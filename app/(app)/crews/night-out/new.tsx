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
    throw new Error(
      'Use a date and time like 2026-10-10 19:30.'
    );
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
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="moon" size={27} color={colors.accent} />
          </View>

          <Text style={styles.eyebrow}>PLAN THE NIGHT</Text>
          <Text style={styles.title}>Night Out</Text>
          <Text style={styles.subtitle}>
            Who's going, where you're headed, and how everybody plans
            to get home.
          </Text>

          {crew ? (
            <View style={styles.crewPill}>
              <Ionicons
                name="people"
                size={15}
                color={colors.accent}
              />
              <Text style={styles.crewPillText}>{crew.name}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>What's the plan?</Text>

          <Text style={styles.label}>Night Out name</Text>
          <TextInput
            style={styles.input}
            placeholder="Saturday Night"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            maxLength={80}
            editable={!creating}
          />

          <Text style={styles.label}>Destination</Text>
          <TextInput
            style={styles.input}
            placeholder="Old Town Scottsdale"
            placeholderTextColor={colors.textMuted}
            value={destination}
            onChangeText={setDestination}
            maxLength={120}
            editable={!creating}
          />

          <Text style={styles.label}>Starts</Text>
          <TextInput
            style={styles.input}
            placeholder="2026-10-10 19:30"
            placeholderTextColor={colors.textMuted}
            value={startsAt}
            onChangeText={setStartsAt}
            autoCapitalize="none"
            editable={!creating}
          />

          <Text style={styles.help}>
            Use YYYY-MM-DD HH:MM for now. We'll replace this with the
            native date/time picker during the UI pass.
          </Text>

          <Text style={styles.label}>Plan to head home around</Text>
          <TextInput
            style={styles.input}
            placeholder="2026-10-11 00:30"
            placeholderTextColor={colors.textMuted}
            value={plannedReturnAt}
            onChangeText={setPlannedReturnAt}
            autoCapitalize="none"
            editable={!creating}
          />

          <Text style={styles.label}>Transportation plan</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Dinner → Bar → GIB ride home"
            placeholderTextColor={colors.textMuted}
            value={transportationPlan}
            onChangeText={setTransportationPlan}
            multiline
            textAlignVertical="top"
            maxLength={240}
            editable={!creating}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.participantHeader}>
            <View style={styles.participantHeading}>
              <Text style={styles.sectionTitle}>Who's coming?</Text>
              <Text style={styles.sectionSubtitle}>
                {selectedCount} selected
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

          {members.map((member) => {
            const selected = selectedIds.includes(member.profile_id);
            const nameValue =
              member.profiles?.full_name || 'Crew member';

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
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberInitial}>
                    {nameValue.trim()[0]?.toUpperCase() ?? '?'}
                  </Text>
                </View>

                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{nameValue}</Text>
                  <Text style={styles.memberRole}>
                    {member.role === 'owner' ? 'Crew owner' : 'Member'}
                  </Text>
                </View>

                <Ionicons
                  name={
                    selected
                      ? 'checkmark-circle'
                      : 'ellipse-outline'
                  }
                  size={26}
                  color={
                    selected ? colors.accent : colors.textMuted
                  }
                />
              </Pressable>
            );
          })}
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Ionicons
              name="alert-circle-outline"
              size={19}
              color={colors.danger}
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          style={[
            styles.primaryButton,
            creating && styles.disabledButton,
          ]}
          onPress={() => void handleCreate()}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <>
              <Ionicons
                name="sparkles"
                size={19}
                color={colors.text}
              />
              <Text style={styles.primaryButtonText}>
                Plan Night Out
              </Text>
            </>
          )}
        </Pressable>

        <View style={styles.safetyNote}>
          <Ionicons
            name="shield-checkmark-outline"
            size={19}
            color={colors.accent}
          />
          <Text style={styles.safetyNoteText}>
            This Night Out becomes the shared safety context for your
            Crew — from going out through getting everybody Home Safe.
          </Text>
        </View>
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
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  hero: {
    marginBottom: spacing.lg,
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
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
  crewPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    marginTop: spacing.md,
  },
  crewPillText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 13,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  label: {
    color: colors.text,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: spacing.md,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 90,
  },
  help: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  participantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  participantHeading: {
    flex: 1,
  },
  selectAllButton: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selectAllText: {
    color: colors.accent,
    fontWeight: '700',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  memberRowSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  memberInitial: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 16,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: colors.text,
    fontWeight: '700',
  },
  memberRole: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  errorCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    flex: 1,
    lineHeight: 19,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  primaryButtonText: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  safetyNote: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  safetyNoteText: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
});
