import * as Location from 'expo-location';
import { Platform } from 'react-native';

export type RideCoordinate = {
  latitude: number;
  longitude: number;
};

export type ResolvedRideLocations = {
  pickupAddress: string;
  dropoffAddress: string;
  pickup: RideCoordinate;
  dropoff: RideCoordinate;
};

type Geocode = (address: string) => Promise<RideCoordinate[]>;

function validCoordinate(value: RideCoordinate): boolean {
  return (
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude) &&
    Math.abs(value.latitude) <= 90 &&
    Math.abs(value.longitude) <= 180
  );
}

async function findSinglePoint(
  label: 'pickup' | 'drop-off',
  address: string,
  geocode: Geocode
): Promise<RideCoordinate> {
  let candidates: RideCoordinate[];
  try {
    candidates = await geocode(address);
  } catch {
    throw new Error(
      'Could not locate the ' + label + ' address. Check your connection and try a complete street address.'
    );
  }

  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error(
      'No location found for the ' + label + ' address. Enter a complete street address, city, and state.'
    );
  }
  if (candidates.length > 1) {
    throw new Error(
      'The ' + label + ' address matches multiple locations. Add a street number, city, and state.'
    );
  }

  const point = candidates[0];
  if (!validCoordinate(point)) {
    throw new Error('The ' + label + ' location could not be verified. Edit the address and try again.');
  }

  return { latitude: point.latitude, longitude: point.longitude };
}

/** Resolves typed addresses. No GPS fallback, fabricated points, or fare quote. */
export async function resolveRideLocations(
  rawPickup: string,
  rawDropoff: string,
  geocode: Geocode = Location.geocodeAsync
): Promise<ResolvedRideLocations> {
  const pickupAddress = rawPickup.trim();
  const dropoffAddress = rawDropoff.trim();
  if (!pickupAddress || !dropoffAddress) {
    throw new Error('Enter a pickup and drop-off address.');
  }

  // Expo's native Android geocoder requires foreground location permission.
  // iOS permits user-entered addresses to be resolved without live GPS.
  if (Platform.OS === 'android') {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Location permission is needed to resolve addresses on Android.');
    }
  }

  // Sequential calls avoid overwhelming the native geocoder.
  const pickup = await findSinglePoint('pickup', pickupAddress, geocode);
  const dropoff = await findSinglePoint('drop-off', dropoffAddress, geocode);

  if (pickup.latitude === dropoff.latitude && pickup.longitude === dropoff.longitude) {
    throw new Error('Pickup and drop-off resolve to the same location. Check both addresses.');
  }

  return { pickupAddress, dropoffAddress, pickup, dropoff };
}
