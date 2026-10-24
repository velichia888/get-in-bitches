# GIB — Recovery Redirect & Account Password Setup
Prepared October 23, 2026
Status: source-only implementation verified; native-device and live Supabase redirect acceptance **pending**.

## Confirmed root cause
- GIB Supabase project's Authentication > URL Configuration > **Site URL** is currently `http://localhost:3000` (owner-confirmed).
- Supabase sent a Dashboard invitation to the replacement screenshot user. Auth recorded a confirmed email and sign-in but redirected the user to localhost, which does not have a working GIB account page. The invitation cannot be relied upon to complete password setup.
- The replacement account and its fictional `GIB Screenshot Crew` / `Girls Night Out` are preserved. Do **not** invite a duplicate user or ban/delete this replacement.
- The previous compromised demo account remains banned.

## Source implementation staged in draft PR
- Existing Expo `app.json` registers URL scheme `getinbitches`.
- New `lib/password-recovery.ts` recognizes only a `getinbitches:///reset-password` recovery callback; it refuses other protocols/paths and extracts recovery/invite tokens or PKCE authorization codes without printing them.
- New root route `app/reset-password.tsx` permits recovery even when signed out. It requests a reset email via `supabase.auth.resetPasswordForEmail(email, { redirectTo })`, handles the callback using Supabase Auth, then asks the user to set and confirm a 12-character-or-longer password using `auth.updateUser`. The page signs out upon success and returns to the sign-in screen.
- A **Forgot password or accepted an invitation?** link now appears on the GIB sign-in screen.
- No reset password, recovery URL, authentication token or service-role key was added to GitHub. App Store release and Codemagic credentials were not changed.

## Required Supabase configuration, after a native GIB test build is installed
1. In [GIB URL Configuration](https://supabase.com/dashboard/project/xeyfdyzspspcmyrhqmnb/auth/url-configuration), under **Redirect URLs** add this exact value:
   `getinbitches:///reset-password`
2. This should be an **additional allowed redirect**, not a replacement Site URL. The explicit `redirectTo` option on the recovery request chooses this target.
3. The **Site URL** remains an outstanding project configuration issue for Dashboard-created invitations: `http://localhost:3000` is not a working production URL. Replace it with a real, verified HTTPS site *when one exists and implements auth callbacks*, or design a dedicated default mobile callback after confirming all supported auth flows. **Do not use a made-up domain or assume a custom scheme is a valid public web page.**
4. The GIB native app build with this source must be **installed on the same phone where the reset email is opened**; otherwise the custom scheme cannot launch GIB. An Expo JavaScript bundle alone is not installable and cannot complete this acceptance.
5. Open GIB → Sign In → Forgot password → enter the invited email → request a link. Follow the latest link on that phone, choose a new unique password, save it in a password manager, then sign back in. Never share a recovery URL, token, or password in chat or logs.
6. Only after password-based sign-in works, update protected Codemagic `ios_test` variables `EXPO_PUBLIC_DEMO_EMAIL` and `EXPO_PUBLIC_DEMO_PASSWORD` and validate the six screenshot tour stages. The `ios-app-store` workflow must never import `ios_test`.

## Verification so far
- Native-link parser tests: 4/4 passed using fake token strings, including unrecognized domain/path rejection.
- Combined source tests: 19/19 passed.
- TypeScript `tsc --noEmit`: passed.
- `npx expo export --platform ios`: passed, produced a JS bundle (not IPA).
- Live Supabase Redirect URL configuration, device handling, reset email delivery and password update: **NOT TESTED / NOT CHANGED**.
- The old `localhost:3000` Site URL is not fixed by merely adding source code. Only a working installed app plus allowed explicit redirect completes the proposed recovery route.

References:
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/native-mobile-deep-linking
- https://supabase.com/docs/guides/auth/passwords
- https://docs.expo.dev/linking/into-your-app/
