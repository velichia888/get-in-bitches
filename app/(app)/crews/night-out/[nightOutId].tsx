import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import { useAuth } from '../../../../lib/auth-context';
import {
  getCrew,
  getNightOut,
  listNightOutParticipants,
  subscribeToNightOutParticipants,
  updateMySafetyStatus,
} from '../../../../lib/crew-service';
import type {
  Crew,
  NightOut,
  NightOutParticipantWithProfile,
  ParticipantSafetyStatus,
} from '../../../../lib/crew-types';
import {
  listNightOutRides,
  type NightOutRide,
} from '../../../../lib/ride-service';
import { colors, radius, spacing } from '../../../../lib/theme';

const SAFETY_LABELS: Record<ParticipantSafetyStatus, string> = {
  going: 'Going',
  riding: 'Riding',
  dropped_off: 'Dropped Off',
  home_safe: 'Home Safe',
  left_outing: 'Left Outing',
};

const PRIMARY_SAFETY_STATES: ParticipantSafetyStatus[] = [
  'going',
  'riding',
  'dropped_off',
  'home_safe',
];

function formatDateTime(value: string | null): string {
  if (!value) {
    return 'Not set';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function NightOutDashboardScreen() {
  const { nightOutId, focus } = useLocalSearchParams<{
    nightOutId?: string;
    focus?: string;
  }>();

  const { session } = useAuth();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [nightOut, setNightOut] = useState<NightOut | null>(null);
  const [crew, setCrew] = useState<Crew | null>(null);
  const [participants, setParticipants] = useState<
    NightOutParticipantWithProfile[]
  >([]);

  const [rides, setRides] = useState<NightOutRide[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = session?.user.id;

  const currentParticipant = useMemo(
    () =>
      participants.find(
        (participant) => participant.profile_id === currentUserId
      ) ?? null,
    [currentUserId, participants]
  );

  const latestRide = useMemo(
    () => rides[0] ?? null,
    [rides]
  );

  const accountedFor = useMemo(
    () =>
      participants.filter(
        (participant) =>
          participant.safety_status === 'home_safe' ||
          participant.safety_status === 'left_outing'
      ).length,
    [participants]
  );

  const load = useCallback(
    async (showRefresh = false) => {
      if (!nightOutId) {
        setError('Night Out ID is missing.');
        setLoading(false);
        return;
      }

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const outing = await getNightOut(nightOutId);

        const [crewData, participantData, rideData] =
          await Promise.all([
            getCrew(outing.crew_id),
            listNightOutParticipants(nightOutId),
            listNightOutRides(nightOutId),
          ]);

        setNightOut(outing);
        setCrew(crewData);
        setParticipants(participantData);
        setRides(rideData);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not load this Night Out.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [nightOutId]
  );

  const refreshParticipants = useCallback(async () => {
    if (!nightOutId) {
      return;
    }

    try {
      const participantData =
        await listNightOutParticipants(nightOutId);

      setParticipants(participantData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not refresh Night Out safety states.'
      );
    }
  }, [nightOutId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  useEffect(() => {
    if (
      process.env.EXPO_PUBLIC_IOS_TEST_AUTOMATION !== '1' ||
      focus !== 'home-safe' ||
      loading ||
      !nightOut
    ) {
      return;
    }

    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    }, 350);

    return () => clearTimeout(timer);
  }, [focus, loading, nightOut]);

  useEffect(() => {
    if (!nightOutId) {
      return;
    }

    const unsubscribe = subscribeToNightOutParticipants(
      nightOutId,
      () => {
        void refreshParticipants();
      }
    );

    return unsubscribe;
  }, [nightOutId, refreshParticipants]);

  async function handleSafetyStatus(
    safetyStatus: ParticipantSafetyStatus
  ) {
    if (!nightOutId || !currentParticipant || updatingStatus) {
      return;
    }

    if (currentParticipant.safety_status === safetyStatus) {
      return;
    }

    setUpdatingStatus(true);
    setError(null);

    try {
      await updateMySafetyStatus(nightOutId, safetyStatus);
      await refreshParticipants();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not update your safety status.'
      );
    } finally {
      setUpdatingStatus(false);
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
        <View style={styles.unavailableCard}>
          <Ionicons
            name="alert-circle-outline"
            size={28}
            color={colors.danger}
          />
          <Text style={styles.unavailableTitle}>
            Night Out unavailable
          </Text>
          <Text style={styles.muted}>
            {error ?? 'This Night Out could not be loaded.'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load(true)}
          tintColor={colors.accent}
        />
      }
    >
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="moon" size={28} color={colors.accent} />
        </View>

        <Text style={styles.eyebrow}>NIGHT OUT</Text>
        <Text style={styles.title}>{nightOut.name}</Text>

        <Text style={styles.subtitle}>
          {crew?.name ?? 'Your Crew'} is planning this one together.
        </Text>

        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>
            {nightOut.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Ionicons
            name="people"
            size={21}
            color={colors.accent}
          />
          <Text style={styles.summaryValue}>
            {participants.length}
          </Text>
          <Text style={styles.summaryLabel}>Going out</Text>
        </View>

        <View style={styles.summaryCard}>
          <Ionicons
            name="shield-checkmark"
            size={21}
            color={colors.success}
          />
          <Text style={styles.summaryValue}>
            {accountedFor}/{participants.length}
          </Text>
          <Text style={styles.summaryLabel}>Accounted for</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionEyebrow}>THE PLAN</Text>

        <View style={styles.detailRow}>
          <Ionicons
            name="location-outline"
            size={21}
            color={colors.accent}
          />
          <View style={styles.detailText}>
            <Text style={styles.detailLabel}>Destination</Text>
            <Text style={styles.detailValue}>
              {nightOut.destination_name || 'Not set'}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons
            name="time-outline"
            size={21}
            color={colors.accent}
          />
          <View style={styles.detailText}>
            <Text style={styles.detailLabel}>Starts</Text>
            <Text style={styles.detailValue}>
              {formatDateTime(nightOut.starts_at)}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons
            name="home-outline"
            size={21}
            color={colors.accent}
          />
          <View style={styles.detailText}>
            <Text style={styles.detailLabel}>
              Plan to head home
            </Text>
            <Text style={styles.detailValue}>
              {formatDateTime(nightOut.planned_return_at)}
            </Text>
          </View>
        </View>

        <View style={[styles.detailRow, styles.lastDetailRow]}>
          <Ionicons
            name="car-outline"
            size={21}
            color={colors.accent}
          />
          <View style={styles.detailText}>
            <Text style={styles.detailLabel}>
              Transportation
            </Text>
            <Text style={styles.detailValue}>
              {nightOut.transportation_plan || 'Not set'}
            </Text>
          </View>
        </View>
      </View>

      {currentParticipant ? (
        <View style={styles.myStatusCard}>
          <View style={styles.myStatusHeader}>
            <View style={styles.myStatusTitleRow}>
              <View style={styles.myStatusIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={colors.accent}
                />
              </View>

              <View style={styles.myStatusHeading}>
                <Text style={styles.sectionEyebrow}>YOUR STATUS</Text>
                <Text style={styles.myStatusTitle}>
                  Let your Crew know where you are
                </Text>
              </View>
            </View>

            <View style={styles.currentStatusPill}>
              <Text style={styles.currentStatusText}>
                {SAFETY_LABELS[currentParticipant.safety_status]}
              </Text>
            </View>
          </View>

          <View style={styles.safetyStateGrid}>
            {PRIMARY_SAFETY_STATES.map((status) => {
              const selected =
                currentParticipant.safety_status === status;

              return (
                <Pressable
                  key={status}
                  style={[
                    styles.safetyStateButton,
                    selected && styles.safetyStateButtonSelected,
                    updatingStatus && styles.safetyStateButtonDisabled,
                  ]}
                  onPress={() => void handleSafetyStatus(status)}
                  disabled={updatingStatus}
                >
                  <Ionicons
                    name={
                      status === 'going'
                        ? 'sparkles-outline'
                        : status === 'riding'
                          ? 'car-outline'
                          : status === 'dropped_off'
                            ? 'location-outline'
                            : 'home-outline'
                    }
                    size={19}
                    color={
                      selected ? colors.text : colors.textMuted
                    }
                  />

                  <Text
                    style={[
                      styles.safetyStateButtonText,
                      selected &&
                        styles.safetyStateButtonTextSelected,
                    ]}
                  >
                    {SAFETY_LABELS[status]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.leftOutingRow}>
            <View style={styles.leftOutingText}>
              <Text style={styles.leftOutingTitle}>
                No longer part of this Night Out?
              </Text>
              <Text style={styles.leftOutingSubtitle}>
                {currentParticipant.safety_status === 'left_outing'
                  ? 'You are accounted for as Left Outing. Rejoin anytime if your plans change.'
                  : 'Mark yourself as Left Outing so your Crew knows you no longer need to be accounted for.'}
              </Text>
            </View>

            <Pressable
              style={[
                styles.leftOutingButton,
                currentParticipant.safety_status === 'left_outing' &&
                  styles.leftOutingButtonSelected,
                updatingStatus && styles.safetyStateButtonDisabled,
              ]}
              onPress={() =>
                void handleSafetyStatus(
                  currentParticipant.safety_status === 'left_outing'
                    ? 'going'
                    : 'left_outing'
                )
              }
              disabled={updatingStatus}
            >
              {updatingStatus ? (
                <ActivityIndicator
                  size="small"
                  color={colors.textMuted}
                />
              ) : (
                <Text style={styles.leftOutingButtonText}>
                  {currentParticipant.safety_status === 'left_outing'
                    ? 'Rejoin Night Out'
                    : 'Leave Outing'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Your people</Text>
          <Text style={styles.sectionSubtitle}>
            Everybody stays visible until they're Home Safe.
          </Text>
        </View>
      </View>

      {participants.map((participant) => {
        const participantName =
          participant.profiles?.full_name || 'Crew member';

        const isCurrentUser =
          participant.profile_id === currentUserId;

        const finalState =
          participant.safety_status === 'home_safe' ||
          participant.safety_status === 'left_outing';

        return (
          <View
            key={participant.profile_id}
            style={styles.participantCard}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {participantName.trim()[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>

            <View style={styles.participantInfo}>
              <Text style={styles.participantName}>
                {participantName}
                {isCurrentUser ? ' · You' : ''}
              </Text>

              <Text
                style={[
                  styles.safetyStatus,
                  finalState && styles.safetyStatusFinal,
                ]}
              >
                {SAFETY_LABELS[participant.safety_status]}
              </Text>
            </View>

            <Ionicons
              name={
                participant.safety_status === 'home_safe'
                  ? 'checkmark-circle'
                  : 'ellipse-outline'
              }
              size={25}
              color={
                participant.safety_status === 'home_safe'
                  ? colors.success
                  : colors.textMuted
              }
            />
          </View>
        );
      })}

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}

      {latestRide ? (
        <View style={styles.transportCard}>
          <View style={styles.transportHeader}>
            <View style={styles.getHomeIcon}>
              <Ionicons
                name="car-sport"
                size={25}
                color={colors.accent}
              />
            </View>

            <View style={styles.getHomeText}>
              <Text style={styles.getHomeEyebrow}>
                TRANSPORTATION
              </Text>
              <Text style={styles.getHomeTitle}>
                {latestRide.status === 'requested'
                  ? 'Looking for a driver'
                  : latestRide.status === 'matched'
                    ? 'Driver matched'
                    : latestRide.status === 'in_progress'
                      ? 'Ride in progress'
                      : latestRide.status === 'completed'
                        ? 'Ride completed'
                        : 'Ride cancelled'}
              </Text>
            </View>

            <View
              style={[
                styles.rideStatusPill,
                latestRide.status === 'completed' &&
                  styles.rideStatusPillComplete,
                latestRide.status === 'cancelled' &&
                  styles.rideStatusPillCancelled,
              ]}
            >
              <Text
                style={[
                  styles.rideStatusText,
                  latestRide.status === 'completed' &&
                    styles.rideStatusTextComplete,
                  latestRide.status === 'cancelled' &&
                    styles.rideStatusTextCancelled,
                ]}
              >
                {latestRide.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.rideRoute}>
            <View style={styles.rideRoutePoint}>
              <Ionicons
                name="radio-button-on"
                size={16}
                color={colors.accent}
              />
              <View style={styles.rideRouteText}>
                <Text style={styles.detailLabel}>Pickup</Text>
                <Text style={styles.detailValue}>
                  {latestRide.pickup_address}
                </Text>
              </View>
            </View>

            <View style={styles.rideRouteLine} />

            <View style={styles.rideRoutePoint}>
              <Ionicons
                name="location"
                size={16}
                color={colors.success}
              />
              <View style={styles.rideRouteText}>
                <Text style={styles.detailLabel}>Drop-off</Text>
                <Text style={styles.detailValue}>
                  {latestRide.dropoff_address}
                </Text>
              </View>
            </View>
          </View>

          {latestRide.fare_estimate != null ? (
            <Text style={styles.rideFare}>
              Estimated fare: ${latestRide.fare_estimate}
            </Text>
          ) : null}

          <Pressable
            style={styles.openRideButton}
            onPress={() =>
              router.push(`/(app)/ride/${latestRide.id}`)
            }
          >
            <Text style={styles.openRideButtonText}>
              Open Ride
            </Text>
            <Ionicons
              name="arrow-forward"
              size={18}
              color={colors.text}
            />
          </Pressable>

          {latestRide.status === 'cancelled' ? (
            <Pressable
              style={styles.requestAnotherButton}
              onPress={() => {
                if (!nightOutId) {
                  return;
                }

                router.push({
                  pathname:
                    '/(app)/crews/night-out/[nightOutId]/get-home',
                  params: { nightOutId },
                });
              }}
            >
              <Text style={styles.requestAnotherButtonText}>
                Request Another Ride
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <Pressable
          style={styles.getHomeCard}
          onPress={() => {
            if (!nightOutId) {
              return;
            }

            router.push({
              pathname:
                '/(app)/crews/night-out/[nightOutId]/get-home',
              params: { nightOutId },
            });
          }}
        >
          <View style={styles.getHomeIcon}>
            <Ionicons
              name="car-sport"
              size={25}
              color={colors.accent}
            />
          </View>

          <View style={styles.getHomeText}>
            <Text style={styles.getHomeEyebrow}>
              TRANSPORTATION
            </Text>
            <Text style={styles.getHomeTitle}>Get Us Home</Text>
            <Text style={styles.getHomeSubtitle}>
              Ready to wrap up the night? Request a ride connected to
              this Night Out.
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.accent}
          />
        </Pressable>
      )}

      <View style={styles.homeSafeCard}>
        <Ionicons
          name="shield-checkmark"
          size={25}
          color={colors.success}
        />

        <View style={styles.homeSafeText}>
          <Text style={styles.homeSafeTitle}>Home Safe</Text>
          <Text style={styles.homeSafeSubtitle}>
            {participants.length === 0
              ? 'Nobody is participating yet.'
              : accountedFor === participants.length
                ? 'Everybody is accounted for.'
                : `${participants.length - accountedFor} ${
                    participants.length - accountedFor === 1
                      ? 'person'
                      : 'people'
                  } still to account for.`}
          </Text>
        </View>
      </View>
    </ScrollView>
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
    paddingTop: 18,
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
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.accentWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },
  eyebrow: {
    color: colors.blushMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.2,
    marginBottom: 7,
  },
  title: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 38,
    lineHeight: 42,
    marginBottom: 7,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginTop: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  statusText: {
    color: colors.blushMuted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    minHeight: 96,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    justifyContent: 'center',
  },
  summaryValue: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 27,
    marginTop: 7,
  },
  summaryLabel: {
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  card: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  sectionEyebrow: {
    color: colors.blushMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 13,
    marginBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastDetailRow: { borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0 },
  detailText: { flex: 1 },
  detailLabel: {
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  detailValue: {
    color: colors.blush,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  myStatusCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.blushMuted,
    padding: 16,
    marginBottom: 24,
  },
  myStatusHeader: { gap: 11, marginBottom: 14 },
  myStatusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  myStatusIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accentWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myStatusHeading: { flex: 1 },
  myStatusTitle: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 18,
    lineHeight: 22,
  },
  currentStatusPill: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    backgroundColor: colors.accentWash,
    borderWidth: 1,
    borderColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  currentStatusText: {
    color: colors.accentBright,
    fontSize: 10,
    fontWeight: '900',
  },
  safetyStateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  safetyStateButton: {
    width: '48.5%',
    minHeight: 64,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    padding: 8,
  },
  safetyStateButtonSelected: {
    backgroundColor: colors.blushStrong,
    borderColor: colors.blushStrong,
  },
  safetyStateButtonDisabled: { opacity: 0.55 },
  safetyStateButtonText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  safetyStateButtonTextSelected: { color: colors.ink },
  leftOutingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  leftOutingText: { flex: 1 },
  leftOutingTitle: { color: colors.blush, fontSize: 12, fontWeight: '800' },
  leftOutingSubtitle: {
    color: colors.textSubtle,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  leftOutingButton: {
    minWidth: 92,
    minHeight: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  leftOutingButtonSelected: {
    backgroundColor: colors.accentWash,
    borderColor: colors.accent,
  },
  leftOutingButtonText: {
    color: colors.blushMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  sectionHeader: { marginBottom: 12, marginTop: 2 },
  sectionTitle: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 25,
  },
  sectionSubtitle: {
    color: colors.textSubtle,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 11,
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentWash,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 16,
    fontWeight: '700',
  },
  participantInfo: { flex: 1 },
  participantName: { color: colors.blush, fontWeight: '800', fontSize: 13 },
  safetyStatus: { color: colors.textSubtle, fontSize: 11, marginTop: 2 },
  safetyStatusFinal: { color: colors.success, fontWeight: '800' },
  errorText: { color: colors.danger, marginVertical: 12, fontSize: 12 },
  transportCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.blushMuted,
    padding: 16,
    marginTop: 18,
  },
  transportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rideStatusPill: {
    backgroundColor: colors.accentWash,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  rideStatusPillComplete: { backgroundColor: 'rgba(84, 214, 160, 0.12)' },
  rideStatusPillCancelled: { backgroundColor: 'rgba(255, 100, 124, 0.12)' },
  rideStatusText: {
    color: colors.accentBright,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  rideStatusTextComplete: { color: colors.success },
  rideStatusTextCancelled: { color: colors.danger },
  rideRoute: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rideRoutePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  rideRouteText: { flex: 1 },
  rideRouteLine: {
    width: 1,
    height: 17,
    backgroundColor: colors.borderStrong,
    marginLeft: 7,
    marginVertical: 2,
  },
  rideFare: {
    color: colors.textSubtle,
    fontSize: 11,
    marginTop: 12,
  },
  openRideButton: {
    backgroundColor: colors.blushStrong,
    borderRadius: radius.pill,
    minHeight: 48,
    paddingHorizontal: 16,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  openRideButtonText: { color: colors.ink, fontWeight: '900', fontSize: 11 },
  requestAnotherButton: { alignItems: 'center', paddingTop: 12 },
  requestAnotherButtonText: {
    color: colors.accentBright,
    fontWeight: '800',
    fontSize: 11,
  },
  getHomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.blushMuted,
    padding: 16,
    marginTop: 18,
  },
  getHomeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  getHomeText: { flex: 1 },
  getHomeEyebrow: {
    color: colors.blushMuted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  getHomeTitle: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 18,
    marginBottom: 3,
  },
  getHomeSubtitle: { color: colors.textSubtle, fontSize: 10, lineHeight: 15 },
  homeSafeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0D1714',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#24483A',
    padding: 16,
    marginTop: 10,
  },
  homeSafeText: { flex: 1 },
  homeSafeTitle: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 18,
    marginBottom: 3,
  },
  homeSafeSubtitle: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  unavailableCard: {
    margin: 20,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  unavailableTitle: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 22,
    marginTop: 9,
    marginBottom: 4,
  },
  muted: { color: colors.textMuted },
});
