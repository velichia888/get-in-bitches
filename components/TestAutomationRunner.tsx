import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import {
  listMyCrews,
  listNightOuts,
} from '../lib/crew-service';

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export default function TestAutomationRunner() {
  const router = useRouter();
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    if (process.env.EXPO_PUBLIC_IOS_TEST_AUTOMATION !== '1') {
      return;
    }

    const email = process.env.EXPO_PUBLIC_DEMO_EMAIL;
    const password = process.env.EXPO_PUBLIC_DEMO_PASSWORD;
    const crewName = process.env.EXPO_PUBLIC_DEMO_CREW_NAME;
    const nightOutName = process.env.EXPO_PUBLIC_DEMO_NIGHT_OUT_NAME;

    async function run() {
      if (!email || !password || !crewName || !nightOutName) {
        setStatus('CONFIG ERROR: screenshot environment is incomplete');
        return;
      }

      setStatus('signing in to screenshot account');

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        setStatus(
          `SIGN-IN FAILED: ${error?.message ?? 'no user returned'}`
        );
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        setStatus(`PROFILE FAILED: ${profileError.message}`);
        return;
      }

      if (profile.role !== 'rider') {
        setStatus('CONFIG ERROR: screenshot account must be a rider');
        return;
      }

      setStatus('loading screenshot Crew');

      const crews = await listMyCrews();
      const crew = crews.find((candidate) => candidate.name === crewName);

      if (!crew) {
        setStatus(`SEED ERROR: Crew "${crewName}" not found`);
        return;
      }

      const nightOuts = await listNightOuts(crew.id);
      const nightOut = nightOuts.find(
        (candidate) => candidate.name === nightOutName
      );

      if (!nightOut) {
        setStatus(`SEED ERROR: Night Out "${nightOutName}" not found`);
        return;
      }

      setStatus('STAGE_1_CREWS');
      router.replace('/(app)/crews');
      await sleep(7000);

      setStatus('STAGE_2_CREW');
      router.push(`/(app)/crews/${crew.id}`);
      await sleep(7000);

      setStatus('STAGE_3_NIGHT_OUT');
      router.push({
        pathname: '/(app)/crews/night-out/[nightOutId]',
        params: { nightOutId: nightOut.id },
      });
      await sleep(9000);

      setStatus('STAGE_4_HOME_SAFE');
      router.replace({
        pathname: '/(app)/crews/night-out/[nightOutId]',
        params: {
          nightOutId: nightOut.id,
          focus: 'home-safe',
        },
      });
      await sleep(7000);

      setStatus('STAGE_5_GET_US_HOME');
      router.push({
        pathname: '/(app)/crews/night-out/[nightOutId]/get-home',
        params: { nightOutId: nightOut.id },
      });
      await sleep(8000);

      setStatus('STAGE_6_SAFETY');
      router.push('/(app)/safety');
      await sleep(8000);

      setStatus('TOUR_COMPLETE');
    }

    run().catch((err) => {
      setStatus(`CRASHED: ${String(err)}`);
    });
  }, [router]);

  if (process.env.EXPO_PUBLIC_IOS_TEST_AUTOMATION !== '1') {
    return null;
  }

  if (process.env.EXPO_PUBLIC_IOS_TEST_DEBUG_BANNER !== '1') {
    return null;
  }

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
