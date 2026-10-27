# P2 requirements and updated backlog
The implementation supplied by the team is an Expo/React Native local-memory prototype. This replaces the earlier separate Express prototype as the P2 implementation. P1 remains the long-term product scope; its private-group/backend/video acceptance criteria are not silently redefined as local storage or a slideshow.

## P2 working stories (refined iteration scope)
P2-M01: As a user, I can create and reopen a memory, so I can keep its title/story on my device.
AC1: A nonblank title <=80 characters and story <=2000 characters are trimmed, saved with ID/date, shown newest first and restored on reopen.
AC2: Blank/overlong input creates no record; read/write errors do not report success or replace corrupted data.
P2-M02: As a user, I can attach photos, so I can keep images with a memory.
AC1: Up to ten JPEG/PNG photos can be selected, previewed and saved in selection order; native copies live in app documents, web uses durable data URIs.
AC2: Reject unsupported format, >10 MB, >20 MP, >10 per memory, or a local-device UTC monthly total above 30.
AC3: Failed copying or metadata storage creates no completed memory and attempts to remove copied files; cleanup failure is surfaced.
P2-M03: As a user, I can change a memory's collage, so I can choose its presentation.
AC1: Classic, Grid and Scrapbook change the photo arrangement.
AC2: The choice persists; title/story/photos remain unchanged; a failed save restores the previous UI choice.
P2-M04: As a user, I can play a photo reel and selected audio, so I can revisit a memory.
AC1: Reel starts from photo 1, advances every 2.5 seconds and loops; Stop Reel stops playback.
AC2: User chooses an audio file, plays/stops it, and navigation pauses playback. The app does not export an MP4.

These are local-device acceptance criteria. Their tests do not prove identity, group access, server decoding/security, multi-device concurrency or recap generation.

## Status of the revised P2 increment
| Story | Local/web baseline status |
|---|---|
| P2-M01 Create and reopen a memory | Done - tested and accepted in team review |
| P2-M02 Attach and persist photos | Done for web/local baseline - native device rehearsal remains |
| P2-M03 Persist collage preference | Done - tested and accepted in team review |
| P2-M04 Photo reel and audio | Done for web/local baseline - native device rehearsal remains |

These statuses do not mark the larger P1 group/cloud/video stories complete. Team acceptance is recorded in docs/team-review.md.

## Original P1 backlog (47 points retained)
| ID | Story | Priority | Points | Current status |
|---|---|---|---:|---|
| US-01 | Account access | Blocker | 3 | To Do: no authentication. |
| US-02 | Private group creation | Blocker | 3 | To Do: circle card is a future-feature message. |
| US-03 | Invite/join | Critical | 5 | To Do. |
| US-06 | Photo uploads | Critical | 5 | In Progress: local photo selection/storage/limits; group uploads and server rules pending. |
| US-08 | Monthly group timeline | Critical | 3 | In Progress: local recent-memory list; shared/month-filtered timeline pending. |
| US-04 | Leave/remove member | Critical | 5 | To Do. |
| US-07 | Manage own photos | Critical | 3 | To Do: no edit/delete workflow. |
| US-10 | Automatic recap | Critical | 8 | To Do: photo slideshow is not an automatic rendered recap. |
| US-11 | Manual recap/status | Critical | 5 | To Do: no queued jobs/retries. |
| US-12 | Private recap delivery | Critical | 3 | To Do: no MP4/private download. |
| US-09 | Select music | Major | 2 | In Progress: local audio picker/player; licensed catalogue and saved preference pending. |
| US-05 | Posting schedule | Major | 2 | To Do. |

P2-M01 to M04 track the revised local increment and are not added to the original 47-point total. No P1 story is marked Done from these partial features. Next priority is account/group architecture and a migration path from local records to shared storage. The switch from P1's React/Express/Supabase plan to Expo/AsyncStorage is recorded as a significant iteration adjustment; the original group/cloud requirements remain visible as later work.
