import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

// Drives a self-contained screenshot tour for the ios-simulator CI
// workflow only (EXPO_PUBLIC_IOS_TEST_AUTOMATION is never set for the
// real ios-app-store build, so this is inert in the shipped app).
//
// This does NOT use deep links (xcrun simctl openurl): iOS shows a
// blocking "Open in <App>?" system confirmation for custom URL schemes
// that no CI script can dismiss, which silently stalled every attempt.
// Instead all navigation happens via in-app router calls on a fixed
// internal timer, logging one marker per stage for the CI script to
// poll for and screenshot after.
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function TestAutomationRunner() {
  const router = useRouter();

  useEffect(() => {
    if (process.env.EXPO_PUBLIC_IOS_TEST_AUTOMATION !== '1') return;

    const email = process.env.EXPO_PUBLIC_DEMO_EMAIL!;
    const password = process.env.EXPO_PUBLIC_DEMO_PASSWORD!;

    async function run() {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        console.log(`IOS_TEST_ERROR sign-in failed: ${error?.message}`);
        return;
      }

      await supabase.from('profiles').update({ role: 'rider' }).eq('id', data.user.id);
      await sleep(2000);
      console.log('IOS_TEST_STAGE_1_HOME_RIDER');

      await sleep(4000);
      router.push('/safety');
      await sleep(1500);
      console.log('IOS_TEST_STAGE_2_SAFETY');

      await sleep(4000);
      router.push('/profile');
      await sleep(1500);
      console.log('IOS_TEST_STAGE_3_PROFILE');

      await sleep(4000);
      await supabase.from('profiles').update({ role: 'driver' }).eq('id', data.user.id);
      await supabase.from('driver_status').upsert({ profile_id: data.user.id, is_online: true });
      router.replace('/(app)');
      await sleep(2000);
      console.log('IOS_TEST_STAGE_4_HOME_DRIVER');
    }

    run();
  }, []);

  return null;
}
