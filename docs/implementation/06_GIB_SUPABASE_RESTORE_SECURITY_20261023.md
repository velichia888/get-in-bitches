# GIB Supabase Restoration / Security Baseline — October 23, 2026

## Verified without changing production data
- Project: **Get In Bitches**, `xeyfdyzspspcmyrhqmnb`.
- Restoration was explicitly approved and requested. Project status moved from `INACTIVE` through `COMING_UP` to `ACTIVE_HEALTHY`.
- Live Supabase migration history lists `0001_init`, `0002_crew_safety`, `0003_night_out_ride_visibility`. All three files also exist in candidate source.
- Crew, crew_members, night_outs, night_out_participants, rides, reports and blocks exist. All inspected public application tables have RLS enabled; live policies were listed in catalog queries.
- Column-level permissions: `public.profiles.phone` has **no SELECT grant** for either `anon` or `authenticated`; non-sensitive columns have authenticated column grants.
- `delete-account` Edge Function is deployed at version 3. It has platform `verify_jwt: false`, but its code independently checks a bearer token with `auth.getUser(token)` and only deletes that token's user. Its login/delete behavior has not been functionally tested after restore.

## Security advisor findings requiring follow-up
Live Supabase security advisor returned:
- `function_search_path_mutable`: 3 trigger helpers (`set_updated_at`, `set_participant_status_updated_at`, `protect_participant_identity`) have no pinned search path.
- `anon_security_definer_function_executable`: 5 callable privileged public functions, including two trigger-only functions and three legitimate per-user helpers.
- `authenticated_security_definer_function_executable`: the same 5. Three (`can_read_profile`, `find_crew_invitee_by_phone`, `get_my_private_profile`) are intended authenticated API/policy helpers and must retain required access.
- `auth_leaked_password_protection`: disabled. Enable via Supabase Auth configuration if supported by the project; no Auth settings were changed.

Read-only inspection of `pg_proc` and function ACLs **confirmed** that `anon` holds direct EXECUTE grants for the five public SECURITY DEFINER functions despite earlier `revoke ... from public` lines in source. No exploitation was demonstrated; the three per-user functions check `auth.uid()` or membership, and trigger-only functions cannot be called as normal functions successfully. Nevertheless, excess RPC permissions increase risk and should be narrowed.

Remediation reference:
- Supabase docs: https://supabase.com/docs/guides/database/functions
- Supabase security advisor: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- Supabase Auth leaked-password protection: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Proposed, NOT deployed
Migration generated using `supabase migration new tighten_gib_rpc_privileges` and staged at:
`supabase/migrations/20261023074008_tighten_gib_rpc_privileges.sql`

It proposes:
1. Revoke public/anon/authenticated direct EXECUTE from trigger-only privileged functions `add_crew_owner_as_member` and `handle_new_user`.
2. Revoke anon/public grants on the three necessary user-authenticated SECURITY DEFINER RPCs, retaining authenticated EXECUTE.
3. Revoke direct public/anon/authenticated execution of three ordinary trigger helpers.
4. Pin the search path for the three mutable-search-path functions to an empty path.

It deliberately does **not** rewrite original migrations, blindly revoke all function privileges, change table RLS, clear application records, or change the live Auth/Edge Function configuration.

## Required tests before any deployment
- Review exact source and migration ordering; use a disposable Supabase/PostgreSQL test database (never users' production data).
- Verify owner creation trigger, profile creation trigger, timestamps and immutable participant identity continue to work after privilege revocation.
- Verify anonymous callers cannot call `can_read_profile`, `find_crew_invitee_by_phone` or `get_my_private_profile`.
- Verify authenticated users **can** use those helpers and cannot retrieve anyone else's phone or private Crew membership.
- Confirm two-user Crew invitation, Night Out creation and Home Safe status change pass.
- Re-run Supabase security advisor and compare warnings.
- Coordinate approved deploy and rollback; users must approve production migration separately.

## Scope / remaining caveats
- This audit checked SQL metadata, not real end-to-end access as two authenticated test accounts.
- GIB's old screenshot-demo password remains in public Git history even though current Codemagic branch no longer embeds it. Rotate/revoke the disposable account credential before another simulator run; no credentials were accessed or changed during this review.
- Supabase performance advisor also reports index and auth-RLS plan optimizations. Those are distinct performance tasks and not immediate App Store release proof.
- No production SQL writes or user-data reads were performed by this audit.

## Isolated migration/behavior qualification — October 23
- The complete `0001`, `0002`, `0003` and proposed `20261023074008` SQL migrations were applied to a clean **PGlite PostgreSQL 17** test database. Only `CREATE EXTENSION pgcrypto` was omitted *in the isolated harness*, because it is unavailable in PGlite; PostgreSQL 17 provides `gen_random_uuid()` natively. Repository migrations were not modified to accommodate the test.
- The harness recreates the observed Supabase-style direct function `EXECUTE` grants for `anon` and `authenticated`, with disposable fake authentication/users. It then tests the permission changes, not just string matching.
- **31/31 isolated behavioral assertions PASSED**, including anonymous/authenticated RPC privilege differences, login/profile triggers, post-hardening Crew creation and automatic owner membership, invitation lookup, two-member Night Out creation, updated-at trigger, member Home Safe update, rejection of participant identity change, and denial of another Crew's private data/status mutation.
- Repeatable test sources are `tests/postgres/privilege-integration.cjs`, `tests/postgres/package.json`, and a pinned lockfile. The audit-branch `.github/workflows/gib-source-qualification.yml` runs the PostgreSQL integration test before the iOS bundle step.
- **Limitations:** This is an emulated/isolated PostgreSQL environment, not Supabase's full managed Auth, PostgREST, realtime, Edge Functions or a physical iPhone. It is not proof that the pending migration has been applied to production or that multi-device runtime acceptance is complete. No production migration has been deployed.
