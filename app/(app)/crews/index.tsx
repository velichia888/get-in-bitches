import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  createCrew,
  listCrewMembers,
  listMyCrews,
} from '../../../lib/crew-service';
import type {
  Crew,
  CrewMemberWithProfile,
} from '../../../lib/crew-types';
import { colors, radius, spacing } from '../../../lib/theme';
import { gibAssetUris } from '../../../components/GibAssetUris';
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

type CrewMembersMap = Record<string, CrewMemberWithProfile[]>;

export default function CrewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [crews, setCrews] = useState<Crew[]>([]);
  const [membersByCrew, setMembersByCrew] = useState<CrewMembersMap>({});
  const [cardStylesByCrew, setCardStylesByCrew] = useState<
    Record<string, CrewCardStyle>
  >({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [crewName, setCrewName] = useState('');
  const [selectedCardStyle, setSelectedCardStyle] =
    useState<CrewCardStyle>('disco');
  const [error, setError] = useState<string | null>(null);

  const loadCrews = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }

    setError(null);

    try {
      const [nextCrews, storedCardStyles] = await Promise.all([
        listMyCrews(),
        loadCrewCardStyles(),
      ]);
      setCrews(nextCrews);
      setCardStylesByCrew(storedCardStyles);

      const memberEntries = await Promise.all(
        nextCrews.map(async (crew) => {
          try {
            const members = await listCrewMembers(crew.id);
            return [crew.id, members] as const;
          } catch {
            return [crew.id, []] as const;
          }
        })
      );

      setMembersByCrew(Object.fromEntries(memberEntries));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your Crews.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadCrews();
    }, [loadCrews])
  );

  async function handleCreateCrew() {
    const name = crewName.trim();

    if (!name) {
      setError('Give your Crew a name.');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const crew = await createCrew(name);
      await saveCrewCardStyle(crew.id, selectedCardStyle);
      setCardStylesByCrew((current) => ({
        ...current,
        [crew.id]: selectedCardStyle,
      }));
      setCrewName('');
      setSelectedCardStyle('disco');
      setShowCreate(false);
      router.push(`/(app)/crews/${crew.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your Crew.');
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        style={styles.list}
        data={crews}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={crews.length > 1 ? styles.crewRow : undefined}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadCrews(true)}
            tintColor={colors.accent}
          />
        }
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <Header onProfile={() => router.push('/(app)/profile')} />

            <View style={styles.hero}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroEyebrow}>GOOD GIRLS BACK EACH OTHER</Text>
                <Text style={styles.heroTitle}>Your people.</Text>
                <Text style={styles.heroTitlePink}>Your night.</Text>
                <Text style={styles.heroBody}>
                  Plan together. Look out for each other. Get home safe.
                </Text>
              </View>

              <View pointerEvents="none" style={styles.heroArt}>
                <Image
                  source={{ uri: gibAssetUris.hero }}
                  style={styles.heroArtImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            <FlowStrip />

            {error ? (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Crews</Text>
              <View style={styles.seeAllWrap}>
                <Text style={styles.seeAll}>See all</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.accent} />
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Image
              source={{ uri: gibAssetUris.crew0 }}
              style={styles.emptyArtImage}
              resizeMode="contain"
            />
            <Text style={styles.emptyTitle}>Your people go here.</Text>
            <Text style={styles.emptyBody}>
              Create a Crew, invite your people, then build the night around everyone getting home safe.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <CrewCard
            crew={item}
            members={membersByCrew[item.id] ?? []}
            cardStyle={
              cardStylesByCrew[item.id] ?? fallbackCardStyleForIndex(index)
            }
            onPress={() => router.push(`/(app)/crews/${item.id}`)}
          />
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            {showCreate ? (
              <CreateCrewPanel
                value={crewName}
                onChangeText={setCrewName}
                selectedCardStyle={selectedCardStyle}
                onSelectCardStyle={setSelectedCardStyle}
                creating={creating}
                onCancel={() => {
                  setShowCreate(false);
                  setError(null);
                }}
                onSubmit={() => void handleCreateCrew()}
              />
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.createCrewButton,
                pressed && styles.pressed,
              ]}
              onPress={() => setShowCreate((current) => !current)}
            >
              <Ionicons name="people" size={24} color={colors.ink} />
              <Text style={styles.createCrewButtonText}>
                {showCreate ? 'Close' : 'Create a Crew'}
              </Text>
              <Ionicons
                name={showCreate ? 'close' : 'chevron-forward'}
                size={24}
                color={colors.ink}
              />
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

function Header({ onProfile }: { onProfile: () => void }) {
  return (
    <View style={styles.header}>
      <View style={styles.logoWrap}>
        <Text style={styles.logo}>GIB</Text>
        <MaterialCommunityIcons
          name="star-four-points"
          size={19}
          color={colors.accent}
          style={styles.logoSpark}
        />
      </View>

      <View style={styles.headerActions}>
        <Pressable style={styles.headerIcon}>
          <Ionicons name="notifications-outline" size={22} color={colors.blush} />
          <View style={styles.notificationDot} />
        </Pressable>

        <Pressable style={styles.headerIcon} onPress={onProfile}>
          <Ionicons name="person" size={22} color={colors.blush} />
        </Pressable>
      </View>
    </View>
  );
}

function FlowStrip() {
  const items = [
    {
      icon: 'people' as const,
      label: 'CREW UP',
      body: 'Bring your\npeople together',
    },
    {
      icon: 'calendar-outline' as const,
      label: 'NIGHT OUT',
      body: 'Plan, share\nand stay in sync',
    },
    {
      icon: 'car-sport' as const,
      label: 'GET HOME',
      body: 'Choose your\nride and share it',
    },
    {
      icon: 'shield-checkmark' as const,
      label: 'HOME SAFE',
      body: "We'll make sure\nyou get there",
    },
  ];

  return (
    <View style={styles.flowStrip}>
      {items.map((item, index) => (
        <View key={item.label} style={styles.flowItemWrap}>
          <View style={styles.flowStep}>
            <View style={styles.flowIcon}>
              <Ionicons name={item.icon} size={25} color={colors.blushStrong} />
            </View>
            <Text style={styles.flowLabel}>{item.label}</Text>
            <Text style={styles.flowBody}>{item.body}</Text>
          </View>

          {index < items.length - 1 ? <View style={styles.flowConnector} /> : null}
        </View>
      ))}
    </View>
  );
}

function CrewCard({
  crew,
  members,
  cardStyle,
  onPress,
}: {
  crew: Crew;
  members: CrewMemberWithProfile[];
  cardStyle: CrewCardStyle;
  onPress: () => void;
}) {
  const chips = useMemo(
    () =>
      members.slice(0, 5).map((member) => ({
        id: member.profile_id,
        initial: memberInitial(member),
      })),
    [members]
  );

  const overflow = Math.max(0, members.length - chips.length);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.crewCard, pressed && styles.pressed]}
    >
      <View style={styles.crewArt}>
        <Image
          source={{ uri: cardAssetForStyle(cardStyle) }}
          style={styles.crewArtImage}
          resizeMode="contain"
        />
      </View>

      <View style={styles.crewInfo}>
        <View style={styles.crewTitleRow}>
          <Text style={styles.crewName} numberOfLines={1}>
            {crew.name}
          </Text>
          <Ionicons name="chevron-forward" size={22} color={colors.blush} />
        </View>

        <View style={styles.memberChips}>
          {chips.length ? (
            chips.map((chip) => (
              <View key={chip.id} style={styles.memberChip}>
                <Text style={styles.memberChipText}>{chip.initial}</Text>
              </View>
            ))
          ) : (
            <View style={styles.memberChip}>
              <Ionicons name="person-outline" size={13} color={colors.blush} />
            </View>
          )}

          {overflow > 0 ? (
            <View style={[styles.memberChip, styles.memberChipOverflow]}>
              <Text style={styles.memberChipText}>+{overflow}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.memberCount}>
          {members.length} {members.length === 1 ? 'member' : 'members'}
        </Text>
      </View>
    </Pressable>
  );
}

function CreateCrewPanel({
  value,
  onChangeText,
  selectedCardStyle,
  onSelectCardStyle,
  creating,
  onCancel,
  onSubmit,
}: {
  value: string;
  onChangeText: (value: string) => void;
  selectedCardStyle: CrewCardStyle;
  onSelectCardStyle: (style: CrewCardStyle) => void;
  creating: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <View style={styles.createPanel}>
      <View style={styles.createPanelHeader}>
        <View>
          <Text style={styles.createEyebrow}>NEW CREW</Text>
          <Text style={styles.createTitle}>Give your Crew a name.</Text>
        </View>

        <Pressable style={styles.createClose} onPress={onCancel}>
          <Ionicons name="close" size={18} color={colors.blush} />
        </Pressable>
      </View>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Main Crew"
        placeholderTextColor={colors.textSubtle}
        editable={!creating}
        autoCapitalize="words"
        maxLength={60}
        returnKeyType="done"
        onSubmitEditing={() => {
          if (!creating) onSubmit();
        }}
        style={styles.input}
      />

      <View style={styles.cardStyleSection}>
        <Text style={styles.cardStyleLabel}>CHOOSE YOUR CREW VIBE</Text>

        <View style={styles.cardStyleGrid}>
          {crewCardStyleOptions.map((option) => {
            const selected = option.value === selectedCardStyle;

            return (
              <Pressable
                key={option.value}
                onPress={() => onSelectCardStyle(option.value)}
                disabled={creating}
                style={[
                  styles.cardStyleOption,
                  selected && styles.cardStyleOptionSelected,
                ]}
              >
                <Image
                  source={{ uri: cardAssetForStyle(option.value) }}
                  style={styles.cardStylePreview}
                  resizeMode="cover"
                />

                <View style={styles.cardStyleMeta}>
                  <Text
                    style={[
                      styles.cardStyleName,
                      selected && styles.cardStyleNameSelected,
                    ]}
                  >
                    {option.label}
                  </Text>

                  {selected ? (
                    <View style={styles.cardStyleCheck}>
                      <Ionicons name="checkmark" size={12} color={colors.ink} />
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        style={[styles.createSubmit, creating && styles.disabled]}
        onPress={onSubmit}
        disabled={creating}
      >
        {creating ? (
          <ActivityIndicator color={colors.ink} />
        ) : (
          <>
            <Text style={styles.createSubmitText}>Create Crew</Text>
            <Ionicons name="arrow-forward" size={19} color={colors.ink} />
          </>
        )}
      </Pressable>
    </View>
  );
}

function memberInitial(member: CrewMemberWithProfile) {
  const name = member.profiles?.full_name?.trim();

  if (!name) {
    return '•';
  }

  return name[0]?.toUpperCase() ?? '•';
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
  },
  list: {
    flex: 1,
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 34,
  },
  pressed: {
    opacity: 0.82,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  logo: {
    color: '#F8DDE6',
    fontFamily: 'Georgia',
    fontSize: 44,
    lineHeight: 48,
    fontWeight: '700',
    letterSpacing: -4,
  },
  logoSpark: {
    marginLeft: 3,
    marginTop: 7,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 9,
    paddingTop: 5,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#46323E',
    backgroundColor: '#110E11',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    right: 5,
    top: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4B9B',
  },

  hero: {
    minHeight: 242,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 7,
  },
  heroCopy: {
    width: '61%',
    zIndex: 2,
    paddingTop: 16,
  },
  heroEyebrow: {
    color: '#EFC6D5',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 3.6,
    marginBottom: 10,
  },
  heroTitle: {
    color: '#F8DDE6',
    fontFamily: 'Georgia',
    fontSize: 40,
    lineHeight: 42,
    fontWeight: '700',
    letterSpacing: -2.1,
  },
  heroTitlePink: {
    color: '#FF4B9B',
    fontFamily: 'Georgia',
    fontSize: 40,
    lineHeight: 42,
    fontWeight: '700',
    letterSpacing: -2.1,
  },
  heroBody: {
    color: '#F0E5E9',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 13,
    maxWidth: 230,
  },
  heroArt: {
    position: 'absolute',
    right: -8,
    top: 0,
    width: '49%',
    height: 176,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  heroArtImage: {
    width: '100%',
    height: '100%',
  },

  flowStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  flowItemWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  flowStep: {
    flex: 1,
    alignItems: 'center',
  },
  flowIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#24151F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  flowLabel: {
    color: '#F6C5D8',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
    textAlign: 'center',
  },
  flowBody: {
    color: '#E9DDE2',
    fontSize: 8,
    lineHeight: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  flowConnector: {
    width: 16,
    marginTop: 24,
    borderTopWidth: 1.5,
    borderStyle: 'dotted',
    borderColor: '#DDA9BD',
  },

  errorCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: '#241116',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 13,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#F8DDE6',
    fontFamily: 'Georgia',
    fontSize: 34,
    lineHeight: 39,
    fontWeight: '700',
    letterSpacing: -1.6,
  },
  seeAllWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAll: {
    color: '#FF4B9B',
    fontSize: 10,
    fontWeight: '700',
  },

  crewRow: {
    gap: 10,
  },
  crewCard: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    backgroundColor: '#171116',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#432D39',
    marginBottom: 10,
  },
  crewArt: {
    height: 82,
    overflow: 'hidden',
    backgroundColor: '#110C10',
    borderBottomWidth: 1,
    borderBottomColor: '#2A1B23',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crewArtImage: {
    width: 220,
    height: 76,
    maxWidth: '100%',
  },
  crewInfo: {
    paddingHorizontal: 11,
    paddingTop: 9,
    paddingBottom: 11,
  },
  crewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  crewName: {
    flex: 1,
    color: '#F8E2E9',
    fontFamily: 'Georgia',
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  memberChips: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 4,
    marginTop: 9,
  },
  memberChip: {
    width: 27,
    height: 27,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D97FA4',
    backgroundColor: '#181116',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberChipOverflow: {
    backgroundColor: '#261821',
    borderColor: '#4C3040',
  },
  memberChipText: {
    color: '#F5D9E4',
    fontSize: 9,
    fontWeight: '700',
  },
  memberCount: {
    color: '#CDBCC3',
    fontSize: 10,
    marginTop: 7,
  },

  emptyCard: {
    flex: 1,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171216',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#493540',
    padding: 24,
    marginBottom: 10,
  },
  emptyArtImage: {
    width: 220,
    height: 80,
    marginBottom: 8,
  },
  emptyTitle: {
    color: '#F7DDE6',
    fontFamily: 'Georgia',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  emptyBody: {
    color: '#C8B7BF',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 390,
    marginTop: 8,
  },

  footer: {
    marginTop: 6,
    gap: 10,
  },
  createCrewButton: {
    minHeight: 58,
    borderRadius: 29,
    backgroundColor: '#F594B9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
  },
  createCrewButtonText: {
    color: '#161014',
    fontFamily: 'Georgia',
    fontSize: 20,
    fontWeight: '700',
  },

  createPanel: {
    backgroundColor: '#171216',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#493540',
    padding: 18,
  },
  createPanelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  createEyebrow: {
    color: '#FF4B9B',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2.2,
    marginBottom: 4,
  },
  createTitle: {
    color: '#F7DDE6',
    fontFamily: 'Georgia',
    fontSize: 20,
    fontWeight: '700',
  },
  createClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#493540',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: '#0F0C0F',
    color: '#FFF8FB',
    borderWidth: 1,
    borderColor: '#493540',
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 14,
  },
  cardStyleSection: {
    marginBottom: 14,
  },
  cardStyleLabel: {
    color: '#DDA9BD',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.8,
    marginBottom: 9,
  },
  cardStyleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardStyleOption: {
    width: '31.5%',
    overflow: 'hidden',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3B2833',
    backgroundColor: '#100C0F',
  },
  cardStyleOptionSelected: {
    borderColor: '#FF4B9B',
    borderWidth: 2,
  },
  cardStylePreview: {
    width: '100%',
    height: 54,
  },
  cardStyleMeta: {
    minHeight: 30,
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  cardStyleName: {
    color: '#C7B4BC',
    fontSize: 9,
    fontWeight: '700',
  },
  cardStyleNameSelected: {
    color: '#F8DDE6',
  },
  cardStyleCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF4B9B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createSubmit: {
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: '#F594B9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  createSubmitText: {
    color: '#161014',
    fontSize: 14,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.55,
  },
});
