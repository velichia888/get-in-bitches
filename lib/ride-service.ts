import * as Location from 'expo-location';

import { supabase } from './supabase';

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


function estimateFare(distanceMiles: number) {
  const base = 3.5;
  const perMile = 1.75;

  return (
    Math.round((base + distanceMiles * perMile) * 100) /
    100
  );
}

function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const toRad = (degrees: number) =>
    (degrees * Math.PI) / 180;

  const earthRadiusMiles = 3958.8;
  const latitudeDelta = toRad(lat2 - lat1);
  const longitudeDelta = toRad(lng2 - lng1);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    earthRadiusMiles *
    2 *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
}

async function getRideRequestPosition() {
  // Permission prompts may remain unanswered, especially on web.
  // Preserve the existing five-second fallback behavior so extracting
  // this logic does not change the current rider experience.
  const timeout = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), 5000);
  });

  return Promise.race([
    (async () => {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        return null;
      }

      return Location.getCurrentPositionAsync({});
    })(),
    timeout,
  ]);
}

export async function createRideRequest(
  input: CreateRideRequestInput
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

  const position = await getRideRequestPosition();

  const pickupLat = position?.coords.latitude ?? 34.05;
  const pickupLng = position?.coords.longitude ?? -118.24;

  // The existing v1 ride flow does not geocode the typed destination.
  // Keep that behavior intact during extraction. Real geocoding remains
  // separate from the Crew Safety differentiation milestone.
  const dropoffLat = pickupLat + 0.03;
  const dropoffLng = pickupLng + 0.03;

  const distance = haversineMiles(
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng
  );

  const fareEstimate = estimateFare(distance);

  const { data, error } = await supabase
    .from('rides')
    .insert({
      rider_id: user.id,
      pickup_lat: pickupLat,
      pickup_lng: pickupLng,
      pickup_address: pickupAddress,
      dropoff_lat: dropoffLat,
      dropoff_lng: dropoffLng,
      dropoff_address: dropoffAddress,
      fare_estimate: fareEstimate,
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
