# GIB — Apple 4.3 Crew Safety Differentiation

## Status

ACTIVE

Working branch:

`feat/4.3-crew-safety-differentiation`

Baseline:

`b837572`

## Why This Work Exists

GIB was rejected under App Store Review Guideline 4.3(a).

The rejected product experience centered primarily on a conventional ride-hailing loop:

Request Ride -> Driver Accepts -> Ride -> Complete -> Rate

Although GIB already has its own branding, audience, safety features, reporting, blocking, and visual identity, the core product experience can still appear conceptually similar to conventional ride-hailing applications.

This milestone changes the product itself rather than merely changing its appearance.

## Product Identity

GIB is not intended to be simply a conventional ride-hailing application with different branding.

The product centers on helping a private group of friends coordinate a night out and make sure the entire group gets home safely.

Core product loop:

Crews -> Night Out -> Get Us Home -> Home Safe

Existing ride functionality remains part of the product, but transportation becomes one component of a larger group-safety experience.

---

# 1. Crews

Users can create persistent private groups of people they regularly go out with.

Examples:

- The Girls
- Roommates
- Work Crew
- Scottsdale Night Crew

A Crew is the social/safety unit around which outings are organized.

Initial Crew functionality should support:

- creating a Crew
- viewing Crews
- viewing Crew members
- adding/inviting members through an appropriate initial mechanism
- selecting a Crew when planning a Night Out

The implementation should be designed so richer invitations and sharing can be added later without replacing the underlying Crew model.

---

# 2. Night Out

A Crew can create a planned outing.

A Night Out should represent more than a ride request.

Initial information may include:

- outing name
- Crew
- date/time
- destination or outing location
- approximate planned return time
- participating members
- transportation/return plan
- current outing state

Example:

Saturday Night

5 going out

Dinner -> Bar -> Home

Meet at 7:30 PM

Get Us Home around 12:30 AM

A Night Out becomes the parent context for the group's transportation and safety state.

---

# 3. Get Us Home

Transportation home should be presented as part of the Night Out rather than as an isolated conventional ride request.

The existing ride system should be preserved where practical.

The Night Out should be capable of associating transportation with the group and participating members.

The architecture should allow later expansion into:

- multiple drop-offs
- multiple pickups
- shared return plans
- preferred/trusted drivers
- outbound + return planning

Do not overbuild all future functionality during this milestone.

---

# 4. Home Safe

Home Safe is a signature GIB safety state.

A person's participation does not conceptually end merely because a vehicle marks a ride complete.

Participants should be capable of progressing through safety states such as:

Going
-> Riding
-> Dropped Off
-> Home Safe

The Night Out should provide a clear view of the status of participating members.

Example:

Ona    — Home Safe
Jess   — Home Safe
Emily  — En Route
Sarah  — Dropped Off

The outing is not considered fully accounted for until participating members have reached an appropriate final state or have explicitly left the outing.

This is a central product differentiator.

---

# 5. Navigation / Product Hierarchy

The application should no longer present its primary identity as only:

Home / Safety / Profile

The revised information architecture should make the Crew/Night Out experience prominent.

Exact tab names and screen organization can be refined during implementation, but the user should encounter the group-safety workflow as a first-class part of GIB.

The conventional ride request flow must not visually dominate the entire product identity.

---

# 6. Existing Ride System

Preserve working ride functionality unless modification is necessary for the new architecture.

Existing capabilities include:

- rider/driver roles
- ride requests
- driver online/offline state
- driver acceptance
- ride lifecycle
- maps
- completion
- ratings
- reports
- blocking

Do not rewrite stable functionality merely for novelty.

Integrate it into the new GIB product hierarchy.

---

# 7. Database Direction

The Supabase model will require first-class entities for concepts such as:

- crews
- crew_members
- night_outs
- night_out_participants

Relationships to existing rides should be explicit rather than encoded only in UI state.

Safety/member status must be persisted rather than existing only locally.

Database changes must use migrations.

Existing migrations must not be destructively rewritten.

RLS must remain enabled and appropriate policies must be created for new user-owned/private-group data.

---

# 8. Scope Discipline

This milestone should create a meaningful, reviewable product difference without becoming an uncontrolled rewrite.

Required focus:

1. Crews
2. Night Out
3. Get Us Home integration
4. Home Safe status
5. Revised product hierarchy/navigation
6. Supporting Supabase schema/RLS
7. Appropriate UI polish
8. App Store review/testability preparation

Potential later features are explicitly non-blocking:

- Guardian Mode
- automatic route anomaly detection
- venue partnerships
- event integrations
- automatic emergency escalation
- advanced ride splitting
- preferred driver pools
- sophisticated multi-vehicle orchestration

Do not delay this milestone to implement those.

---

# 9. Branding

Retain GIB's strong pink/black visual identity and personality.

Potential product language includes:

- Your Crew
- Who's Going?
- The Night
- Get Us There
- Get Us Home
- Home Safe
- No Bitch Left Behind

Use branded language intentionally without making important safety controls unclear.

---

# 10. Template / Project Cleanup

Remove avoidable template/starter residue where appropriate.

Known cleanup item:

`package.json` currently uses the package name:

`get-in-bitches-starter`

This should be replaced with an appropriate project package name.

Cleanup must not become an unnecessary dependency rewrite.

---

# 11. Quality Gates

Before this branch is eligible for merge:

- TypeScript check passes
- application launches
- existing authentication still works
- existing rider/driver functionality is not unintentionally broken
- Crew workflow works
- Night Out workflow works
- Home Safe state persists
- database migration is reviewable
- RLS protects private Crew/Night Out information
- no debug-only UI is unintentionally exposed
- worktree is clean after commit
- final changes are reviewed before merge

---

# 12. App Store Resubmission Goal

The revised binary should visibly and functionally demonstrate that GIB is a distinct group transportation and safety product.

Review notes should explain:

- what changed since the rejected build
- where Crews are located
- how to create/test a Night Out
- how Get Us Home relates to the outing
- how Home Safe works
- how the group-safety workflow differs from a conventional standalone ride request

Do not resubmit the previously rejected binary unchanged.

Do not claim that these changes guarantee App Store approval.

---

# Immediate Implementation Sequence

Phase A — Foundation
- establish this design contract
- clean project naming residue
- design/add Supabase Crew + Night Out schema
- define application types/data access

Phase B — Crews
- Crew list
- Crew creation
- Crew detail
- member representation

Phase C — Night Out
- creation flow
- participant selection
- outing detail/status

Phase D — Home Safe
- persisted participant safety states
- group status presentation
- final accounted-for state

Phase E — Ride Integration
- connect Get Us Home to existing ride functionality
- preserve existing driver/rider lifecycle

Phase F — Product Hierarchy
- revise navigation
- polish branded experience
- make new workflow prominent

Phase G — Acceptance
- TypeScript/build checks
- functional testing
- regression review
- App Store screenshot/review-note preparation

