import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import { getCrew, getNightOut } from '../../../../../lib/crew-service';
import type { Crew, NightOut } from '../../../../../lib/crew-types';
import { createRideRequest } from '../../../../../lib/ride-service';
import { colors, radius, spacing } from '../../../../../lib/theme';

export default function GetUsHomeScreen() {
  const { nightOutId } = useLocalSearchParams<{
    nightOutId?: string;
  }>();

  const router = useRouter();

  const [nightOut, setNightOut] = useState<NightOut | null>(null);
  const [crew, setCrew] = useState<Crew | null>(null);

  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [pickupInitialized, setPickupInitialized] = useState(false);

  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!nightOutId) {
      setError('Night Out ID is missing.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const outing = await getNightOut(nightOutId);
      const crewData = await getCrew(outing.crew_id);

      setNightOut(outing);
      setCrew(crewData);

      if (!pickupInitialized) {
        setPickupAddress(outing.destination_name ?? '');
        setPickupInitialized(true);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load Get Us Home.'
      );
    } finally {
      setLoading(false);
    }
  }, [nightOutId, pickupInitialized]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function handleRequestRide() {
    if (!nightOutId || requesting) {
      return;
    }

    if (!pickupAddress.trim() || !dropoffAddress.trim()) {
      setError('Enter both where you are and where you are going.');
      return;
    }

    setRequesting(true);
    setError(null);

    try {
      const ride = await createRideRequest({
        pickupAddress,
        dropoffAddress,
        nightOutId,
      });

      router.push(`/(app)/ride/${ride.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not request your ride.'
      );
    } finally {
      setRequesting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!nightOut) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <Ionicons
            name="alert-circle-outline"
            size={28}
            color={colors.danger}
          />
          <Text style={styles.errorTitle}>Get Us Home unavailable</Text>
          <Text style={styles.errorText}>
            {error ?? 'This Night Out could not be loaded.'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Get Us Home',
          headerShown: true,
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

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="car-sport"
              size={30}
              color={colors.accent}
            />
          </View>

          <Text style={styles.eyebrow}>GET US HOME</Text>

          <Text style={styles.title}>Time to</Text>
          <Text style={styles.titleAccent}>Get Us Home.</Text>

          <Text style={styles.subtitle}>
            Request transportation as part of {nightOut.name}. Your ride
            stays connected to the Night Out while your Crew keeps track
            of everyone getting home safely.
          </Text>
        </View>

        <View style={styles.contextCard}>
          <View style={styles.contextHeader}>
            <Ionicons
              name="people"
              size={20}
              color={colors.accent}
            />

            <View style={styles.contextText}>
              <Text style={styles.contextLabel}>YOUR NIGHT OUT</Text>
              <Text style={styles.contextTitle}>{nightOut.name}</Text>
              <Text style={styles.contextSubtitle}>
                {crew?.name ?? 'Your Crew'}
              </Text>
            </View>
          </View>

          {nightOut.transportation_plan ? (
            <View style={styles.planRow}>
              <Ionicons
                name="navigate-outline"
                size={18}
                color={colors.textMuted}
              />
              <Text style={styles.planText}>
                {nightOut.transportation_plan}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionEyebrow}>THE RIDE HOME</Text>

          <Text style={styles.fieldLabel}>Where are you now?</Text>
          <TextInput
            style={styles.input}
            value={pickupAddress}
            onChangeText={setPickupAddress}
            placeholder="Enter pickup location"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
          />

          {nightOut.destination_name ? (
            <Text style={styles.helperText}>
              We started with your Night Out destination. Change it if
              your Crew moved somewhere else.
            </Text>
          ) : null}

          <Text style={styles.fieldLabel}>Where are you going?</Text>
          <TextInput
            style={styles.input}
            value={dropoffAddress}
            onChangeText={setDropoffAddress}
            placeholder="Enter home or drop-off address"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
          />

          <View style={styles.safetyNote}>
            <Ionicons
              name="shield-checkmark-outline"
              size={21}
              color={colors.success}
            />

            <Text style={styles.safetyNoteText}>
              The ride is transportation. Home Safe keeps going afterward
              so your Crew can see when everyone is actually accounted for.
            </Text>
          </View>

          {error ? (
            <Text style={styles.requestError}>{error}</Text>
          ) : null}

          <Pressable
            style={[
              styles.requestButton,
              requesting && styles.requestButtonDisabled,
            ]}
            onPress={() => void handleRequestRide()}
            disabled={requesting}
          >
            {requesting ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <>
                <Ionicons
                  name="car-sport"
                  size={21}
                  color={colors.text}
                />
                <Text style={styles.requestButtonText}>
                  Request Crew Ride
                </Text>
              </>
            )}
          </Pressable>

          <Text style={styles.footerText}>
            This ride will be linked to {nightOut.name}.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 42,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  hero: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 22,
    marginBottom: 16,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    letterSpacing: 2.1,
    marginBottom: 7,
  },
  title: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 37,
    lineHeight: 40,
  },
  titleAccent: {
    color: colors.accent,
    fontFamily: 'Georgia',
    fontSize: 37,
    lineHeight: 40,
    marginBottom: 11,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  contextCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.blushMuted,
    padding: 15,
    marginBottom: 14,
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  contextText: { flex: 1 },
  contextLabel: {
    color: colors.blushMuted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 3,
  },
  contextTitle: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 18,
  },
  contextSubtitle: {
    color: colors.textSubtle,
    fontSize: 11,
    marginTop: 2,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 13,
    paddingTop: 13,
  },
  planText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 17,
  },
  formCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  sectionEyebrow: {
    color: colors.blushMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
    marginBottom: 16,
  },
  fieldLabel: {
    color: colors.blushMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 7,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 9,
    fontSize: 14,
  },
  helperText: {
    color: colors.textSubtle,
    fontSize: 10,
    lineHeight: 15,
    marginBottom: 16,
  },
  safetyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: '#0D1714',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#24483A',
    padding: 13,
    marginTop: 14,
  },
  safetyNoteText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 16,
  },
  requestError: {
    color: colors.danger,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 12,
  },
  requestButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.blushStrong,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    marginTop: 18,
  },
  requestButtonDisabled: { opacity: 0.6 },
  requestButtonText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  footerText: {
    color: colors.textSubtle,
    textAlign: 'center',
    fontSize: 9,
    marginTop: 9,
  },
  errorCard: {
    margin: 20,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  errorTitle: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 22,
    marginTop: 9,
    marginBottom: 4,
  },
  errorText: { color: colors.textMuted },
});
