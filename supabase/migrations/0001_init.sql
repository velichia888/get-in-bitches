-- Get In Bitches v1 schema: profiles, driver status, rides, ratings,
-- reports, and blocks. Reports/blocks exist specifically because ratings
-- are user-generated content, per Apple Guideline 2.1's requirement that
-- UGC features ship with reporting and blocking.

create extension if not exists pgcrypto;

create type user_role as enum ('rider', 'driver');
create type ride_status as enum ('requested', 'matched', 'in_progress', 'completed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role user_role not null default 'rider',
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.driver_status (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  is_online boolean not null default false,
  vehicle_make text,
  vehicle_model text,
  vehicle_plate text,
  current_lat double precision,
  current_lng double precision,
  rating_avg numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.rides (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.profiles(id) on delete cascade,
  driver_id uuid references public.profiles(id) on delete set null,
  pickup_lat double precision not null,
  pickup_lng double precision not null,
  pickup_address text not null,
  dropoff_lat double precision not null,
  dropoff_lng double precision not null,
  dropoff_address text not null,
  status ride_status not null default 'requested',
  fare_estimate numeric(10,2),
  requested_at timestamptz not null default now(),
  matched_at timestamptz,
  completed_at timestamptz
);

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  rater_id uuid not null references public.profiles(id) on delete cascade,
  ratee_id uuid not null references public.profiles(id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (ride_id, rater_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  ride_id uuid references public.rides(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id)
);

-- Auto-create a profile row when someone signs up, so the client never
-- has to race its own insert against a brand-new, not-yet-authenticated
-- session.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security

alter table public.profiles enable row level security;
alter table public.driver_status enable row level security;
alter table public.rides enable row level security;
alter table public.ratings enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;

create policy "profiles are readable by authenticated users"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "users manage their own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "driver status readable by authenticated users"
  on public.driver_status for select
  using (auth.role() = 'authenticated');

create policy "drivers manage their own status"
  on public.driver_status for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- Riders see their own rides; a matched driver sees the ride they're on;
-- any authenticated driver can see open, unclaimed requests so they can
-- accept one.
create policy "rides visible to participants and open requests"
  on public.rides for select
  using (
    auth.uid() = rider_id
    or auth.uid() = driver_id
    or (status = 'requested' and driver_id is null)
  );

create policy "riders create their own ride requests"
  on public.rides for insert
  with check (auth.uid() = rider_id);

-- Two update policies, OR'd together by Postgres RLS: the rider can
-- update their own ride (e.g. cancel), and any driver can claim an open
-- request. Concurrent claim attempts are serialized by normal Postgres
-- row locking on the UPDATE - the WHERE clause is re-checked after the
-- first writer commits, so only one UPDATE ever actually matches a given
-- ride, with no extra RPC/function required.
create policy "riders update their own rides"
  on public.rides for update
  using (auth.uid() = rider_id)
  with check (auth.uid() = rider_id);

create policy "drivers claim open requests or update their matched ride"
  on public.rides for update
  using ((status = 'requested' and driver_id is null) or auth.uid() = driver_id)
  with check (driver_id = auth.uid());

create policy "ratings readable by participants"
  on public.ratings for select
  using (auth.uid() = rater_id or auth.uid() = ratee_id);

create policy "ride participants can rate each other after completion"
  on public.ratings for insert
  with check (
    auth.uid() = rater_id
    and ratee_id <> auth.uid()
    and exists (
      select 1 from public.rides r
      where r.id = ride_id
        and r.status = 'completed'
        and (r.rider_id = auth.uid() or r.driver_id = auth.uid())
        and (ratee_id = r.rider_id or ratee_id = r.driver_id)
    )
  );

create policy "users create their own reports"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

create policy "users read their own reports"
  on public.reports for select
  using (auth.uid() = reporter_id);

create policy "users manage their own blocks"
  on public.blocks for all
  using (auth.uid() = blocker_id)
  with check (auth.uid() = blocker_id);

-- Realtime: tables aren't broadcast by default - the app subscribes to
-- ride status changes (open requests for online drivers, live status
-- updates for a rider's active ride), so rides has to be added
-- explicitly.
alter publication supabase_realtime add table public.rides;
