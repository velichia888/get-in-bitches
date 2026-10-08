import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import RideMap from '../../../../components/RideMap';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth-context';
import { colors, radius } from '../../../../lib/theme';

type Ride = {
  id: string;
  rider_id: string;
  driver_id: string | null;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_address: string;
  status: 'requested' | 'matched' | 'in_progress' | 'completed' | 'cancelled';
  fare_estimate: number | null;
};

export default function RideDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [otherPartyName, setOtherPartyName] = useState<string | null>(null);

  const userId = session?.user.id;

  const loadRide = useCallback(async () => {
    if (!id) return;

    const { data } = await supabase.from('rides').select('*').eq('id', id).single();
    setRide(data);
    setLoading(false);

    const otherId = data?.rider_id === userId ? data?.driver_id : data?.rider_id;

    if (otherId) {
      const { data: otherProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', otherId)
        .single();

      setOtherPartyName(otherProfile?.full_name ?? null);
    }
  }, [id, userId]);

  useEffect(() => {
    loadRide();

    const channel = supabase
      .channel(`ride-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rides',
          filter: `id=eq.${id}`,
        },
        () => {
          loadRide();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, loadRide]);

  async function updateStatus(status: Ride['status']) {
    if (!ride) return;

    const patch: Record<string, unknown> = { status };

    if (status === 'completed') {
      patch.completed_at = new Date().toISOString();
    }

    await supabase.from('rides').update(patch).eq('id', ride.id);

    if (status === 'completed') {
      router.replace(`/(app)/ride/${ride.id}/rate`);
    }
  }

  if (loading || !ride) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const isDriver = userId === ride.driver_id;
  const completed = ride.status === 'completed';

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Ride',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.blush,
          headerShadowVisible: false,
          headerTitleStyle: {
            color: colors.blush,
            fontFamily: 'Georgia',
            fontSize: 18,
          },
        }}
      />

      <View style={styles.map}>
        <RideMap
          pickup={{ latitude: ride.pickup_lat, longitude: ride.pickup_lng }}
          dropoff={{ latitude: ride.dropoff_lat, longitude: ride.dropoff_lng }}
        />
      </View>

      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />

        <View style={styles.statusRow}>
          <View style={styles.statusCopy}>
            <Text style={styles.eyebrow}>YOUR RIDE</Text>
            <Text style={styles.status}>{statusLabel(ride.status)}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              completed && styles.statusBadgeComplete,
              ride.status === 'cancelled' && styles.statusBadgeCancelled,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                completed && styles.statusDotComplete,
                ride.status === 'cancelled' && styles.statusDotCancelled,
              ]}
            />
            <Text style={styles.statusBadgeText}>
              {ride.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.routeCard}>
          <View style={styles.routeRow}>
            <View style={styles.routeMarker}>
              <Ionicons name="radio-button-on" size={16} color={colors.accent} />
            </View>
            <View style={styles.routeCopy}>
              <Text style={styles.routeLabel}>PICKUP</Text>
              <Text style={styles.routeValue}>{ride.pickup_address}</Text>
            </View>
          </View>

          <View style={styles.routeLine} />

          <View style={styles.routeRow}>
            <View style={styles.routeMarker}>
              <Ionicons name="location" size={16} color={colors.blushStrong} />
            </View>
            <View style={styles.routeCopy}>
              <Text style={styles.routeLabel}>DROP-OFF</Text>
              <Text style={styles.routeValue}>{ride.dropoff_address}</Text>
            </View>
          </View>
        </View>

        <View style={styles.metaRow}>
          {ride.fare_estimate != null ? (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>EST. FARE</Text>
              <Text style={styles.metaValue}>${ride.fare_estimate}</Text>
            </View>
          ) : null}

          {otherPartyName ? (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>{isDriver ? 'RIDER' : 'DRIVER'}</Text>
              <Text style={styles.metaValue}>{otherPartyName}</Text>
            </View>
          ) : null}
        </View>

        {isDriver && ride.status === 'matched' ? (
          <Pressable style={styles.primaryButton} onPress={() => updateStatus('in_progress')}>
            <Text style={styles.primaryButtonText}>START RIDE</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.ink} />
          </Pressable>
        ) : null}

        {isDriver && ride.status === 'in_progress' ? (
          <Pressable style={styles.primaryButton} onPress={() => updateStatus('completed')}>
            <Text style={styles.primaryButtonText}>COMPLETE RIDE</Text>
            <Ionicons name="checkmark" size={18} color={colors.ink} />
          </Pressable>
        ) : null}

        {!isDriver && completed ? (
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push(`/(app)/ride/${ride.id}/rate`)}
          >
            <Text style={styles.primaryButtonText}>RATE THIS RIDE</Text>
            <Ionicons name="star-outline" size={18} color={colors.ink} />
          </Pressable>
        ) : null}

        {(ride.status === 'requested' || ride.status === 'matched') ? (
          <Pressable style={styles.cancelButton} onPress={() => updateStatus('cancelled')}>
            <Text style={styles.cancelText}>Cancel ride</Text>
          </Pressable>
        ) : null}

        <View style={styles.safeNote}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.success} />
          <Text style={styles.safeNoteText}>
            The ride gets you there. Home Safe keeps your Crew in the loop after drop-off.
          </Text>
        </View>
      </View>
    </View>
  );
}

function statusLabel(status: Ride['status']) {
  switch (status) {
    case 'requested':
      return 'Finding your ride.';
    case 'matched':
      return 'Your driver is matched.';
    case 'in_progress':
      return 'You’re on the way.';
    case 'completed':
      return 'Ride complete.';
    case 'cancelled':
      return 'Ride cancelled.';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  map: {
    width: '100%',
    height: '43%',
    backgroundColor: colors.surface,
  },
  sheet: {
    flex: 1,
    marginTop: -18,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  statusCopy: { flex: 1 },
  eyebrow: {
    color: colors.blushMuted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.8,
    marginBottom: 3,
  },
  status: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 24,
    lineHeight: 28,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.accentWash,
    borderWidth: 1,
    borderColor: colors.accentSoft,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statusBadgeComplete: {
    backgroundColor: 'rgba(84, 214, 160, 0.10)',
    borderColor: '#24483A',
  },
  statusBadgeCancelled: {
    backgroundColor: 'rgba(255, 100, 124, 0.10)',
    borderColor: 'rgba(255, 100, 124, 0.3)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  statusDotComplete: { backgroundColor: colors.success },
  statusDotCancelled: { backgroundColor: colors.danger },
  statusBadgeText: {
    color: colors.blushMuted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  routeCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  routeMarker: {
    width: 22,
    alignItems: 'center',
    paddingTop: 2,
  },
  routeCopy: { flex: 1 },
  routeLabel: {
    color: colors.textSubtle,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 3,
  },
  routeValue: {
    color: colors.blush,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  routeLine: {
    width: 1,
    height: 18,
    backgroundColor: colors.borderStrong,
    marginLeft: 10,
    marginVertical: 3,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  metaItem: {
    flex: 1,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 11,
  },
  metaLabel: {
    color: colors.textSubtle,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  metaValue: {
    color: colors.blush,
    fontSize: 12,
    fontWeight: '800',
  },
  primaryButton: {
    minHeight: 50,
    backgroundColor: colors.blushStrong,
    borderRadius: radius.pill,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 11,
  },
  cancelText: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '800',
  },
  safeNote: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 8,
    paddingTop: 12,
  },
  safeNoteText: {
    flex: 1,
    color: colors.textSubtle,
    fontSize: 9,
    lineHeight: 14,
  },
});
