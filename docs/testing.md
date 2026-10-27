# Initial testing plan
16/16 automated local tests pass; captured output: tests/latest-results.tap. Windows 10.0.26200, Node v24.22.1. Production Vite build passes. Clean GitHub Linux CI also passed installation, all 16 tests and build (run 40556656826). Supertest calls the real Express API using the local store and Sharp decoding with synthetic files. Unique temporary persistence fixtures are cleaned. This is not hosted Supabase evidence.

| Requirement / P1 criteria | Implementation | Verification |
|---|---|---|
| US-01 AC1-3 | auth routes/local sessions; Supabase adapter | Register/login, invalid credentials, copied pre-logout cookie rejected. Supabase confirmation pending. |
| US-02 AC1 | createGroup / SQL transaction | Owner ID, stored schedule, group listing, restart persistence. |
| US-02 AC2 | groupInput | Blank/oversized name and invalid schedule add no group. |
| US-02 AC3 / NFR-03 | group/media membership checks | Second account denied direct group, list, upload and image access. Signed-out requests rejected. |
| US-06 AC1 | imageInput/upload/store | Valid decoded JPEG/PNG, dimensions, 200-char caption, correct record count and protected media. |
| US-06 AC2 | Multer/Sharp/cap | Corrupt bytes/forged PNG label, GIF, missing file, >10 MiB, >20 MP, 201-char caption and 31st photo rejected. |
| US-06 AC3 | local serialized mutation/rollback | At 29, concurrent requests yield 201/409 with 30 records. Actual filesystem save failure gives 500 and no completed metadata. |
| UTC/shared rules | server month | October cap does not block November or another group. |

Additional tests: stored password is hashed, restart preserves data, HttpOnly/SameSite flags, no-store media, invalid month, cross-site write rejection and internal error redaction.

## Browser checks
In-app Chromium walkthrough: registration, sign-in and private-circle creation. Dashboard overflow checked at 390 and 1366 px. Full Chrome/Firefox matrix, keyboard-only flow and upload form/photo-loaded layout need team verification; NFR-05 is not complete.

## Live Supabase acceptance plan
After provisioning, register/confirm two test accounts in separate contexts. Repeat US-01/02/06 criteria with APP_MODE=supabase. Check group/owner atomicity, direct anon/authenticated table/function denial, private bucket denial, email confirmation and logout/expiry. At 29 photos, submit simultaneous uploads from independent server processes: expect one commit and one 409. Inject Storage failure (no row), RPC failure (new object removed), removal failure (cleanup queue) and retry. Check server UTC month at publication. Record commands, roles, DB/storage observations and dates. Never expose service role credentials to the browser.

## NFR status
NFR-01: 8-user/240-record latency benchmark pending.
NFR-02: local synthetic spike only; five runs on intended host pending.
NFR-03: current local boundaries pass; HTTPS/cloud and future member-revocation/recap cases pending.
NFR-04: recap job persistence/restart recovery not built.
NFR-05: partial Chromium walkthrough/layout; Chrome/Firefox/keyboard matrix pending.
NFR-06: README/env/tests supplied; independent teammate setup/review pending.
NFR-07: cleanup queue scaffolding only; retry/24-hour guarantee unverified.
