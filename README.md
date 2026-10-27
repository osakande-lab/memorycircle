# MemoryCircle - Team FrameFour P2
Expo/React Native implementation based on the team's supplied MemoryCircle app.
Team: Oluwatolayomi Akande, Daniel Seriki, Nimo Usman, Franklin Uba.
Repository: https://github.com/osakande-lab/memorycircle
Review branch: p2-mobile-baseline

## Features
Create/persist/reopen local memories with title/story/photos, choose Classic/Grid/Scrapbook, play a looping photo reel and choose/play/stop local audio. Local only: no accounts, real shared circles, invitations, server upload, automated MP4 generation or video download.

## Setup and checks
Prerequisites: Node.js 24 with npm.

    npm ci
    npm test
    npm run typecheck
    npm run lint
    npm run build:web
    npm run web

npm run web starts Expo's web development server; open the address printed in the terminal. For native use npm start, then use a compatible SDK 58 Expo client/development build. Native permissions/media behavior must be rehearsed on the actual device. No backend keys are needed.

The project uses npm and the committed package-lock.json for reproducible installation. Do not run reset-project: it is a starter reset command, not needed for this demo.

## Demo data
Use demo-assets/photo-1.jpg to photo-3.jpg and demo-assets/demo-tone.mp3. They are synthetic, not personal media or third-party music. Create a memory with all three photos. Reopen it, switch collage layout, start/stop reel and choose/play/stop audio. Reload/reopen to show saved text/photos/layout. Audio selection and current reel position are not persisted.

## Storage
Metadata key: memorycircle_memories in AsyncStorage. Native photos: app document directory / memorycircle-photos. Web photos are data URIs stored with metadata so blob URLs do not disappear on reload. Browser storage quota may limit photo capacity before the 30-photo device cap; failure is reported without publishing an incomplete record. Native photo copies are not encrypted cloud/group storage.

Validation: title 80, story 2000 characters; <=10 JPEG/PNG photos per memory, <=10 MB/20 MP per image, <=30 photos per local device per UTC month. Picker metadata and native file/browser blob checks support the prototype. There is no server-side decoding or per-member/group monthly enforcement.

## Evidence
24 repository tests cover acceptance behavior, concurrent local saves, corrupted/legacy data, limits, rollback, layouts and reel index. These tests inject storage/photo adapters; native filesystem/audio/permissions require device checks. See docs/acceptance-and-backlog.md and docs/architecture.md. Complete report and TA guide are in docs/.

## Scope change and contributions
P1 planned React/Express/Supabase private groups and automated recaps. The team's supplied app instead establishes an Expo local-memory workflow. The report explicitly records the change and leaves unimplemented original stories pending. Team responsibilities are recorded on the user's confirmation that all members completed their roles; Git history is not fabricated or backdated. Preserve the original ZIP as the source snapshot.
