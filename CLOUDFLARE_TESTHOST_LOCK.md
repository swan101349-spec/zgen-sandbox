# ZGenArtStudio Pro | Frozen Cloudflare Pages testhost candidate
**Snapshot prepared:** 2026-11-24 (Bangkok)  
**Deploy branch:** `testhost/cloudflare-fixed-20261124`  
**Source baseline:** `main@33a8c8613cc9d3e218e97a849faedb41cd38614d`  
**Purpose:** Verify imported PNG persistence and Android Chrome/shortcut stability on a completely separate host.  

## Safety lock
- This branch is a **byte-identical copy of the existing public GitHub Pages beta** apart from this documentation file. It is NOT a fix for the PNG disappearance.
- The primary GitHub Pages URL, `main`, existing Chrome shortcuts, WordPress, private engineering source and DNS must remain untouched.
- Cloudflare Pages preview is **not confirmed live** until an authenticated Cloudflare provider deployment receipt and exact preview URL are obtained.
- The expected deployment is the built static site from repository root. `index.html`, `three-shell.js`, `bounded-fill.js`, `artist-feedback.js`, associated CSS and assets stay at their existing relative paths.
- Do not automatically merge this branch or enable Cloudflare production deployment. Use a separate Pages preview branch, with Preview build control restricted to this branch if supported by the connected project.
- A branch alias may update if commits are added. For a fixed test use a deployment's unique commit-pinned preview address, not a mutable alias. Record deployment ID, URL and SHA before any owner test.
- Preview addresses may be publicly accessible. Use Cloudflare Access if protecting private art and unreleased engineering builds. This public-repo snapshot contains only the already-public beta.

## Diagnostic acceptance
1. On actual Galaxy Tab S9, import a distinctive PNG into the reference layer, confirm it stays visible after panel/drawer operations, Fit Canvas, portrait/landscape changes and returning to Chrome after Android task switch.
2. Separately reload the page: existing public beta **cannot automatically recover unsaved PNG**. Mark this as KNOWN FAIL, not a Cloudflare defect.
3. Record WebGL context-loss and page lifecycle events; compare exact rendered shell/version to the same GitHub revision served on GitHub Pages.
4. Verify a manual Chrome shortcut opens this SAME host, not a new URL or stale tab, and does not redirect to old GitHub Pages/WordPress.
5. No deployment or platform claim of real hardware PASS without jas testing.

**Owner priority:** painting preservation first. Existing right/left/bottom panel **OPEN** already PASS; do not re-test panel-opening in place of missing content or disappearing PNG.
