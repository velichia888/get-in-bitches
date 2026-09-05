import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth-context';
import { colors, spacing, radius } from '../../../../lib/theme';

export default function RateRide() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();

  const [rateeId, setRateeId] = useState<string | null>(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const userId = session?.user.id;

  useEffect(() => {
    async function loadRide() {
      const { data } = await supabase.from('rides').select('rider_id, driver_id').eq('id', id).single();
      if (!data) return;
      setRateeId(data.rider_id === userId ? data.driver_id : data.rider_id);
    }
    loadRide();
  }, [id, userId]);

  async function submitRating() {
    if (!userId || !rateeId || !id) return;
    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from('ratings').insert({
      ride_id: id,
      rater_id: userId,
      ratee_id: rateeId,
      stars,
      comment: comment || null,
    });

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSubmitted(true);
  }

  async function reportAndBlock() {
    if (!userId || !rateeId) return;
    router.push(`/(app)/report/${rateeId}?rideId=${id}`);
  }

  if (submitted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Thanks for rating your ride!</Text>
        <Pressable style={styles.button} onPress={() => router.replace('/(app)')}>
          <Text style={styles.buttonText}>Back to Home</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Rate Ride', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />

      <Text style={styles.title}>How was your ride?</Text>

      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setStars(n)}>
            <Text style={[styles.star, n <= stars && styles.starActive]}>★</Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Leave a comment (optional)"
        placeholderTextColor={colors.textMuted}
        value={comment}
        onChangeText={setComment}
        multiline
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.button} onPress={submitRating} disabled={submitting}>
        {submitting ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Submit Rating</Text>}
      </Pressable>

      <Pressable style={styles.reportButton} onPress={reportAndBlock}>
        <Text style={styles.reportText}>Report or block this user</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  title: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: spacing.lg, textAlign: 'center' },
  starsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.lg },
  star: { fontSize: 40, color: colors.border, marginHorizontal: spacing.xs },
  starActive: { color: colors.accent },
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
  reportButton: { alignItems: 'center', marginTop: spacing.lg },
  reportText: { color: colors.danger },
});
