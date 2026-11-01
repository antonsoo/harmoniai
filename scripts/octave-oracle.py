"""Measure actual browser buffers and independently reconstruct native WAVs.

Requires NumPy. Imports no application code. The literal pitch table and the
closed-form damped harmonic sum are independent of the TS interval accumulator,
recursive oscillators and WAV writer. No acoustic device output is inferred.
"""
import csv
import json
import math
import sys
import wave
from pathlib import Path

import numpy as np

root = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/harmoniai-octave-review")
review = json.loads((root / "review.json").read_text())
RATIOS = [1, 9/8, 32/27, 4/3, 3/2, 128/81, 16/9, 2, 9/4, 64/27, 8/3, 3, 256/81, 32/9, 4]
KEYS = [0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19, 20, 22, 24]


def expected_hz(case, index=None):
    i = case["index"] if index is None else index
    factor = RATIOS[i] if case["tuning"] == "pythagorean" else 2 ** (KEYS[i]/12)
    return case["mese"] / 2 * factor


def measure(samples, rate, target):
    # A late window reduces the rapidly decaying upper partials. Search only
    # the independently predicted fundamental band, never a displayed UI value.
    a = samples[round(.25*rate):round(1.2*rate)]
    n = 2**20
    spectrum = abs(np.fft.rfft(a*np.hanning(len(a)), n))
    low, high = int(target*.97*n/rate), int(target*1.03*n/rate)
    k = low + np.argmax(spectrum[low:high])
    y = np.log(spectrum[k-1:k+2])
    shift = .5 * (y[0]-y[2]) / (y[0]-2*y[1]+y[2])
    hz = (k+shift)*rate/n
    cents = 1200*math.log2(hz/target)
    return float(hz), float(cents)


measured = []
for case in review["signals"]:
    samples = np.fromfile(root / case["file"], dtype="<f4")
    rate = case["rate"]
    assert len(samples) == round(rate*1.6)
    assert np.isfinite(samples).all()
    assert max(abs(samples)) <= 1
    assert samples[0] == samples[-1] == 0
    hz, cents = measure(samples, rate, expected_hz(case))
    assert abs(cents) < .1, (case, hz, cents)
    measured.append({**{k: v for k,v in case.items() if k != "file"}, "expected_hz":expected_hz(case), "measured_hz":hz, "error_cents":cents})


def reference_note(hz, rate):
    t = np.arange(round(rate*1.6))/rate
    y = np.zeros(len(t))
    amplitudes = []
    for h in range(1, min(24, math.ceil(.45*rate/hz)-1)+1):
        amplitude = math.sin(math.pi*h*.23)/h**2
        amplitudes.append(abs(amplitude))
        y += amplitude*np.exp(-(2.8+.35*h*h)*t)*np.sin(2*math.pi*h*hz*t)
    attack, release = round(rate*.003), round(rate*.05)
    envelope = np.minimum(1, np.minimum(np.arange(len(t))/attack, np.arange(len(t)-1,-1,-1)/release))
    return y/sum(amplitudes)*envelope*.32


wav_checks = []
for case in review["downloads"]:
    with open(case["csv"], newline="") as f:
        rows = list(csv.DictReader(f))
    assert len(rows) == 15
    assert sum(r["in_selected_octave"] == "true" for r in rows) == 8
    for i,r in enumerate(rows):
        assert abs(float(r["target_hz"])-expected_hz(case,i)) < 1e-10
    for kind in ["note", "wav"]:
        with wave.open(case[kind], "rb") as f:
            assert f.getnchannels() == 1 and f.getsampwidth() == 2
            rate = f.getframerate()
            assert rate == 44100
            pcm = np.frombuffer(f.readframes(f.getnframes()), dtype="<i2")
        start = case["species"]
        up = list(range(start,start+8))
        order = [case["index"]] if kind == "note" else up+up[-2::-1]
        expected = np.zeros(round(((len(order)-1)*.42+1.6)*rate))
        for position,index in enumerate(order):
            a = reference_note(expected_hz(case,index), rate)
            offset = round(position*.42*rate)
            expected[offset:offset+len(a)] += a
        # JS Math.round breaks ties towards +infinity. The 1-LSB allowance
        # covers Float32 accumulation and PCM rounding, not a different signal.
        quantized = np.floor(np.clip(expected,-1,1)*32767+.5)
        error = float(max(abs(pcm.astype(float)-quantized)))
        assert len(pcm) == len(expected)
        assert error <= 1, (case,kind,error)
        wav_checks.append({"engine":case["engine"],"width":case["width"],"kind":kind,"samples":len(pcm),"worst_lsb":error})

baseline = []
if len(sys.argv) > 2:
    for path in Path(sys.argv[2]).glob("before-*.f32"):
        _, rate, tuning, index = path.stem.split("-")
        case = {"rate":int(rate),"tuning":tuning,"index":int(index),"mese":220}
        hz, cents = measure(np.fromfile(path,dtype="<f4"),case["rate"],expected_hz(case))
        baseline.append({**case,"expected_hz":expected_hz(case),"measured_hz":hz,"error_cents":cents})
    (root/"baseline.json").write_text(json.dumps({"source_commit":"c00cc4d","seed":1,"measurements":baseline,"worst_absolute_cents":max(abs(r["error_cents"]) for r in baseline)},indent=2)+"\n")

result = {"signals_measured":len(measured),"worst_absolute_cents":max(abs(r["error_cents"]) for r in measured),"native_wavs":wav_checks,"measurements":measured}
(root/"oracle.json").write_text(json.dumps(result,indent=2)+"\n")
print(json.dumps({k:v for k,v in result.items() if k != "measurements"},indent=2))
