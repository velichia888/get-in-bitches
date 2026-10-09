import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRootNavigationState, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import {
  listMyCrews,
  listNightOuts,
} from '../lib/crew-service';

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export default function TestAutomationRunner() {
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const { session, loading } = useAuth();
  const [status, setStatus] = useState('idle');
  const signingIn = useRef(false);
  const tourStarted = useRef(false);

  useEffect(() => {
    if (process.env.EXPO_PUBLIC_IOS_TEST_AUTOMATION !== '1') {
      return;
    }

    const email = process.env.EXPO_PUBLIC_DEMO_EMAIL;
    const password = process.env.EXPO_PUBLIC_DEMO_PASSWORD;
    const crewName = process.env.EXPO_PUBLIC_DEMO_CREW_NAME;
    const nightOutName = process.env.EXPO_PUBLIC_DEMO_NIGHT_OUT_NAME;

    if (!email || !password || !crewName || !nightOutName) {
      setStatus('CONFIG ERROR: screenshot environment is incomplete');
      return;
    }

    if (loading || !navigationState?.key) {
      setStatus('waiting for app navigation');
      return;
    }

    if (!session) {
      if (signingIn.current) {
        return;
      }

      signingIn.current = true;
      setStatus('signing in to screenshot account');

      void supabase.auth
        .signInWithPassword({ email, password })
        .then(({ data, error }) => {
          if (error || !data.user) {
            setStatus(
              `SIGN-IN FAILED: ${error?.message ?? 'no user returned'}`
            );
          }
        })
        .catch((err) => {
          setStatus(`SIGN-IN FAILED: ${String(err)}`);
        })
        .finally(() => {
          signingIn.current = false;
        });

      return;
    }

    if (tourStarted.current) {
      return;
    }

    tourStarted.current = true;
    const userId = session.user.id;

    async function runTour() {
      setStatus('verifying screenshot account');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
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

      // Let the authenticated Tabs tree finish mounting before the
      // screenshot-only tour takes control of navigation.
      await sleep(1200);

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

    void runTour().catch((err) => {
      tourStarted.current = false;
      setStatus(`CRASHED: ${String(err)}`);
    });
  }, [loading, navigationState?.key, router, session]);

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
