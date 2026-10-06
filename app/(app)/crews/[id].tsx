import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { useAuth } from '../../../lib/auth-context';
import {
  getCrew,
  listCrewMembers,
  listNightOuts,
} from '../../../lib/crew-service';
import type {
  Crew,
  CrewMemberWithProfile,
  NightOut,
} from '../../../lib/crew-types';
import { colors, radius, spacing } from '../../../lib/theme';

export default function CrewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();

  const [crew, setCrew] = useState<Crew | null>(null);
  const [members, setMembers] = useState<CrewMemberWithProfile[]>([]);
  const [nightOuts, setNightOuts] = useState<NightOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user.id;

  const isOwner = useMemo(
    () => !!crew && !!userId && crew.owner_id === userId,
    [crew, userId]
  );

  const load = useCallback(
    async (showRefresh = false) => {
      if (!id) {
        setError('Crew ID is missing.');
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
        const [crewData, memberData, nightOutData] = await Promise.all([
          getCrew(id),
          listCrewMembers(id),
          listNightOuts(id),
        ]);

        setCrew(crewData);
        setMembers(memberData);
        setNightOuts(nightOutData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not load this Crew.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id]
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

  if (!crew) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={28} color={colors.danger} />
          <Text style={styles.errorTitle}>Crew unavailable</Text>
          <Text style={styles.errorText}>
            {error ?? 'This Crew could not be loaded.'}
          </Text>

          <Pressable style={styles.retryButton} onPress={() => void load()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={members}
        keyExtractor={(item) => item.profile_id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={colors.accent}
          />
        }
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={styles.hero}>
              <View style={styles.heroIcon}>
                <Ionicons name="people" size={28} color={colors.accent} />
              </View>

              <Text style={styles.eyebrow}>YOUR CREW</Text>
              <Text style={styles.title}>{crew.name}</Text>
              <Text style={styles.subtitle}>
                The people you plan with, ride with, and make sure get home safe.
              </Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{members.length}</Text>
                <Text style={styles.statLabel}>
                  {members.length === 1 ? 'Person' : 'People'}
                </Text>
              </View>

              <View style={styles.statCard}>
                <Ionicons
                  name={isOwner ? 'star' : 'people-circle-outline'}
                  size={22}
                  color={colors.accent}
                />
                <Text style={styles.statLabel}>
                  {isOwner ? 'You own this Crew' : 'Crew member'}
                </Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Your people</Text>
                <Text style={styles.sectionSubtitle}>
                  Everyone currently in this Crew.
                </Text>
              </View>

              {isOwner && (
                <View style={styles.ownerBadge}>
                  <Ionicons name="star" size={13} color={colors.accent} />
                  <Text style={styles.ownerBadgeText}>Owner</Text>
                </View>
              )}
            </View>

            {error && <Text style={styles.errorInline}>{error}</Text>}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nobody here yet</Text>
            <Text style={styles.emptyText}>
              This Crew does not have any visible members yet.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isCurrentUser = item.profile_id === userId;

          return (
            <View style={styles.memberCard}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberInitial}>
                  {(item.profiles?.full_name?.trim()?.[0] ?? '?').toUpperCase()}
                </Text>
              </View>

              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {item.profiles?.full_name || 'Crew member'}
                  {isCurrentUser ? ' · You' : ''}
                </Text>

                <View style={styles.roleRow}>
                  <Ionicons
                    name={item.role === 'owner' ? 'star' : 'person'}
                    size={13}
                    color={
                      item.role === 'owner'
                        ? colors.accent
                        : colors.textMuted
                    }
                  />
                  <Text
                    style={[
                      styles.memberRole,
                      item.role === 'owner' && styles.memberRoleOwner,
                    ]}
                  >
                    {item.role === 'owner' ? 'Crew owner' : 'Member'}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          <View>
            <View style={styles.nightOutSection}>
              <View style={styles.nightOutHeader}>
                <View style={styles.nightOutHeading}>
                  <Text style={styles.sectionTitle}>Night Outs</Text>
                  <Text style={styles.sectionSubtitle}>
                    Plan the night, who's going, and how everybody gets home.
                  </Text>
                </View>

                <Pressable
                  style={styles.planButton}
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/crews/night-out/new',
                      params: { crewId: crew.id },
                    })
                  }
                >
                  <Ionicons
                    name="moon"
                    size={17}
                    color={colors.text}
                  />
                  <Text style={styles.planButtonText}>Plan</Text>
                </Pressable>
              </View>

              {nightOuts.length === 0 ? (
                <View style={styles.noNightOutCard}>
                  <Ionicons
                    name="moon-outline"
                    size={27}
                    color={colors.textMuted}
                  />
                  <Text style={styles.noNightOutTitle}>
                    Nothing planned yet
                  </Text>
                  <Text style={styles.noNightOutText}>
                    Start a Night Out and choose who's coming.
                  </Text>
                </View>
              ) : (
                nightOuts.map((nightOut) => (
                  <Pressable
                    key={nightOut.id}
                    style={styles.nightOutCard}
                    onPress={() =>
                      router.push({
                        pathname: '/(app)/crews/night-out/[nightOutId]',
                        params: { nightOutId: nightOut.id },
                      })
                    }
                  >
                    <View style={styles.nightOutIcon}>
                      <Ionicons
                        name="moon"
                        size={20}
                        color={colors.accent}
                      />
                    </View>

                    <View style={styles.nightOutInfo}>
                      <Text style={styles.nightOutName}>
                        {nightOut.name}
                      </Text>
                      <Text style={styles.nightOutMeta}>
                        {nightOut.destination_name || 'Destination not set'}
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.textMuted}
                    />
                  </Pressable>
                ))
              )}
            </View>

            {isOwner ? (
              <View style={styles.ownerActions}>
                <View style={styles.ownerActionHeader}>
                  <Ionicons
                    name="person-add-outline"
                    size={22}
                    color={colors.accent}
                  />
                  <View style={styles.ownerActionText}>
                    <Text style={styles.ownerActionTitle}>
                      Add your people
                    </Text>
                    <Text style={styles.ownerActionSubtitle}>
                      Add someone who already has a GIB account.
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={styles.inviteAction}
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/crews/invite',
                      params: {
                        crewId: crew.id,
                        crewName: crew.name,
                      },
                    })
                  }
                >
                  <Text style={styles.inviteActionText}>
                    Invite member
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.accent}
                  />
                </Pressable>
              </View>
            ) : null}
          </View>
        }
      />
    </View>
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
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    minHeight: 88,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    justifyContent: 'center',
  },
  statValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  ownerBadgeText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  errorInline: {
    color: colors.danger,
    marginBottom: spacing.md,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  memberAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  memberInitial: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '800',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  memberRole: {
    color: colors.textMuted,
    fontSize: 13,
  },
  memberRoleOwner: {
    color: colors.accent,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  nightOutSection: {
    marginTop: spacing.xl,
  },
  nightOutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  nightOutHeading: {
    flex: 1,
  },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  planButtonText: {
    color: colors.text,
    fontWeight: '800',
  },
  noNightOutCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  noNightOutTitle: {
    color: colors.text,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  noNightOutText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  nightOutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  nightOutIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  nightOutInfo: {
    flex: 1,
  },
  nightOutName: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 15,
  },
  nightOutMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 3,
  },
  ownerActions: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  ownerActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  ownerActionText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  ownerActionTitle: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  ownerActionSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
  },
  inviteAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  inviteActionText: {
    color: colors.text,
    fontWeight: '700',
  },
  errorCard: {
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
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  retryButtonText: {
    color: colors.text,
    fontWeight: '800',
  },
});
