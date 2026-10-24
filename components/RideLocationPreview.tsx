import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import RideMap from './RideMap';
import type { ResolvedRideLocations } from '../lib/ride-locations';
import { colors, radius } from '../lib/theme';

type Props = {
  locations: ResolvedRideLocations;
  submitting: boolean;
  onConfirm: () => void;
  onEdit: () => void;
};

/** Shows two resolved pins, never a fictitious driving route or fare. */
export default function RideLocationPreview({
  locations,
  submitting,
  onConfirm,
  onEdit,
}: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.heading}>CHECK THE TWO MAP PINS</Text>
      <View style={styles.map}>
        <RideMap pickup={locations.pickup} dropoff={locations.dropoff} />
      </View>
      <Text style={styles.label}>PICKUP</Text>
      <Text style={styles.address}>{locations.pickupAddress}</Text>
      <Text style={styles.label}>DROP-OFF</Text>
      <Text style={styles.address}>{locations.dropoffAddress}</Text>
      <Text style={styles.note}>
        Confirm both pins match your intended locations. These are address
        matches, not a verified road route or a fare estimate.
      </Text>
      <Pressable
        style={styles.confirm}
        onPress={onConfirm}
        disabled={submitting}
        accessibilityRole="button"
        accessibilityLabel="Confirm pickup and drop-off map locations"
      >
        {submitting ? (
          <ActivityIndicator color={colors.ink} />
        ) : (
          <Text style={styles.confirmText}>CONFIRM & REQUEST RIDE</Text>
        )}
      </Pressable>
      <Pressable
        style={styles.edit}
        onPress={onEdit}
        disabled={submitting}
        accessibilityRole="button"
      >
        <Text style={styles.editText}>Edit addresses</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: 14, gap: 5 },
  heading: {
    color: colors.blush,
    fontWeight: '900',
    letterSpacing: 1.2,
    fontSize: 11,
    marginBottom: 6,
  },
  map: {
    height: 190,
    width: '100%',
    borderRadius: 13,
    overflow: 'hidden',
    marginBottom: 8,
  },
  label: {
    color: colors.blushMuted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 6,
  },
  address: { color: colors.text, fontSize: 13 },
  note: { color: colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 10 },
  confirm: {
    minHeight: 48,
    marginTop: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.blushStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: { color: colors.ink, fontWeight: '900', fontSize: 11 },
  edit: { alignItems: 'center', padding: 12 },
  editText: { color: colors.blush, fontWeight: '700', fontSize: 12 },
});
