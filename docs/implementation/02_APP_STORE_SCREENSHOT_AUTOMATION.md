# GIB — App Store Screenshot Automation

## Purpose

Prepare the differentiated Get In Bitches product for App Store
resubmission after the Guideline 4.3(a) rejection.

The screenshot set must communicate that GIB is a group night-out
transportation and safety product, not merely a conventional standalone
ride-request application.

Primary product story:

Crews -> Night Out -> Get Us Home -> Home Safe

This work is screenshot/review preparation only. It must not change the
normal production experience or expand product scope.

---

## Existing Infrastructure

The repository already contains:

- `codemagic.yaml`
- an `ios-app-store` signed IPA workflow
- an `ios-simulator` screenshot workflow
- `components/TestAutomationRunner.tsx`

The existing App Store build/signing workflow is retained.

The existing screenshot tour is obsolete because it emphasizes:

1. standalone Rider home
2. Safety
3. Profile
4. Driver mode

That ordering reflects the older generic rideshare hierarchy and should
not be used for the differentiated App Store presentation.

---

## Security Cleanup

The current Codemagic YAML contains literal screenshot-demo credentials.

Remove literal values for:

- `EXPO_PUBLIC_DEMO_EMAIL`
- `EXPO_PUBLIC_DEMO_PASSWORD`

Do not replace them with other literal credentials.

The screenshot workflow must receive these values from Codemagic secure
environment configuration.

Do not print either credential.

Do not change the production Supabase URL/project as part of this task.

The Supabase publishable/anon key is not treated as a user password or
service-role secret, but no privileged Supabase credential may be added.

The previously committed demo password should be considered exposed and
rotated separately before future screenshot runs.

---

## Screenshot Automation Boundary

`TestAutomationRunner` remains strictly gated behind:

`EXPO_PUBLIC_IOS_TEST_AUTOMATION=1`

The real `ios-app-store` workflow must not set this value.

Therefore the automation remains inert in the shipped App Store binary.

Do not add screenshot-only behavior to ordinary production execution.

---

## Data Strategy

Do not create disposable production records on every screenshot run.

Do not request a real ride merely to produce screenshots.

Do not change participant Home Safe state merely to produce screenshots.

Do not switch the screenshot account into Driver mode.

Use a pre-seeded screenshot/demo account with a pre-seeded Crew and
Night Out.

The automation should discover the seeded records using deterministic
demo names supplied through screenshot-only environment variables rather
than hardcoded UUIDs.

Preferred variables:

- `EXPO_PUBLIC_DEMO_CREW_NAME`
- `EXPO_PUBLIC_DEMO_NIGHT_OUT_NAME`

Initial intended seed names:

- Crew: `GIB Screenshot Crew`
- Night Out: `Girls Night Out`

If the required seeded data cannot be found, automation must fail
visibly in its debug/status state rather than creating substitute data.

---

## Required Screenshot Story

### Stage 1 — Crews

Navigate to the Crews surface.

Purpose:
Immediately establish GIB as a group product.

The screen should visibly communicate:

- Who's coming out?
- Crew
- Night Out
- Get Us Home
- Home Safe
- seeded demo Crew

### Stage 2 — Crew

Open the seeded Crew.

Purpose:
Show the persistent people/group context.

The screen should show:

- Crew identity
- members
- Night Outs
- seeded Night Out

### Stage 3 — Night Out

Open the seeded Night Out.

Purpose:
Show the shared outing context.

The screen should show as much as naturally fits of:

- Night Out identity
- destination
- timing
- participants
- transportation plan
- accounting/safety context

### Stage 4 — Home Safe

Remain on the Night Out dashboard but capture the portion/state that
best demonstrates:

- Going
- Riding
- Dropped Off
- Home Safe
- participant accounting
- "Everybody stays visible until they're Home Safe."

If the current screen naturally presents Stage 3 and Stage 4 together,
the CI capture sequence may use separate timing/scroll positioning only
if reliable. Do not mutate safety state solely for screenshots.

### Stage 5 — Get Us Home

Navigate to the Night Out's Get Us Home surface.

Purpose:
Show that transportation is embedded in the outing.

The screen should communicate:

- YOUR NIGHT OUT
- pickup
- dropoff
- Request Crew Ride
- ride remains connected to the Night Out / Crew safety context

Do not submit the ride.

### Stage 6 — Safety

Navigate to Safety.

Purpose:
Reinforce the overall differentiated safety model.

The screen should communicate:

- NO BITCH LEFT BEHIND
- Start with your Crew
- Plan the Night Out
- Get Us Home
- Everyone Home Safe

### Optional Stage 7 — Standalone Ride

Standalone Ride may be captured as supporting material, but it must not
lead the App Store screenshot set.

---

## Automation Implementation

Update `components/TestAutomationRunner.tsx`.

Required behavior:

1. Exit immediately unless screenshot automation is enabled.
2. Read demo email/password from environment.
3. Validate required screenshot environment values.
4. Sign into the seeded demo account.
5. Ensure the account is in Rider role only if required for normal
   navigation; avoid unnecessary writes.
6. Resolve the seeded Crew by:
   - authenticated user's Crew memberships
   - exact configured demo Crew name
7. Resolve the seeded Night Out within that Crew by exact configured
   demo Night Out name.
8. Navigate deterministically through the required screenshot stages.
9. Preserve a visible debug/status mode when
   `EXPO_PUBLIC_IOS_TEST_DEBUG_BANNER=1`.
10. Never expose the password in status text or logs.
11. Never create a ride.
12. Never change safety status.
13. Never enable Driver availability.
14. Fail visibly if expected seed records are missing.

Prefer existing Crew/data-layer helpers when practical rather than
duplicating database behavior.

---

## Codemagic Screenshot Workflow

Update only the screenshot workflow as necessary.

Keep:

- iOS Simulator release build
- standalone simulator application
- screenshot artifact collection
- existing App Store workflow
- existing signing behavior

Remove literal demo credentials.

Reference secure environment variables instead.

Add non-secret screenshot identifiers if useful:

- `EXPO_PUBLIC_DEMO_CREW_NAME: "GIB Screenshot Crew"`
- `EXPO_PUBLIC_DEMO_NIGHT_OUT_NAME: "Girls Night Out"`

The screenshot workflow must continue to be independent of the signed
App Store build workflow.

---

## Capture Strategy

The existing fixed-interval sampling approach may be retained initially
if it is the most reliable mechanism.

However, update timing/comments/stage expectations for the new six-stage
tour.

The resulting artifact set must contain distinguishable frames from the
new differentiated product journey rather than repeated/frozen frames.

Debug-banner captures may be used for qualification.

Final App Store screenshots must use:

`EXPO_PUBLIC_IOS_TEST_DEBUG_BANNER=0`

---

## Production Safety

This task must NOT:

- modify Supabase schema
- add a migration
- create production Crew/Night Out records automatically
- create ride records
- change participant safety state
- alter rider/driver production behavior
- change App Store signing
- submit a build
- submit to TestFlight
- submit to App Store
- expose privileged credentials

---

## Acceptance

Before commit:

- `git diff --check` passes
- `npx tsc --noEmit` passes
- no literal demo password remains in tracked source
- no literal demo email remains in tracked source
- screenshot runner remains automation-gated
- App Store workflow remains automation-free
- screenshot tour begins with Crews
- tour includes Crew
- tour includes Night Out
- tour includes Get Us Home
- tour includes Safety
- no ride creation exists in screenshot runner
- no safety-state mutation exists in screenshot runner
- no Driver-online mutation exists in screenshot runner
- worktree contains only intended G3.4 changes

A later qualification step will run the Codemagic simulator workflow
against deliberately seeded screenshot data.

---

## Credential Follow-Up

The old screenshot-demo password was committed in repository source.

After source cleanup:

1. rotate the screenshot account password
2. store the replacement in Codemagic secure environment configuration
3. store the screenshot email there as well
4. do not commit either value back into the repository

This credential operation is intentionally separate from source
implementation.
