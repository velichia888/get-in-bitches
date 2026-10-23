# GIB screenshot-demo credential rotation — action and verification
Date: 2026-10-23. Status: **NOT ROTATED**.

## Identified account / risk
- The earlier `main` revision of `codemagic.yaml` embedded a screenshot-only demo user's email and password.
- The Supabase Auth account is confirmed to exist and have confirmed email. Identity is `gibscreenshot.demo@gmail.com`.
- The current candidate's `ios-simulator` workflow imports Codemagic environment group `ios_test`, rather than committing the password again.
- The previous plaintext password survives in public Git history. Editing or removing the old YAML line cannot revoke it; changing the credential is necessary.
- Automated password management was **not completed**: the connected Supabase plugin does not have an Auth-user password update tool, Codemagic is not connected, and direct automated sign-in/password change was blocked before execution. No credential or account settings were changed.

## Safe owner action
1. Open the project's [Supabase Auth Users page](https://supabase.com/dashboard/project/xeyfdyzspspcmyrhqmnb/auth/users).
2. Find `gibscreenshot.demo@gmail.com`. Use its action menu to send/reset the password **only if you control that mailbox**. Follow the recovery email to choose a unique password, saving it directly to a password manager. Do not paste passwords, OTPs, recovery URLs or session tokens in GitHub or this chat.
3. If you do **not** control that Gmail mailbox, avoid sending a reset to an unknown party. Instead, create a new clearly named, disposable test account using an inbox you control, move the screenshot workflow to that new account, and revoke/disable the old compromised account using an approved Supabase Auth administration method. Do not delete real users or production records.
4. Open [Codemagic](https://codemagic.io/) → Get In Bitches application → **Environment variables** → group `ios_test`. Replace the **Secret** value of `EXPO_PUBLIC_DEMO_PASSWORD`; confirm `EXPO_PUBLIC_DEMO_EMAIL` points to the account you just secured. Application-scoped secrets are preferable to globally shared groups.
5. Never put either value into `codemagic.yaml`, a GitHub comment, CI logs or issue text. The `EXPO_PUBLIC_` variables are compiled into the **screenshot simulator binary**, so that build is only for disposable test users with fictional data and must never be shipped to App Store/TestFlight. The release workflow must not import `ios_test`.
6. After saving, run only the `ios-simulator` screenshot build on the qualified branch and confirm automated sign-in works. The old password should fail if verified using an authorized private channel; do not paste either password into a visible chat message.

## Evidence to capture without secrets
- Supabase account credential changed or old account disabled: pending.
- Codemagic `ios_test` updated: pending.
- Simulator screenshot test pass on refreshed credentials: pending.
- Build does not print credential variables or include screenshot-only secrets in a signed distribution: source-audit and binary checks still required.

References:
- https://supabase.com/docs/guides/auth/passwords
- https://docs.codemagic.io/yaml-basic-configuration/configuring-environment-variables/
