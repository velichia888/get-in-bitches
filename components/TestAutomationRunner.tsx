import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

// Drives a self-contained screenshot tour for the ios-simulator CI
// workflow only (EXPO_PUBLIC_IOS_TEST_AUTOMATION is never set for the
// real ios-app-store build, so this is inert in the shipped app).
//
// This does NOT use deep links (xcrun simctl openurl): iOS shows a
// blocking "Open in <App>?" system confirmation for custom URL schemes
// that no CI script can dismiss, which silently stalled every attempt.
// It also does NOT rely on console.log reaching the CI-captured output:
// confirmed empirically that Release-mode Hermes doesn't forward it
// reliably. Instead this renders its own status as on-screen text -
// visible directly in the screenshots themselves - and the CI script
// just sleeps fixed, generous intervals timed against this component's
// own internal schedule.
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function TestAutomationRunner() {
  const router = useRouter();
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    if (process.env.EXPO_PUBLIC_IOS_TEST_AUTOMATION !== '1') return;

    const email = process.env.EXPO_PUBLIC_DEMO_EMAIL!;
    const password = process.env.EXPO_PUBLIC_DEMO_PASSWORD!;

    async function run() {
      setStatus(`signing in as ${email}`);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        setStatus(`SIGN-IN FAILED: ${error?.message ?? 'no user returned'}`);
        return;
      }

      setStatus('signed in, setting role=rider');
      await supabase.from('profiles').update({ role: 'rider' }).eq('id', data.user.id);
      await sleep(2000);
      setStatus('STAGE_1_HOME_RIDER');

      await sleep(4000);
      router.push('/safety');
      await sleep(1500);
      setStatus('STAGE_2_SAFETY');

      await sleep(4000);
      router.push('/profile');
      await sleep(1500);
      setStatus('STAGE_3_PROFILE');

      await sleep(4000);
      setStatus('switching role=driver');
      await supabase.from('profiles').update({ role: 'driver' }).eq('id', data.user.id);
      await supabase.from('driver_status').upsert({ profile_id: data.user.id, is_online: true });
      router.replace('/(app)');
      await sleep(2000);
      setStatus('STAGE_4_HOME_DRIVER');
    }

    run().catch((err) => setStatus(`CRASHED: ${String(err)}`));
  }, []);

  if (process.env.EXPO_PUBLIC_IOS_TEST_AUTOMATION !== '1') return null;
  if (process.env.EXPO_PUBLIC_IOS_TEST_DEBUG_BANNER !== '1') return null;

  return (
    <View pointerEvents="none" style={styles.banner}>
      <Text style={styles.text}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingTop: 60,
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  text: {
    color: '#0f0',
    fontSize: 12,
    fontFamily: 'Courier',
  },
});
