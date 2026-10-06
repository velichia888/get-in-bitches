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

          <Text style={styles.title}>
            Ready to head home?
          </Text>

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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  hero: {
    marginBottom: spacing.lg,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  contextCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accentSoft,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  contextText: {
    flex: 1,
  },
  contextLabel: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 3,
  },
  contextTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  contextSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  planText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  sectionEyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    marginBottom: spacing.sm,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: spacing.lg,
  },
  safetyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  safetyNoteText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  requestError: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.md,
  },
  requestButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  requestButtonDisabled: {
    opacity: 0.65,
  },
  requestButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  footerText: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 11,
    marginTop: spacing.sm,
  },
  errorCard: {
    margin: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  errorText: {
    color: colors.textMuted,
  },
});
