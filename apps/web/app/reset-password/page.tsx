'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import {
  AuthPageShell,
  FormMessage,
  PrimaryCta,
  TextField,
} from '../../components/auth-page-shell';
import { AuthApiError, webAuthApi } from '../../lib/auth-api';

function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState(searchParams.get('identifier') ?? '');
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
      const response = await webAuthApi.resetPassword({
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
    <AuthPageShell
      eyebrow="Yeni Sifre"
      title="Sifreni sifirla"
      description="Gonderilen 6 haneli kodu ve yeni sifreni gir. Bu islem aktif oturumlari sonlandirir."
      backHref="/login"
    >
      <div className="form-grid">
        <TextField
          label="Email veya telefon"
          value={identifier}
          onChange={setIdentifier}
          placeholder="ahmet@example.com"
        />
        <TextField label="Kod" value={code} onChange={setCode} placeholder="000000" />
        <TextField
          label="Yeni sifre"
          type="password"
          value={newPassword}
          onChange={setNewPassword}
          placeholder="Yeni sifren"
        />
        {statusMessage ? <FormMessage tone="success" message={statusMessage} /> : null}
        {errorMessage ? <FormMessage tone="error" message={errorMessage} /> : null}
        <PrimaryCta
          label={loading ? 'Sifre guncelleniyor...' : 'Sifreyi guncelle'}
          disabled={loading}
          onClick={() => {
            void handleSubmit();
          }}
        />
      </div>
    </AuthPageShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}
