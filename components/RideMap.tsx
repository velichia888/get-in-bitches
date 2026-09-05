import MapView, { Marker } from 'react-native-maps';
import { colors } from '../lib/theme';

type Props = {
  pickup: { latitude: number; longitude: number };
  dropoff: { latitude: number; longitude: number };
};

export default function RideMap({ pickup, dropoff }: Props) {
  const midLat = (pickup.latitude + dropoff.latitude) / 2;
  const midLng = (pickup.longitude + dropoff.longitude) / 2;

  return (
    <MapView
      style={{ width: '100%', height: '100%' }}
      initialRegion={{
        latitude: midLat,
        longitude: midLng,
        latitudeDelta: Math.abs(pickup.latitude - dropoff.latitude) * 2 + 0.02,
        longitudeDelta: Math.abs(pickup.longitude - dropoff.longitude) * 2 + 0.02,
      }}
    >
      <Marker coordinate={pickup} title="Pickup" pinColor={colors.accent} />
      <Marker coordinate={dropoff} title="Dropoff" />
    </MapView>
  );
}
