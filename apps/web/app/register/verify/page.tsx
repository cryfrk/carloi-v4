'use client';

import type { SendVerificationCodeRequest } from '@carloi-v4/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useAuth } from '../../../components/auth-provider';
import {
  AuthPageShell,
  ChoiceToggle,
  FormMessage,
  PrimaryCta,
  TextField,
} from '../../../components/auth-page-shell';
import { AuthApiError, webAuthApi } from '../../../lib/auth-api';

const CHANNELS = {
  EMAIL: 'EMAIL',
  SMS: 'SMS',
} as const;

type ChannelValue = 'EMAIL' | 'SMS';

function VerifyRegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState(searchParams.get('identifier') ?? '');
  const [channel, setChannel] = useState<ChannelValue>(CHANNELS.EMAIL);
  const [code, setCode] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function handleSendCode() {
    setSending(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const request: SendVerificationCodeRequest = {
        identifier,
        channel: channel as SendVerificationCodeRequest['channel'],
      };
      const response = await webAuthApi.sendVerificationCode(request);
      setStatusMessage(response.message ?? 'Kod gonderildi.');
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Kod gonderilemedi.');
      }
    } finally {
      setSending(false);
    }
  }

  async function handleVerify() {
    setVerifying(true);
    setErrorMessage(null);

    try {
      const response = await webAuthApi.verifyCode({
        identifier,
        code,
      });
      signIn(response);
      router.replace('/');
    } catch (error) {
      if (error instanceof AuthApiError) {
        setErrorMessage(error.message);
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Kod dogrulanamadi.');
      }
    } finally {
      setVerifying(false);
    }
  }

  return (
    <AuthPageShell
      eyebrow="Brevo Dogrulama"
      title="Hesabini aktive et"
      description="Email veya SMS kanali secip 6 haneli kodu iste. Kod onaylandiginda dogrudan ana uygulamaya gecersin."
      backHref="/login"
    >
      <div className="form-grid">
        <TextField
          label="Email veya telefon"
          value={identifier}
          onChange={setIdentifier}
          placeholder="ahmet@example.com veya +905551112233"
        />
        <div className="choice-row">
          <ChoiceToggle
            label="Email"
            active={channel === CHANNELS.EMAIL}
            onClick={() => setChannel(CHANNELS.EMAIL)}
          />
          <ChoiceToggle
            label="SMS"
            active={channel === CHANNELS.SMS}
            onClick={() => setChannel(CHANNELS.SMS)}
          />
        </div>
        <PrimaryCta
          label={sending ? 'Kod gonderiliyor...' : 'Dogrulama kodu gonder'}
          disabled={sending}
          onClick={() => {
            void handleSendCode();
          }}
        />
        <TextField label="6 haneli kod" value={code} onChange={setCode} placeholder="000000" />
        {statusMessage ? <FormMessage tone="success" message={statusMessage} /> : null}
        {errorMessage ? <FormMessage tone="error" message={errorMessage} /> : null}
        <PrimaryCta
          label={verifying ? 'Kod kontrol ediliyor...' : 'Kodu dogrula'}
          disabled={verifying}
          onClick={() => {
            void handleVerify();
          }}
        />
      </div>
    </AuthPageShell>
  );
}

export default function VerifyRegisterPage() {
  return (
    <Suspense fallback={null}>
      <VerifyRegisterPageContent />
    </Suspense>
  );
}
