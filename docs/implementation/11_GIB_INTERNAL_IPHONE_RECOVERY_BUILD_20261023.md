# GIB — Install recovery build via internal TestFlight
Date: October 23, 2026
Status: **BUILD WORKFLOW READY TO LAUNCH MANUALLY; NO IPA BUILT OR UPLOADED YET**

## Situation
The owner added `getinbitches:///reset-password` to Supabase Authentication → Redirect URLs, but does **not** have GIB installed on the iPhone. The live Supabase Site URL still points to `http://localhost:3000`, a broken default for Dashboard invitations. The already-confirmed replacement user and fictional screenshot Crew/Night Out must be retained; the retired legacy demo account is banned.

The source recovery route at `app/reset-password.tsx` is in draft branch `audit/gib-app-review-20261023`, not in the previously distributed GIB binary.

## Separate internal-only build workflow
`codemagic.yaml` includes a **new** manual workflow:

- ID: `ios-recovery-internal`
- Display name: `Get In Bitches - Internal Recovery TestFlight`
- Source branch: `audit/gib-app-review-20261023` (review exact commit before launching)
- Existing Apple Distribution signing certificate/provisioning profile and bundle `com.getinbitches.app`
- Uses `xcode-project use-profiles --custom-export-options='{"testFlightInternalTestingOnly": true}'`, then validates the export plist contains the internal-only flag
- Builds signed iOS IPA; `publishing.app_store_connect.auth: integration` **uploads** the signed IPA to Apple's App Store Connect when manually run
- `submit_to_testflight: false` and `submit_to_app_store: false`: never automatically submits to external TestFlight beta review or App Store review
- Does not import screenshot-only Codemagic `ios_test` secrets; screenshot account passwords must not enter an app-distribution build
- Runs TypeScript and 20 source tests before signing; existing regular `ios-app-store` workflow is unchanged

This is a real connected upload to App Store Connect, **not a local-only build**. Running it consumes Codemagic build resources; it must be initiated deliberately by an authorized project owner. Adding this YAML does not start it.

## Owner installation steps
1. Log into [Codemagic](https://codemagic.io/) and select **Get In Bitches**. Choose **Start new build**, pick branch `audit/gib-app-review-20261023`, and workflow **Get In Bitches - Internal Recovery TestFlight**. Start it manually.
2. Confirm the build uploads a signed IPA successfully to App Store Connect. Do not select the old `ios-app-store` workflow or the `ios-simulator` screenshot workflow; neither is needed for this installation.
3. In [App Store Connect](https://appstoreconnect.apple.com/), open **Get In Bitches** → **TestFlight**. Once Apple processes the new build, find it under iOS builds. Check that it is marked **Internal**.
4. Under **Internal Testing**, create/select a private internal tester group. Add the processed build and invite the Apple Account you use on your iPhone, which must be an eligible App Store Connect internal tester. This is not an external TestFlight group; external beta review is not intended.
5. On the iPhone, install Apple's **TestFlight** app and accept the internal testing invitation. Install the exact new GIB build containing `app/reset-password.tsx`.
6. Open GIB → **Sign In** → **Forgot password or accepted an invitation?** → type the replacement screenshot account email you control → request a password link. Open the email on the same iPhone with GIB installed. The link should invoke `getinbitches:///reset-password` and permit choosing a new password. Save it only in a password manager.
7. Verify a fresh email-and-password sign-in on GIB. Never send the password, recovery URL, OTP or tokens in chat.
8. Only after password login is proven, set replacement `EXPO_PUBLIC_DEMO_EMAIL` and `EXPO_PUBLIC_DEMO_PASSWORD` in Codemagic's separate screenshot-only protected `ios_test` group. Do not add these to `ios-recovery-internal` or `ios-app-store`. Run the screenshot simulator separately when ready.

## Limits / outstanding acceptance
- The GitHub Actions checks validate JS/TS, source safety, Expo iOS bundling and isolated PostgreSQL regressions; they cannot prove Apple certificate validity, Mac archive/export, App Store Connect upload, Apple processing, actual TestFlight installation or live deep-link/password-reset handling.
- Supabase Redirect URL configuration was reported done by the owner, but was not independently inspected; confirm exact spelling if a reset redirects to localhost or errors.
- Supabase's default Site URL is still not a valid production callback URL for non-explicit redirects. This manual recovery flow uses an **explicit** native-app redirect instead.
- Internal TestFlight testers must belong to App Store Connect; if unavailable, authorized development/ad-hoc signing with a registered device is an alternative but requires different signing and installation setup.
- Don't deploy drafted database security migrations, merge draft PR #1, distribute externally, or submit for App Store review as part of this recovery installation.
- Note that Codemagic's app store uploading integration uploads the artifact even when `submit_to_testflight: false`; that flag prevents automatic TestFlight beta review, not binary upload.

## Sources
- [Codemagic App Store Connect publishing](https://docs.codemagic.io/yaml-publishing/app-store-connect/)
- [Codemagic iOS signing](https://docs.codemagic.io/yaml-code-signing/signing-ios/)
- [Apple: Add internal testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/)
- [Apple: Add testers to builds](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-testers-to-builds)
