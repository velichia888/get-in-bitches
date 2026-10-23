# GIB — Live API, Home Safe and Ride Integrity Findings
Date: October 23, 2026. Source-only fixes on `audit/gib-app-review-20261023`.

## Read-only live API results after Supabase restoration
- Supabase reported `ACTIVE_HEALTHY`.
- Migration history remains `0001_init`, `0002_crew_safety`, `0003_night_out_ride_visibility`. No 2026-10-23 candidate migration has been deployed.
- Read-only production counts: 5 Auth user records, 5 profiles, 6 Crews, 3 Night Outs, 3 Night Out participants. Counts are aggregates only; no identities or other row content were copied.
- Unauthenticated REST requests for Crew ids, Night Out ids and participant outing ids returned HTTP 200 with empty arrays, despite existing records. Private phone-column REST access was denied HTTP 401 (`42501`).
- Unauthenticated `get_my_private_profile` RPC returned HTTP 200 with empty array; `can_read_profile` returned `false` for a fictional UUID. Unauthorized `find_crew_invitee_by_phone` RPC rejected without credentials. These responses show internal authentication checks but also justify the already-prepared SQL privilege correction so those RPCs aren't executable by anonymous clients in the first place.
- These are anonymous read-only checks; they are not a substitute for two-account end-to-end RLS and App Store acceptance testing.

## Reproduced Home Safe integrity issue (before source-only fix)
The original permissive policy `night out creators update participants` allows a creator to modify another participant's `safety_status` to `home_safe`. A controlled PGlite PostgreSQL 17 reproduction confirmed this.

Proposed **not deployed** migration `20261023075907_restrict_home_safe_to_participant.sql` removes that permissive policy while retaining each participant's existing self-update policy. Verified in isolation: creator cannot update another person's safety state; each member can update their own, and all original Crew/Night Out tests pass.

## Reproduced ride integrity issues (before source-only fix)
With the original ride UPDATE policies in an isolated database:
- A `rider`-role account could claim an unclaimed ride by setting `driver_id` to its own user id and `status='matched'`.
- The request owner could change `fare_estimate` after request creation. Both behaviors reproduced with fictional users/ride rows.

Proposed **not deployed** migration `20261023080717_enforce_ride_lifecycle_authorization.sql` adds a BEFORE UPDATE guard:
- Request route/coordinates, owner, Night Out link, fare, and requested timestamp are immutable after creation for ordinary clients.
- A driver-role profile may claim a requested unclaimed ride, and only its assigned driver may start or complete it.
- The requesting rider may cancel before a ride begins; the assigned driver may also cancel a matched ride.
- Server timestamps replace untrusted matched/completed timestamps on permitted state changes.
- Administrative migration and service roles retain a supported bypass, not available to ordinary clients.

The app Ride screen now checks the response of its mutation: it displays an alert instead of redirecting to the rating screen after failed status changes. The cancel action is hidden for unrelated Crew viewers.

## Qualification and limitations
- Isolated PGlite PostgreSQL 17: source migrations 0001–0003 plus the three 2026-10-23 staged changes applied successfully. The harness omits `CREATE EXTENSION pgcrypto` only in its emulated test environment; it uses PostgreSQL 17's native `gen_random_uuid()` and does not modify source migrations to compensate.
- **45/45 behavioral assertions passed**, including Crew creation, Home Safe self-confirmation, anonymous RPC restrictions, fare immutability, rider-role claim denial, authorized driver claim/start/complete and legitimate ride cancel.
- Test suite at `tests/postgres/privilege-integration.cjs` runs in GitHub Actions; TypeScript and Expo iOS bundling also run.
- This is not an App Store signed IPA test, does not verify Supabase Realtime behavior, user identity/driver eligibility, actual geocoded routes, payments or dispatch, and does not authorize any production deployment.
- Current app `lib/ride-service.ts` still uses a fallback coordinate near Los Angeles if device location is unavailable and sets the destination coordinate to a fixed offset from the pickup instead of geocoding the entered destination. **This is a separate high-priority product-correctness and safety issue.** It must be replaced with actual address resolution and tested on device before treating transport/map/fare workflows as complete. Existing fare estimates are therefore not validated for real routes.
- Profile role is self-supplied rather than proof of approved/vetted driver identity. Role-level authorization prevents a rider-role account from using the driver transitions, but does not provide driver screening. Do not claim verified/professional drivers until that business/safety process exists.
- The older exposed screenshot demo password must be rotated through the proper Supabase Auth administration path; no credentials or user records were modified.

## Required before release
1. Test all staged SQL on full Supabase staging / production-equivalent PostgREST/Auth and run advisor checks.
2. Obtain explicit approval before deploying any production SQL.
3. Replace synthetic/fallback map coordinates and test actual pickup/destination handling without accepting false locations; add user confirmation where geocoding is ambiguous.
4. Rotate screenshot demo password and update Codemagic protected variables.
5. Complete physical iPhone tests with two or more genuine fictional role accounts, including error states, Ride and Home Safe statuses, reporting, blocking, deletion, and video evidence Apple requested.
6. Confirm Apple review status and coordinate any signed build/resubmission separately.
