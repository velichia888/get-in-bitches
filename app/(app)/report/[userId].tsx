import { useState } from 'react';
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

import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth-context';
import { colors, radius } from '../../../lib/theme';

const REASONS = [
  'Unsafe driving',
  'Inappropriate behavior',
  'Harassment',
  'Vehicle mismatch',
  'Other',
];

export default function ReportUser() {
  const { userId: reportedUserId, rideId } =
    useLocalSearchParams<{ userId: string; rideId?: string }>();
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
      await supabase
        .from('blocks')
        .upsert({ blocker_id: userId, blocked_id: reportedUserId });
    }

    setSubmitting(false);
    setDone(true);
  }

  if (done) {
    return (
      <View style={styles.center}>
        <View style={styles.successIcon}>
          <Ionicons name="shield-checkmark" size={28} color={colors.success} />
        </View>
        <Text style={styles.eyebrow}>REPORT SUBMITTED</Text>
        <Text style={styles.title}>Thanks for telling us.</Text>
        <Text style={styles.subtitle}>
          {alsoBlock
            ? 'This user is blocked and won’t be matched with you again.'
            : 'Your report has been submitted.'}
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
          title: 'Report',
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
        <View style={styles.heroIcon}>
          <Ionicons name="flag-outline" size={24} color={colors.danger} />
        </View>
        <Text style={styles.eyebrow}>SAFETY FIRST</Text>
        <Text style={styles.title}>What happened?</Text>
        <Text style={styles.subtitle}>
          Tell us what went wrong. You can also block this person so they
          aren’t matched with you again.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>REASON</Text>

        <View style={styles.reasonList}>
          {REASONS.map((item) => {
            const selected = reason === item;

            return (
              <Pressable
                key={item}
                style={[styles.reasonRow, selected && styles.reasonRowSelected]}
                onPress={() => setReason(item)}
              >
                <View style={[styles.radio, selected && styles.radioActive]}>
                  {selected ? <View style={styles.radioInner} /> : null}
                </View>
                <Text
                  style={[
                    styles.reasonText,
                    selected && styles.reasonTextSelected,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>DETAILS</Text>

        <TextInput
          style={styles.input}
          placeholder="Add details (optional)"
          placeholderTextColor={colors.textSubtle}
          value={details}
          onChangeText={setDetails}
          multiline
          textAlignVertical="top"
        />

        <Pressable
          style={[styles.blockRow, alsoBlock && styles.blockRowSelected]}
          onPress={() => setAlsoBlock(!alsoBlock)}
        >
          <View style={[styles.checkBox, alsoBlock && styles.checkBoxSelected]}>
            {alsoBlock ? (
              <Ionicons name="checkmark" size={15} color={colors.ink} />
            ) : null}
          </View>

          <View style={styles.blockCopy}>
            <Text style={styles.blockTitle}>Also block this user</Text>
            <Text style={styles.blockText}>
              Prevent future matching with this person.
            </Text>
          </View>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={styles.button}
          onPress={submit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <>
              <Text style={styles.buttonText}>SUBMIT REPORT</Text>
              <Ionicons name="shield-checkmark-outline" size={17} color={colors.ink} />
            </>
          )}
        </Pressable>
      </View>
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
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 100, 124, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 100, 124, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
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
  card: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  sectionLabel: {
    color: colors.blushMuted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 9,
    marginTop: 4,
  },
  reasonList: {
    gap: 7,
    marginBottom: 17,
  },
  reasonRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
  },
  reasonRowSelected: {
    borderColor: colors.blushMuted,
    backgroundColor: '#1D151B',
  },
  radio: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    marginRight: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: colors.blushStrong,
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.blushStrong,
  },
  reasonText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  reasonTextSelected: {
    color: colors.blush,
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
    marginBottom: 13,
  },
  blockRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
  },
  blockRowSelected: {
    borderColor: colors.blushMuted,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkBoxSelected: {
    backgroundColor: colors.blushStrong,
    borderColor: colors.blushStrong,
  },
  blockCopy: { flex: 1 },
  blockTitle: {
    color: colors.blush,
    fontSize: 11,
    fontWeight: '800',
  },
  blockText: {
    color: colors.textSubtle,
    fontSize: 9,
    marginTop: 2,
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
});
