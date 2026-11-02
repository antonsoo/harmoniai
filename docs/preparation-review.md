# Let Stop interrupt the preparation

Accurate samples did not make the main instrument responsive on a slower CPU.
The ascending/descending octave prepared fifteen independent buffers in one
main-thread task. Seven descending pitches repeat notes already rendered on the
way up. With Chromium's 6x CPU slowdown, that task occupied roughly a third of a
second, and a queued Stop waited for the whole render.

The instrument now makes one buffer for each exact frequency within the action.
Every onset still creates its own one-shot source: eight buffers, fifteen notes.
There is no frequency rounding or cache shared across actions. A MessageChannel
handoff between unique renders gives queued controls a chance to run, then checks
that the action still owns playback before rendering more. The handoffs also
publish the audio-clock snapshot before choosing the start time. Stop, a tuning
change or a newer action can discard the remaining preparation.

This uses the [Web Audio buffer acquisition model](https://www.w3.org/TR/webaudio/#acquire-the-content):
multiple source nodes can acquire the same finished buffer's immutable contents.
The [HTML timer rules](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers)
explain the minimum delay for repeatedly nested timers; the MessageChannel handoff
uses a separate task. The browser observations below verify that controls actually
get to run. The complete octave is still prepared before its first onset, keeping
the chosen tempo independent of later rendering work.

WAV creation also reuses repeated plucks within that file's render. Its output
rate, overlap, gain, envelope and PCM encoding remain the same. WAV creation is
still synchronous; its bank reduces computation, while the live preparation's
task handoffs provide the interruptible controls.

## Actual controls, not a synthesis-only stopwatch

`preparation-review.mjs` serves a frozen build and operates the real buttons.
It warms the audio context, observes native AudioBuffer allocations and source
starts, and measures the interval from completed resume to the first scheduling
call. An 8 ms heartbeat records event-loop gaps. The cancellation case queues
Stop after 30 ms and watches for another 600 ms, rejecting any later buffer
allocation or source start. WAV timing ends when the generated download anchor
is invoked; the actual native download is separately saved and hashed.

The paired builds are source `a7bc754` and `73d8562`. Both receipts record the
same review-script SHA-256 and their complete build inventories. The baseline
inventory matches the previous published edition; the revised inventory matches
a fresh Node 24.22.1 install/check/build, including 27 tests. The host is WSL2 Linux,
14 logical CPUs, 50,516,529,152 bytes of reported memory. Browser:
Chromium 153.0.8010.12. These are DevTools CPU-emulation observations on this host,
not hardware or audio-device latency measurements.

Medians of three completed live preparations per row:

| Context rate | CPU slowdown | Before | After |
| --- | --- | --- | --- |
| 44,100 Hz | 1x | 50.9 ms | 37.0 ms |
| 48,000 Hz | 1x | 54.0 ms | 44.2 ms |
| 44,100 Hz | 6x | 329.6 ms | 192.7 ms |
| 48,000 Hz | 6x | 347.8 ms | 217.7 ms |

| Operated property | Before | After |
| --- | --- | --- |
| Completed octave buffers / source starts | 15 / 15 | 8 / 15 |
| Created channel samples at 48 kHz, in bytes | 4,608,000 | 2,457,600 |
| Largest heartbeat gap across 6x completed cases | 359.3 ms | 62.7 ms |
| Stop queued at 30 ms, actual dispatch range | 314.7–362.3 ms | 70.0–80.6 ms |
| Sources scheduled when that Stop ran | 15 | 0 |
| Additional work after Stop in 600 ms observation | None | None |
| WAV creation, 1x median of six runs | 67.0 ms | 64.6 ms |
| WAV creation, 6x median of six runs | 413.6 ms | 358.2 ms |

The channel-sample count records application-created buffers, not resident RAM.
The Stop times describe dispatch of a queued control, not physical-device silence.
All 24 actual WAV downloads across the paired runs have the same SHA-256:
`a65179446e613c9502d74e26128cf95176c2eb922cc7a2ab469ff5f4e2d9b8e2`.
The revision preserves the file's bytes while doing less repeated synthesis.

[Paired measurements](review/preparation/summary.json) ·
[All baseline operations](review/preparation/before.json) ·
[All revised operations](review/preparation/after.json) ·
[Fresh build](review/preparation/build.json).

## Preserve the previous entry's module URLs

A release rehearsal exposed another boundary. Replaying the previous published
HTML against a pruned new build, with service workers blocked, produced missing
module responses and no instrument in both engines. A controlling worker's
edition cache protects its own tabs; an HTTP-cached entry can exist separately.

Publication now creates a normal-history Pages commit in a worktree. It keeps
prior hashed assets, removes obsolete unhashed files, and overlays the reviewed
build. The workflow uses the same approach, with a fast-forward push. The public comparison covers the current 37 canonical files. Offline readiness
uses that build’s generated cache inventory. The previous entry’s six additional
hashed assets are served for its module graph.

The release preflight checks all six retained identities, then replays the actual
previous HTML in worker-blocked Chromium and Firefox contexts at both widths.
Its modules come from the tested origin. The old instrument mounts, keyboard
operation works, and an actual native WAV downloads without missing responses
or page errors. Each context ends by checking the unchanged canonical entry.

[Pruned-entry failure](review/preparation/pruned-entry.json) ·
[Complete retained-entry preflight](review/preparation/retained-entry-local.json).
The public replay is a separate receipt after publication. This is an explicit
previous-entry simulation, rather than a claim to have observed every visitor's
browser cache.

## Keep the waveform check independent

After the change, all 26 actual audio-thread captures pass the existing independent
oracle in Chromium and Firefox: both context rates, both octave models, Stop and
tuning-change silence, pure/equal fifths and native media output. The eight octave
mixes match the direct harmonic formula with maximum absolute sample error below
0.000000109. The test still checks every octave sample, including all reused
pitches and overlapping tails; it does not accept pitch measurements alone.
The recorder's isolated timestamp corrections and startup gaps remain explicit.
All four newly downloaded illustrated studies also match the retained HTML
example byte for byte. No speaker, microphone, human listening or ancient
instrument was measured.

[Audio-thread capture receipt](review/preparation/audio-thread.json) ·
[Independent oracle](review/preparation/audio-oracle.json).

To reproduce with the installed Playwright browsers and NumPy:

```sh
npm ci
npm run check
node scripts/preparation-review.mjs /tmp/harmoniai-preparation
node scripts/live-output-review.mjs /tmp/harmoniai-rendered-output
python3 scripts/live-output-oracle.py /tmp/harmoniai-rendered-output
```

For a paired historical build, follow the output directory with its dist
path and full source revision:

```sh
node scripts/preparation-review.mjs /tmp/baseline-review /path/to/baseline/dist FULL_SOURCE_REVISION
```

Keep browser performance reviews sequential so another audit does not compete
with its measured main thread.
