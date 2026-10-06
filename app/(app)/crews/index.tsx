import { useCallback, useState } from 'react';
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

import { createCrew, listMyCrews } from '../../../lib/crew-service';
import type { Crew } from '../../../lib/crew-types';
import { colors, radius, spacing } from '../../../lib/theme';

export default function CrewsScreen() {
  const router = useRouter();

  const [crews, setCrews] = useState<Crew[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [crewName, setCrewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadCrews = useCallback(async () => {
    setError(null);

    try {
      const data = await listMyCrews();
      setCrews(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your Crews.');
    } finally {
      setLoading(false);
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

      setCrewName('');
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
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="people" size={26} color={colors.accent} />
        </View>

        <Text style={styles.eyebrow}>GET IN BITCHES</Text>
        <Text style={styles.title}>Who's coming out?</Text>
        <Text style={styles.subtitle}>
          Your night starts with your people. Build a Crew, plan the Night
          Out, get everybody a ride, and don't call it done until everyone's
          Home Safe.
        </Text>

        <View style={styles.journey}>
          <View style={styles.journeyStep}>
            <Ionicons name="people" size={16} color={colors.accent} />
            <Text style={styles.journeyText}>Crew</Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={14}
            color={colors.textMuted}
          />

          <View style={styles.journeyStep}>
            <Ionicons name="moon" size={16} color={colors.accent} />
            <Text style={styles.journeyText}>Night Out</Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={14}
            color={colors.textMuted}
          />

          <View style={styles.journeyStep}>
            <Ionicons
              name="car-sport"
              size={16}
              color={colors.accent}
            />
            <Text style={styles.journeyText}>Get Us Home</Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={14}
            color={colors.textMuted}
          />

          <View style={styles.journeyStep}>
            <Ionicons
              name="shield-checkmark"
              size={16}
              color={colors.success}
            />
            <Text style={styles.journeyText}>Home Safe</Text>
          </View>
        </View>
      </View>

      <View style={styles.headingRow}>
        <Text style={styles.sectionTitle}>My Crews</Text>

        <Pressable
          style={styles.createButton}
          onPress={() => {
            setError(null);
            setShowCreate((current) => !current);
          }}
        >
          <Ionicons
            name={showCreate ? 'close' : 'add'}
            size={20}
            color={colors.text}
          />
          <Text style={styles.createButtonText}>
            {showCreate ? 'Cancel' : 'New Crew'}
          </Text>
        </Pressable>
      </View>

      {showCreate && (
        <View style={styles.createCard}>
          <Text style={styles.createTitle}>Name your Crew</Text>
          <Text style={styles.createHint}>
            Roommates, best friends, coworkers — whoever you actually go out with.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="The Girls"
            placeholderTextColor={colors.textMuted}
            value={crewName}
            onChangeText={setCrewName}
            autoCapitalize="words"
            maxLength={60}
            editable={!creating}
            returnKeyType="done"
            onSubmitEditing={() => {
              if (!creating) {
                void handleCreateCrew();
              }
            }}
          />

          <Pressable
            style={[styles.primaryButton, creating && styles.buttonDisabled]}
            onPress={() => void handleCreateCrew()}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <>
                <Ionicons name="people" size={19} color={colors.text} />
                <Text style={styles.primaryButtonText}>Create Crew</Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={crews}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={crews.length === 0 ? styles.emptyList : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => void loadCrews()}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons
              name="people-outline"
              size={42}
              color={colors.textMuted}
            />
            <Text style={styles.emptyTitle}>No Crew yet</Text>
            <Text style={styles.emptyText}>
              Start with the people you'd want beside you on a night out.
            </Text>

            {!showCreate && (
              <Pressable
                style={styles.emptyAction}
                onPress={() => setShowCreate(true)}
              >
                <Text style={styles.emptyActionText}>Create your first Crew</Text>
              </Pressable>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.crewCard,
              pressed && styles.crewCardPressed,
            ]}
            onPress={() => router.push(`/(app)/crews/${item.id}`)}
          >
            <View style={styles.crewAvatar}>
              <Ionicons name="people" size={24} color={colors.accent} />
            </View>

            <View style={styles.crewInfo}>
              <Text style={styles.crewName}>{item.name}</Text>
              <Text style={styles.crewMeta}>
                Tap to see your people and plan what's next.
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={22}
              color={colors.textMuted}
            />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    marginBottom: spacing.xl,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.6,
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
    maxWidth: 440,
  },
  journey: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  journeyStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  journeyText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },

  headingRow: {
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  createButtonText: {
    color: colors.text,
    fontWeight: '700',
  },
  createCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  createTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  createHint: {
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  primaryButton: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  primaryButtonText: {
    color: colors.text,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyCard: {
    flex: 1,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 300,
  },
  emptyAction: {
    marginTop: spacing.lg,
  },
  emptyActionText: {
    color: colors.accent,
    fontWeight: '700',
  },
  crewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  crewCardPressed: {
    backgroundColor: colors.surfaceRaised,
  },
  crewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  crewInfo: {
    flex: 1,
  },
  crewName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  crewMeta: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
