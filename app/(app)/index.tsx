import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { colors, radius } from '../../lib/theme';
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
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const [isOnline, setIsOnline] = useState(false);
  const [openRides, setOpenRides] = useState<OpenRide[]>([]);
  const [loadingRides, setLoadingRides] = useState(false);

  const userId = session?.user.id;

  const loadProfile = useCallback(async () => {
    if (!userId) return;

    setLoadingProfile(true);

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', userId)
      .single();

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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rides' },
        () => {
          loadOpenRides();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.role, isOnline, loadOpenRides]);

  async function toggleOnline(next: boolean) {
    if (!userId) return;

    setIsOnline(next);

    await supabase.from('driver_status').upsert({
      profile_id: userId,
      is_online: next,
      updated_at: new Date().toISOString(),
    });
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
        error instanceof Error ? error.message : 'Unable to request a ride.'
      );
    } finally {
      setRequesting(false);
    }
  }

  async function acceptRide(rideId: string) {
    if (!userId) return;

    const { error } = await supabase
      .from('rides')
      .update({
        driver_id: userId,
        status: 'matched',
        matched_at: new Date().toISOString(),
      })
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
      <View style={[styles.container, { paddingTop: insets.top + 18 }]}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>GIB</Text>
          <Ionicons name="sparkles" size={12} color={colors.accent} />
        </View>

        <View style={styles.driverHero}>
          <Text style={styles.eyebrow}>DRIVER MODE</Text>
          <Text style={styles.rideTitle}>
            {isOnline ? 'You’re online.' : 'You’re offline.'}
          </Text>
          <Text style={styles.rideSubtitle}>
            {isOnline
              ? 'New ride requests will show here as they come in.'
              : 'Go online when you’re ready to see available rides.'}
          </Text>

          <Pressable
            style={[styles.toggle, isOnline && styles.toggleActive]}
            onPress={() => toggleOnline(!isOnline)}
          >
            <View style={[styles.toggleDot, isOnline && styles.toggleDotActive]} />
            <Text style={[styles.toggleText, isOnline && styles.toggleTextActive]}>
              {isOnline ? 'GO OFFLINE' : 'GO ONLINE'}
            </Text>
          </Pressable>
        </View>

        {isOnline ? (
          <>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionNumber}>01</Text>
              <Text style={styles.sectionTitle}>Open rides</Text>
            </View>

            <FlatList
              data={openRides}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl
                  refreshing={loadingRides}
                  onRefresh={loadOpenRides}
                  tintColor={colors.accent}
                />
              }
              contentContainerStyle={styles.driverList}
              ListEmptyComponent={
                <View style={styles.emptyCard}>
                  <Ionicons name="car-outline" size={22} color={colors.textSubtle} />
                  <Text style={styles.emptyText}>No ride requests right now.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={styles.rideCard}>
                  <View style={styles.routeRow}>
                    <Ionicons name="radio-button-on" size={15} color={colors.accent} />
                    <View style={styles.routeCopy}>
                      <Text style={styles.routeLabel}>PICKUP</Text>
                      <Text style={styles.routeText}>{item.pickup_address}</Text>
                    </View>
                  </View>

                  <View style={styles.routeLine} />

                  <View style={styles.routeRow}>
                    <Ionicons name="location" size={15} color={colors.blushStrong} />
                    <View style={styles.routeCopy}>
                      <Text style={styles.routeLabel}>DROP-OFF</Text>
                      <Text style={styles.routeText}>{item.dropoff_address}</Text>
                    </View>
                  </View>

                  {item.fare_estimate != null ? (
                    <Text style={styles.fareText}>Est. fare · ${item.fare_estimate}</Text>
                  ) : null}

                  <Pressable
                    style={styles.acceptButton}
                    onPress={() => acceptRide(item.id)}
                  >
                    <Text style={styles.primaryButtonText}>ACCEPT RIDE</Text>
                    <Ionicons name="arrow-forward" size={17} color={colors.ink} />
                  </Pressable>
                </View>
              )}
            />
          </>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 18 }]}>
      <View style={styles.brandRow}>
        <Text style={styles.brand}>GIB</Text>
        <Ionicons name="sparkles" size={12} color={colors.accent} />
      </View>

      <View style={styles.rideHero}>
        <View style={styles.rideHeroIcon}>
          <Ionicons name="car-sport" size={24} color={colors.accent} />
        </View>

        <Text style={styles.eyebrow}>NEED A RIDE?</Text>
        <Text style={styles.rideTitle}>Go somewhere.</Text>
        <Text style={styles.rideTitleAccent}>Get there safe.</Text>
        <Text style={styles.rideSubtitle}>
          For a whole night with your people, start from Crews so the ride
          and Home Safe stay connected.
        </Text>
      </View>

      <View style={styles.rideForm}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionNumber}>01</Text>
          <Text style={styles.sectionTitle}>Standalone ride</Text>
        </View>

        <Text style={styles.fieldLabel}>Pickup</Text>
        <View style={styles.inputShell}>
          <Ionicons name="radio-button-on" size={17} color={colors.accent} />
          <TextInput
            style={styles.input}
            placeholder="Pickup address"
            placeholderTextColor={colors.textSubtle}
            value={pickupAddress}
            onChangeText={setPickupAddress}
          />
        </View>

        <Text style={styles.fieldLabel}>Drop-off</Text>
        <View style={styles.inputShell}>
          <Ionicons name="location" size={17} color={colors.blushStrong} />
          <TextInput
            style={styles.input}
            placeholder="Dropoff address"
            placeholderTextColor={colors.textSubtle}
            value={dropoffAddress}
            onChangeText={setDropoffAddress}
          />
        </View>

        {requestError ? <Text style={styles.error}>{requestError}</Text> : null}

        <Pressable
          style={styles.primaryButton}
          onPress={requestRide}
          disabled={requesting}
        >
          {requesting ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>REQUEST RIDE</Text>
              <Ionicons name="arrow-forward" size={17} color={colors.ink} />
            </>
          )}
        </Pressable>
      </View>

      <Pressable style={styles.crewCallout} onPress={() => router.push('/(app)/crews')}>
        <View style={styles.crewCalloutIcon}>
          <Ionicons name="people-outline" size={19} color={colors.blush} />
        </View>
        <View style={styles.crewCalloutCopy}>
          <Text style={styles.crewCalloutTitle}>Going out with your Crew?</Text>
          <Text style={styles.crewCalloutText}>
            Plan the Night Out first so everyone stays connected through Home Safe.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginBottom: 22,
  },
  brand: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  rideHero: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 22,
    marginBottom: 16,
  },
  driverHero: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 18,
  },
  rideHeroIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.accentWash,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  eyebrow: {
    color: colors.blushMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 6,
  },
  rideTitle: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 34,
    lineHeight: 37,
  },
  rideTitleAccent: {
    color: colors.accent,
    fontFamily: 'Georgia',
    fontSize: 34,
    lineHeight: 37,
    marginBottom: 10,
  },
  rideSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    maxWidth: 480,
  },
  rideForm: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 9,
    marginBottom: 13,
  },
  sectionNumber: {
    color: colors.blushStrong,
    fontFamily: 'Georgia',
    fontSize: 28,
  },
  sectionTitle: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 21,
  },
  fieldLabel: {
    color: colors.blushMuted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 10,
  },
  inputShell: {
    minHeight: 49,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    paddingVertical: 12,
  },
  error: {
    color: colors.danger,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 10,
  },
  primaryButton: {
    minHeight: 49,
    backgroundColor: colors.blushStrong,
    borderRadius: radius.pill,
    marginTop: 15,
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
  crewCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElevated,
    padding: 13,
    marginTop: 12,
  },
  crewCalloutIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accentWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crewCalloutCopy: { flex: 1 },
  crewCalloutTitle: {
    color: colors.blush,
    fontSize: 12,
    fontWeight: '800',
  },
  crewCalloutText: {
    color: colors.textSubtle,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 2,
  },
  toggle: {
    alignSelf: 'flex-start',
    marginTop: 15,
    minHeight: 42,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 13,
  },
  toggleActive: {
    backgroundColor: '#0D1714',
    borderColor: '#24483A',
  },
  toggleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textSubtle,
  },
  toggleDotActive: { backgroundColor: colors.success },
  toggleText: {
    color: colors.blushMuted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  toggleTextActive: { color: colors.success },
  driverList: {
    paddingBottom: 80,
  },
  emptyCard: {
    minHeight: 92,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElevated,
  },
  emptyText: {
    color: colors.textSubtle,
    fontSize: 11,
  },
  rideCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 9,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  routeCopy: { flex: 1 },
  routeLabel: {
    color: colors.textSubtle,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.9,
    marginBottom: 2,
  },
  routeText: {
    color: colors.blush,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
  routeLine: {
    width: 1,
    height: 15,
    backgroundColor: colors.borderStrong,
    marginLeft: 7,
    marginVertical: 3,
  },
  fareText: {
    color: colors.textSubtle,
    fontSize: 10,
    marginTop: 10,
  },
  acceptButton: {
    minHeight: 44,
    backgroundColor: colors.blushStrong,
    borderRadius: radius.pill,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
});
