import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { colors, spacing, radius } from '../../lib/theme';

const SAFETY_TIPS = [
  {
    title: 'Verify before you ride',
    body: "Check that the driver's name and vehicle in the app match who actually pulls up before you get in.",
  },
  {
    title: 'Share your ride',
    body: 'Send a friend your pickup and dropoff details for any ride, especially at night.',
  },
  {
    title: 'Trust your instincts',
    body: 'If something feels off, cancel the ride from the ride screen and report it from your ride history.',
  },
];

type BlockedUser = {
  id: string; // block row id
  blocked_id: string;
  full_name: string;
};

export default function Safety() {
  const { session } = useAuth();
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
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Safety Center</Text>

      {SAFETY_TIPS.map((tip) => (
        <View key={tip.title} style={styles.tipCard}>
          <Ionicons name="shield-checkmark" size={20} color={colors.accent} style={{ marginBottom: spacing.xs }} />
          <Text style={styles.tipTitle}>{tip.title}</Text>
          <Text style={styles.tipBody}>{tip.body}</Text>
        </View>
      ))}

      <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Blocked users</Text>
      <FlatList
        data={blocked}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.muted}>You haven't blocked anyone.</Text>}
        renderItem={({ item }) => (
          <View style={styles.blockedRow}>
            <Text style={styles.blockedName}>{item.full_name}</Text>
            <Pressable onPress={() => unblock(item.id)}>
              <Text style={styles.unblockText}>Unblock</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: spacing.md },
  tipCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipTitle: { color: colors.text, fontWeight: '700', marginBottom: spacing.xs },
  tipBody: { color: colors.textMuted },
  muted: { color: colors.textMuted },
  blockedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  blockedName: { color: colors.text },
  unblockText: { color: colors.accent, fontWeight: '600' },
});
