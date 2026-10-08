import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
import {
  cardAssetForStyle,
  crewCardStyleOptions,
  fallbackCardStyleForIndex,
  type CrewCardStyle,
} from '../../../components/GibCardAssets';
import {
  loadCrewCardStyles,
  saveCrewCardStyle,
} from '../../../lib/crew-card-style';
import { colors } from '../../../lib/theme';

export default function CrewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();

  const [crew, setCrew] = useState<Crew | null>(null);
  const [members, setMembers] = useState<CrewMemberWithProfile[]>([]);
  const [nightOuts, setNightOuts] = useState<NightOut[]>([]);
  const [cardStyle, setCardStyle] = useState<CrewCardStyle>('disco');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user.id;

  const isOwner = useMemo(
    () => !!crew && !!userId && crew.owner_id === userId,
    [crew, userId]
  );

  const upcomingNightOuts = useMemo(
    () =>
      nightOuts.filter(
        (nightOut) =>
          nightOut.status === 'planned' ||
          nightOut.status === 'active' ||
          nightOut.status === 'getting_home'
      ),
    [nightOuts]
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
        const [crewData, memberData, nightOutData, storedStyles] =
          await Promise.all([
            getCrew(id),
            listCrewMembers(id),
            listNightOuts(id),
            loadCrewCardStyles(),
          ]);

        setCrew(crewData);
        setMembers(memberData);
        setNightOuts(nightOutData);
        setCardStyle(
          storedStyles[id] ??
            fallbackCardStyleForIndex(stableStyleIndex(crewData.id))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load this Crew.');
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

  async function handleVibeChange(nextStyle: CrewCardStyle) {
    if (!crew) return;

    setCardStyle(nextStyle);
    await saveCrewCardStyle(crew.id, nextStyle);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!crew) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={30} color={colors.danger} />
        <Text style={styles.errorTitle}>Crew unavailable</Text>
        <Text style={styles.errorText}>
          {error ?? 'This Crew could not be loaded.'}
        </Text>
        <Pressable style={styles.retryButton} onPress={() => void load()}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={colors.accent}
          />
        }
      >
        <View style={styles.topBar}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.push('/(app)/crews')}
          >
            <Ionicons name="chevron-back" size={22} color="#FF6AAA" />
            <Text style={styles.backText}>Crews</Text>
          </Pressable>

          <Pressable style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={22} color="#F5D8E3" />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroArtFrame}>
            <Image
              source={{ uri: cardAssetForStyle(cardStyle) }}
              style={styles.heroImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.heroSparkOne}>
            <MaterialCommunityIcons
              name="star-four-points"
              size={22}
              color="#F7D9E4"
            />
          </View>
          <View style={styles.heroSparkTwo}>
            <MaterialCommunityIcons
              name="star-four-points"
              size={15}
              color="#FF4B9B"
            />
          </View>
        </View>

        <Text style={styles.crewTitle}>{crew.name}</Text>
        <Text style={styles.crewMeta}>
          {members.length} {members.length === 1 ? 'member' : 'members'}  •  Created{' '}
          {formatMonthYear(crew.created_at)}
        </Text>

        <View style={styles.actionRow}>
          {isOwner ? (
            <ActionButton
              icon="person-add"
              label="Invite"
              onPress={() =>
                router.push({
                  pathname: '/(app)/crews/invite',
                  params: { crewId: crew.id, crewName: crew.name },
                })
              }
            />
          ) : (
            <ActionButton icon="people" label="Members" />
          )}

          <ActionButton
            icon="calendar"
            label="Plan Night"
            onPress={() =>
              router.push({
                pathname: '/(app)/crews/night-out/new',
                params: { crewId: crew.id },
              })
            }
          />

          <ActionButton
            icon="moon"
            label="Plans"
            onPress={() => {
              const nextNight = upcomingNightOuts[0];
              if (nextNight) {
                router.push({
                  pathname: '/(app)/crews/night-out/[nightOutId]',
                  params: { nightOutId: nextNight.id },
                });
              } else {
                router.push({
                  pathname: '/(app)/crews/night-out/new',
                  params: { crewId: crew.id },
                });
              }
            }}
          />

          <ActionButton
            icon="shield-checkmark"
            label="Safety"
            onPress={() => router.push('/(app)/safety')}
          />
        </View>

        <View style={styles.vibeMessage}>
          <View style={styles.vibeMessageIcon}>
            <Ionicons name="sparkles" size={22} color="#FF5FAE" />
          </View>
          <Text style={styles.vibeMessageText}>
            Good nights, good company, and everyone getting home safe.
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#E7B3C8" />
        </View>

        {error ? (
          <View style={styles.inlineError}>
            <Ionicons
              name="alert-circle-outline"
              size={17}
              color={colors.danger}
            />
            <Text style={styles.inlineErrorText}>{error}</Text>
          </View>
        ) : null}

        <SectionHeader title="Members" action="See all" />

        <View style={styles.membersRow}>
          {members.slice(0, 6).map((member) => {
            const displayName = member.profiles?.full_name?.trim() || 'Crew';
            const isCurrentUser = member.profile_id === userId;

            return (
              <View key={member.profile_id} style={styles.memberItem}>
                <View
                  style={[
                    styles.memberAvatar,
                    isCurrentUser && styles.memberAvatarYou,
                  ]}
                >
                  {member.role === 'owner' ? (
                    <Ionicons
                      name="star"
                      size={10}
                      color="#FF5FAE"
                      style={styles.memberCrown}
                    />
                  ) : null}
                  <Text style={styles.memberInitial}>
                    {(displayName[0] || '?').toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.memberName} numberOfLines={1}>
                  {isCurrentUser ? 'You' : firstName(displayName)}
                </Text>
                {isCurrentUser ? (
                  <Text style={styles.memberRole}>Admin</Text>
                ) : null}
              </View>
            );
          })}

          {members.length > 6 ? (
            <View style={styles.memberItem}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberInitial}>+{members.length - 6}</Text>
              </View>
              <Text style={styles.memberName}>More</Text>
            </View>
          ) : null}
        </View>

        <SectionHeader title="Upcoming Plans" action="See all" />

        {upcomingNightOuts.length ? (
          <View style={styles.planStack}>
            {upcomingNightOuts.slice(0, 3).map((nightOut) => (
              <Pressable
                key={nightOut.id}
                style={({ pressed }) => [
                  styles.planCard,
                  pressed && styles.pressed,
                ]}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/crews/night-out/[nightOutId]',
                    params: { nightOutId: nightOut.id },
                  })
                }
              >
                <View style={styles.planDate}>
                  <Text style={styles.planMonth}>
                    {formatPlanDate(nightOut.starts_at).month}
                  </Text>
                  <Text style={styles.planDay}>
                    {formatPlanDate(nightOut.starts_at).day}
                  </Text>
                </View>

                <View style={styles.planInfo}>
                  <Text style={styles.planName}>{nightOut.name}</Text>
                  <Text style={styles.planMeta} numberOfLines={1}>
                    {formatPlanTime(nightOut.starts_at)} •{' '}
                    {nightOut.destination_name || 'Destination TBD'}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={21}
                  color="#F5D9E4"
                />
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyPlans}>
            <Ionicons name="moon-outline" size={25} color="#FF5FAE" />
            <View style={styles.emptyPlansCopy}>
              <Text style={styles.emptyPlansTitle}>No plans yet</Text>
              <Text style={styles.emptyPlansText}>
                Give the Crew something to look forward to.
              </Text>
            </View>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.planNightButton,
            pressed && styles.pressed,
          ]}
          onPress={() =>
            router.push({
              pathname: '/(app)/crews/night-out/new',
              params: { crewId: crew.id },
            })
          }
        >
          <Ionicons name="calendar" size={20} color="#140E12" />
          <Text style={styles.planNightButtonText}>Plan a Night Out</Text>
          <Ionicons name="chevron-forward" size={21} color="#140E12" />
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Crew Vibes</Text>
          <Text style={styles.editText}>Edit</Text>
        </View>

        <View style={styles.vibeGrid}>
          {crewCardStyleOptions.map((option) => {
            const selected = option.value === cardStyle;

            return (
              <Pressable
                key={option.value}
                style={[
                  styles.vibeTile,
                  selected && styles.vibeTileSelected,
                ]}
                onPress={() => void handleVibeChange(option.value)}
              >
                <Image
                  source={{ uri: cardAssetForStyle(option.value) }}
                  style={styles.vibeTileImage}
                  resizeMode="cover"
                />
                <View style={styles.vibeTileFooter}>
                  <Text
                    style={[
                      styles.vibeTileText,
                      selected && styles.vibeTileTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {selected ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#FF4B9B"
                    />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <SectionHeader title="Home Safe" />

        <Pressable
          style={({ pressed }) => [
            styles.homeSafeCard,
            pressed && styles.pressed,
          ]}
          onPress={() => router.push('/(app)/safety')}
        >
          <View style={styles.homeSafeIcon}>
            <Ionicons name="shield-checkmark" size={28} color="#FF5FAE" />
          </View>

          <View style={styles.homeSafeCopy}>
            <Text style={styles.homeSafeTitle}>We look out for each other.</Text>
            <Text style={styles.homeSafeText}>
              Keep rides, check-ins, and the end of the night connected to the Crew.
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={21} color="#F6D6E2" />
        </Pressable>
      </ScrollView>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={22} color="#FF6AAA" />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

function stableStyleIndex(value: string) {
  return Array.from(value).reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function firstName(value: string) {
  return value.split(/\s+/)[0] || value;
}

function formatMonthYear(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

function formatPlanDate(value: string | null) {
  if (!value) return { month: 'TBD', day: '—' };

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { month: 'TBD', day: '—' };

  return {
    month: date
      .toLocaleDateString('en-US', { month: 'short' })
      .toUpperCase(),
    day: date.toLocaleDateString('en-US', { day: '2-digit' }),
  };
}

function formatPlanTime(value: string | null) {
  if (!value) return 'Time TBD';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time TBD';

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080708',
  },
  center: {
    flex: 1,
    backgroundColor: '#080708',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  scroll: {
    flex: 1,
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 34,
  },
  pressed: {
    opacity: 0.82,
  },

  topBar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: '#FF6AAA',
    fontSize: 15,
    fontWeight: '700',
  },
  moreButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroCard: {
    height: 132,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#120D11',
    borderWidth: 1,
    borderColor: '#472F3C',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroArtFrame: {
    width: 250,
    height: 92,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#100B0F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: 220,
    height: 76,
  },
  heroSparkOne: {
    position: 'absolute',
    right: 20,
    top: 17,
  },
  heroSparkTwo: {
    position: 'absolute',
    left: 21,
    bottom: 21,
  },

  crewTitle: {
    color: '#F8E3EA',
    fontFamily: 'Georgia',
    fontSize: 40,
    lineHeight: 45,
    fontWeight: '700',
    letterSpacing: -1.8,
    marginTop: 14,
  },
  crewMeta: {
    color: '#D4C2C9',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 15,
  },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 15,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#24141E',
    borderWidth: 1,
    borderColor: '#3F2935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    color: '#E9BACD',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },

  vibeMessage: {
    minHeight: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4A303D',
    backgroundColor: '#21131B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    gap: 11,
    marginBottom: 24,
  },
  vibeMessageIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2E1723',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vibeMessageText: {
    flex: 1,
    color: '#EADCE2',
    fontSize: 11,
    lineHeight: 16,
  },

  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#241116',
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
  },
  inlineErrorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 11,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#F7DFE8',
    fontFamily: 'Georgia',
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.9,
  },
  sectionAction: {
    color: '#FF5FAE',
    fontSize: 11,
    fontWeight: '700',
  },
  editText: {
    color: '#FF5FAE',
    fontSize: 11,
    fontWeight: '700',
  },

  membersRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginBottom: 24,
  },
  memberItem: {
    width: 49,
    alignItems: 'center',
  },
  memberAvatar: {
    width: 45,
    height: 45,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: '#D98DAA',
    backgroundColor: '#1D1319',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  memberAvatarYou: {
    borderColor: '#FF5FAE',
    borderWidth: 2,
  },
  memberCrown: {
    position: 'absolute',
    top: -7,
  },
  memberInitial: {
    color: '#F5DCE6',
    fontSize: 15,
    fontWeight: '700',
  },
  memberName: {
    color: '#DCCBD2',
    fontSize: 8,
    marginTop: 5,
    maxWidth: 48,
    textAlign: 'center',
  },
  memberRole: {
    color: '#8F7B84',
    fontSize: 7,
    marginTop: 1,
  },

  planStack: {
    gap: 8,
    marginBottom: 10,
  },
  planCard: {
    minHeight: 74,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#3D2933',
    backgroundColor: '#151014',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  planDate: {
    width: 58,
    alignSelf: 'stretch',
    backgroundColor: '#25151E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planMonth: {
    color: '#E0AFC2',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  planDay: {
    color: '#F7DDE7',
    fontFamily: 'Georgia',
    fontSize: 23,
    lineHeight: 26,
    fontWeight: '700',
  },
  planInfo: {
    flex: 1,
    paddingHorizontal: 12,
  },
  planName: {
    color: '#F6DDE6',
    fontFamily: 'Georgia',
    fontSize: 16,
    fontWeight: '700',
  },
  planMeta: {
    color: '#BAA8B0',
    fontSize: 9,
    marginTop: 3,
  },
  emptyPlans: {
    minHeight: 72,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#3D2933',
    backgroundColor: '#151014',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  emptyPlansCopy: {
    flex: 1,
  },
  emptyPlansTitle: {
    color: '#F6DDE6',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyPlansText: {
    color: '#AD99A2',
    fontSize: 9,
    marginTop: 2,
  },

  planNightButton: {
    minHeight: 56,
    borderRadius: 28,
    backgroundColor: '#F594B9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  planNightButtonText: {
    color: '#140E12',
    fontFamily: 'Georgia',
    fontSize: 19,
    fontWeight: '700',
  },

  vibeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  vibeTile: {
    width: '31.5%',
    overflow: 'hidden',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3B2932',
    backgroundColor: '#130E12',
  },
  vibeTileSelected: {
    borderColor: '#FF4B9B',
    borderWidth: 2,
  },
  vibeTileImage: {
    width: '100%',
    height: 56,
  },
  vibeTileFooter: {
    minHeight: 31,
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vibeTileText: {
    color: '#BCA7B0',
    fontSize: 8,
    fontWeight: '700',
  },
  vibeTileTextSelected: {
    color: '#F6DDE6',
  },

  homeSafeCard: {
    minHeight: 92,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#3F2934',
    backgroundColor: '#171116',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  homeSafeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2B1622',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeSafeCopy: {
    flex: 1,
  },
  homeSafeTitle: {
    color: '#F6DDE6',
    fontFamily: 'Georgia',
    fontSize: 15,
    fontWeight: '700',
  },
  homeSafeText: {
    color: '#B9A6AE',
    fontSize: 9,
    lineHeight: 14,
    marginTop: 4,
  },

  errorTitle: {
    color: '#F6DDE6',
    fontFamily: 'Georgia',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 12,
  },
  errorText: {
    color: '#BDAAB2',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 320,
  },
  retryButton: {
    marginTop: 16,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: '#F594B9',
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#140E12',
    fontWeight: '800',
  },
});
