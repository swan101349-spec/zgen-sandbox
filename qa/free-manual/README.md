# ZGen | Free manual-only synthetic QA

**PUBLIC REPOSITORY.** This folder contains only new, generic, artificial painting test data. It contains **no** proprietary ZGenArtStudio-Pro source, real owner artwork, saved projects, credentials or private repository history. The public retired painter at root index.html has **not** been changed.

## Cost / execution policy

- Isolated **unmerged** branch: qa/free-manual-synthetic-20261127.
- No scheduled automation, GitHub Actions workflow, pull request, CI trigger, deployment or payment is created in this branch.
- The existing repository workflow definitions were not changed; this branch/folder was selected to avoid their configured branch/path triggers.
- All test execution is **manual**, on a local machine. Do not enable an automatic agent or Actions runner without new explicit owner permission.
- Never copy real ZGen private painting source or the 120 owner artworks to this public repository.

## Contents

- synthetic-painter.html: minimal 720x1280 canvas for artificial pointer strokes, undo/redo, fake-project localStorage save/open, explicit PNG export, and 9:16 transparent monochrome PNG validation. **It is not a ZGen product or beta.**
- test_offline.py: Python/Pillow image cases (valid portrait, 362x362 square, opaque dark, color, blank), HTML contract checks, and JavaScript syntax validation with Node. No browser/hosting required.
- test_manual.py: prepared local Python Playwright/Chromium checks across five phone/tablet viewport sizes, pointer drawing, undo/redo, cold reload Save/Open, PNG output and image gate.

## Commands for an authorized local engineering machine

Requirements: Node 22+, Python 3.10+, Pillow, Playwright for Python, installed Chromium (current manual test expects /usr/bin/chromium on Linux).

Run the offline check within this folder: python3 test_offline.py

Prepare Chromium testing only on an approved local machine: python3 -m pip install playwright Pillow, then python3 -m playwright install chromium; change the executable_path in test_manual.py if necessary. Run: python3 test_manual.py

These tests do not need GitHub Actions or any new subscription. Do not install or run this code on the owner's tablet merely to test the toolchain.

## Actual evidence | 27 November 2026

**PASS:** offline source assertions, embedded JavaScript syntax via Node, and five artificial PNG cases, including expected rejection of square, opaque, color and blank inputs.

**BLOCKED / NOT VERIFIED:** live Chromium/Playwright browser acceptance in the assistant environment. Chromium navigation to local HTTP and local file sources returned net::ERR_BLOCKED_BY_ADMINISTRATOR. The test script is prepared but no browser PASS is claimed.

**NOT TESTED:** private Pro engine, watercolor physics, 120 actual gallery PNGs, physical Tab S9 S Pen/palm, OPPO, real WebGL2, WordPress, owner artwork, and any live GitHub cost cap.

## Release boundary

Protect the retired public home page, all original artwork, private Pro repository and its PRs, and WordPress production. Do not merge this isolated branch to main or create an Actions workflow to run it unless separately authorized by the owner. Automatic assistants remain off.
