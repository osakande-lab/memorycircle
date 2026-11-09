# P3 shared circles | TA walkthrough

Start the shared-circle server from the repository root using the README. Open
the printed localhost address in a regular and a private window. Use fresh
test usernames and the synthetic photos in `demo-assets/`.

1. Register and sign in as the owner. Create a daily circle and show the owner
   label. Create an invitation, copy it, and register/sign in as a second user
   in the private window. Paste the invitation link and join.
2. Upload `demo-assets/photo-1.jpg` as the second user with a caption. Show the
   photo and contribution indicator, then refresh the month in the owner
   window. Select an earlier month to show the empty timeline and switch back.
3. Change the posting schedule to weekly as owner. Refresh as the second user
   and show the updated schedule.
4. Copy the uploaded image address and open it in the second window while the
   member still has access. In the owner window, remove the second user and
   show that their photo disappears. Refresh the image address in the second
   window to demonstrate access denial. Refresh its circle list. The tests
   also verify voluntary departure and that another circle stays intact.
5. Revoke the invitation and try it again in the second window. Show sign-out
   and reference the tests for seven-day expiry, eight-member concurrency,
   invalid images, quota, and storage failure. Demonstrate the P2 Expo app
   separately if asked.

## Design and evidence

Browser forms and the JSON API share a loopback origin. The Node server stores
salted scrypt password hashes and expiring session and invitation token hashes.
It checks membership for timeline and photo reads and ownership for invitation,
schedule and removal actions. Pillow checks the actual JPEG/PNG data and pixel
limit. SQLite transactions enforce join and monthly upload quotas, and commit
photo bytes and metadata together. The membership foreign key cascades photo
deletion in the same transaction as departure. The app uses server UTC for the
timeline, monthly quotas and daily/weekly contribution periods.

`node --test tests/circles.test.mjs` runs the five P3 HTTP integration tests
against real server instances. `npm test` also runs the 24 P2 tests. The
storage-failure case deliberately raises a SQLite error, checks the HTTP 500
and verifies that no photo is published. The error in the log is expected.

The P3 implementation uses local accounts and SQLite rather than the P1
Supabase and object-storage plan. The Expo personal-memory app retains device
storage and does not sync to shared circles. The P3 web flow is for a
same-machine lab demonstration. Production hosting, native integration,
recap generation, recap cleanup and private MP4 delivery remain future work.
