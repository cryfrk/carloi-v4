import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAdminAuth } from '../context/admin-auth-context';
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
    backgroundColor: '#08131d',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: 14,
    padding: 24,
  },
  kicker: {
    color: '#ffd6c2',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: '#f8f2ea',
    fontSize: 28,
    fontWeight: '800',
  },
  copy: {
    color: '#9eb0be',
    lineHeight: 22,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#102030',
  },
  roleChipActive: {
    borderColor: 'rgba(239,131,84,0.32)',
    backgroundColor: 'rgba(239,131,84,0.14)',
  },
  roleChipLabel: {
    color: '#b7c4ce',
    fontWeight: '700',
  },
  roleChipLabelActive: {
    color: '#f8f2ea',
  },
  input: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#102030',
    color: '#f8f2ea',
  },
  button: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#ef8354',
  },
  buttonLabel: {
    color: '#08131d',
    fontWeight: '900',
  },
  error: {
    color: '#ffb4b4',
  },
});
