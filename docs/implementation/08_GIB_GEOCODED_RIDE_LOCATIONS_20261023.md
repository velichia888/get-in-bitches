# GIB — Geocoded Ride Location Acceptance Checkpoint

Date: October 23, 2026
Status: Source-qualified, **not validated on a physical device** and **not deployed**.
Branch: `audit/gib-app-review-20261023` / draft PR #1.

## Prior incorrect behavior
The previous `lib/ride-service.ts` used GPS if available but silently defaulted pickup to Los Angeles-area coordinates (`34.05, -118.24`) if permissions or positioning failed. It always set the destination to pickup latitude/longitude +0.03, instead of resolving the entered destination. It then calculated a "fare estimate" from straight-line distance between two invented points.

That behavior produced a misleading map and price estimate, potentially unsafe for a transportation workflow.

## Proposed changes
- New `lib/ride-locations.ts`: resolves the **typed pickup and destination** sequentially through the existing native `expo-location` geocoder, on-device.
- Rejects empty inputs, zero matches, multiple geocoder matches, non-finite/out-of-range coordinates, matching pickup/drop-off points, permission denial on Android, and geocoding failures. There is **no GPS fallback** and no fabricated coordinate.
- New `components/RideLocationPreview.tsx`: presents both points on the actual app map with their typed addresses. Users must confirm pins match their intended points or return to edit. This previews two markers; it **does not claim a road route, ETA, guaranteed accuracy, driver assignment, or fare quote**.
- Both standalone Home ride request and `Crews → Night Out → Get Us Home` call the same resolver and require confirmation before saving. Editing inputs clears the preview.
- `createRideRequest` now requires a matching resolved-location object and persists the confirmed coordinates. The `fare_estimate` field is set to `null` because no routing service or travel-distance-based fare calculation is currently implemented.
- Existing Night Out linkage is retained for Crew rides; all old ride records remain unchanged.

## Tests already run on isolated source checkout
- `npm ci`: succeeded.
- `tsc --noEmit`: succeeded.
- `npx expo export --platform ios`: succeeded; builds an iOS JS bundle only, **not a signed IPA**.
- `node --test tests/ride-location.test.cjs`: 6/6 passed.
- Combined previous 8 source-contract tests and the new 6 location tests: 14/14 passed.
- Existing isolated database migration regression suite: 45/45 passed previously, and remains included in the audit-branch GitHub qualification workflow.
- Current GitHub Actions workflow includes the new tests; verify latest run status before claiming GitHub is green.

## Remaining acceptance / limitations
1. Native `Location.geocodeAsync` provides coordinates, not a reliable standardized matching address or road route. A single returned match can still be wrong. The user is expected to visually check the map pins and edit ambiguous addresses. **Physical iPhone verification is required**.
2. No real route geometry, turn-by-turn navigation, actual road mileage, dynamic pricing, booking/payment guarantee or professional-driver verification exists. Do **not** relabel this as a finished commercial ride-hailing platform.
3. Confirm iOS and Android geocoding behavior with address cases across several cities, weak signal/offline conditions, permission states, and partial/street-level locations. Android native geocoding requires foreground permission; iOS typed addresses do not require current GPS.
4. Ensure the two-pin preview remains visible and confirmation works on actual iPhones with limited display height; confirm destination coordinates reflect the user's entered destination. Exercise the Crew-linked request and rider/driver lifecycle under distinct fictional accounts.
5. Consider a full routing/geocoder API with address suggestions and confidence thresholds for higher-quality transportation matching before general release. This source change intentionally does not claim road travel times, fares, or exact landmark resolution.
6. Rotate the old public screenshot-demo password and verify full Supabase staging, native device tests, and Apple's App Review status.
7. **Do not merge, deploy the three prepared production database migrations, upload a signed binary, or resubmit to Apple without coordinated release approval.**

References: Expo Location documentation for geocodeAsync, Android permission requirement, and geocoder rate-limit guidance: https://docs.expo.dev/versions/latest/sdk/location/
