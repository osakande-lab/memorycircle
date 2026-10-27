# Initial architecture
Expo SDK 58 / React Native / TypeScript / Expo Router.

Home (src/app/index.tsx) -> Create (create-memory.tsx) -> Memory detail (memory/[id].tsx).
All metadata writes go through repository.ts -> memory-repository.ts -> AsyncStorage.
Photo copying uses photo-store.native.ts (Expo FileSystem app documents) or photo-store.web.ts (durable data URI). Both implement the same injected PhotoStore interface.
Detail screen combines saved memory + collage selection + timer state + Expo DocumentPicker and platform audio controls (Expo Audio on native, HTML audio on web). Reel timing is in memory; audio selection is session-only. It is not video encoding.

The storage queue serializes writes within ONE application runtime. A saved list is published only after photo persistence succeeds. Failed operations attempt cleanup; corrupted JSON is surfaced rather than silently reset. Legacy records without photos/layout are supported. There is no cross-process transaction/database or account-based authorization. App-local storage must not be described as authenticated private group sharing.

Preserved: friend's screens, colors, navigation, native photo picker, collage layouts and audio/reel concept.
Improved: shared validation/storage, guarded save button, ordered copy/rollback, web photo persistence, read errors, local photo limits, non-nested reel controls, accurate Photo Reel label, playback cleanup and inherited SDK type fixes.

Platform adapters need native-device validation; automated repository tests inject storage/files and do not simulate every OS permission, filesystem or audio behavior.

Unused large Expo starter artwork is retained in the original ZIP but omitted from the review package. The existing adaptive foreground is reused as the fallback icon; memory screens and their styling are preserved.
