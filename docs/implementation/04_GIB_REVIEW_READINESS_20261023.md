# Get In Bitches (GIB) — iOS App Review Readiness Checkpoint
Audit date: 2026-10-23 (Arizona)
Source: `feat/ui-option-b` at commit `e1c10c6b10bba66098d6aca614fcc444fc4892f0`
Audit branch: `audit/gib-app-review-20261023`

## Apple review history
- Previous reviewer feedback cited Guideline 4.3(a) and later 4.3(a)/(b) and 4.2.6, comparing the original GIB submission to common ride-request or templated apps.
- Build 47 was reported submitted to Apple for iOS review on 2026-10-09; the owner submitted a detailed nine-answer reconsideration reply on October 16. This audit has **not** verified the latest live App Store Connect review status or whether Apple has answered that reply.
- Do not resubmit an unchanged/rejected binary, repeat the October 17 explanation as though new, or claim Apple has accepted the latest improvements without explicit review evidence.
- The standalone product's distinctive loop is **Crews → Night Out → Get Us Home → Home Safe**. It coordinates known members of a private group across a night out, associated transport, dropoff and the final Home Safe state. It should never be represented merely as a conventional one-off ride request.

## Source and CI status
- GitHub default branch `main` was `b83757247fab6614ce650724d8bbfb262e6d1d50` during audit; the `feat/ui-option-b` release candidate is **24 commits ahead of main**, not merged.
- `feat/4.3-crew-safety-differentiation` is a separate older line 16 commits ahead of main. Do not mass-merge both or overwrite the later `feat/ui-option-b` interface.
- Candidate contains all six major Crew/Night Out/Get Home/Safety routes, RLS migration `0002_crew_safety.sql`, and supplementary `0003_night_out_ride_visibility.sql`.
- Running `npm ci --no-audit --no-fund --ignore-scripts` on an isolated homeserver checkout succeeded; `./node_modules/.bin/tsc --noEmit --pretty false` passed.
- `npx expo export --platform ios --output-dir /tmp/gib-ios-export-20261023` completed successfully, including a 3.8 MB Hermes iOS JS bundle. This is **not** an Apple-signed IPA, and bundling does not prove iPhone or backend operation.
- Added `tests/release-contract.test.cjs`; five Node source-contract tests passed in the isolated checkout.
- Added a non-deploying `.github/workflows/gib-source-qualification.yml` to repeat npm, TypeScript, source checks, and iOS JS bundling on this audit branch. Its current-run result should be inspected separately.

## Critical backend finding — do not publish
- Connected Supabase project **Get In Bitches** (`xeyfdyzspspcmyrhqmnb`) reported **INACTIVE** on October 23. Read-only table and migration listing failed with database connection timeouts. This means **live data/RLS/API functionality cannot currently be accepted as operational**.
- The source contains RLS declarations for crews, crew_members, night_outs and night_out_participants plus functions used by Crew invitations and private profile reads. Source-level presence does not establish that migrations `0002` and `0003` were applied to production.
- Ask the owner before restoring/reactivating the production Supabase project or running any migration. Once active, verify current schema/migration history, storage, project security advisors, RLS negative access tests, and sample Crew/Night Out flow using fake data. Never apply migrations blind just to get the app through review.
- If the app is still in App Store review, avoid changing operational behavior without a rollback plan and understanding the effect on existing users.

## Security / testing
- The earlier `main` version of `codemagic.yaml` committed plaintext screenshot demo account credentials. **Never copy or display the previous password.** The later `feat/ui-option-b` candidate instead imports Codemagic group `ios_test` for the screenshot simulator and avoids hardcoded demo sign-in credentials.
- Since the earlier demo credential is in public Git history, changing the YAML alone does NOT revoke it. Rotate that disposable demo account password once the Supabase project is reachable; verify no real account reused it. The screenshot workflow must be configured with the new protected secret in Codemagic. A protected variable will still be bundled into a simulator app for test automation; use only a disposable, fake-data test account.
- App Store release workflow has `submit_to_testflight: false` and `submit_to_app_store: false`; that prevents automatic submission from this workflow, but uploading to App Store Connect still requires explicit release authorization.
- Preserve existing Supabase data and deployed Edge Functions. Do not deploy unqualified RLS or grant public select for private profile information.

## Gates before asking Apple for reconsideration or resubmitting
1. Check the current **Get In Bitches** App Store Connect review status and any reply to the October 16 answer. Record Apple submission/build IDs.
2. Restore/check project only with permission, then verify deployed schema, authentication, scoped RLS, and functions. Confirm that frontend data calls return correct members/status without exposing phone details.
3. Test with 2+ distinct fictional participants: Crew create/invite, Night Out creation/participant selection, Ride association and Get Us Home, independent safety status transitions, and Home Safe completion, plus deleted/blocked user handling.
4. Validate actual iPhone behavior: permissions and location prompts, authentication, offline/reconnect, status re-open/persistence, deep links, app icon, accessibility, and crash monitoring.
5. Qualify Codemagic simulator screenshots, signed IPA provenance (branch SHA, build number, App Store Connect submission), and exact feature availability in that binary. Remove any debug tour/credentials from production build.
6. If Apple responds adversely to current reconsideration, identify whether a new binary with substantial improvements is appropriate; if no update, do not send repetitive responses.
7. Only merge to main/publish signed builds/deploy migration or Edge Functions after qualified review and explicit approval.

## Boundaries
This audit creates source tests and CI/docs only. It has not restored Supabase, read personal production rows, edited Apple/Codemagic setup, deployed schema, merged branches or submitted any app.
