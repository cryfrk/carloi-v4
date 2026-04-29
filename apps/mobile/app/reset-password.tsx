import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { AuthApiError, mobileAuthApi } from '../lib/auth-api';
import {
  AuthInput,
  AuthScreen,
  FormMessage,
  GhostButton,
  PrimaryButton,
} from '../components/auth-ui';

function resolveParam(param: string | string[] | undefined) {
  return Array.isArray(param) ? param[0] : param;
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ identifier?: string | string[] }>();
  const [identifier, setIdentifier] = useState(resolveParam(params.identifier) ?? '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await mobileAuthApi.resetPassword({
        identifier,
        code,
        newPassword,
      });
      setStatusMessage(response.message ?? 'Sifre basariyla guncellendi.');
      router.push('/login');
    } catch (error) {
      if (error instanceof AuthApiError) {
        setErrorMessage(error.message);
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Sifre guncellenemedi.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen
      eyebrow="Yeni Sifre"
      title="Sifreni sifirla"
      description="Gonderilen 6 haneli kodu ve yeni sifreni gir. Bu islem aktif oturumlari sonlandirir."
      footer={<GhostButton label="Giris ekranina don" onPress={() => router.push('/login')} />}
    >
      <AuthInput
        label="Email veya telefon"
        value={identifier}
        onChangeText={setIdentifier}
        placeholder="ahmet@example.com"
      />
      <AuthInput
        label="Kod"
        value={code}
        onChangeText={setCode}
        placeholder="000000"
        keyboardType="number-pad"
      />
      <AuthInput
        label="Yeni sifre"
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder="Yeni sifren"
        secureTextEntry
      />
      {statusMessage ? <FormMessage tone="success" message={statusMessage} /> : null}
      {errorMessage ? <FormMessage tone="error" message={errorMessage} /> : null}
      <PrimaryButton
        label={loading ? 'Sifre guncelleniyor...' : 'Sifreyi guncelle'}
        onPress={() => {
          void handleSubmit();
        }}
        disabled={loading}
      />
    </AuthScreen>
  );
}
