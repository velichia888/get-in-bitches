import { useCallback, useMemo, useState } from 'react';
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
import { useFocusEffect, useLocalSearchParams } from 'expo-router';

import { useAuth } from '../../../../lib/auth-context';
import {
  getCrew,
  getNightOut,
  listNightOutParticipants,
} from '../../../../lib/crew-service';
import type {
  Crew,
  NightOut,
  NightOutParticipantWithProfile,
  ParticipantSafetyStatus,
} from '../../../../lib/crew-types';
import { colors, radius, spacing } from '../../../../lib/theme';

const SAFETY_LABELS: Record<ParticipantSafetyStatus, string> = {
  going: 'Going',
  riding: 'Riding',
  dropped_off: 'Dropped Off',
  home_safe: 'Home Safe',
  left_outing: 'Left Outing',
};

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
  const { nightOutId } = useLocalSearchParams<{
    nightOutId?: string;
  }>();

  const { session } = useAuth();

  const [nightOut, setNightOut] = useState<NightOut | null>(null);
  const [crew, setCrew] = useState<Crew | null>(null);
  const [participants, setParticipants] = useState<
    NightOutParticipantWithProfile[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = session?.user.id;

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

        const [crewData, participantData] = await Promise.all([
          getCrew(outing.crew_id),
          listNightOutParticipants(nightOutId),
        ]);

        setNightOut(outing);
        setCrew(crewData);
        setParticipants(participantData);
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

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

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

      <View style={styles.getHomeCard}>
        <View style={styles.getHomeIcon}>
          <Ionicons
            name="car-sport"
            size={25}
            color={colors.accent}
          />
        </View>

        <View style={styles.getHomeText}>
          <Text style={styles.getHomeTitle}>Get Us Home</Text>
          <Text style={styles.getHomeSubtitle}>
            Transportation will plug into this Night Out instead of
            living as a separate generic ride request.
          </Text>
        </View>

        <Ionicons
          name="lock-closed-outline"
          size={18}
          color={colors.textMuted}
        />
      </View>

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
    width: 56,
    height: 56,
    borderRadius: 28,
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
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    marginTop: spacing.md,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  statusText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    minHeight: 110,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    justifyContent: 'center',
  },
  summaryValue: {
    color: colors.text,
    fontSize: 23,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  sectionEyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastDetailRow: {
    borderBottomWidth: 0,
    paddingBottom: 0,
    marginBottom: 0,
  },
  detailText: {
    flex: 1,
  },
  detailLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 3,
  },
  detailValue: {
    color: colors.text,
    fontWeight: '700',
    lineHeight: 20,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 17,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  safetyStatus: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 3,
  },
  safetyStatusFinal: {
    color: colors.success,
    fontWeight: '700',
  },
  errorText: {
    color: colors.danger,
    marginVertical: spacing.md,
  },
  getHomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  getHomeIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  getHomeText: {
    flex: 1,
  },
  getHomeTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 3,
  },
  getHomeSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  homeSafeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  homeSafeText: {
    flex: 1,
  },
  homeSafeTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 3,
  },
  homeSafeSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  unavailableCard: {
    margin: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  unavailableTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  muted: {
    color: colors.textMuted,
  },
});
