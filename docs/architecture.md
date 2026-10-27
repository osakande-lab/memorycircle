# Initial architecture

~~~mermaid
flowchart TD
 Browser[React browser UI] -->|same-origin JSON/multipart and HttpOnly cookie| API[Express API]
 API --> Identity[Session and membership checks]
 API --> Validation[Sharp decode and validation]
 API --> Adapter[Store adapter]
 Adapter --> Local[Local JSON data and scrypt accounts]
 Adapter --> Supa[Supabase Auth, PostgreSQL, private Storage]
 Spike[Separate FFmpeg feasibility script] --> MP4[Synthetic 720p MP4]
~~~

Local and Supabase are alternative modes. The local demonstration does not exercise Supabase. The FFmpeg script is separate from uploaded photos and has no scheduler.

- client/main.jsx: forms, month selection, private listing, error/empty states. React escapes captions; no privileged keys or public media URLs.
- server/app.js: same-origin boundary, HttpOnly cookies, rate-limited auth, private routes, upload size enforcement and error handling.
- server/validation.js: normalized account/group input; real JPEG/PNG decoding; <=10 MiB source, <=20 MP, <=200 Unicode codepoints; metadata stripping/re-encoding.
- server/local.js: single-process persistence, scrypt hashes, eight-hour revocable sessions and monthly cap.
- server/supabase.js: server-only credentials, membership checks, private objects, hashed opaque sessions.
- supabase/migrations/001_baseline.sql: atomic group/owner creation, locked photo publication, private bucket, backend-only grants and cleanup queue.
- scripts/spike.js and worker/Dockerfile: separate rendering-risk investigation; no recap jobs.

## Upload interaction
Authenticate and check membership before buffering. Enforce source size, decode/validate/re-encode image. Local mode synchronously checks cap and persists; photo save failure removes completed metadata. Supabase writes storage first, then atomically rechecks membership/count and publishes metadata with server UTC time; failed commits compensate/remove the object. Return metadata only. Media bytes pass through membership-checking routes; data/ is never served statically.

## Decisions and tradeoffs
Preserve P1 React/Express/Supabase direction. Add an explicit local adapter because no project/host exists. Shared API/validation avoids duplicating the workflow; live Supabase remains a release gap. Group-row locks suit small circles, while local mode cannot be clustered. Private backend-mediated media meets the P1 design intent. Opaque revocable app sessions make application logout immediate without relying on an unexpired JWT.

Pending: live SQL/grants/Auth/Storage and cross-process concurrency, HTTPS hosting, cleanup retry, membership lifecycle and recap security. Local JSON is demonstration infrastructure, not a production availability claim.
References: https://supabase.com/docs/guides/auth/signout and https://supabase.com/docs/guides/database/functions . Function execution is restricted to service_role and uses an empty search_path.
