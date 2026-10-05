-- GIB Crew Safety Experience
--
-- Adds the persistent group-safety model used by:
--
-- Crews -> Night Out -> Get Us Home -> Home Safe
--
-- Existing ride-hailing tables remain intact. A ride may optionally belong
-- to a Night Out so transportation becomes part of the larger group-safety
-- experience rather than replacing the existing ride lifecycle.

create type crew_member_role as enum (
  'owner',
  'member'
);

create type night_out_status as enum (
  'planned',
  'active',
  'getting_home',
  'completed',
  'cancelled'
);

create type participant_safety_status as enum (
  'going',
  'riding',
  'dropped_off',
  'home_safe',
  'left_outing'
);


-- ============================================================
-- CREWS
-- ============================================================

create table public.crews (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table public.crew_members (
  crew_id uuid not null references public.crews(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role crew_member_role not null default 'member',
  joined_at timestamptz not null default now(),

  primary key (crew_id, profile_id)
);


-- ============================================================
-- NIGHT OUTS
-- ============================================================

create table public.night_outs (
  id uuid primary key default gen_random_uuid(),

  crew_id uuid not null references public.crews(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,

  name text not null check (char_length(trim(name)) between 1 and 120),

  destination_name text,

  starts_at timestamptz,
  planned_return_at timestamptz,

  transportation_plan text,

  status night_out_status not null default 'planned',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    planned_return_at is null
    or starts_at is null
    or planned_return_at >= starts_at
  )
);


create table public.night_out_participants (
  night_out_id uuid not null
    references public.night_outs(id) on delete cascade,

  profile_id uuid not null
    references public.profiles(id) on delete cascade,

  safety_status participant_safety_status not null default 'going',

  status_updated_at timestamptz not null default now(),

  joined_at timestamptz not null default now(),

  primary key (night_out_id, profile_id)
);


-- ============================================================
-- RIDE INTEGRATION
-- ============================================================

alter table public.rides
  add column night_out_id uuid
  references public.night_outs(id)
  on delete set null;


create index crews_owner_idx
  on public.crews(owner_id);

create index crew_members_profile_idx
  on public.crew_members(profile_id);

create index night_outs_crew_idx
  on public.night_outs(crew_id);

create index night_outs_created_by_idx
  on public.night_outs(created_by);

create index night_out_participants_profile_idx
  on public.night_out_participants(profile_id);

create index rides_night_out_idx
  on public.rides(night_out_id);


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.crews enable row level security;
alter table public.crew_members enable row level security;
alter table public.night_outs enable row level security;
alter table public.night_out_participants enable row level security;


-- ------------------------------------------------------------
-- RLS HELPERS
-- ------------------------------------------------------------
--
-- These SECURITY DEFINER helpers intentionally perform membership checks
-- outside the caller's row-security context. This avoids recursive RLS
-- evaluation when a policy on crew_members needs to determine whether
-- the current user is also a crew member.
--
-- Each helper exposes only a boolean authorization result.

create or replace function public.is_crew_owner(
  target_crew_id uuid,
  target_profile_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.crews c
    where c.id = target_crew_id
      and c.owner_id = target_profile_id
  );
$$;


create or replace function public.is_crew_member(
  target_crew_id uuid,
  target_profile_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.crew_members cm
    where cm.crew_id = target_crew_id
      and cm.profile_id = target_profile_id
  );
$$;


create or replace function public.is_night_out_creator(
  target_night_out_id uuid,
  target_profile_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.night_outs n
    where n.id = target_night_out_id
      and n.created_by = target_profile_id
  );
$$;


create or replace function public.is_night_out_crew_member(
  target_night_out_id uuid,
  target_profile_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.night_outs n
    join public.crew_members cm
      on cm.crew_id = n.crew_id
    where n.id = target_night_out_id
      and cm.profile_id = target_profile_id
  );
$$;


-- ------------------------------------------------------------
-- CREWS
-- ------------------------------------------------------------

create policy "crew members can read their crews"
  on public.crews
  for select
  using (
    owner_id = auth.uid()
    or public.is_crew_member(id)
  );


create policy "users create their own crews"
  on public.crews
  for insert
  with check (
    owner_id = auth.uid()
  );


create policy "crew owners update their crews"
  on public.crews
  for update
  using (
    owner_id = auth.uid()
  )
  with check (
    owner_id = auth.uid()
  );


create policy "crew owners delete their crews"
  on public.crews
  for delete
  using (
    owner_id = auth.uid()
  );


-- ------------------------------------------------------------
-- CREW MEMBERS
-- ------------------------------------------------------------

create policy "crew members can read membership"
  on public.crew_members
  for select
  using (
    public.is_crew_member(crew_id)
  );


create policy "crew owners add members"
  on public.crew_members
  for insert
  with check (
    role = 'member'
    and public.is_crew_owner(crew_id)
  );


create policy "crew owners update members"
  on public.crew_members
  for update
  using (
    role = 'member'
    and public.is_crew_owner(crew_id)
  )
  with check (
    role = 'member'
    and public.is_crew_owner(crew_id)
  );


create policy "crew owners remove members"
  on public.crew_members
  for delete
  using (
    role = 'member'
    and public.is_crew_owner(crew_id)
  );


create policy "members can leave crews"
  on public.crew_members
  for delete
  using (
    profile_id = auth.uid()
    and role = 'member'
  );


-- ------------------------------------------------------------
-- NIGHT OUTS
-- ------------------------------------------------------------

create policy "crew members can read night outs"
  on public.night_outs
  for select
  using (
    public.is_crew_member(crew_id)
  );


create policy "crew members create night outs"
  on public.night_outs
  for insert
  with check (
    created_by = auth.uid()
    and public.is_crew_member(crew_id)
  );


create policy "night out creators update night outs"
  on public.night_outs
  for update
  using (
    created_by = auth.uid()
  )
  with check (
    created_by = auth.uid()
    and public.is_crew_member(crew_id)
  );


create policy "night out creators delete night outs"
  on public.night_outs
  for delete
  using (
    created_by = auth.uid()
  );


-- ------------------------------------------------------------
-- NIGHT OUT PARTICIPANTS
-- ------------------------------------------------------------

create policy "crew members can read outing participants"
  on public.night_out_participants
  for select
  using (
    public.is_night_out_crew_member(night_out_id)
  );


create policy "night out creators add participants"
  on public.night_out_participants
  for insert
  with check (
    public.is_night_out_creator(night_out_id)
    and exists (
      select 1
      from public.night_outs n
      where n.id = night_out_id
        and public.is_crew_member(n.crew_id, profile_id)
    )
  );


create policy "night out creators update participants"
  on public.night_out_participants
  for update
  using (
    public.is_night_out_creator(night_out_id)
  )
  with check (
    public.is_night_out_creator(night_out_id)
  );


create policy "night out creators remove participants"
  on public.night_out_participants
  for delete
  using (
    public.is_night_out_creator(night_out_id)
  );


create policy "participants update their own safety status"
  on public.night_out_participants
  for update
  using (
    profile_id = auth.uid()
    and public.is_night_out_crew_member(night_out_id)
  )
  with check (
    profile_id = auth.uid()
    and public.is_night_out_crew_member(night_out_id)
  );


-- ============================================================
-- OWNER MEMBERSHIP
-- ============================================================
--
-- Creating a Crew automatically inserts the owner as its first
-- Crew member. This gives all downstream code one consistent
-- membership representation.

create or replace function public.add_crew_owner_as_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.crew_members (
    crew_id,
    profile_id,
    role
  )
  values (
    new.id,
    new.owner_id,
    'owner'
  );

  return new;
end;
$$;


create trigger on_crew_created
  after insert on public.crews
  for each row
  execute function public.add_crew_owner_as_member();


-- ============================================================
-- UPDATED-AT / SAFETY-STATUS TIMESTAMPS
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


create trigger crews_set_updated_at
  before update on public.crews
  for each row
  execute function public.set_updated_at();


create trigger night_outs_set_updated_at
  before update on public.night_outs
  for each row
  execute function public.set_updated_at();


create or replace function public.set_participant_status_updated_at()
returns trigger
language plpgsql
as $$
begin
  if new.safety_status is distinct from old.safety_status then
    new.status_updated_at = now();
  end if;

  return new;
end;
$$;


create trigger night_out_participant_status_updated
  before update on public.night_out_participants
  for each row
  execute function public.set_participant_status_updated_at();


-- A participant may update her own safety state, but the identity of the
-- participant row itself is immutable. Moving an existing participant row
-- to another user or another outing must be represented by explicit
-- delete/insert operations controlled by the outing creator.

create or replace function public.protect_participant_identity()
returns trigger
language plpgsql
as $$
begin
  if new.night_out_id is distinct from old.night_out_id
     or new.profile_id is distinct from old.profile_id then
    raise exception 'night out participant identity cannot be changed';
  end if;

  -- Membership metadata is immutable after creation. Participants may
  -- advance their safety state, while status_updated_at is maintained
  -- automatically by the database trigger.
  new.joined_at = old.joined_at;
  new.status_updated_at = old.status_updated_at;

  return new;
end;
$$;


create trigger night_out_participant_identity_guard
  before update on public.night_out_participants
  for each row
  execute function public.protect_participant_identity();


-- ============================================================
-- REALTIME
-- ============================================================
--
-- Crew members should see Home Safe state changes without needing
-- to manually refresh the outing.

alter publication supabase_realtime
  add table public.night_out_participants;



-- ============================================================
-- ATOMIC NIGHT OUT CREATION
-- ============================================================
--
-- Creating the outing and its initial participant rows is one logical
-- operation. Keeping it in a database function prevents a partially-created
-- Night Out if participant creation fails.

create or replace function public.create_night_out_with_participants(
  p_crew_id uuid,
  p_name text,
  p_destination_name text default null,
  p_starts_at timestamptz default null,
  p_planned_return_at timestamptz default null,
  p_transportation_plan text default null,
  p_participant_ids uuid[] default array[]::uuid[]
)
returns public.night_outs
language plpgsql
security invoker
set search_path = public
as $$
declare
  created_outing public.night_outs;
  participant_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'night out name is required';
  end if;

  insert into public.night_outs (
    crew_id,
    created_by,
    name,
    destination_name,
    starts_at,
    planned_return_at,
    transportation_plan
  )
  values (
    p_crew_id,
    auth.uid(),
    trim(p_name),
    nullif(trim(p_destination_name), ''),
    p_starts_at,
    p_planned_return_at,
    nullif(trim(p_transportation_plan), '')
  )
  returning * into created_outing;

  for participant_id in
    select distinct candidate_id
    from unnest(
      array_append(
        coalesce(p_participant_ids, array[]::uuid[]),
        auth.uid()
      )
    ) as candidate_id
    where candidate_id is not null
  loop
    insert into public.night_out_participants (
      night_out_id,
      profile_id,
      safety_status
    )
    values (
      created_outing.id,
      participant_id,
      'going'
    );
  end loop;

  return created_outing;
end;
$$;
