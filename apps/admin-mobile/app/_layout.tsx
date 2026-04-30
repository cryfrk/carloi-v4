import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AdminAuthProvider } from '../context/admin-auth-context';
import { adminMobileTheme } from '../lib/design-system';

export default function RootLayout() {
  return (
    <AdminAuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: adminMobileTheme.colors.surface },
          headerTintColor: adminMobileTheme.colors.textStrong,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: adminMobileTheme.colors.background },
        }}
      />
    </AdminAuthProvider>
  );
}
