# Updated backlog - 27 October 2026
P1 baseline: 47 points, 12 stories. Original priority, estimates and relative order retained. No story is Done: P1 requires acceptance/NFR checks and teammate review. In Progress includes local code ready for review but missing live verification.

| Order / ID | Story | Priority | Points | Status | Evidence / remaining work |
|---|---|---|---:|---|---|
| 1 US-01 | Account access | Blocker | 3 | In Progress | Local register/login/logout tested; Supabase confirmation/session acceptance and review pending. |
| 2 US-02 | Create private group | Blocker | 3 | In Progress | Local persisted group/owner and validation pass; SQL supplied, live checks/review pending. |
| 3 US-03 | Invite/join | Critical | 5 | To Do | Expiry/revoke, duplicate join and eight-member concurrency not built. |
| 4 US-06 | Upload photos | Critical | 5 | In Progress | Local image/limits/cap/failure tests pass; live Storage/RPC concurrency and compensation pending. |
| 5 US-08 | Monthly timeline | Critical | 3 | In Progress | Supporting month listing/empty state/private media; shared-member/browser checks pending. |
| 6 US-04 | Leave/remove member | Critical | 5 | To Do | Revocation, cancellation, 24-hour deletion/retry pending. |
| 7 US-07 | Manage own photos | Critical | 3 | To Do | Caption editing, deletion and recap invalidation pending. |
| 8 US-10 | Automatic recap | Critical | 8 | To Do | Local spike only. Scheduler, filtering, durable jobs and publication guards pending. |
| 9 US-11 | Manual recap/status | Critical | 5 | To Do | Generate/status/retry and active-job uniqueness pending. |
| 10 US-12 | Private recap delivery | Critical | 3 | To Do | Player/download, duration and ownership checks pending. |
| 11 US-09 | Select music | Major | 2 | To Do | Licensed catalogue, preview/preferences/default pending. |
| 12 US-05 | Posting schedule | Major | 2 | To Do | Creation schedule only. Owner updates and contribution indicator pending. |

SP-01 is a separate spike: partially verified locally. Thirty synthetic images render/decode; Docker, intended host, peak memory and host decision pending. Do not count this as US-10 or claim the eight-team-hour budget was measured.
Changes: added selected-month photo listing to make US-06 reviewable, without completing US-08. Added explicit local mode because no Supabase project/host exists. Prioritize provisioning/live checks and teammate review before expanding scope. No velocity or estimate change is justified yet.
