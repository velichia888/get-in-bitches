import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { colors, spacing, radius } from '../../lib/theme';
import { createRideRequest } from '../../lib/ride-service';

type Profile = {
  id: string;
  full_name: string;
  role: 'rider' | 'driver';
};

type OpenRide = {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  fare_estimate: number | null;
};

export default function Home() {
  const { session } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Rider state
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  // Driver state
  const [isOnline, setIsOnline] = useState(false);
  const [openRides, setOpenRides] = useState<OpenRide[]>([]);
  const [loadingRides, setLoadingRides] = useState(false);

  const userId = session?.user.id;

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    setLoadingProfile(true);
    const { data } = await supabase.from('profiles').select('id, full_name, role').eq('id', userId).single();
    setProfile(data);
    setLoadingProfile(false);

    if (data?.role === 'driver') {
      const { data: status } = await supabase
        .from('driver_status')
        .select('is_online')
        .eq('profile_id', userId)
        .maybeSingle();
      setIsOnline(!!status?.is_online);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const loadOpenRides = useCallback(async () => {
    setLoadingRides(true);
    const { data } = await supabase
      .from('rides')
      .select('id, pickup_address, dropoff_address, fare_estimate')
      .eq('status', 'requested')
      .is('driver_id', null)
      .order('requested_at', { ascending: true });
    setOpenRides(data ?? []);
    setLoadingRides(false);
  }, []);

  useEffect(() => {
    if (profile?.role !== 'driver' || !isOnline) return;

    loadOpenRides();

    const channel = supabase
      .channel('open-rides')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, () => {
        loadOpenRides();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.role, isOnline, loadOpenRides]);

  async function toggleOnline(next: boolean) {
    if (!userId) return;
    setIsOnline(next);
    await supabase.from('driver_status').upsert({ profile_id: userId, is_online: next, updated_at: new Date().toISOString() });
  }

  async function requestRide() {
    if (!pickupAddress || !dropoffAddress) {
      setRequestError('Enter both a pickup and dropoff address.');
      return;
    }

    setRequesting(true);
    setRequestError(null);

    try {
      const ride = await createRideRequest({
        pickupAddress,
        dropoffAddress,
      });

      setPickupAddress('');
      setDropoffAddress('');

      router.push(`/(app)/ride/${ride.id}`);
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : 'Unable to request a ride.'
      );
    } finally {
      setRequesting(false);
    }
  }

  async function acceptRide(rideId: string) {
    if (!userId) return;
    const { error } = await supabase
      .from('rides')
      .update({ driver_id: userId, status: 'matched', matched_at: new Date().toISOString() })
      .eq('id', rideId)
      .eq('status', 'requested')
      .is('driver_id', null);

    if (!error) {
      router.push(`/(app)/ride/${rideId}`);
    } else {
      loadOpenRides();
    }
  }

  if (loadingProfile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (profile?.role === 'driver') {
    return (
      <View style={styles.container}>
        <View style={styles.onlineRow}>
          <Text style={styles.sectionTitle}>{isOnline ? "You're online" : "You're offline"}</Text>
          <Pressable
            style={[styles.toggle, isOnline && styles.toggleActive]}
            onPress={() => toggleOnline(!isOnline)}
          >
            <Text style={styles.toggleText}>{isOnline ? 'Go Offline' : 'Go Online'}</Text>
          </Pressable>
        </View>

        {isOnline && (
          <FlatList
            data={openRides}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={loadingRides} onRefresh={loadOpenRides} tintColor={colors.accent} />}
            contentContainerStyle={{ paddingTop: spacing.md }}
            ListEmptyComponent={<Text style={styles.muted}>No ride requests right now.</Text>}
            renderItem={({ item }) => (
              <View style={styles.rideCard}>
                <Text style={styles.rideText}>Pickup: {item.pickup_address}</Text>
                <Text style={styles.rideText}>Dropoff: {item.dropoff_address}</Text>
                {item.fare_estimate != null && <Text style={styles.muted}>Est. fare: ${item.fare_estimate}</Text>}
                <Pressable style={styles.acceptButton} onPress={() => acceptRide(item.id)}>
                  <Text style={styles.buttonText}>Accept</Text>
                </Pressable>
              </View>
            )}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Request a ride</Text>

      <TextInput
        style={styles.input}
        placeholder="Pickup address"
        placeholderTextColor={colors.textMuted}
        value={pickupAddress}
        onChangeText={setPickupAddress}
      />
      <TextInput
        style={styles.input}
        placeholder="Dropoff address"
        placeholderTextColor={colors.textMuted}
        value={dropoffAddress}
        onChangeText={setDropoffAddress}
      />

      {requestError && <Text style={styles.error}>{requestError}</Text>}

      <Pressable style={styles.button} onPress={requestRide} disabled={requesting}>
        {requesting ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Request Ride</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  error: { color: colors.danger, marginBottom: spacing.sm },
  muted: { color: colors.textMuted, marginTop: spacing.sm },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: { color: colors.text, fontWeight: '700' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggle: { backgroundColor: colors.surfaceRaised, borderRadius: radius.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  toggleActive: { backgroundColor: colors.accent },
  toggleText: { color: colors.text, fontWeight: '600' },
  rideCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rideText: { color: colors.text, marginBottom: spacing.xs },
  acceptButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    padding: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
});
