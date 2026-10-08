import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import {
  createNightOut,
  getCrew,
  listCrewMembers,
} from '../../../../lib/crew-service';
import type {
  Crew,
  CrewMemberWithProfile,
} from '../../../../lib/crew-types';
import { colors, radius, spacing } from '../../../../lib/theme';

function parseLocalDateTime(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.includes('T')
    ? trimmed
    : trimmed.replace(' ', 'T');

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    throw new Error('Use a date and time like 2026-10-10 19:30.');
  }

  return date.toISOString();
}

export default function NewNightOutScreen() {
  const { crewId } = useLocalSearchParams<{ crewId?: string }>();
  const router = useRouter();

  const [crew, setCrew] = useState<Crew | null>(null);
  const [members, setMembers] = useState<CrewMemberWithProfile[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [plannedReturnAt, setPlannedReturnAt] = useState('');
  const [transportationPlan, setTransportationPlan] = useState('');

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCount = selectedIds.length;

  const allSelected = useMemo(
    () => members.length > 0 && selectedIds.length === members.length,
    [members, selectedIds]
  );

  const load = useCallback(async () => {
    if (!crewId) {
      setError('Crew ID is missing.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [crewData, memberData] = await Promise.all([
        getCrew(crewId),
        listCrewMembers(crewId),
      ]);

      setCrew(crewData);
      setMembers(memberData);
      setSelectedIds(memberData.map((member) => member.profile_id));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not prepare this Night Out.'
      );
    } finally {
      setLoading(false);
    }
  }, [crewId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  function toggleParticipant(profileId: string) {
    setSelectedIds((current) =>
      current.includes(profileId)
        ? current.filter((id) => id !== profileId)
        : [...current, profileId]
    );
  }

  function toggleAll() {
    setSelectedIds(
      allSelected ? [] : members.map((member) => member.profile_id)
    );
  }

  async function handleCreate() {
    if (!crewId) {
      setError('Crew ID is missing.');
      return;
    }

    if (!name.trim()) {
      setError('Give the Night Out a name.');
      return;
    }

    if (selectedIds.length === 0) {
      setError('Choose at least one person who is going.');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const startIso = parseLocalDateTime(startsAt);
      const returnIso = parseLocalDateTime(plannedReturnAt);

      if (
        startIso &&
        returnIso &&
        new Date(returnIso).getTime() < new Date(startIso).getTime()
      ) {
        throw new Error(
          'Planned return time cannot be before the Night Out starts.'
        );
      }

      const nightOut = await createNightOut({
        crewId,
        name,
        destinationName: destination,
        startsAt: startIso,
        plannedReturnAt: returnIso,
        transportationPlan,
        participantIds: selectedIds,
      });

      router.replace({
        pathname: '/(app)/crews/night-out/[nightOutId]',
        params: { nightOutId: nightOut.id },
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not create this Night Out.'
      );
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={21} color={colors.blush} />
          </Pressable>

          <View style={styles.brandWrap}>
            <Text style={styles.brand}>GIB</Text>
            <Ionicons name="sparkles" size={12} color={colors.accent} />
          </View>

          <View style={styles.iconButton}>
            <Ionicons name="moon-outline" size={20} color={colors.blushMuted} />
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>PLAN A NIGHT OUT</Text>
            <Text style={styles.heroTitle}>Same people.</Text>
            <Text style={styles.heroTitleAccent}>Safer nights.</Text>
            <Text style={styles.heroSubtitle}>
              Set the plan once, keep your Crew on the same page, and make
              getting everybody home part of the night from the start.
            </Text>

            {crew ? (
              <View style={styles.crewPill}>
                <Ionicons name="people-outline" size={15} color={colors.blush} />
                <Text style={styles.crewPillText}>{crew.name}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.heroArt}>
            <Ionicons name="moon" size={58} color={colors.blushStrong} />
            <Ionicons
              name="sparkles"
              size={18}
              color={colors.accent}
              style={styles.heroSparkleOne}
            />
            <Ionicons
              name="sparkles"
              size={12}
              color={colors.blushMuted}
              style={styles.heroSparkleTwo}
            />
          </View>
        </View>

        <View style={styles.progressCard}>
          {[
            ['01', 'The plan'],
            ['02', "Who's going"],
            ['03', 'Get home'],
          ].map(([number, label], index) => (
            <View key={number} style={styles.progressItem}>
              <View style={styles.progressDot}>
                <Text style={styles.progressNumber}>{number}</Text>
              </View>
              <Text style={styles.progressLabel}>{label}</Text>
              {index < 2 ? <View style={styles.progressLine} /> : null}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionNumber}>01</Text>
            <View style={styles.sectionHeadingCopy}>
              <Text style={styles.sectionTitle}>The plan</Text>
              <Text style={styles.sectionSubtitle}>
                Give everyone the basics before the night starts.
              </Text>
            </View>
          </View>

          <Text style={styles.label}>Night Out name</Text>
          <View style={styles.inputShell}>
            <Ionicons name="sparkles-outline" size={18} color={colors.blushMuted} />
            <TextInput
              style={styles.input}
              placeholder="Saturday Night"
              placeholderTextColor={colors.textSubtle}
              value={name}
              onChangeText={setName}
              maxLength={80}
              editable={!creating}
            />
          </View>

          <Text style={styles.label}>Destination</Text>
          <View style={styles.inputShell}>
            <Ionicons name="location-outline" size={19} color={colors.blushMuted} />
            <TextInput
              style={styles.input}
              placeholder="Old Town Scottsdale"
              placeholderTextColor={colors.textSubtle}
              value={destination}
              onChangeText={setDestination}
              maxLength={120}
              editable={!creating}
            />
          </View>

          <View style={styles.twoColumn}>
            <View style={styles.column}>
              <Text style={styles.label}>Starts</Text>
              <View style={styles.inputShell}>
                <Ionicons name="time-outline" size={18} color={colors.blushMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="2026-10-10 19:30"
                  placeholderTextColor={colors.textSubtle}
                  value={startsAt}
                  onChangeText={setStartsAt}
                  autoCapitalize="none"
                  editable={!creating}
                />
              </View>
            </View>

            <View style={styles.column}>
              <Text style={styles.label}>Head home</Text>
              <View style={styles.inputShell}>
                <Ionicons name="home-outline" size={18} color={colors.blushMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="2026-10-11 00:30"
                  placeholderTextColor={colors.textSubtle}
                  value={plannedReturnAt}
                  onChangeText={setPlannedReturnAt}
                  autoCapitalize="none"
                  editable={!creating}
                />
              </View>
            </View>
          </View>

          <Text style={styles.help}>
            Use YYYY-MM-DD HH:MM for now.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionNumber}>02</Text>
            <View style={styles.sectionHeadingCopy}>
              <Text style={styles.sectionTitle}>Who's going?</Text>
              <Text style={styles.sectionSubtitle}>
                {selectedCount} of {members.length} selected
              </Text>
            </View>

            {members.length > 1 ? (
              <Pressable
                style={styles.selectAllButton}
                onPress={toggleAll}
                disabled={creating}
              >
                <Text style={styles.selectAllText}>
                  {allSelected ? 'Clear' : 'Everyone'}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.memberList}>
            {members.map((member) => {
              const selected = selectedIds.includes(member.profile_id);
              const nameValue = member.profiles?.full_name || 'Crew member';

              return (
                <Pressable
                  key={member.profile_id}
                  style={[
                    styles.memberRow,
                    selected && styles.memberRowSelected,
                  ]}
                  onPress={() => toggleParticipant(member.profile_id)}
                  disabled={creating}
                >
                  <View style={[styles.memberAvatar, selected && styles.memberAvatarSelected]}>
                    <Text style={styles.memberInitial}>
                      {nameValue.trim()[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>

                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{nameValue}</Text>
                    <Text style={styles.memberRole}>
                      {member.role === 'owner' ? 'Crew owner' : 'Crew member'}
                    </Text>
                  </View>

                  <View style={[styles.checkCircle, selected && styles.checkCircleSelected]}>
                    {selected ? (
                      <Ionicons name="checkmark" size={16} color={colors.ink} />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionNumber}>03</Text>
            <View style={styles.sectionHeadingCopy}>
              <Text style={styles.sectionTitle}>Get home plan</Text>
              <Text style={styles.sectionSubtitle}>
                Make the end of the night part of the plan now.
              </Text>
            </View>
          </View>

          <Text style={styles.label}>Transportation plan</Text>
          <View style={[styles.inputShell, styles.multilineShell]}>
            <Ionicons
              name="car-outline"
              size={19}
              color={colors.blushMuted}
              style={styles.multilineIcon}
            />
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Dinner → Bar → GIB ride home"
              placeholderTextColor={colors.textSubtle}
              value={transportationPlan}
              onChangeText={setTransportationPlan}
              multiline
              textAlignVertical="top"
              maxLength={240}
              editable={!creating}
            />
          </View>

          <View style={styles.homeSafeNote}>
            <View style={styles.homeSafeIcon}>
              <Ionicons name="shield-checkmark-outline" size={19} color={colors.accent} />
            </View>
            <View style={styles.homeSafeCopy}>
              <Text style={styles.homeSafeTitle}>Built for Home Safe</Text>
              <Text style={styles.homeSafeText}>
                This Night Out becomes the shared safety context for your Crew
                from going out through getting everybody home.
              </Text>
            </View>
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={19} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.primaryButton, creating && styles.disabledButton]}
          onPress={() => void handleCreate()}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>PLAN THIS NIGHT</Text>
              <Ionicons name="arrow-forward" size={19} color={colors.ink} />
            </>
          )}
        </Pressable>

        <Text style={styles.footerLine}>GOOD FRIENDS / SAFER NIGHTS</Text>
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 42,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  brand: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  hero: {
    minHeight: 190,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 24,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroCopy: {
    flex: 1,
  },
  eyebrow: {
    color: colors.blushMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.1,
    marginBottom: 9,
  },
  heroTitle: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 36,
    lineHeight: 39,
  },
  heroTitleAccent: {
    color: colors.accent,
    fontFamily: 'Georgia',
    fontSize: 36,
    lineHeight: 39,
    marginBottom: 12,
  },
  heroSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 470,
  },
  crewPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginTop: 13,
  },
  crewPillText: {
    color: colors.blush,
    fontSize: 12,
    fontWeight: '700',
  },
  heroArt: {
    width: 106,
    height: 126,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroSparkleOne: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  heroSparkleTwo: {
    position: 'absolute',
    bottom: 13,
    left: 3,
  },
  progressCard: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: 12,
    paddingVertical: 13,
    marginBottom: 18,
  },
  progressItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  progressDot: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.blushMuted,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    zIndex: 2,
  },
  progressNumber: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 11,
  },
  progressLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
  },
  progressLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: colors.accent,
    width: '52%',
    right: '-26%',
    top: 15,
  },
  section: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 17,
    marginBottom: 14,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 12,
  },
  sectionNumber: {
    color: colors.blushStrong,
    fontFamily: 'Georgia',
    fontSize: 29,
    lineHeight: 32,
  },
  sectionHeadingCopy: {
    flex: 1,
  },
  sectionTitle: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 21,
  },
  sectionSubtitle: {
    color: colors.textSubtle,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  label: {
    color: colors.blushMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 7,
    marginTop: 12,
    textTransform: 'uppercase',
  },
  inputShell: {
    minHeight: 50,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 13,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    paddingVertical: 13,
    minWidth: 0,
  },
  twoColumn: {
    flexDirection: 'row',
    gap: 10,
  },
  column: {
    flex: 1,
  },
  help: {
    color: colors.textSubtle,
    fontSize: 10,
    marginTop: 7,
  },
  selectAllButton: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentWash,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  selectAllText: {
    color: colors.accentBright,
    fontSize: 11,
    fontWeight: '800',
  },
  memberList: {
    gap: 8,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 10,
  },
  memberRowSelected: {
    borderColor: colors.blushMuted,
    backgroundColor: '#1D151B',
  },
  memberAvatar: {
    width: 39,
    height: 39,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  memberAvatarSelected: {
    borderColor: colors.blushStrong,
    backgroundColor: colors.accentWash,
  },
  memberInitial: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 16,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  memberRole: {
    color: colors.textSubtle,
    fontSize: 10,
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleSelected: {
    backgroundColor: colors.blushStrong,
    borderColor: colors.blushStrong,
  },
  multilineShell: {
    minHeight: 94,
    alignItems: 'flex-start',
  },
  multilineIcon: {
    marginTop: 14,
  },
  multilineInput: {
    minHeight: 88,
    paddingTop: 13,
  },
  homeSafeNote: {
    flexDirection: 'row',
    gap: 11,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
    marginTop: 15,
  },
  homeSafeIcon: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: colors.accentWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeSafeCopy: {
    flex: 1,
  },
  homeSafeTitle: {
    color: colors.blush,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 3,
  },
  homeSafeText: {
    color: colors.textSubtle,
    fontSize: 11,
    lineHeight: 16,
  },
  errorCard: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: 13,
    marginBottom: 14,
  },
  errorText: {
    color: colors.danger,
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.blushStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 3,
  },
  primaryButtonText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  disabledButton: {
    opacity: 0.55,
  },
  footerLine: {
    color: colors.textSubtle,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 17,
  },
});
