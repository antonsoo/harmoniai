"""Check the actual audio-thread mix, not scheduled buffers or UI counters.

NumPy only. No application imports. Plucks use a direct damped harmonic sum;
oscillators use independently specified frequencies and gain envelopes. Native
media is compared with its actual downloaded PCM and separately measured pitches.
"""
import json
import math
import sys
import wave
from pathlib import Path

import numpy as np

root = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/harmoniai-live-output")
review = json.loads((root / "review.json").read_text())
RATIOS = [1, 9/8, 32/27, 4/3, 3/2, 128/81, 16/9, 2, 9/4, 64/27, 8/3, 3, 256/81, 32/9, 4]
KEYS = [0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19, 20, 22, 24]
results = []


def pluck(hz, rate):
    t = np.arange(round(1.6 * rate)) / rate
    signal = np.zeros(len(t))
    bound = 0
    for h in range(1, min(24, math.ceil(.45*rate/hz)-1)+1):
        amplitude = math.sin(math.pi*h*.23)/h**2
        bound += abs(amplitude)
        signal += amplitude*np.exp(-(2.8+.35*h*h)*t)*np.sin(2*math.pi*h*hz*t)
    attack, release = round(.003*rate), round(.05*rate)
    envelope = np.minimum(1, np.minimum(np.arange(len(t))/attack, np.arange(len(t)-1, -1, -1)/release))
    return signal/bound*envelope*.32


def pitch(values, rate):
    a, b = values[:-1], values[1:]
    positions = np.flatnonzero((a <= 0) & (b > 0))
    crossings = positions-a[positions]/(b[positions]-a[positions])
    assert len(crossings) > 10
    return (len(crossings)-1)*rate/(crossings[-1]-crossings[0])


for case in review["receipts"]:
    actual = np.fromfile(root / case["file"], dtype="<f4").astype(float)
    assert len(actual) == case["samples"] and np.isfinite(actual).all()
    assert max(abs(actual)) < 1, "The mixed signal clipped"
    rate, first = case["rate"], case["firstFrame"]
    kind = case["kind"]
    rms = float(np.sqrt(np.mean(actual**2)))
    assert rms > .001, (case, "There was no meaningful output")
    result = {"engine": case["engine"], "rate": rate, "kind": kind, "samples": len(actual), "rms": rms}
    if kind == "octave":
        assert not [g for g in case.get("clockGaps", []) if g["actual"] > case["starts"][0]["at"]*rate], (case["file"], "Recorder timestamps discontinuous during sound; repeat this capture and retain the failed receipt")
        starts = case["starts"]
        assert len(starts) == 15
        origin = starts[0]["at"]
        assert max(abs(s["at"]-origin-i*.42) for i, s in enumerate(starts)) < 1e-9
        expected = np.zeros(len(actual))
        up = list(range(case["species"], case["species"]+8))
        for start, index in zip(starts, up+up[-2::-1], strict=True):
            hz = case["mese"]/2*(RATIOS[index] if case["tuning"] == "pythagorean" else 2**(KEYS[index]/12))
            note = pluck(hz, rate)
            offset = round(start["at"]*rate)-first
            assert offset >= 0 and offset+len(note) <= len(actual)
            expected[offset:offset+len(note)] += note
        error = float(max(abs(actual-expected)))
        assert error < 2e-6, (case["file"], error)
        result.update(tuning=case["tuning"], worst_absolute_error=error)
    elif kind == "stop":
        after = round(case["stopTime"]*rate)-first+512
        assert 0 < after < len(actual)
        peak = float(max(abs(actual[after:])))
        assert peak == 0, (case["file"], peak)
        result.update(post_stop_peak=peak, remaining_frames=len(actual)-after)
    elif kind in ["pure-fifth", "equal-fifth"]:
        expected_hz = [220, 330 if kind == "pure-fifth" else 220*2**(13/22)]
        assert len(case["starts"]) == 2
        for s, target in zip(case["starts"], expected_hz, strict=True):
            assert abs(s["hz"]-target) < .0001
        onset = case["starts"][0]["at"]
        t = (np.arange(len(actual))+first)/rate-onset
        gain = .15*np.maximum(0, np.minimum(1, np.minimum(t/.05, (2-t)/.2)))
        expected = sum(np.sin(2*math.pi*f*t) for f in expected_hz)*gain
        # Engines may initialize an oscillator at a different sub-sample phase.
        # Measure the steady two-tone output; do not turn phase into pitch error.
        selected = (t > .2) & (t < 1.6)
        times = t[selected]
        values = actual[selected]
        # Search frequencies independently of application code, keeping both
        # phases free. Downsampling preserves these sub-400 Hz components.
        times, values = times[::8], values[::8]
        measured = expected_hz.copy()
        def fit():
            design = np.column_stack([fn(2*math.pi*f*times) for f in measured for fn in [np.sin, np.cos]])
            coefficients = np.linalg.lstsq(design, values, rcond=None)[0]
            residual = float(np.sqrt(np.mean((values-design@coefficients)**2)))
            return residual, coefficients
        for _ in range(3):
            for i, target in enumerate(expected_hz):
                low, high = target-.05, target+.05
                for _ in range(28):
                    left, right = low+(high-low)*.381966, high-(high-low)*.381966
                    measured[i] = left
                    a = fit()[0]
                    measured[i] = right
                    b = fit()[0]
                    if a < b:
                        high = right
                    else:
                        low = left
                measured[i] = (low+high)/2
        residual, coefficients = fit()
        amplitudes = [float(np.hypot(*coefficients[i:i+2])) for i in [0, 2]]
        errors = [abs(1200*math.log2(f/target)) for f, target in zip(measured, expected_hz, strict=True)]
        assert residual < .00001, (case["file"], residual)
        assert max(errors) < .02, (case["file"], errors)
        assert max(abs(a-.15) for a in amplitudes) < .0001, (case["file"], amplitudes)
        result.update(steady_waveform_rms_error=residual, amplitudes=amplitudes,
                      measured_frequencies=measured, worst_pitch_error_cents=max(errors),
                      boundary="Independent two-frequency fit with free oscillator phase; no phase precision claim.")
    elif kind == "media":
        with wave.open(str(root / case["wav"]), "rb") as wav:
            assert wav.getframerate() == rate and wav.getnchannels() == 1
            reference = np.frombuffer(wav.readframes(wav.getnframes()), dtype="<i2").astype(float)/32768
        n = 2**math.ceil(math.log2(len(actual)+len(reference)))
        correlation = np.fft.irfft(np.fft.rfft(actual, n)*np.conj(np.fft.rfft(reference, n)), n)
        k = int(np.argmax(correlation[:round(rate*.8)]))
        y = correlation[k-1:k+2]
        fractional = .5*(y[0]-y[2])/(y[0]-2*y[1]+y[2]) if k else 0
        lag = k+fractional
        expected = np.interp(np.arange(len(actual))-lag, np.arange(len(reference)), reference, left=0, right=0)
        error = float(np.sqrt(np.mean((actual-expected)**2)))
        assert error < .0002, (case["file"], error, lag)
        keys = [0, 1, 3, 5, 7, 8, 10, 12, 0, 2, 3, 5, 7, 9, 10, 12]
        errors = []
        for i, key in enumerate(keys):
            onset = i*.46 if i < 8 else 4.33+(i-8)*.46
            a, b = round(lag+(onset+.06)*rate), round(lag+(onset+.30)*rate)
            measured = pitch(actual[a:b], rate)
            errors.append(abs(1200*math.log2(measured/(220*2**(key/12)))))
        assert max(errors) < .02, (case["file"], max(errors))
        result.update(alignment_frames=lag, waveform_rms_error=error, worst_pitch_error_cents=max(errors), measured_tones=len(errors))
    else:
        raise AssertionError(kind)
    results.append(result)

report = {"captures": len(results), "results": results, "boundary": "Digital audio-thread output before the physical device. No speaker, microphone or listening claim."}
(root / "oracle.json").write_text(json.dumps(report, indent=2)+"\n")
print(json.dumps(report, indent=2))
