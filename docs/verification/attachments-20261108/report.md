# Image/video attachments — verification

Date: 2026-11-08

## Phase A — working attachments

### Root causes

- Client: `src/dashboard/conversations.js` rejected every attachment over **4 KiB** before reading it.
- Server: `src/services/studio-conversations.js` also rejected text attachments over 4 KiB; a client-only change would still fail.
- The dashboard API body parser is limited to **32 KiB** JSON (`src/app.js`), so large images could not be sent as base64 JSON.
- The file picker `accept` list contained only text/code extensions, which Chrome presents as **Custom files** and hides images.
- The old message path had no binary storage route; only text `content` was stored in the event.

### Fix

- New authenticated binary route:
  `POST /api/console/studio/projects/:id/attachments`
  - `application/octet-stream`, separate from the 32 KiB JSON parser.
  - Max **25 MiB image**, **200 MiB video**.
  - PNG/JPEG/WebP/GIF and MP4/WebM/MOV only, checked by extension and magic bytes.
  - Safe UUID filename in `references/`, `wx` (never overwrite), SHA-256, no directory traversal.
- Server message validation accepts the returned metadata, re-reads the file, re-checks size/hash and allows at most one image/video per Send.
- `references/` is excluded from static preview and project snapshots.
- File picker `accept="image/*,video/*,*/*"` — Chrome opens on All files, with images/videos visible.
- Composer shows image/video thumbnail, filename/size and remove control.
- Paste (Ctrl/Cmd+V), drag/drop and Attach share the same media handler. Plain text paste is not prevented or swallowed.
- Chat history fetches the protected reference through the dashboard token and shows an openable image or playable video.
- Dashboard CSP now permits `blob:` images and media.

## Browser evidence

- Attached a **132 KB PNG** through the real Attach input; accepted, thumbnail shown, saved with **Save message** (no worker started).
- Attached a **29 KB generated MP4** the same way; accepted, video thumbnail shown, saved.
- Real Chrome synthetic paste and drop tests:
  - paste: `prevented: true`, thumbnail inserted;
  - plain text paste: `prevented: false`;
  - drop: `prevented: true`, thumbnail inserted.
- Reloaded history: image rendered at **1576×870** and video element present.
- No 4 KiB error occurred.

Screenshots: `image-saved.png`, `video-saved.png`, `pasted.png`, `history-after-reload.png`.
The MP4 is a generated 4-second local test recording, not a production screen recording.

## Step 3 — building from the image: NOT IMPLEMENTED

No existing worker adapter passes image content to the Builder. The packets are text-only; Codex/Claude/DeepSeek/Nemotron calls do not receive an image part, and no vision-to-spec step exists. I did not fake a vision result. Consequently acceptance test 2 (a live build recognisably matching the reference) was **not run**.

## Limitations

- I verified **Save message**, not **Send**, because Send starts paid/provider work and no image-understanding route exists.
- Text-only regression run (acceptance 3) was not repeated.
- Oversize image rejection was unit-tested at 25 MiB; a full 200 MiB video upload was not performed.
- Resume/role-swap image retention (acceptance 5) was not exercised because no image run was started.

## Tests

- Focused attachment/composer tests: **35/35 passed**.
- `tests/attachments.test.js`: **2/2 passed** (storage, limits, magic, traversal, preview block, snapshot exclusion, message metadata).
- `tests/conversation-ui.test.js`: includes attach >4 KiB, 25 MiB rejection, paste, drop, text-paste regression.
- Full serial run: **748 tests, 747 passed, 1 failed** — `imported independent review persists, freezes tests and preserves explicit owner acceptance` ended at `AWAITING_REVIEW` after 326 s instead of `VERIFIED`. The same test passed alone in 4.9 s, and the full `tests/demo-workers.test.js` file passed **27/27** (91.9 s). This is recorded as an environmental/full-suite failure, not hidden; the full suite is **not green** in this run.

## Backend

PID and health reported after final restart.
