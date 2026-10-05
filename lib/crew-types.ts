export type CrewMemberRole = 'owner' | 'member';

export type NightOutStatus =
  | 'planned'
  | 'active'
  | 'getting_home'
  | 'completed'
  | 'cancelled';

export type ParticipantSafetyStatus =
  | 'going'
  | 'riding'
  | 'dropped_off'
  | 'home_safe'
  | 'left_outing';

export type Crew = {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type CrewMember = {
  crew_id: string;
  profile_id: string;
  role: CrewMemberRole;
  joined_at: string;
};

export type CrewMemberWithProfile = CrewMember & {
  profiles: {
    full_name: string;
    avatar_url: string | null;
  } | null;
};

export type NightOut = {
  id: string;
  crew_id: string;
  created_by: string;
  name: string;
  destination_name: string | null;
  starts_at: string | null;
  planned_return_at: string | null;
  transportation_plan: string | null;
  status: NightOutStatus;
  created_at: string;
  updated_at: string;
};

export type NightOutParticipant = {
  night_out_id: string;
  profile_id: string;
  safety_status: ParticipantSafetyStatus;
  status_updated_at: string;
  joined_at: string;
};

export type NightOutParticipantWithProfile = NightOutParticipant & {
  profiles: {
    full_name: string;
    avatar_url: string | null;
  } | null;
};

export type CreateNightOutInput = {
  crewId: string;
  name: string;
  destinationName?: string | null;
  startsAt?: string | null;
  plannedReturnAt?: string | null;
  transportationPlan?: string | null;
  participantIds?: string[];
};
