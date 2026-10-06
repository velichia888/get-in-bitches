import { Stack } from 'expo-router';
import { colors } from '../../../lib/theme';

export default function CrewsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
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
        }}
      />
      <Stack.Screen
        name="night-out/new"
        options={{
          title: 'Plan a Night Out',
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
