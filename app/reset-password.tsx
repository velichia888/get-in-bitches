import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../lib/theme';
import {
  PASSWORD_RECOVERY_REDIRECT,
  parsePasswordRecoveryUrl,
} from '../lib/password-recovery';

export default function ResetPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [readyToUpdate, setReadyToUpdate] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The Supabase client deliberately disables automatic URL handling in
  // React Native. Consume recovery links explicitly without logging tokens.
  useEffect(() => {
    let mounted = true;
    void Linking.getInitialURL().then((url) => {
      if (mounted && url) setLinkUrl(url);
    }).catch(() => {
      // No cold-start recovery link. The email request form remains usable.
    });
    const listener = Linking.addEventListener('url', (event) => {
      if (mounted) setLinkUrl(event.url);
    });
    return () => {
      mounted = false;
      listener.remove();
    };
  }, []);

  useEffect(() => {
    if (!linkUrl) return;
    const payload = parsePasswordRecoveryUrl(linkUrl);
    if (!payload) return;
    let active = true;

    async function recover() {
      setLinkLoading(true);
      setError(null);
      setNotice(null);
      setReadyToUpdate(false);
      try {
        if (!payload || payload.kind === 'error') {
          throw new Error('This link has expired or is invalid. Request a new password link.');
        }
        if (payload.kind === 'tokens') {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: payload.accessToken,
            refresh_token: payload.refreshToken,
          });
          if (sessionError) throw sessionError;
        } else if (payload.kind === 'code') {
          const { error: codeError } = await supabase.auth.exchangeCodeForSession(
            payload.code
          );
          if (codeError) throw codeError;
        } else {
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: payload.tokenHash,
            type: payload.type,
          });
          if (otpError) throw otpError;
        }
        if (active) setReadyToUpdate(true);
      } catch {
        if (active) setError('This link could not be verified. Request a new password link.');
      } finally {
        if (active) setLinkLoading(false);
      }
    }

    void recover();
    return () => {
      active = false;
    };
  }, [linkUrl]);

  async function sendRecovery() {
    if (working || !email.trim()) {
      setError('Enter the email address associated with your GIB account.');
      return;
    }
    setWorking(true);
    setError(null);
    setNotice(null);
    const { error: sendError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: PASSWORD_RECOVERY_REDIRECT }
    );
    setWorking(false);
    if (sendError) {
      setError('Could not send the reset link. Please try again.');
    } else {
      setNotice('Check your email for a new password link. Open it on the device with GIB installed.');
    }
  }

  async function changePassword() {
    if (working) return;
    if (password.length < 12 || password !== confirmation) {
      setError('Choose a password with at least 12 characters and confirm it matches.');
      return;
    }
    setWorking(true);
    setError(null);
    const { error: changeError } = await supabase.auth.updateUser({ password });
    setWorking(false);
    if (changeError) {
      setError('The password could not be saved. Request a fresh link and try again.');
      return;
    }
    setPassword('');
    setConfirmation('');
    setReadyToUpdate(false);
    await supabase.auth.signOut();
    router.replace('/(auth)/sign-in');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>GIB account recovery</Text>
      <Text style={styles.description}>
        {readyToUpdate
          ? 'Set your new password to sign into Get In Bitches.'
          : 'Enter the email address you control. We will send a secure password setup link.'}
      </Text>
      {linkLoading ? <ActivityIndicator color={colors.accent} /> : null}
      {readyToUpdate ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="New password (12+ characters)"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            accessibilityLabel="New password"
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            placeholderTextColor={colors.textMuted}
            value={confirmation}
            onChangeText={setConfirmation}
            secureTextEntry
            autoCapitalize="none"
            accessibilityLabel="Confirm new password"
          />
          <Pressable style={styles.button} disabled={working} onPress={() => void changePassword()}>
            <Text style={styles.buttonText}>Save password</Text>
          </Pressable>
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            accessibilityLabel="Email address"
          />
          <Pressable style={styles.button} disabled={working || linkLoading} onPress={() => void sendRecovery()}>
            <Text style={styles.buttonText}>Email a reset link</Text>
          </Pressable>
        </>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: spacing.lg },
  heading: { color: colors.text, fontSize: 27, fontWeight: '800', marginBottom: 12 },
  description: { color: colors.textMuted, lineHeight: 21, fontSize: 14, marginBottom: 18 },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: { color: colors.text, fontWeight: '800' },
  error: { color: colors.danger, marginTop: 12 },
  notice: { color: colors.success, marginTop: 12 },
});
