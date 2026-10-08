import { Stack } from 'expo-router';
import { colors } from '../../../lib/theme';

export default function CrewsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.blush,
        headerShadowVisible: false,
        headerTitleStyle: {
          color: colors.blush,
          fontFamily: 'Georgia',
          fontSize: 18,
        },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Crews',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Crew',
        }}
      />
      <Stack.Screen
        name="invite"
        options={{
          title: 'Add to Crew',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="night-out/new"
        options={{
          title: 'Plan a Night Out',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="night-out/[nightOutId]"
        options={{
          title: 'Night Out',
        }}
      />
      <Stack.Screen
        name="night-out/[nightOutId]/get-home"
        options={{
          title: 'Get Us Home',
        }}
      />
    </Stack>
  );
}
