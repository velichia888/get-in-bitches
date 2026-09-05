import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';

// Deep-link-driven login for CI screenshot capture only. Only compiled
// into the ios-simulator screenshot workflow (EXPO_PUBLIC_IOS_TEST_AUTOMATION
// is never set for the real ios-appstore build), so this route is inert
// in the shipped app - it signs in and optionally switches role, then
// logs a marker the CI script polls for before screenshotting.
export default function TestLogin() {
  const { email, password, role } = useLocalSearchParams<{
    email: string;
    password: string;
    role?: 'rider' | 'driver';
  }>();
  const [status, setStatus] = useState('Signing in...');
  const router = useRouter();

  useEffect(() => {
    if (process.env.EXPO_PUBLIC_IOS_TEST_AUTOMATION !== '1') return;

    async function run() {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        setStatus(`Sign-in failed: ${error?.message}`);
        return;
      }

      if (role) {
        await supabase.from('profiles').update({ role }).eq('id', data.user.id);
        if (role === 'driver') {
          await supabase.from('driver_status').upsert({ profile_id: data.user.id, is_online: true });
        }
      }

      router.replace('/(app)');
      setStatus('IOS_TEST_APP_LAUNCHED');
      console.log('IOS_TEST_APP_LAUNCHED');
    }

    run();
  }, [email, password, role]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.textMuted }}>{status}</Text>
    </View>
  );
}
