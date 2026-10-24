import { supabase } from './supabase';
import type { ResolvedRideLocations } from './ride-locations';

export type CreateRideRequestInput = {
  pickupAddress: string;
  dropoffAddress: string;
  nightOutId?: string | null;
};

export type CreatedRideRequest = {
  id: string;
};

export type NightOutRide = {
  id: string;
  rider_id: string;
  driver_id: string | null;
  pickup_address: string;
  dropoff_address: string;
  status:
    | 'requested'
    | 'matched'
    | 'in_progress'
    | 'completed'
    | 'cancelled';
  fare_estimate: number | null;
  requested_at: string;
  matched_at: string | null;
  completed_at: string | null;
  night_out_id: string;
};


export async function createRideRequest(
  input: CreateRideRequestInput,
  locations: ResolvedRideLocations
): Promise<CreatedRideRequest> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error('You must be signed in to request a ride.');
  }

  const pickupAddress = input.pickupAddress.trim();
  const dropoffAddress = input.dropoffAddress.trim();

  if (!pickupAddress || !dropoffAddress) {
    throw new Error('Enter both a pickup and dropoff address.');
  }

  // The user's map preview must match the request being saved.
  if (
    pickupAddress !== locations.pickupAddress ||
    dropoffAddress !== locations.dropoffAddress
  ) {
    throw new Error('Addresses changed. Preview the locations again.');
  }

  const { data, error } = await supabase
    .from('rides')
    .insert({
      rider_id: user.id,
      pickup_lat: locations.pickup.latitude,
      pickup_lng: locations.pickup.longitude,
      pickup_address: pickupAddress,
      dropoff_lat: locations.dropoff.latitude,
      dropoff_lng: locations.dropoff.longitude,
      dropoff_address: dropoffAddress,
      fare_estimate: null,
      night_out_id: input.nightOutId ?? null,
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return data as CreatedRideRequest;
}

export async function listNightOutRides(
  nightOutId: string
): Promise<NightOutRide[]> {
  const { data, error } = await supabase
    .from('rides')
    .select(
      'id, rider_id, driver_id, pickup_address, dropoff_address, status, fare_estimate, requested_at, matched_at, completed_at, night_out_id'
    )
    .eq('night_out_id', nightOutId)
    .order('requested_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as NightOutRide[];
}
