-- GIB Phase E3
-- Allow members of a Night Out's Crew to read rides associated with that
-- Night Out.
--
-- This is SELECT-only visibility. It does not grant Crew members permission
-- to claim, cancel, start, complete, or otherwise mutate another person's
-- ride. Existing ride UPDATE/INSERT policies remain authoritative.

create policy "night out crew members can read associated rides"
  on public.rides
  for select
  using (
    night_out_id is not null
    and private.is_night_out_crew_member(night_out_id)
  );
