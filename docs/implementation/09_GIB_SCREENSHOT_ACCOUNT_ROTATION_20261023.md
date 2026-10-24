# GIB screenshot-demo account retirement and replacement
Date: 2026-10-23. Status: **OLD ACCOUNT BANNED; NEW TEST ACCOUNT VERIFIED AND DEMO DATA SEEDED; CODEMAGIC SECRETS PENDING**.

## Identified account / risk
- The earlier `main` revision of `codemagic.yaml` embedded a screenshot-only demo user's email and password.
- The Supabase Auth account is confirmed to exist and have confirmed email. Identity is `gibscreenshot.demo@gmail.com`.
- The current candidate's `ios-simulator` workflow imports Codemagic environment group `ios_test`, rather than committing the password again.
- The previous plaintext password survives in public Git history. Editing or removing the old YAML line cannot revoke it; changing the credential is necessary.
- Automated password management was **not completed**: the connected Supabase plugin does not have an Auth-user password update tool, Codemagic is not connected, and direct automated sign-in/password change was blocked before execution. No credential or account settings were changed.

## Owner confirmed they do NOT control the old screenshot mailbox
- Do **not** send a password recovery link to `gibscreenshot.demo@gmail.com`. The inbox is not controlled by the owner.
- `codemagic.yaml` now refuses to run screenshot builds when the configured demo email is the retired address. The preflight does not print the email or password values.
- The old account remains present but is **now banned in Supabase Auth**. Source blocking and Auth ban are both in place.

## Completed: ban compromised demo account (preserve data)
1. Open [GIB Supabase Authentication → Users](https://supabase.com/dashboard/project/xeyfdyzspspcmyrhqmnb/auth/users).
2. Search for `gibscreenshot.demo@gmail.com` and open **that exact user**, checking its email before taking any action.
3. In the user's panel under **Danger Zone**, use **Ban user** if available and choose a long duration/maximum supported. This is safer than deleting an account with foreign-key relationships because it preserves the Crew/Night Out demo data for review. **Do not ban any other user.**
4. **Verified October 23, 2026 by read-only Supabase query:** exactly one user matched the retired email; its `banned_until` value is **2029-07-19 08:44:53 UTC** and `banned_until > now()` was true. The owner chose a 1000-day ban. This blocks future sign-ins/refresh, but existing stateless JWT access tokens may remain valid until expiration. Do not assume instant session invalidation.

## Completed: accepted invitation and seeded a new account
- On October 23, 2026, the owner confirmed the new invitation was accepted.
- Read-only Auth inspection found one newly invited account created October 24 at 03:38 UTC, with confirmed email, successful sign-in, `rider` profile role and zero existing Crew memberships. Its actual email and password are **not stored** in this document.
- In one atomic transaction, a separate fictional `GIB Screenshot Crew` was created with that replacement account as owner. The existing on-crew-created trigger added its owner membership.
- `Girls Night Out` was seeded inside that new Crew with a fictional demo venue and transport description, a planned Halloween-night schedule, and only the owner's own participant row with status `going`. **No ride, payment, or real destination** was created.
- A read-only post-write verification confirmed exactly one replacement Crew, one owner membership, one Night Out, one Going participant, zero rides for the new account, and the old account still banned.
- This is application seed data only; **no migrations, RLS permissions, Edge Functions, or Auth password settings changed**.

## Remaining owner action: set Codemagic protected test credentials
1. Open [Codemagic](https://codemagic.io/) for Get In Bitches → Environment variables → group `ios_test`.
2. Set `EXPO_PUBLIC_DEMO_EMAIL` to the **newly invited email you control** and `EXPO_PUBLIC_DEMO_PASSWORD` to the unique password you set when accepting its invitation. **Mark both secret** and remove any retired values.
3. Leave `EXPO_PUBLIC_DEMO_CREW_NAME=GIB Screenshot Crew` and `EXPO_PUBLIC_DEMO_NIGHT_OUT_NAME=Girls Night Out` as configured in the simulator workflow.
4. Do not paste either credential in GitHub, chat, build logs, or committed YAML. These variables are compiled into a **screenshot-only simulator binary** and must never be included in the App Store build.
5. When protected variables are saved, qualify the `ios-simulator` workflow on the release-audit branch. Confirm all screenshot stages, account login, and absence of `CONFIG ERROR` / `SEED ERROR` before using any screenshots.
6. Keep `ios-app-store` signing/upload and live backend deployments disabled until separately authorized.

Supabase added **Ban user** to the Auth Users details panel Danger Zone in its [October 2024 Dashboard changelog](https://supabase.com/changelog/29710-dashboard-updates-23-09-24-07-10-24). If the current UI wording differs, use the user detail panel's ban control; do not substitute raw writes into the `auth` schema.

## Evidence to capture without secrets
- Old test account ban: **VERIFIED ACTIVE through 2029-07-19 08:44:53 UTC**.
- Replacement account accepted and fictional Crew/Night Out seeded: **VERIFIED**. Codemagic `ios_test` updated: **PENDING OWNER ACTION**.
- Simulator screenshot test pass on refreshed credentials: pending.
- Build does not print credential variables or include screenshot-only secrets in a signed distribution: source-audit and binary checks still required.

References:
- https://supabase.com/docs/guides/auth/users
- https://docs.codemagic.io/yaml-basic-configuration/configuring-environment-variables/
