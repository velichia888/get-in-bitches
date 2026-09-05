import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth-context';
import { colors, spacing, radius } from '../../../lib/theme';

const REASONS = ['Unsafe driving', 'Inappropriate behavior', 'Harassment', 'Vehicle mismatch', 'Other'];

export default function ReportUser() {
  const { userId: reportedUserId, rideId } = useLocalSearchParams<{ userId: string; rideId?: string }>();
  const { session } = useAuth();
  const router = useRouter();

  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const userId = session?.user.id;

  async function submit() {
    if (!userId || !reportedUserId) return;
    setSubmitting(true);
    setError(null);

    const { error: reportError } = await supabase.from('reports').insert({
      reporter_id: userId,
      reported_user_id: reportedUserId,
      ride_id: rideId ?? null,
      reason,
      details: details || null,
    });

    if (reportError) {
      setSubmitting(false);
      setError(reportError.message);
      return;
    }

    if (alsoBlock) {
      await supabase.from('blocks').upsert({ blocker_id: userId, blocked_id: reportedUserId });
    }

    setSubmitting(false);
    setDone(true);
  }

  if (done) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Report submitted</Text>
        <Text style={styles.muted}>
          {alsoBlock ? "This user is blocked and won't be matched with you again." : 'Thanks for letting us know.'}
        </Text>
        <Pressable style={styles.button} onPress={() => router.replace('/(app)')}>
          <Text style={styles.buttonText}>Back to Home</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Report', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />

      <Text style={styles.title}>What happened?</Text>

      {REASONS.map((r) => (
        <Pressable key={r} style={styles.reasonRow} onPress={() => setReason(r)}>
          <View style={[styles.radio, reason === r && styles.radioActive]} />
          <Text style={styles.reasonText}>{r}</Text>
        </Pressable>
      ))}

      <TextInput
        style={styles.input}
        placeholder="Add details (optional)"
        placeholderTextColor={colors.textMuted}
        value={details}
        onChangeText={setDetails}
        multiline
      />

      <Pressable style={styles.reasonRow} onPress={() => setAlsoBlock(!alsoBlock)}>
        <View style={[styles.radio, alsoBlock && styles.radioActive]} />
        <Text style={styles.reasonText}>Also block this user</Text>
      </Pressable>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.button} onPress={submit} disabled={submitting}>
        {submitting ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Submit Report</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  title: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: spacing.lg, textAlign: 'center' },
  muted: { color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg },
  reasonRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, marginRight: spacing.sm },
  radioActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  reasonText: { color: colors.text },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  error: { color: colors.danger, marginBottom: spacing.sm },
  button: { backgroundColor: colors.accent, borderRadius: radius.sm, padding: spacing.md, alignItems: 'center' },
  buttonText: { color: colors.text, fontWeight: '700' },
});
