# GIB — App Store Resubmission Package

## App Review Notes

Get In Bitches (GIB) has been substantially revised since the prior Guideline 4.3(a) review.

The product is now centered on a differentiated group night-out coordination and safety workflow rather than a conventional standalone ride-request experience.

### What changed

The primary product flow is now:

**Crews → Night Out → Get Us Home → Home Safe**

- **Crews** — users create persistent private groups for the people they regularly go out with.
- **Night Out** — a Crew can plan an outing with timing, destination, participating members, and a transportation plan.
- **Get Us Home** — transportation is initiated from within the Night Out so the ride remains connected to the group context.
- **Home Safe** — participants remain visible through safety states such as Going, Riding, Dropped Off, and Home Safe. The outing remains a group-safety experience after transportation ends.

The navigation and visual hierarchy were also redesigned so Crews and the group-safety workflow are first-class product surfaces rather than presenting GIB primarily as a conventional ride-hailing app.

Existing ride functionality remains available as one component of the broader Night Out experience.

### Suggested reviewer path

1. Open **Crews**.
2. Open an existing Crew.
3. Open or create a **Night Out**.
4. Review the participating members and outing details.
5. Review the **Home Safe** participant status area.
6. Open **Get Us Home** from the Night Out.
7. Open the **Home Safe** tab to review the overall safety workflow.

### Key differentiation

GIB is designed around a private group staying coordinated through an entire night out. Transportation does not end the product experience; participant accounting continues until the group is accounted for through the Home Safe workflow.

This submission includes a new binary reflecting these functional and navigation changes.

---

## Final Screenshot Story

Recommended App Store ordering:

1. **Crews**
   - Establishes GIB as a group product immediately.
   - Show the Crew grid and the Crew / Night Out / Get Home / Home Safe flow.

2. **Crew Detail**
   - Show members and an upcoming Night Out.
   - Use only a clean frame without system notifications.

3. **Night Out**
   - Show destination, timing, transportation plan, and participant context.

4. **Home Safe**
   - Show participant accounting and Going / Riding / Dropped Off / Home Safe states.

5. **Get Us Home**
   - Show transportation embedded inside the Night Out flow.

6. **Home Safe / Safety**
   - Reinforce the full safety loop and "No Bitch Left Behind" product identity.

### Simulator build 21 candidates

Known strong frames from the qualified simulator run:

- Crews: `sample_07.png`
- Night Out overview: `sample_11.png`
- Home Safe participant accounting: `sample_14.png`
- Get Us Home: `sample_16.png` or `sample_17.png`
- Home Safe / Safety: `sample_19.png`

Do not use frames containing Apple Intelligence or other system notification banners.

---

## Before Submission

- Confirm the App Store release workflow produces a signed IPA.
- Confirm the uploaded build appears in App Store Connect.
- Confirm the build is the current GIB UI revision.
- Upload the final screenshot set in the differentiated story order above.
- Paste the App Review notes from this document.
- Confirm reviewer access/test credentials are current if required.
- Do not claim guaranteed approval or functionality that is not present in the submitted binary.
