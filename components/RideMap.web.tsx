import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../lib/theme';

// react-native-maps has no web target. This app ships iOS-only, so the
// real map only needs to render there - real device/simulator
// verification happens via the Codemagic ios-simulator workflow. This
// stub exists purely so the rest of the app (auth, ride requests,
// ratings, etc.) stays testable locally via `expo start --web`, since
// Expo Router eagerly registers every route and an unresolvable native
// import here would otherwise crash the entire bundle.
type Props = {
  pickup: { latitude: number; longitude: number };
  dropoff: { latitude: number; longitude: number };
};

export default function RideMap({ pickup, dropoff }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Map preview unavailable on web - view on iOS.</Text>
      <Text style={styles.coords}>Pickup: {pickup.latitude.toFixed(4)}, {pickup.longitude.toFixed(4)}</Text>
      <Text style={styles.coords}>Dropoff: {dropoff.latitude.toFixed(4)}, {dropoff.longitude.toFixed(4)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  text: { color: colors.textMuted, marginBottom: 8 },
  coords: { color: colors.textMuted, fontSize: 12 },
});
