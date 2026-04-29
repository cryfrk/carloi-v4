import type { SendVerificationCodeRequest } from '@carloi-v4/types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AuthApiError, mobileAuthApi } from '../lib/auth-api';
import {
  AuthInput,
  AuthScreen,
  ChoiceButton,
  FormMessage,
  GhostButton,
  PrimaryButton,
} from '../components/auth-ui';
import { useAuth } from '../context/auth-context';

function resolveParam(param: string | string[] | undefined) {
  return Array.isArray(param) ? param[0] : param;
}

const CHANNELS = {
  EMAIL: 'EMAIL',
  SMS: 'SMS',
} as const;

type ChannelValue = 'EMAIL' | 'SMS';

export default function VerifyAccountScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const params = useLocalSearchParams<{ identifier?: string | string[] }>();
  const [identifier, setIdentifier] = useState(resolveParam(params.identifier) ?? '');
  const [channel, setChannel] = useState<ChannelValue>(CHANNELS.EMAIL);
  const [code, setCode] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function handleSendCode() {
    setSending(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const request: SendVerificationCodeRequest = {
        identifier,
        channel: channel as SendVerificationCodeRequest['channel'],
      };
      const response = await mobileAuthApi.sendVerificationCode(request);
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
      const response = await mobileAuthApi.verifyCode({
        identifier,
        code,
      });
      signIn(response);
      router.replace('/home');
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
    <AuthScreen
      eyebrow="Brevo Dogrulama"
      title="Hesabini aktive et"
      description="Email veya SMS kanali secip 6 haneli kodu iste. Kod onaylandiginda dogrudan ana uygulamaya gecersin."
      footer={<GhostButton label="Giris ekranina don" onPress={() => router.push('/login')} />}
    >
      <AuthInput
        label="Email veya telefon"
        value={identifier}
        onChangeText={setIdentifier}
        placeholder="ahmet@example.com veya +905551112233"
      />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <ChoiceButton
          label="Email"
          active={channel === CHANNELS.EMAIL}
          onPress={() => setChannel(CHANNELS.EMAIL)}
        />
        <ChoiceButton
          label="SMS"
          active={channel === CHANNELS.SMS}
          onPress={() => setChannel(CHANNELS.SMS)}
        />
      </View>
      <PrimaryButton
        label={sending ? 'Kod gonderiliyor...' : 'Dogrulama kodu gonder'}
        onPress={() => {
          void handleSendCode();
        }}
        disabled={sending}
      />
      <AuthInput
        label="6 haneli kod"
        value={code}
        onChangeText={setCode}
        placeholder="000000"
        keyboardType="number-pad"
      />
      {statusMessage ? <FormMessage tone="success" message={statusMessage} /> : null}
      {errorMessage ? <FormMessage tone="error" message={errorMessage} /> : null}
      <PrimaryButton
        label={verifying ? 'Kod kontrol ediliyor...' : 'Kodu dogrula'}
        onPress={() => {
          void handleVerify();
        }}
        disabled={verifying}
      />
    </AuthScreen>
  );
}
