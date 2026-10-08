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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
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
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 18 }]}
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
            <Text style={styles.title}>The night ends</Text>
            <Text style={styles.titleAccent}>Home Safe.</Text>
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
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 80,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  hero: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 26,
  },
  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.accentWash,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  eyebrow: {
    color: colors.blushMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 34,
    lineHeight: 37,
  },
  titleAccent: {
    color: colors.accent,
    fontFamily: 'Georgia',
    fontSize: 34,
    lineHeight: 37,
    marginBottom: 11,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  primaryButton: {
    marginTop: 17,
    backgroundColor: colors.blushStrong,
    borderRadius: radius.pill,
    minHeight: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  sectionHeader: { marginBottom: 12, marginTop: 4 },
  sectionEyebrow: {
    color: colors.blushMuted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.8,
    marginBottom: 4,
  },
  sectionTitle: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 23,
    lineHeight: 27,
  },
  sectionDescription: {
    color: colors.textSubtle,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  loopCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
    marginBottom: 12,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepIcon: {
    width: 37,
    height: 37,
    borderRadius: 19,
    backgroundColor: colors.accentWash,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  stepCopy: { flex: 1, paddingTop: 1 },
  stepTitle: {
    color: colors.blush,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 3,
  },
  stepBody: {
    color: colors.textSubtle,
    fontSize: 11,
    lineHeight: 16,
  },
  stepConnector: {
    width: 1,
    height: 14,
    backgroundColor: colors.accent,
    marginLeft: 18,
    marginVertical: 4,
  },
  callout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: '#0D1714',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#24483A',
    padding: 13,
    marginBottom: 25,
  },
  calloutCopy: { flex: 1 },
  calloutTitle: {
    color: colors.blush,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 3,
  },
  calloutBody: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 15,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 16,
    padding: 13,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipCopy: { flex: 1 },
  tipTitle: {
    color: colors.blush,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 3,
  },
  tipBody: {
    color: colors.textSubtle,
    fontSize: 10,
    lineHeight: 15,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 15,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.border,
  },
  muted: { color: colors.textSubtle, fontSize: 11 },
  blockedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.backgroundElevated,
    borderRadius: 15,
    padding: 13,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  blockedIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  blockedName: { color: colors.blush, fontSize: 12, fontWeight: '700' },
  unblockButton: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  unblockText: {
    color: colors.accentBright,
    fontSize: 10,
    fontWeight: '800',
  },
});
