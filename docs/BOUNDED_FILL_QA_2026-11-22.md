# ZGenArtStudio Pro | Bounded watercolor Fill engineering receipt
**Bangkok date:** 22 November 2026  
**Build:** `engineering/bounded-watercolor-fill-20261122` on `swan101349-spec/zgen-sandbox`  
**Review:** [draft PR #3](https://github.com/swan101349-spec/zgen-sandbox/pull/3), based on favorites PR #2 and auto-fit PR #1.

## Scope
A real, compact Fill button within Brushes. Use a normal phone tap inside an actual **closed dark graphite/ink outline** on the existing reference or paint layer. The adapter reads reference and paint RGBA, builds a bounded four-neighbor region, rejects open/edge/oversized masks, lays a textured translucent color wash *inside* the mask, and registers native Undo through a narrow bridge to the existing painter.

Existing 720 × 1280 native rendering pixels, canvas gestures outside Fill, watercolor brush heads, paint physics, imported reference layers, Undo/Redo and PNG routines are not replaced. The downloaded PNG contains both original reference and the new real wash paint.

## QA evidence
- [Chromium run 44993906413](https://github.com/swan101349-spec/zgen-sandbox/actions/runs/44993906413) **PASS**: closed rectangle wash, blank/open fails safely, real graphite visibility, strength adjustment, original Undo/Redo, exported PNG sampled for actual wash pixels.
- [Chromium run 44994059620](https://github.com/swan101349-spec/zgen-sandbox/actions/runs/44994059620) **PASS**: real simulated touchscreen taps, not only internal Fill function.
- [Chromium run 44994103832](https://github.com/swan101349-spec/zgen-sandbox/actions/runs/44994103832) **PASS**: high/low Coverage and Soft Edge produce measurably different pixels while remaining bounded; all previous history/PNG/graphite tests passed.
- `tests/bounded-fill-source-integrity.cjs` matches decoded packed module from `index.html` against `shell-v2.html` after removal of the single audited 746-byte bridge; **114,233 original bytes identical**.
- Final CI workflow `44994166361` for source-integrity + browser QA should be read for its final conclusion; do not claim pass before GitHub confirms it.

## Explicit non-PASS
Real Tab S9 / OPPO physical finger and S Pen acceptance, detailed imported cartoon with fragile antialiasing, arbitrary open/ambiguous artwork, long wet-flow scene under memory pressure, repeat fill saturation and PNG print aesthetics remain unverified. Protection guard: do not ship the Fill candidate to live Pages main, WordPress or production without reviewing all hardware/test gates.

## Repository guard
Public Pages `main` remains source SHA `353a56d378e58d584b2efc42a573f53a35250393`, **no Fill release**. The source-only work was committed to an isolated review branch, and existing auto-fit/favorites PRs remain intact. No new host, charge, library import or unsupported background worker was used.
