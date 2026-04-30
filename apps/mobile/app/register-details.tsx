import type { RegisterRequest } from '@carloi-v4/types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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

const USER_TYPES = {
  INDIVIDUAL: 'INDIVIDUAL',
  COMMERCIAL: 'COMMERCIAL',
} as const;

type UserTypeValue = 'INDIVIDUAL' | 'COMMERCIAL';

export default function RegisterDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userType?: string | string[] }>();
  const userType = useMemo<UserTypeValue>(() => {
    return resolveParam(params.userType) === USER_TYPES.COMMERCIAL
      ? USER_TYPES.COMMERCIAL
      : USER_TYPES.INDIVIDUAL;
  }, [params.userType]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [companyTitle, setCompanyTitle] = useState('');
  const [tcIdentityNo, setTcIdentityNo] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const request: RegisterRequest = {
        userType: userType as RegisterRequest['userType'],
        firstName,
        lastName,
        username,
        email: email || undefined,
        phone: phone || undefined,
        password,
        companyTitle: userType === USER_TYPES.COMMERCIAL ? companyTitle : undefined,
        tcIdentityNo: tcIdentityNo || undefined,
        taxNumber: userType === USER_TYPES.COMMERCIAL ? taxNumber : undefined,
      };

      await mobileAuthApi.register(request);

      router.push({
        pathname: '/verify-account',
        params: {
          identifier: email || phone,
        },
      });
    } catch (error) {
      if (error instanceof AuthApiError) {
        setErrorMessage(error.message);
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Kayit tamamlanamadi.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen
      eyebrow={userType === USER_TYPES.COMMERCIAL ? 'Ticari Uyelik' : 'Bireysel Uyelik'}
      title="Bilgilerini gir"
      description="En az bir email veya telefon alanini doldur. Ticari hesapta firma, TC ve vergi bilgileri de zorunludur."
      footer={<GhostButton label="Geri don" onPress={() => router.back()} />}
    >
      <AuthInput
        label="Ad"
        value={firstName}
        onChangeText={setFirstName}
        placeholder="Ahmet"
        autoCapitalize="words"
      />
      <AuthInput
        label="Soyad"
        value={lastName}
        onChangeText={setLastName}
        placeholder="Yilmaz"
        autoCapitalize="words"
      />
      <AuthInput
        label="Kullanici adi"
        value={username}
        onChangeText={setUsername}
        placeholder="ahmetyilmaz"
      />
      <AuthInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="ahmet@example.com"
        keyboardType="email-address"
      />
      <AuthInput
        label="Telefon"
        value={phone}
        onChangeText={setPhone}
        placeholder="+905551112233"
        keyboardType="phone-pad"
      />
      <AuthInput
        label="Sifre"
        value={password}
        onChangeText={setPassword}
        placeholder="En az 8 karakter"
        secureTextEntry
      />
      {userType === USER_TYPES.COMMERCIAL ? (
        <>
          <AuthInput
            label="Firma unvani"
            value={companyTitle}
            onChangeText={setCompanyTitle}
            placeholder="Carloi Otomotiv"
            autoCapitalize="words"
          />
          <AuthInput
            label="TC kimlik no"
            value={tcIdentityNo}
            onChangeText={setTcIdentityNo}
            placeholder="11 haneli TC kimlik no"
            keyboardType="number-pad"
          />
          <AuthInput
            label="Vergi numarasi"
            value={taxNumber}
            onChangeText={setTaxNumber}
            placeholder="Vergi numarasi"
            keyboardType="number-pad"
          />
        </>
      ) : null}
      {errorMessage ? <FormMessage tone="error" message={errorMessage} /> : null}
      <PrimaryButton
        label={loading ? 'Kayit olusturuluyor...' : 'Kayit ol'}
        onPress={() => {
          void handleSubmit();
        }}
        disabled={loading}
      />
    </AuthScreen>
  );
}
