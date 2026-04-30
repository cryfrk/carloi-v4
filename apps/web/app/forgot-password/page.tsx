'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  AuthPageShell,
  FormMessage,
  PrimaryCta,
  TextField,
} from '../../components/auth-page-shell';
import { AuthApiError, webAuthApi } from '../../lib/auth-api';

export default function ForgotPasswordPage() {
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
      const response = await webAuthApi.forgotPassword({ identifier });
      setStatusMessage(response.message ?? 'Sifre sifirlama kodu gonderildi.');
      router.push(`/reset-password?identifier=${encodeURIComponent(identifier)}`);
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
    <AuthPageShell
      title="Sifremi unuttum"
      description="Email veya telefonunu gir, sifirlama kodunu gonderelim."
      backHref="/login"
    >
      <div className="form-grid">
        <TextField
          label="Email veya telefon"
          value={identifier}
          onChange={setIdentifier}
          placeholder="ahmet@example.com"
        />
        {statusMessage ? <FormMessage tone="success" message={statusMessage} /> : null}
        {errorMessage ? <FormMessage tone="error" message={errorMessage} /> : null}
        <PrimaryCta
          label={loading ? 'Kod isteniyor...' : 'Sifirla kodu gonder'}
          disabled={loading}
          onClick={() => {
            void handleSubmit();
          }}
        />
      </div>
    </AuthPageShell>
  );
}
