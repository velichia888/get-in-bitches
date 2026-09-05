import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import RideMap from '../../../../components/RideMap';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth-context';
import { colors, spacing, radius } from '../../../../lib/theme';

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
      const { data: otherProfile } = await supabase.from('profiles').select('full_name').eq('id', otherId).single();
      setOtherPartyName(otherProfile?.full_name ?? null);
    }
  }, [id, userId]);

  useEffect(() => {
    loadRide();

    const channel = supabase
      .channel(`ride-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${id}` }, () => {
        loadRide();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, loadRide]);

  async function updateStatus(status: Ride['status']) {
    if (!ride) return;
    const patch: Record<string, unknown> = { status };
    if (status === 'completed') patch.completed_at = new Date().toISOString();
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

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Ride', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />

      <View style={styles.map}>
        <RideMap
          pickup={{ latitude: ride.pickup_lat, longitude: ride.pickup_lng }}
          dropoff={{ latitude: ride.dropoff_lat, longitude: ride.dropoff_lng }}
        />
      </View>

      <View style={styles.details}>
        <Text style={styles.status}>{statusLabel(ride.status)}</Text>
        <Text style={styles.text}>Pickup: {ride.pickup_address}</Text>
        <Text style={styles.text}>Dropoff: {ride.dropoff_address}</Text>
        {ride.fare_estimate != null && <Text style={styles.muted}>Est. fare: ${ride.fare_estimate}</Text>}
        {otherPartyName && (
          <Text style={styles.muted}>{isDriver ? 'Rider' : 'Driver'}: {otherPartyName}</Text>
        )}

        {isDriver && ride.status === 'matched' && (
          <Pressable style={styles.button} onPress={() => updateStatus('in_progress')}>
            <Text style={styles.buttonText}>Start Ride</Text>
          </Pressable>
        )}
        {isDriver && ride.status === 'in_progress' && (
          <Pressable style={styles.button} onPress={() => updateStatus('completed')}>
            <Text style={styles.buttonText}>Complete Ride</Text>
          </Pressable>
        )}
        {!isDriver && ride.status === 'completed' && (
          <Pressable style={styles.button} onPress={() => router.push(`/(app)/ride/${ride.id}/rate`)}>
            <Text style={styles.buttonText}>Rate this ride</Text>
          </Pressable>
        )}
        {(ride.status === 'requested' || ride.status === 'matched') && (
          <Pressable style={styles.cancelButton} onPress={() => updateStatus('cancelled')}>
            <Text style={styles.cancelText}>Cancel ride</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function statusLabel(status: Ride['status']) {
  switch (status) {
    case 'requested':
      return 'Looking for a driver…';
    case 'matched':
      return 'Driver matched';
    case 'in_progress':
      return 'Ride in progress';
    case 'completed':
      return 'Ride completed';
    case 'cancelled':
      return 'Ride cancelled';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  map: { width: '100%', height: '45%' },
  details: { padding: spacing.lg },
  status: { color: colors.accent, fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  text: { color: colors.text, marginBottom: spacing.xs },
  muted: { color: colors.textMuted, marginBottom: spacing.xs },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonText: { color: colors.text, fontWeight: '700' },
  cancelButton: { alignItems: 'center', marginTop: spacing.md },
  cancelText: { color: colors.danger },
});
