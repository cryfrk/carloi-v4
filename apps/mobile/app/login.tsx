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
import { useAuth } from '../context/auth-context';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await mobileAuthApi.login({
        identifier,
        password,
      });

      signIn(response);
      router.replace('/home');
    } catch (error) {
      if (error instanceof AuthApiError && error.verificationRequired) {
        setErrorMessage('Hesabinizi aktiflestirmek icin once dogrulama kodunu onaylayin.');
        router.push({
          pathname: '/verify-account',
          params: {
            identifier,
          },
        });
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Giris su anda tamamlanamadi.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen
      eyebrow="Carloi Access"
      title="Tek hesapla giris yap"
      description="Telefon, email veya kullanici adi ile giris yap. Dogrulanmamis hesaplar dogrulama ekranina yonlendirilir."
      footer={<GhostButton label="Uye ol" onPress={() => router.push('/register')} />}
    >
      <AuthInput
        label="Telefon, email veya kullanici adi"
        value={identifier}
        onChangeText={setIdentifier}
        placeholder="ornek: ahmetyilmaz"
      />
      <AuthInput
        label="Sifre"
        value={password}
        onChangeText={setPassword}
        placeholder="********"
        secureTextEntry
      />
      {errorMessage ? <FormMessage tone="error" message={errorMessage} /> : null}
      <PrimaryButton
        label={loading ? 'Giris yapiliyor...' : 'Giris yap'}
        onPress={() => {
          void handleLogin();
        }}
        disabled={loading}
      />
      <GhostButton label="Sifremi unuttum" onPress={() => router.push('/forgot-password')} />
    </AuthScreen>
  );
}

