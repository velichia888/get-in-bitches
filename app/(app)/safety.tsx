import { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { colors, spacing, radius } from '../../lib/theme';

const SAFETY_STEPS = [
  {
    icon: 'people' as const,
    title: 'Start with your Crew',
    body: "Put your people together before the night starts so GIB knows who's part of the plan.",
  },
  {
    icon: 'moon' as const,
    title: 'Plan the Night Out',
    body: 'Keep the destination, timing, transportation plan, and everyone going in one place.',
  },
  {
    icon: 'car-sport' as const,
    title: 'Get Us Home',
    body: 'Request the ride from the Night Out so the trip stays connected to the group.',
  },
  {
    icon: 'shield-checkmark' as const,
    title: 'Everyone Home Safe',
    body: "Going, Riding, Dropped Off, Home Safe — the night isn't wrapped until your people are accounted for.",
  },
];

const RIDE_SAFETY_TIPS = [
  {
    title: 'Verify before you ride',
    body: "Check that the driver's name and vehicle in the app match who actually pulls up before you get in.",
  },
  {
    title: 'Trust your instincts',
    body: 'If something feels off, cancel the ride and report the problem. Your safety comes before the trip.',
  },
];

type BlockedUser = {
  id: string;
  blocked_id: string;
  full_name: string;
};

export default function Safety() {
  const { session } = useAuth();
  const router = useRouter();
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const userId = session?.user.id;

  const loadBlocked = useCallback(async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('blocks')
      .select('id, blocked_id, profiles:blocked_id (full_name)')
      .eq('blocker_id', userId);

    setBlocked(
      (data ?? []).map((row: any) => ({
        id: row.id,
        blocked_id: row.blocked_id,
        full_name: row.profiles?.full_name || 'Unknown user',
      }))
    );
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadBlocked();
    }, [loadBlocked])
  );

  async function unblock(blockRowId: string) {
    await supabase.from('blocks').delete().eq('id', blockRowId);
    loadBlocked();
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={blocked}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <>
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons
                name="shield-checkmark"
                size={28}
                color={colors.accent}
              />
            </View>

            <Text style={styles.eyebrow}>NO BITCH LEFT BEHIND</Text>
            <Text style={styles.title}>The night ends when everybody's safe.</Text>
            <Text style={styles.subtitle}>
              GIB keeps your people, your Night Out, the ride home, and each
              person's Home Safe status connected instead of treating safety
              like an afterthought.
            </Text>

            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push('/(app)/crews')}
            >
              <Ionicons name="people" size={18} color={colors.text} />
              <Text style={styles.primaryButtonText}>Go to My Crews</Text>
            </Pressable>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>THE GIB SAFETY LOOP</Text>
            <Text style={styles.sectionTitle}>Stay together from plan to home.</Text>
          </View>

          <View style={styles.loopCard}>
            {SAFETY_STEPS.map((step, index) => (
              <View key={step.title}>
                <View style={styles.step}>
                  <View style={styles.stepIcon}>
                    <Ionicons
                      name={step.icon}
                      size={19}
                      color={
                        index === SAFETY_STEPS.length - 1
                          ? colors.success
                          : colors.accent
                      }
                    />
                  </View>

                  <View style={styles.stepCopy}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepBody}>{step.body}</Text>
                  </View>
                </View>

                {index < SAFETY_STEPS.length - 1 && (
                  <View style={styles.stepConnector} />
                )}
              </View>
            ))}
          </View>

          <View style={styles.callout}>
            <Ionicons
              name="checkmark-circle"
              size={22}
              color={colors.success}
            />
            <View style={styles.calloutCopy}>
              <Text style={styles.calloutTitle}>Home Safe means accounted for.</Text>
              <Text style={styles.calloutBody}>
                A Crew can see who is still Going, Riding, or Dropped Off and
                who has made it Home Safe.
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>WHEN YOU'RE RIDING</Text>
            <Text style={styles.sectionTitle}>Keep the basics covered too.</Text>
          </View>

          {RIDE_SAFETY_TIPS.map((tip) => (
            <View key={tip.title} style={styles.tipCard}>
              <Ionicons
                name="shield-outline"
                size={20}
                color={colors.accent}
              />
              <View style={styles.tipCopy}>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipBody}>{tip.body}</Text>
              </View>
            </View>
          ))}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>YOUR BOUNDARIES</Text>
            <Text style={styles.sectionTitle}>Blocked users</Text>
            <Text style={styles.sectionDescription}>
              Anyone you block stays listed here so you can manage that choice
              whenever you need to.
            </Text>
          </View>
        </>
      }
      ListEmptyComponent={
        <View style={styles.emptyCard}>
          <Ionicons
            name="checkmark-circle-outline"
            size={22}
            color={colors.textMuted}
          />
          <Text style={styles.muted}>You haven't blocked anyone.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.blockedRow}>
          <View style={styles.blockedIdentity}>
            <Ionicons
              name="person-circle-outline"
              size={22}
              color={colors.textMuted}
            />
            <Text style={styles.blockedName}>{item.full_name}</Text>
          </View>

          <Pressable
            style={styles.unblockButton}
            onPress={() => unblock(item.id)}
          >
            <Text style={styles.unblockText}>Unblock</Text>
          </Pressable>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  hero: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accentSoft,
    padding: spacing.lg,
    marginBottom: spacing.xl,
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
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  primaryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryButtonText: {
    color: colors.text,
    fontWeight: '800',
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionEyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  sectionDescription: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  loopCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  stepCopy: {
    flex: 1,
    paddingTop: 1,
  },
  stepTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  stepBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  stepConnector: {
    width: 2,
    height: spacing.md,
    backgroundColor: colors.border,
    marginLeft: 18,
    marginVertical: spacing.xs,
  },
  callout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  calloutCopy: {
    flex: 1,
  },
  calloutTitle: {
    color: colors.text,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  calloutBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipCopy: {
    flex: 1,
  },
  tipTitle: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  tipBody: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  muted: {
    color: colors.textMuted,
  },
  blockedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  blockedIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  blockedName: {
    color: colors.text,
  },
  unblockButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  unblockText: {
    color: colors.accent,
    fontWeight: '700',
  },
});
