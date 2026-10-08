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
import { useLocalSearchParams, useRouter } from 'expo-router';

import { addCrewMemberByPhone } from '../../../lib/crew-service';
import { colors, radius } from '../../../lib/theme';

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
      setAddedName(member.profiles?.full_name || 'Crew member');
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
      <View style={styles.topRow}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.blush} />
        </Pressable>

        <View style={styles.brandRow}>
          <Text style={styles.brand}>GIB</Text>
          <Ionicons name="sparkles" size={12} color={colors.accent} />
        </View>

        <View style={styles.topSpacer} />
      </View>

      <View style={styles.hero}>
        <View style={styles.icon}>
          <Ionicons name="person-add-outline" size={25} color={colors.accent} />
        </View>

        <Text style={styles.eyebrow}>ADD YOUR PEOPLE</Text>
        <Text style={styles.title}>Bring them</Text>
        <Text style={styles.titleAccent}>into the Crew.</Text>

        <Text style={styles.subtitle}>
          Add someone who already has GIB using the phone number saved on
          their profile.
        </Text>

        {crewName ? (
          <View style={styles.crewPill}>
            <Ionicons name="people-outline" size={14} color={colors.blush} />
            <Text style={styles.crewName}>{crewName}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionNumber}>01</Text>
        <Text style={styles.sectionTitle}>Find your person</Text>

        <Text style={styles.label}>Their GIB phone number</Text>

        <View style={styles.inputShell}>
          <Ionicons name="call-outline" size={18} color={colors.blushMuted} />
          <TextInput
            style={styles.input}
            placeholder="(555) 123-4567"
            placeholderTextColor={colors.textSubtle}
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
        </View>

        <Text style={styles.help}>
          The number must match what they saved in Profile. GIB does not expose
          a public user directory.
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
            <Text style={styles.successText}>{addedName} is in the Crew.</Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.primaryButton, adding && styles.disabledButton]}
          onPress={() => void handleAdd()}
          disabled={adding}
        >
          {adding ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>ADD TO CREW</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.ink} />
            </>
          )}
        </Pressable>

        {addedName ? (
          <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>BACK TO CREW</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.note}>
        <Ionicons
          name="information-circle-outline"
          size={17}
          color={colors.blushMuted}
        />
        <Text style={styles.noteText}>
          Invite links and contact sharing can be added later without changing
          the Crew membership model.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topSpacer: { width: 40, height: 40 },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  brand: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  hero: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 21,
    marginBottom: 16,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentWash,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },
  eyebrow: {
    color: colors.blushMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 6,
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
    marginBottom: 9,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 17,
    maxWidth: 480,
  },
  crewPill: {
    alignSelf: 'flex-start',
    marginTop: 11,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.backgroundElevated,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  crewName: {
    color: colors.blush,
    fontSize: 10,
    fontWeight: '800',
  },
  card: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  sectionNumber: {
    color: colors.blushStrong,
    fontFamily: 'Georgia',
    fontSize: 28,
    lineHeight: 30,
  },
  sectionTitle: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 20,
    marginBottom: 12,
  },
  label: {
    color: colors.blushMuted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  inputShell: {
    minHeight: 49,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    paddingVertical: 12,
  },
  help: {
    color: colors.textSubtle,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 7,
    marginBottom: 13,
  },
  messageError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(255, 100, 124, 0.06)',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 100, 124, 0.26)',
    padding: 11,
    marginBottom: 10,
  },
  errorText: {
    color: colors.danger,
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
  },
  messageSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0D1714',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#24483A',
    padding: 11,
    marginBottom: 10,
  },
  successText: {
    color: colors.success,
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
  },
  primaryButton: {
    minHeight: 49,
    backgroundColor: colors.blushStrong,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  disabledButton: { opacity: 0.55 },
  secondaryButton: {
    minHeight: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: colors.blushMuted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  note: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 3,
  },
  noteText: {
    color: colors.textSubtle,
    flex: 1,
    fontSize: 9,
    lineHeight: 14,
  },
});
