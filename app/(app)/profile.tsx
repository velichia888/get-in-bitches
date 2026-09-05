import { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { colors, spacing, radius } from '../../lib/theme';

type Profile = {
  id: string;
  full_name: string;
  role: 'rider' | 'driver';
  phone: string | null;
};

export default function ProfileScreen() {
  const { session } = useAuth();
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
    const { data } = await supabase.from('profiles').select('id, full_name, role, phone').eq('id', userId).single();
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
      await supabase.from('driver_status').upsert({ profile_id: userId, is_online: false });
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

      // The edge function deletes the auth.users row (cascading to
      // profiles and everything else); sign out locally to clear the now
      // -invalid session.
      await supabase.auth.signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account.');
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

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Profile</Text>

      <TextInput style={styles.input} placeholder="Full name" placeholderTextColor={colors.textMuted} value={fullName} onChangeText={setFullName} />
      <TextInput style={styles.input} placeholder="Phone" placeholderTextColor={colors.textMuted} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

      <Pressable style={styles.button} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Save</Text>}
      </Pressable>

      <View style={styles.roleRow}>
        <Text style={styles.text}>Currently: {profile.role === 'driver' ? 'Driver' : 'Rider'}</Text>
        <Pressable style={styles.secondaryButton} onPress={switchRole}>
          <Text style={styles.secondaryButtonText}>Switch to {profile.role === 'driver' ? 'Rider' : 'Driver'}</Text>
        </Pressable>
      </View>

      <Pressable style={styles.secondaryButton} onPress={signOut}>
        <Text style={styles.secondaryButtonText}>Sign Out</Text>
      </Pressable>

      {error && <Text style={styles.error}>{error}</Text>}

      {!confirmingDelete ? (
        <Pressable style={styles.dangerLink} onPress={() => setConfirmingDelete(true)}>
          <Text style={styles.dangerText}>Delete Account</Text>
        </Pressable>
      ) : (
        <View style={styles.confirmBox}>
          <Text style={styles.text}>This permanently deletes your account and all of your ride history. This can't be undone.</Text>
          <View style={styles.confirmRow}>
            <Pressable style={styles.secondaryButton} onPress={() => setConfirmingDelete(false)}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.dangerButton} onPress={deleteAccount} disabled={deleting}>
              {deleting ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Confirm Delete</Text>}
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: spacing.md },
  text: { color: colors.text, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  error: { color: colors.danger, marginVertical: spacing.sm },
  button: { backgroundColor: colors.accent, borderRadius: radius.sm, padding: spacing.md, alignItems: 'center', marginBottom: spacing.lg },
  buttonText: { color: colors.text, fontWeight: '700' },
  roleRow: { marginBottom: spacing.md },
  secondaryButton: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  secondaryButtonText: { color: colors.text, fontWeight: '600' },
  dangerLink: { marginTop: spacing.xl, alignItems: 'center' },
  dangerText: { color: colors.danger, fontWeight: '600' },
  confirmBox: { marginTop: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md },
  confirmRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  dangerButton: { flex: 1, backgroundColor: colors.danger, borderRadius: radius.sm, padding: spacing.md, alignItems: 'center' },
});
