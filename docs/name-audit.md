# Which Dorian? A listening and source audit

The earlier page explained the name changes, but selecting another octave also
changed its starting pitch. The new [comparison](https://antonsoo.github.io/harmoniai/compare.html)
holds that pitch fixed. A learner can distinguish a changed interval order from
a transposition, inspect individual degrees, and take the actual sound and source
pages away together.

## Try the actual work

1. Open **Which Dorian?** with its defaults. Both ascending scales start at 220 Hz.
   Listen to A, then B. Hear degrees 2 and 6 separately in the pitch table.
2. Choose **The same interval order**. B becomes modern Phrygian and all eight
   pitches agree. The control tests the explanation with sound.
3. Keep the same name and change both tunings to **9:8 / 256:243**. The same two
   degrees differ, now by about 113.685 cents instead of 100. The name alone did
   not determine the tuning.
4. Read the named span and the separate diatonic description. On printed page 198,
   find the fourth species: its small steps are first from the low end and third
   from the high end. Count gaps, not notes, on the drawing.
5. Open the explanation of the genera and read page 199, lines 1–3. Cleonides
   explicitly carries the names across; we are not silently treating the preceding
   enharmonic description as a diatonic performance.
6. Save the illustrated reading. Open that downloaded file without a connection,
   play its embedded sound, and inspect its complete source pages. WAV and CSV
   are separate reusable artifacts. **Copy comparison link** reopens the settings;
   changing controls does not silently rewrite the browser URL.

## The comparison

T denotes a tone and S the smaller step. Both lanes use the same step sizes and
starting pitch. Modern interval orders were specified separately from the Greek
species, using [Steps to Music Theory, section 11.1](https://odp.library.tamu.edu/stepstomusictheory/chapter/modes/).

| Shared name | Cleonides, low to high | Modern, low to high | Different degrees |
|---|---|---|---|
| Dorian | S T T T S T T | T S T T T S T | 2, 6 |
| Phrygian | T S T T T S T | S T T T S T T | 2, 6 |
| Lydian | T T S T T T S | T T T S T T S | 4 |
| Mixolydian | S T T S T T T | T T S T T S T | 2, 3, 5, 6 |

The pure sine signal is a teaching choice. The two tunings are 200/100-cent steps
and 9:8 tones with 256:243 small steps. The former realizes tone/half-tone arithmetic
using equal divisions; the latter uses Pythagorean ratios. Neither recovers an
ancient instrument, performance, absolute pitch or ethos. The modern name identifies
an interval order, not a claim about medieval or present-day tuning practice.

The ascending comparison contains eight notes in A, a pause, then eight in B.
Its deterministic mono PCM WAV is also the browser player's actual source. The
renderer uses 44,100 samples/second, 16-bit samples and 20 ms ramps. The player,
downloaded WAV and embedded HTML audio contain the same bytes for a given selection.
Stop resets playback; changing any comparison control stops and replaces the old
sound. A degree button plays just that degree in A and then B.

## Printed evidence

K. von Jan, *Musici scriptores Graeci* (Leipzig: Teubner, 1895), Cleonides chapter 9.
The [source record](../public/sources/manifest.json) retains the original image URLs,
byte sizes and hashes. All three complete images were opened and read in this audit.

| Printed page | Image endpoint index | What it supplies |
|---|---:|---|
| 197 | 298 | First named spans; Jan's diagram of all seven octaves |
| 198 | 299 | Remaining named spans; diatonic half-step positions |
| 199 | 300 | End of the diatonic list; same spans and names across genera |

The scan metadata's leaf numbers differ by one from the image endpoint indices.
The printed page numbers, rather than filenames alone, establish the mapping.
The earlier named excerpts agree with these pages; no correction to the seven
interval mappings was needed. The four new diatonic excerpts and the concluding
sentence were transcribed from these images, with initial capitalization,
apostrophes and punctuation normalized. Omissions and supplied English words are
marked. These are new translations, without independent philological review.

The reader and illustrated export verify the actual source bytes before using
them. A mismatched page is not shown or incorporated. A late request for an older
page cannot replace the newly selected page. Source verification establishes the
retained edition's identity; the separate visual reading establishes the text match.

## Reproduced practice defect

In both Chromium and Firefox, answering one string question and then plucking
another string counted two answers. Firefox's captured run changed a correct
answer to “Not that one”; the next question showed “1 of 2 right so far”. See the
[before receipt](review/name-audit/before.json).

Each question now accepts one answer. Further plucks remain audible for exploration
but leave the explanation and score intact. **Next string** begins another question
and returns keyboard focus to the instrument. Hidden strings have neutral accessible
labels naming their pitch positions, without revealing the Greek answer. Species
selection uses arrow keys, Home and End with a single tab stop. The octave playback
and species buttons are disabled while practising, where they would otherwise act
on an unrelated hidden selection.

## Export audit

The HTML includes its WAV, diagrams, pitch table, Greek and English, three complete
source images, four font subsets and their licenses. It has no scripts or remote
asset dependencies. Its source explanation is open, including when printed; the
first print review found that a closed disclosure omitted this passage and it was
corrected before publication. External reference links still need a connection.

Saving captures the selected comparison before any source fetch. Changing controls
while the export loads cannot relabel that snapshot. Cancellation produces no
download. A corrupted source refuses the entire illustrated export, rather than
silently saving a reading without its evidence.

## Verification

`npm run check` runs lint, strict TypeScript, 23 tests and the build. Independent
interval expectations cover all four names, both tunings and all three starting
pitches. Same-pattern controls agree at every degree. Analysis of 128 rendered
PCM notes found a maximum frequency error of 0.000358 cents in the measured windows;
the assertion threshold is 0.01 cent. This measures the synthesized digital signal,
not speakers, headphones or a listener's hearing.

```sh
npm run build
npx vite preview --host 127.0.0.1 --port 4484 --strictPort
# In another terminal:
npm run test:comparison
```

The comparison browser script uses Chromium and Firefox at 1440 and 375 pixels,
in light and dark themes. It follows the main page's actual link, reproduces the
practice fix, checks all eight name/relation combinations, keyboard playback,
Stop, pitch/tuning changes and shared-link reopening. It decodes the real downloaded
WAV, checks every pitch, compares it with the player's bytes, checks the CSV values,
and verifies every embedded image/font/audio hash in the downloaded HTML. It opens
that file from disk without remote asset requests, prints a tagged A4 PDF, checks
accessibility and overflow, then reloads and exports the identical reading offline.

Both engines separately exercise delayed and corrupted sources, frozen export
selection and cancellation. Receipts:

- [Comparison and download review](review/name-audit/local/review.json)
- [Existing Greek and Sanskrit journeys](review/name-audit/existing/browser.json)
- [Offline navigation, eviction and corrupt-install checks](review/name-audit/offline.json)
- [Actual listening WAV](review/name-audit/local/dorian-comparison.wav)
- [Actual pitch table](review/name-audit/local/dorian-pitches.csv)
- [Illustrated HTML, gzip-compressed](review/name-audit/local/dorian-reading.html.gz)
- [Printed reading](review/name-audit/local/dorian-reading.pdf)

Public build identity and public-browser evidence are recorded separately after
publication; local success alone does not establish what a hosted visitor receives.
