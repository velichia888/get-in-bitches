import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import { addCrewMemberByPhone } from '../../../lib/crew-service';
import { colors, radius, spacing } from '../../../lib/theme';

export default function InviteCrewMemberScreen() {
  const { crewId, crewName } = useLocalSearchParams<{
    crewId?: string;
    crewName?: string;
  }>();

  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedName, setAddedName] = useState<string | null>(null);

  async function handleAdd() {
    if (!crewId) {
      setError('Crew ID is missing.');
      return;
    }

    const value = phone.trim();

    if (!value) {
      setError('Enter the phone number on their GIB profile.');
      return;
    }

    setAdding(true);
    setError(null);
    setAddedName(null);

    try {
      const member = await addCrewMemberByPhone(crewId, value);

      setAddedName(
        member.profiles?.full_name || 'Crew member'
      );
      setPhone('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not add this person to the Crew.'
      );
    } finally {
      setAdding(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.hero}>
        <View style={styles.icon}>
          <Ionicons
            name="person-add"
            size={27}
            color={colors.accent}
          />
        </View>

        <Text style={styles.eyebrow}>ADD YOUR PEOPLE</Text>
        <Text style={styles.title}>Invite to the Crew</Text>

        <Text style={styles.subtitle}>
          Add someone who already has a GIB account using the exact
          phone number saved on their profile.
        </Text>

        {crewName ? (
          <Text style={styles.crewName}>{crewName}</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Their GIB phone number</Text>

        <TextInput
          style={styles.input}
          placeholder="(555) 123-4567"
          placeholderTextColor={colors.textMuted}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          editable={!adding}
          returnKeyType="done"
          onSubmitEditing={() => {
            if (!adding) {
              void handleAdd();
            }
          }}
        />

        <Text style={styles.help}>
          The number has to match what they saved in Profile.
          GIB does not show a public directory of users.
        </Text>

        {error ? (
          <View style={styles.messageError}>
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color={colors.danger}
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {addedName ? (
          <View style={styles.messageSuccess}>
            <Ionicons
              name="checkmark-circle"
              size={19}
              color={colors.success}
            />
            <Text style={styles.successText}>
              {addedName} is in the Crew.
            </Text>
          </View>
        ) : null}

        <Pressable
          style={[
            styles.primaryButton,
            adding && styles.disabledButton,
          ]}
          onPress={() => void handleAdd()}
          disabled={adding}
        >
          {adding ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <>
              <Ionicons
                name="person-add"
                size={19}
                color={colors.text}
              />
              <Text style={styles.primaryButtonText}>
                Add to Crew
              </Text>
            </>
          )}
        </Pressable>

        {addedName ? (
          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.secondaryButtonText}>
              Back to Crew
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.note}>
        <Ionicons
          name="information-circle-outline"
          size={18}
          color={colors.textMuted}
        />
        <Text style={styles.noteText}>
          Invite links and contact sharing can be added later without
          changing the underlying Crew membership model.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  hero: {
    marginBottom: spacing.lg,
  },
  icon: {
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
    fontSize: 28,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  crewName: {
    color: colors.text,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  label: {
    color: colors.text,
    fontWeight: '700',
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
  help: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  messageError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    flex: 1,
    lineHeight: 19,
  },
  messageSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  successText: {
    color: colors.success,
    flex: 1,
    fontWeight: '700',
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
  },
  disabledButton: {
    opacity: 0.6,
  },
  secondaryButton: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '700',
  },
  note: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  noteText: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
});
