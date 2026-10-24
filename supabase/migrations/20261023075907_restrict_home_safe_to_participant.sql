-- GIB Home Safe: each participant must confirm her own safety status.
--
-- The original "night out creators update participants" policy allowed
-- an outing creator to UPDATE another member's safety_status, including
-- marking that other person home_safe without her confirmation.
--
-- The original "participants update their own safety status" UPDATE
-- policy remains. It limits row updates to profile_id = auth.uid()
-- and to members of the Night Out's Crew. The identity-protection
-- trigger continues to reject changes to profile_id / night_out_id.
--
-- Outing creators still have separate INSERT / DELETE permissions for
-- managing attendance. This migration does not change these behaviors,
-- existing participant rows, or existing user safety statuses.
--
-- This is staged for isolated qualification, NOT production deployment.
drop policy if exists "night out creators update participants"
  on public.night_out_participants;
