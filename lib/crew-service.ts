import { supabase } from './supabase';

import type {
  CreateNightOutInput,
  Crew,
  CrewMemberWithProfile,
  NightOut,
  NightOutParticipantWithProfile,
  NightOutStatus,
  ParticipantSafetyStatus,
} from './crew-types';

async function requireUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error('You must be signed in to use Crew features.');
  }

  return user.id;
}

export async function listMyCrews(): Promise<Crew[]> {
  const userId = await requireUserId();

  const { data: memberships, error: membershipError } = await supabase
    .from('crew_members')
    .select('crew_id')
    .eq('profile_id', userId);

  if (membershipError) {
    throw membershipError;
  }

  const crewIds = memberships?.map((membership) => membership.crew_id) ?? [];

  if (crewIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('crews')
    .select('*')
    .in('id', crewIds)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Crew[];
}

export async function createCrew(name: string): Promise<Crew> {
  const ownerId = await requireUserId();
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error('Give your Crew a name.');
  }

  const { data, error } = await supabase
    .from('crews')
    .insert({
      owner_id: ownerId,
      name: trimmedName,
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as Crew;
}

export async function getCrew(crewId: string): Promise<Crew> {
  const { data, error } = await supabase
    .from('crews')
    .select('*')
    .eq('id', crewId)
    .single();

  if (error) {
    throw error;
  }

  return data as Crew;
}

export async function listCrewMembers(
  crewId: string
): Promise<CrewMemberWithProfile[]> {
  const { data, error } = await supabase
    .from('crew_members')
    .select(
      'crew_id, profile_id, role, joined_at, profiles:profile_id(full_name, avatar_url)'
    )
    .eq('crew_id', crewId)
    .order('joined_at', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as CrewMemberWithProfile[];
}

export async function addCrewMember(
  crewId: string,
  profileId: string
): Promise<void> {
  const { error } = await supabase.from('crew_members').insert({
    crew_id: crewId,
    profile_id: profileId,
    role: 'member',
  });

  if (error) {
    throw error;
  }
}

export async function removeCrewMember(
  crewId: string,
  profileId: string
): Promise<void> {
  const { error } = await supabase
    .from('crew_members')
    .delete()
    .eq('crew_id', crewId)
    .eq('profile_id', profileId);

  if (error) {
    throw error;
  }
}

export async function listNightOuts(crewId: string): Promise<NightOut[]> {
  const { data, error } = await supabase
    .from('night_outs')
    .select('*')
    .eq('crew_id', crewId)
    .order('starts_at', { ascending: false, nullsFirst: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as NightOut[];
}

export async function getNightOut(nightOutId: string): Promise<NightOut> {
  const { data, error } = await supabase
    .from('night_outs')
    .select('*')
    .eq('id', nightOutId)
    .single();

  if (error) {
    throw error;
  }

  return data as NightOut;
}

export async function createNightOut(
  input: CreateNightOutInput
): Promise<NightOut> {
  const trimmedName = input.name.trim();

  if (!trimmedName) {
    throw new Error('Give the Night Out a name.');
  }

  const participantIds = Array.from(
    new Set(input.participantIds ?? [])
  );

  const { data, error } = await supabase.rpc(
    'create_night_out_with_participants',
    {
      p_crew_id: input.crewId,
      p_name: trimmedName,
      p_destination_name: input.destinationName?.trim() || null,
      p_starts_at: input.startsAt ?? null,
      p_planned_return_at: input.plannedReturnAt ?? null,
      p_transportation_plan: input.transportationPlan?.trim() || null,
      p_participant_ids: participantIds,
    }
  );

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Night Out could not be created.');
  }

  return data as NightOut;
}

export async function listNightOutParticipants(
  nightOutId: string
): Promise<NightOutParticipantWithProfile[]> {
  const { data, error } = await supabase
    .from('night_out_participants')
    .select(
      'night_out_id, profile_id, safety_status, status_updated_at, joined_at, profiles:profile_id(full_name, avatar_url)'
    )
    .eq('night_out_id', nightOutId)
    .order('joined_at', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as NightOutParticipantWithProfile[];
}

export async function updateMySafetyStatus(
  nightOutId: string,
  safetyStatus: ParticipantSafetyStatus
): Promise<void> {
  const userId = await requireUserId();

  const { error } = await supabase
    .from('night_out_participants')
    .update({
      safety_status: safetyStatus,
    })
    .eq('night_out_id', nightOutId)
    .eq('profile_id', userId);

  if (error) {
    throw error;
  }
}

export async function updateNightOutStatus(
  nightOutId: string,
  status: NightOutStatus
): Promise<void> {
  const { error } = await supabase
    .from('night_outs')
    .update({ status })
    .eq('id', nightOutId);

  if (error) {
    throw error;
  }
}

export function subscribeToNightOutParticipants(
  nightOutId: string,
  onChange: () => void
) {
  const channel = supabase
    .channel(`night-out-participants:${nightOutId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'night_out_participants',
        filter: `night_out_id=eq.${nightOutId}`,
      },
      onChange
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
