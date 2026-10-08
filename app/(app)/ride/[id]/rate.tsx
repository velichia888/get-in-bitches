import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth-context';
import { colors, radius } from '../../../../lib/theme';

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
      const { data } = await supabase
        .from('rides')
        .select('rider_id, driver_id')
        .eq('id', id)
        .single();

      if (!data) return;

      setRateeId(
        data.rider_id === userId ? data.driver_id : data.rider_id
      );
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
        <View style={styles.successIcon}>
          <Ionicons name="checkmark" size={28} color={colors.success} />
        </View>
        <Text style={styles.eyebrow}>RIDE COMPLETE</Text>
        <Text style={styles.title}>Thanks for the rating.</Text>
        <Text style={styles.subtitle}>
          That’s one more ride wrapped. Keep the rest of the night with your Crew.
        </Text>

        <Pressable
          style={styles.button}
          onPress={() => router.replace('/(app)')}
        >
          <Text style={styles.buttonText}>BACK TO RIDE</Text>
          <Ionicons name="arrow-forward" size={17} color={colors.ink} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Rate Ride',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.blush,
          headerShadowVisible: false,
          headerTitleStyle: {
            color: colors.blush,
            fontFamily: 'Georgia',
            fontSize: 18,
          },
        }}
      />

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>ONE LAST THING</Text>
        <Text style={styles.title}>How was your ride?</Text>
        <Text style={styles.subtitle}>
          A quick rating helps keep the ride side of GIB useful and accountable.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>YOUR RATING</Text>

        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              style={styles.starButton}
              onPress={() => setStars(n)}
            >
              <Ionicons
                name={n <= stars ? 'star' : 'star-outline'}
                size={32}
                color={n <= stars ? colors.accent : colors.borderStrong}
              />
            </Pressable>
          ))}
        </View>

        <Text style={styles.ratingText}>
          {stars === 5
            ? 'Loved it'
            : stars === 4
              ? 'Pretty good'
              : stars === 3
                ? 'It was okay'
                : stars === 2
                  ? 'Not great'
                  : 'Needs attention'}
        </Text>

        <Text style={styles.sectionLabel}>OPTIONAL NOTE</Text>

        <TextInput
          style={styles.input}
          placeholder="Leave a comment"
          placeholderTextColor={colors.textSubtle}
          value={comment}
          onChangeText={setComment}
          multiline
          textAlignVertical="top"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={styles.button}
          onPress={submitRating}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <>
              <Text style={styles.buttonText}>SUBMIT RATING</Text>
              <Ionicons name="checkmark" size={17} color={colors.ink} />
            </>
          )}
        </Pressable>
      </View>

      <Pressable style={styles.reportButton} onPress={reportAndBlock}>
        <Ionicons name="flag-outline" size={16} color={colors.danger} />
        <Text style={styles.reportText}>Report or block this user</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  hero: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 20,
    marginBottom: 16,
  },
  eyebrow: {
    color: colors.blushMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 7,
    textAlign: 'center',
  },
  title: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 31,
    lineHeight: 35,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 7,
    maxWidth: 430,
  },
  successIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#0D1714',
    borderWidth: 1,
    borderColor: '#24483A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  card: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 17,
  },
  sectionLabel: {
    color: colors.blushMuted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginBottom: 8,
  },
  starButton: {
    padding: 3,
  },
  ratingText: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 22,
  },
  input: {
    minHeight: 92,
    backgroundColor: colors.surface,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    color: colors.text,
    padding: 13,
    fontSize: 12,
  },
  error: {
    color: colors.danger,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 10,
  },
  button: {
    minHeight: 49,
    backgroundColor: colors.blushStrong,
    borderRadius: radius.pill,
    marginTop: 15,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  reportButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  reportText: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '700',
  },
});
