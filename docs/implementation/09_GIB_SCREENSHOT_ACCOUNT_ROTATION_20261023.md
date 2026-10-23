# GIB screenshot-demo account retirement and replacement
Date: 2026-10-23. Status: **REPLACEMENT REQUIRED; OLD ACCOUNT NOT YET BANNED**.

## Identified account / risk
- The earlier `main` revision of `codemagic.yaml` embedded a screenshot-only demo user's email and password.
- The Supabase Auth account is confirmed to exist and have confirmed email. Identity is `gibscreenshot.demo@gmail.com`.
- The current candidate's `ios-simulator` workflow imports Codemagic environment group `ios_test`, rather than committing the password again.
- The previous plaintext password survives in public Git history. Editing or removing the old YAML line cannot revoke it; changing the credential is necessary.
- Automated password management was **not completed**: the connected Supabase plugin does not have an Auth-user password update tool, Codemagic is not connected, and direct automated sign-in/password change was blocked before execution. No credential or account settings were changed.

## Owner confirmed they do NOT control the old screenshot mailbox
- Do **not** send a password recovery link to `gibscreenshot.demo@gmail.com`. The inbox is not controlled by the owner.
- `codemagic.yaml` now refuses to run screenshot builds when the configured demo email is the retired address. The preflight does not print the email or password values.
- The old account is still present as of the last Supabase Auth check. **Source blocking does not deactivate that Supabase user**.

## Immediate action: ban compromised demo account (preserve data)
1. Open [GIB Supabase Authentication → Users](https://supabase.com/dashboard/project/xeyfdyzspspcmyrhqmnb/auth/users).
2. Search for `gibscreenshot.demo@gmail.com` and open **that exact user**, checking its email before taking any action.
3. In the user's panel under **Danger Zone**, use **Ban user** if available and choose a long duration/maximum supported. This is safer than deleting an account with foreign-key relationships because it preserves the Crew/Night Out demo data for review. **Do not ban any other user.**
4. Confirm the UI reports the account banned; this remains a manual step until recorded and verified. Banning blocks future sign-in/refresh, but existing stateless JWT access tokens may remain valid until expiration. Do not assume instant session invalidation.

## Replace with a dedicated, controlled test user
1. Choose a new email inbox you control. A Gmail plus-address alias (e.g. `yourname+gibdemo@gmail.com`) can work if your provider delivers those messages to you. Do not use another person's address.
2. In [Supabase Authentication → Users](https://supabase.com/dashboard/project/xeyfdyzspspcmyrhqmnb/auth/users), use **Add user → Send invitation** to invite the new email. Open the email yourself and set a unique random password in your password manager. Use no real personal transport, payment, or meeting details in the profile.
3. Sign into a development/TestFlight build with that account and confirm it is a **rider** role. Set up (using the UI, with entirely fictional details) a Crew named **GIB Screenshot Crew** and a Night Out named **Girls Night Out**.
4. The screenshot runner requires those exact seeded records owned by or accessible to the signed-in account. It never creates Crew/Night Out records itself. Without seed data, it will report `SEED ERROR` even if login works.
5. In [Codemagic](https://codemagic.io/) for GIB, under environment group **ios_test**, set `EXPO_PUBLIC_DEMO_EMAIL` to the replacement address and `EXPO_PUBLIC_DEMO_PASSWORD` to the new password, stored as protected variables. Remove the old address and credential. Do not put either in committed YAML or chat.
6. Trigger **only** the `ios-simulator` workflow on the qualified branch after verifying the new account, and confirm six screenshot stages without logging secrets. The `ios-app-store` workflow must not import `ios_test`.

Supabase added **Ban user** to the Auth Users details panel Danger Zone in its [October 2024 Dashboard changelog](https://supabase.com/changelog/29710-dashboard-updates-23-09-24-07-10-24). If the current UI wording differs, use the user detail panel's ban control; do not substitute raw writes into the `auth` schema.

## Evidence to capture without secrets
- Old test account ban confirmed: **PENDING OWNER ACTION**.
- Replacement account invited, verified, seeded: **PENDING**; Codemagic `ios_test` updated: **PENDING**.
- Simulator screenshot test pass on refreshed credentials: pending.
- Build does not print credential variables or include screenshot-only secrets in a signed distribution: source-audit and binary checks still required.

References:
- https://supabase.com/docs/guides/auth/users
- https://docs.codemagic.io/yaml-basic-configuration/configuring-environment-variables/
