import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../lib/auth-context';
import TestAutomationRunner from '../components/TestAutomationRunner';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <TestAutomationRunner />
      <Slot />
    </AuthProvider>
  );
}
