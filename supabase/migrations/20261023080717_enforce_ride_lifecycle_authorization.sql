-- GIB ride integrity: reject unauthorized field edits and status changes.
-- SOURCE ONLY, NOT DEPLOYED. Requires isolated and iPhone acceptance.
--
-- Existing permissive UPDATE policies allowed the request owner to change
-- arbitrary request fields (including fare_estimate) and a rider-role user
-- to claim a ride by writing driver_id = auth.uid().
--
-- This trigger enforces a narrow write contract in addition to existing RLS:
-- * the originating rider can cancel a requested/matched ride;
-- * a driver-role account can claim a requested/unclaimed ride;
-- * the assigned driver can start/complete, or cancel a matched ride;
-- * only the server may set matched_at/completed_at;
-- * ride ID, owner, route, quoted estimate, initial time, and outing link
--   remain immutable after creation.
--
-- It does not establish professional driver verification or paid dispatch.
create or replace function public.enforce_ride_lifecycle_authorization()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  actor_is_driver boolean := false;
begin
  -- Administrative migrations / backend service role retain direct access.
  if current_user in ('postgres','service_role') then
    return new;
  end if;

  if actor is null then
    raise exception 'Signed-in account required for ride changes'
      using errcode = '42501';
  end if;

  if row(new.id, new.rider_id, new.pickup_lat, new.pickup_lng,
         new.pickup_address, new.dropoff_lat, new.dropoff_lng,
         new.dropoff_address, new.fare_estimate, new.requested_at,
         new.night_out_id)
     is distinct from
     row(old.id, old.rider_id, old.pickup_lat, old.pickup_lng,
         old.pickup_address, old.dropoff_lat, old.dropoff_lng,
         old.dropoff_address, old.fare_estimate, old.requested_at,
         old.night_out_id) then
    raise exception 'Cannot modify an existing ride request''s route, fare, or owner'
      using errcode = '42501';
  end if;

  select exists (
    select 1 from public.profiles p
    where p.id = actor and p.role = 'driver'
  ) into actor_is_driver;

  -- Requested → matched, by a driver-role account only.
  if old.status = 'requested' and old.driver_id is null
     and new.status = 'matched' and new.driver_id = actor
     and actor_is_driver
     and new.completed_at is not distinct from old.completed_at then
    new.matched_at := now();
    return new;
  end if;

  -- Assigned driver controls the two lifecycle transitions.
  if actor = old.driver_id and actor_is_driver
     and new.driver_id is not distinct from old.driver_id
     and new.matched_at is not distinct from old.matched_at then
    if old.status = 'matched' and new.status = 'in_progress'
       and new.completed_at is not distinct from old.completed_at then
      return new;
    end if;
    if old.status = 'in_progress' and new.status = 'completed' then
      new.completed_at := now();
      return new;
    end if;
  end if;

  -- The originating rider may cancel before the ride begins. The assigned
  -- driver may also cancel a matched ride. Neither may rewrite timestamps.
  if new.status = 'cancelled' and old.status in ('requested','matched')
     and (actor = old.rider_id or
          (actor = old.driver_id and actor_is_driver))
     and new.driver_id is not distinct from old.driver_id
     and new.matched_at is not distinct from old.matched_at
     and new.completed_at is not distinct from old.completed_at then
    return new;
  end if;

  raise exception 'Ride state change is not permitted for this account'
    using errcode = '42501';
end;
$$;

revoke execute on function public.enforce_ride_lifecycle_authorization()
  from public, anon, authenticated;

create trigger rides_lifecycle_authorization_guard
  before update on public.rides
  for each row
  execute function public.enforce_ride_lifecycle_authorization();
