import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { colors, radius } from '../../lib/theme';

type Profile = {
  id: string;
  full_name: string;
  role: 'rider' | 'driver';
  phone: string | null;
};

export default function ProfileScreen() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user.id;

  const load = useCallback(async () => {
    if (!userId) return;

    const { data: privateProfiles } = await supabase.rpc('get_my_private_profile');
    const data = Array.isArray(privateProfiles)
      ? privateProfiles[0] ?? null
      : null;

    if (data) {
      setProfile(data);
      setFullName(data.full_name ?? '');
      setPhone(data.phone ?? '');
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function save() {
    if (!userId) return;

    setSaving(true);
    await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', userId);
    setSaving(false);
    load();
  }

  async function switchRole() {
    if (!userId || !profile) return;

    const nextRole = profile.role === 'rider' ? 'driver' : 'rider';

    await supabase.from('profiles').update({ role: nextRole }).eq('id', userId);

    if (nextRole === 'driver') {
      await supabase.from('driver_status').upsert({
        profile_id: userId,
        is_online: false,
      });
    }

    load();
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function deleteAccount() {
    if (!session) return;

    setDeleting(true);
    setError(null);

    try {
      const { error: fnError } = await supabase.functions.invoke('delete-account', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (fnError) {
        setError(fnError.message);
        setDeleting(false);
        return;
      }

      await supabase.auth.signOut();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete account.'
      );
      setDeleting(false);
    }
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const initials =
    fullName
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 18 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>GIB</Text>
          <Ionicons name="sparkles" size={12} color={colors.accent} />
        </View>
        <Text style={styles.eyebrow}>YOUR PROFILE</Text>
        <Text style={styles.title}>Your night.</Text>
        <Text style={styles.titleAccent}>Your settings.</Text>
      </View>

      <View style={styles.identityCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={styles.identityCopy}>
          <Text style={styles.identityName}>{fullName || 'Your profile'}</Text>
          <Text style={styles.identityMeta}>
            {profile.role === 'driver' ? 'Driver mode' : 'Rider mode'}
          </Text>
        </View>

        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>
            {profile.role.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionNumber}>01</Text>
        <Text style={styles.sectionTitle}>Your details</Text>
        <Text style={styles.sectionSubtitle}>
          Keep the basics current so your Crew knows who they’re looking out for.
        </Text>

        <Text style={styles.label}>Full name</Text>
        <View style={styles.inputShell}>
          <Ionicons name="person-outline" size={18} color={colors.blushMuted} />
          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor={colors.textSubtle}
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        <Text style={styles.label}>Phone</Text>
        <View style={styles.inputShell}>
          <Ionicons name="call-outline" size={18} color={colors.blushMuted} />
          <TextInput
            style={styles.input}
            placeholder="Phone"
            placeholderTextColor={colors.textSubtle}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <Pressable style={styles.primaryButton} onPress={save} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>SAVE CHANGES</Text>
              <Ionicons name="checkmark" size={18} color={colors.ink} />
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionNumber}>02</Text>
        <Text style={styles.sectionTitle}>App mode</Text>
        <Text style={styles.sectionSubtitle}>
          You’re currently using GIB as a {profile.role}.
        </Text>

        <Pressable style={styles.secondaryButton} onPress={switchRole}>
          <View style={styles.secondaryButtonIcon}>
            <Ionicons
              name={profile.role === 'driver' ? 'person-outline' : 'car-outline'}
              size={18}
              color={colors.blush}
            />
          </View>
          <View style={styles.secondaryButtonCopy}>
            <Text style={styles.secondaryButtonTitle}>
              Switch to {profile.role === 'driver' ? 'Rider' : 'Driver'}
            </Text>
            <Text style={styles.secondaryButtonSubtitle}>
              Change the mode you use for rides.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionNumber}>03</Text>
        <Text style={styles.sectionTitle}>Account</Text>

        <Pressable style={styles.accountRow} onPress={signOut}>
          <View style={styles.accountRowCopy}>
            <Text style={styles.accountRowTitle}>Sign Out</Text>
            <Text style={styles.accountRowSubtitle}>
              Leave this session on this device.
            </Text>
          </View>
          <Ionicons name="log-out-outline" size={19} color={colors.blushMuted} />
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!confirmingDelete ? (
          <Pressable
            style={styles.dangerRow}
            onPress={() => setConfirmingDelete(true)}
          >
            <View style={styles.accountRowCopy}>
              <Text style={styles.dangerTitle}>Delete Account</Text>
              <Text style={styles.accountRowSubtitle}>
                Permanently remove your GIB account and ride history.
              </Text>
            </View>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </Pressable>
        ) : (
          <View style={styles.confirmBox}>
            <Ionicons name="warning-outline" size={22} color={colors.danger} />
            <Text style={styles.confirmTitle}>Delete this account?</Text>
            <Text style={styles.confirmText}>
              This permanently deletes your account and all of your ride history.
              This can’t be undone.
            </Text>

            <View style={styles.confirmRow}>
              <Pressable
                style={styles.confirmCancel}
                onPress={() => setConfirmingDelete(false)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={styles.dangerButton}
                onPress={deleteAccount}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <Text style={styles.dangerButtonText}>DELETE</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <Text style={styles.footer}>GOOD FRIENDS / SAFER NIGHTS</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 80,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    paddingBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginBottom: 17,
  },
  brand: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: 1.2,
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
    fontSize: 35,
    lineHeight: 38,
  },
  titleAccent: {
    color: colors.accent,
    fontFamily: 'Georgia',
    fontSize: 35,
    lineHeight: 38,
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentWash,
    borderWidth: 1,
    borderColor: colors.blushMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  avatarText: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 17,
    fontWeight: '700',
  },
  identityCopy: { flex: 1 },
  identityName: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 18,
  },
  identityMeta: {
    color: colors.textSubtle,
    fontSize: 10,
    marginTop: 2,
  },
  roleBadge: {
    borderRadius: radius.pill,
    backgroundColor: colors.accentWash,
    borderWidth: 1,
    borderColor: colors.accentSoft,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  roleBadgeText: {
    color: colors.accentBright,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  section: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
  },
  sectionNumber: {
    color: colors.blushStrong,
    fontFamily: 'Georgia',
    fontSize: 28,
    lineHeight: 31,
  },
  sectionTitle: {
    color: colors.blush,
    fontFamily: 'Georgia',
    fontSize: 21,
    marginTop: -1,
  },
  sectionSubtitle: {
    color: colors.textSubtle,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
    marginBottom: 12,
  },
  label: {
    color: colors.blushMuted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 10,
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
  primaryButton: {
    minHeight: 49,
    marginTop: 15,
    borderRadius: radius.pill,
    backgroundColor: colors.blushStrong,
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
  secondaryButton: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    padding: 11,
    marginTop: 12,
  },
  secondaryButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonCopy: { flex: 1 },
  secondaryButtonTitle: {
    color: colors.blush,
    fontSize: 12,
    fontWeight: '800',
  },
  secondaryButtonSubtitle: {
    color: colors.textSubtle,
    fontSize: 9,
    marginTop: 2,
  },
  accountRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    marginTop: 12,
  },
  accountRowCopy: { flex: 1 },
  accountRowTitle: {
    color: colors.blush,
    fontSize: 12,
    fontWeight: '800',
  },
  accountRowSubtitle: {
    color: colors.textSubtle,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 2,
  },
  dangerRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 100, 124, 0.28)',
    backgroundColor: 'rgba(255, 100, 124, 0.05)',
    padding: 12,
    marginTop: 8,
  },
  dangerTitle: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800',
  },
  error: {
    color: colors.danger,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 10,
  },
  confirmBox: {
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 100, 124, 0.32)',
    backgroundColor: 'rgba(255, 100, 124, 0.05)',
    padding: 13,
    marginTop: 9,
  },
  confirmTitle: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 7,
  },
  confirmText: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },
  confirmRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  confirmCancel: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    color: colors.blushMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  dangerButton: {
    flex: 1,
    minHeight: 42,
    backgroundColor: colors.danger,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  footer: {
    color: colors.textSubtle,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 5,
  },
});
