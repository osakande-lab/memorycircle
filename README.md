# MemoryCircle - P2 engineering baseline
Private photo sharing for small circles. COMP 3415, Team FrameFour.
Team: Oluwatolayomi Akande, Daniel Seriki, Nimo Usman, Franklin Uba.
Repository: https://github.com/osakande-lab/memorycircle

## Current functionality
Registration/login/logout, persisted private groups and owner membership, daily/weekly schedule at creation, validated JPEG/PNG uploads, protected selected-month listing and image delivery. This is the Sprint 1 foundation for US-01, US-02 and US-06. Invitations, removals, photo editing/deletion, contribution indicators and recap jobs/player are future work.

Two adapters share one API:
- local (default): single-process, loopback-only prototype; scrypt passwords, revocable sessions and a local JSON file. No Supabase/email verification, HTTPS or distributed storage.
- supabase: Supabase Auth, PostgreSQL, private Storage and opaque app sessions. Code and migration supplied; no live project provisioned or tested.

No story is Done until all P1 acceptance/NFR checks and teammate review pass. See docs/backlog.md.

## Run
Prerequisites: Node.js 24, pnpm 11.25.0 (or Corepack). From this directory:

    corepack enable
    pnpm install --frozen-lockfile
    pnpm build
    pnpm start

Open http://127.0.0.1:3001. Create a local account using a valid email shape and a 10-128 character password. Local mode sends no email. Create a circle, then upload a JPEG/PNG. No demo account or real photos ship with the source.
Development: pnpm dev (Vite :5173 proxies /api to :3001).
Configuration: copy .env.example to .env if needed. No source edits required. Never commit .env or data/. Default data file: data/memorycircle.json. Back up before upgrades. Run ONE local server process; local mode is not for public hosting.

## Checks

    pnpm test
    pnpm build

16 tests exercise the actual Express routes, local adapter and Sharp decoder with synthetic media. Unique .test-data fixtures are cleaned up. Failure-path log messages are intentional. Captured evidence: tests/latest-results.tap. These results do not validate the Supabase adapter/SQL.

## Supabase setup (live verification pending)
1. Create a project; keep email confirmation enabled and configure its Site URL.
2. Run supabase/migrations/001_baseline.sql once in a fresh project. This creates tables, private photos bucket, backend-only functions and denies direct anon/authenticated access.
3. Set APP_MODE=supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and SUPABASE_SERVICE_ROLE_KEY in the server environment. Never prefix a secret with VITE_ or put it in frontend code.
4. Register/confirm two test accounts and complete docs/testing.md before claiming acceptance.
5. Use HTTPS with COOKIE_SECURE=true. For containers set HOST=0.0.0.0; local default is 127.0.0.1. Docker scaffolding has not been executed here.

Browser requests are same-origin. Supabase authenticates passwords; a random HttpOnly SameSite=Strict application cookie maps to a hash in app_sessions. Logout deletes that app session, immediately rejecting copied cookies. Sessions last eight hours, then require fresh sign-in. This logout does not revoke other Supabase applications' sessions. Expired rows need periodic maintenance before sustained hosting.

Uploads validate/re-encode source bytes, write private storage, then publish metadata through a locked transaction with membership/count checks and server UTC time. Failed metadata commits remove the new object; failed removals record cleanup_queue. The cleanup retry worker/24-hour guarantee is pending. Media/list routes check membership each time and use no-store responses. Membership lifecycle is future US-04.

## FFmpeg feasibility

    pnpm spike

Creates 30 synthetic 720p photos and a synthetic tone; renders/decodes a 60-second H.264/AAC MP4 and verifies properties. Artifacts: spike-output/. Captured result: docs/spike-result.json. This is local feasibility only: Docker, selected host, five-host-run benchmark and peak memory remain pending. It does not complete US-10/11/12. worker/Dockerfile is a feasibility image, not a working job service.

## Evidence and review
- docs/architecture.md: actual components and decisions.
- docs/testing.md: plan, traceability and unverified checks.
- docs/backlog.md: all 12 P1 stories, original estimates.
- docs/iteration-review.md: planned/verified work and next steps.
- docs/demo.md: repeatable TA walkthrough.
- .github/workflows/ci.yml: automated local-mode tests/build; verify hosted run separately.

P1 responsibility assignments remain a plan, not completed-contribution evidence. This baseline is AI-assisted at the user's request; the user reports instructor permission. Teammates must review, explain and honestly record their own work before submission. No reviews, contributions or commit dates are fabricated.
