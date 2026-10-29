# Contributing

Use Node 24 or later: `npm ci`, then `npm run dev`. `npm run check` runs lint, strict
types, the tests and the build. Any change to a species, a note name or a quotation
should keep `tests/system.test.ts` passing: it reads the Greek on the page and checks it
against the model. Cite the edition and page for any new Greek, and say when a gloss is
a reading of a compound rather than a dictionary entry.
