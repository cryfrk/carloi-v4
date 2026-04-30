import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAdminAuth } from '../context/admin-auth-context';
import { adminMobileTheme } from '../lib/design-system';
import { adminMobileApi } from '../lib/admin-api';

const ROLE_PRESETS = {
  SUPER_ADMIN: 'superadmin',
  INSURANCE_ADMIN: 'insuranceadmin',
  COMMERCIAL_ADMIN: 'commercialadmin',
} as const;

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAdminAuth();
  const [selectedRole, setSelectedRole] = useState<keyof typeof ROLE_PRESETS>('INSURANCE_ADMIN');
  const [username, setUsername] = useState<string>(ROLE_PRESETS.INSURANCE_ADMIN);
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const roleOptions = useMemo(
    () => [
      { role: 'SUPER_ADMIN', label: 'Super Admin' },
      { role: 'INSURANCE_ADMIN', label: 'Insurance Admin' },
      { role: 'COMMERCIAL_ADMIN', label: 'Commercial Admin' },
    ] as const,
    [],
  );

  async function handleLogin() {
    try {
      const session = await adminMobileApi.login(username.trim().toLowerCase(), password);
      signIn(session);

      if (session.admin.role === 'INSURANCE_ADMIN') {
        router.replace('/insurance-requests');
      } else if (session.admin.role === 'COMMERCIAL_ADMIN') {
        router.replace('/commercial-applications');
      } else {
        router.replace('/dashboard');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Admin girisi basarisiz.');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.kicker}>Carloi V4 Admin</Text>
        <Text style={styles.title}>Guvenli admin girisi</Text>
        <Text style={styles.copy}>
          Rol sec, kullanici adini gir ve yetkili admin paneline baglan.
        </Text>
        <View style={styles.roleRow}>
          {roleOptions.map((option) => {
            const active = option.role === selectedRole;
            return (
              <Pressable
                key={option.role}
                style={[styles.roleChip, active ? styles.roleChipActive : null]}
                onPress={() => {
                  setSelectedRole(option.role);
                  setUsername(ROLE_PRESETS[option.role]);
                }}
              >
                <Text style={[styles.roleChipLabel, active ? styles.roleChipLabelActive : null]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Kullanici adi"
          placeholderTextColor="#789"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Sifre"
          placeholderTextColor="#789"
          secureTextEntry
        />
        <Pressable style={styles.button} onPress={() => void handleLogin()}>
          <Text style={styles.buttonLabel}>Giris yap</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: adminMobileTheme.colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: 14,
    padding: 24,
  },
  kicker: {
    color: adminMobileTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: adminMobileTheme.colors.textStrong,
    fontSize: 28,
    fontWeight: '700',
  },
  copy: {
    color: adminMobileTheme.colors.textMuted,
    lineHeight: 22,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    borderRadius: adminMobileTheme.radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: adminMobileTheme.colors.border,
    backgroundColor: adminMobileTheme.colors.surfaceMuted,
  },
  roleChipActive: {
    borderColor: adminMobileTheme.colors.textStrong,
    backgroundColor: adminMobileTheme.colors.surface,
  },
  roleChipLabel: {
    color: adminMobileTheme.colors.textMuted,
    fontWeight: '700',
  },
  roleChipLabelActive: {
    color: adminMobileTheme.colors.textStrong,
  },
  input: {
    borderRadius: adminMobileTheme.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: adminMobileTheme.colors.surface,
    color: adminMobileTheme.colors.textStrong,
    borderWidth: 1,
    borderColor: adminMobileTheme.colors.border,
  },
  button: {
    borderRadius: adminMobileTheme.radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: adminMobileTheme.colors.accent,
    ...adminMobileTheme.shadow,
  },
  buttonLabel: {
    color: adminMobileTheme.colors.white,
    fontWeight: '800',
  },
  error: {
    color: adminMobileTheme.colors.danger,
  },
});
