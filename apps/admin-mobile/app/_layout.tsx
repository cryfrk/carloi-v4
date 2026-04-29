import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AdminAuthProvider } from '../context/admin-auth-context';

export default function RootLayout() {
  return (
    <AdminAuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#102030' },
          headerTintColor: '#f8f2ea',
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#08131d' },
        }}
      />
    </AdminAuthProvider>
  );
}