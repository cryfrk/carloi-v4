'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../components/auth-provider';
import {
  AuthPageShell,
  FormMessage,
  PrimaryCta,
  SecondaryCta,
  TextField,
} from '../../components/auth-page-shell';
import { AuthApiError, webAuthApi } from '../../lib/auth-api';

export default function LoginPage() {
  const router = useRouter();
  const { session, isReady, signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isReady && session) {
      router.replace('/');
    }
  }, [isReady, router, session]);

  async function handleSubmit() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await webAuthApi.login({ identifier, password });
      signIn(response);
      router.replace('/');
    } catch (error) {
      if (error instanceof AuthApiError && error.verificationRequired) {
        setErrorMessage('Hesabinizi aktiflestirmek icin once dogrulama kodunu onaylayin.');
        router.push(`/register/verify?identifier=${encodeURIComponent(identifier)}`);
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
    <AuthPageShell
      eyebrow="Carloi Access"
      title="Telefon, email veya kullanici adi ile giris"
      description="Web istemcisinde auth akisi aktif. Dogrulanmamis hesaplar kayit dogrulama adimina yonlendirilir."
    >
      <div className="form-grid">
        <TextField
          label="Telefon, email veya kullanici adi"
          value={identifier}
          onChange={setIdentifier}
          placeholder="ornek: ahmetyilmaz"
        />
        <TextField
          label="Sifre"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="********"
        />
        {errorMessage ? <FormMessage tone="error" message={errorMessage} /> : null}
        <PrimaryCta
          label={loading ? 'Giris yapiliyor...' : 'Giris yap'}
          disabled={loading}
          onClick={() => {
            void handleSubmit();
          }}
        />
        <SecondaryCta label="Sifremi unuttum" href="/forgot-password" />
        <SecondaryCta label="Uye ol" href="/register" />
      </div>
    </AuthPageShell>
  );
}

