import { Redirect, Tabs } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth-context';
import { colors } from '../../lib/theme';

export default function AppLayout() {
  const { session, loading } = useAuth();
  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: '#100C0F',
          borderTopWidth: 1,
          borderTopColor: '#3A2A33',
          height: 64 + insets.bottom,
          paddingHorizontal: 8,
          paddingTop: 8,
          paddingBottom: Math.max(9, insets.bottom),
          width: '100%',
          maxWidth: 460,
          alignSelf: 'center',
        },
        tabBarItemStyle: {
          borderRadius: 16,
          marginHorizontal: 2,
        },
        tabBarActiveBackgroundColor: 'transparent',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
        tabBarActiveTintColor: colors.accentBright,
        tabBarInactiveTintColor: colors.textSubtle,
      }}
    >
      <Tabs.Screen
        name="crews"
        options={{
          title: 'Crews',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              color={color}
              size={focused ? size + 2 : size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Get Us Home',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'car-sport' : 'car-sport-outline'}
              color={color}
              size={focused ? size + 2 : size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="safety"
        options={{
          title: 'Home Safe',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'}
              color={color}
              size={focused ? size + 2 : size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              color={color}
              size={focused ? size + 2 : size}
            />
          ),
        }}
      />
      <Tabs.Screen name="ride" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="report" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
