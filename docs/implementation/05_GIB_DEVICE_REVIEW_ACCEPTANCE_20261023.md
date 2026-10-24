# GIB — Physical-Device Acceptance and Apple Guideline 2.1 Evidence Plan
Created: 2026-10-23
Status: **Not yet performed**. This document is an execution checklist, not a claim of passing tests.

## Why this is required
Apple's original Guideline 2.1 communication explicitly requested:
1. A single physical-device screen recording on the latest iOS showing launch and typical usage, registration/login/deletion, reporting and blocking, and any paid functionality actually offered;
2. Product purpose and target audience;
3. Setup steps, navigation instructions and working reviewer/demo credentials;
4. External services and tools used by the app;
5. Regional differences or an accurate consistency statement;
6. Any applicable rights/authorization material if relevant.

That request must not be answered with simulator screenshots alone. Prior 4.3/4.2.6 correspondence also requests compelling evidence of **original functional differentiation** rather than a merely restyled ride-request app.

## Recording environment
- Use a supported physical iPhone running the latest supported iOS, with a safe screen-recording arrangement and no real addresses, phone numbers, routes, IDs or messages on camera.
- Use dedicated, freshly created and isolated fictional rider/driver test accounts and at least two unrelated Crew member accounts. Avoid identifiable personal data. Provide any necessary demo credentials *privately* in App Store Connect review notes, **never in GitHub**.
- Do not claim demo account sign-in or Crew operations work until the Supabase project is ACTIVE_HEALTHY and its deployed schema/migrations are qualified.
- The old screenshot-demo password appeared in public history. Rotate the disposable screenshot user password, update the secured Codemagic `ios_test` group, and check whether that old account can still sign in. Do not reuse the historical password in any sample account.
- Capture app version, build number, git commit, iPhone model and iOS version in a separate private testing log.

## Physical-device test route (record results individually)
- [ ] Launch branded GIB app from iPhone home screen; show no splash-only or placeholder experience.
- [ ] Register fictional User A, accept terms, complete account profile; sign out and sign in again. Record actual flows without displaying credentials.
- [ ] Create a private Crew under User A and confirm it persists through relaunch.
- [ ] From fictional User B, join through intended invite path; verify nonmembers cannot view private Crew/Night Out data.
- [ ] Create a Night Out, set an upcoming schedule/destination, select Crew participants, and verify it persists after reopening the app.
- [ ] Confirm participant safety states, including Going, Riding, Dropped Off, Home Safe; test that one member's actions cannot impersonate a different member. Capture what changes appear on both devices.
- [ ] Tap **Get Us Home** from the Night Out; demonstrate relation between the outing and a ride. Confirm whether driver account can accept/advance a test ride; do not fake a pickup, guarantee a vehicle, or make a real transport booking.
- [ ] Show normal ride actions, map/location permissions with mock locations, cancellations/error states, and ride status linking back to the Night Out.
- [ ] Confirm Home Safe remains a separate group accounting flow after a ride completes. Do not claim automatic arrival verification or emergency dispatch if not implemented.
- [ ] Show in-app report and block against fictional User B, verify success and UI behavior, then optionally unblock.
- [ ] Show Profile → Delete Account on a **throwaway** test account only; verify deletion outcome independently, including that the account can no longer sign in. Do not delete existing user accounts.
- [ ] Confirm correct privacy/terms/support links, accessibility, empty/loading/error states, background/relaunch, limited connectivity, and a clear app icon.
- [ ] Confirm whether any paid content exists. If none, state explicitly in Apple notes that no paid features/IAP are implemented; do not invent a purchase flow.

## Recommended recording storyline
Record from launch through sign-in, Crews, creating/entering a Night Out, participant statuses, Get Us Home, the linked ride, return to Home Safe, Safety report/block, and demonstration of account deletion. Registration may be captured in a short separate recording if the same account would need to be deleted. Avoid exposing real personal information or secrets. Ensure the recording clearly distinguishes a **demo status update** from live location tracking.

## Release and reviewer handoff
- [ ] Record pass/fail per step, including screenshots/video references and any issues fixed.
- [x] Read-only verification of live migration history `0001`–`0003`, all four Crew-related tables and enabled RLS after restoration (not a replacement for functional negative-access tests).
- [ ] Run two-user negative RLS checks on an isolated test environment (a team member must not access another private Crew or mutate another's Home Safe status).
- [ ] Verify correct deployed Edge Function for account deletion, and explicitly test on fictional accounts.
- [ ] Supply reviewer setup instructions for both rider and driver roles, including fake Crew invitation/setup and realistic test vehicle/driver status. If functionality is unavailable in some regions, disclose actual limits.
- [ ] Write a concise list of external services actually used (Expo/React Native, Supabase Auth/Database/Edge Functions, map/location services used in this build, Codemagic build tooling). Do not claim actual payment services if not present.
- [ ] Confirm the App Store Connect review status and Apple's latest question before sending more correspondence.
- [ ] Do not upload another signed IPA or change live schema until this acceptance has passed and release approval is given.

## Engineering verification already completed
- TypeScript `tsc --noEmit`: passed in clean isolated checkout.
- `npx expo export --platform ios`: successful Hermes bundle (not an installable IPA).
- Five source-contract tests: passed.
- GitHub Actions nondeploying source-qualification workflow: passed on audit branch.
- Live Supabase restored to **ACTIVE_HEALTHY**; migrations `0001`–`0003` and Crew-related RLS were verified read-only. The security advisor produced findings documented in `06_GIB_SUPABASE_RESTORE_SECURITY_20261023.md`. End-to-end testing has not passed yet.
