import { useRouter } from 'expo-router';
import { useState } from 'react';
import { AuthApiError, mobileAuthApi } from '../lib/auth-api';
import {
  AuthInput,
  AuthScreen,
  FormMessage,
  GhostButton,
  PrimaryButton,
} from '../components/auth-ui';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await mobileAuthApi.forgotPassword({ identifier });
      setStatusMessage(response.message ?? 'Sifre sifirlama kodu gonderildi.');
      router.push({
        pathname: '/reset-password',
        params: {
          identifier,
        },
      });
    } catch (error) {
      if (error instanceof AuthApiError) {
        setErrorMessage(error.message);
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Islem tamamlanamadi.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen
      eyebrow="Sifre Kurtarma"
      title="Yeni sifre icin kod iste"
      description="Email ya da telefon numarani gir. Hesap uygunsa sana 15 dakika gecerlilikli sifirlama kodu gonderilecek."
      footer={<GhostButton label="Giris ekranina don" onPress={() => router.push('/login')} />}
    >
      <AuthInput
        label="Email veya telefon"
        value={identifier}
        onChangeText={setIdentifier}
        placeholder="ahmet@example.com"
      />
      {statusMessage ? <FormMessage tone="success" message={statusMessage} /> : null}
      {errorMessage ? <FormMessage tone="error" message={errorMessage} /> : null}
      <PrimaryButton
        label={loading ? 'Kod isteniyor...' : 'Sifirla kodu gonder'}
        onPress={() => {
          void handleSubmit();
        }}
        disabled={loading}
      />
    </AuthScreen>
  );
}
