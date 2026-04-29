'use client';

import type { RegisterRequest } from '@carloi-v4/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import {
  AuthPageShell,
  FormMessage,
  PrimaryCta,
  TextField,
} from '../../../components/auth-page-shell';
import { AuthApiError, webAuthApi } from '../../../lib/auth-api';

const USER_TYPES = {
  INDIVIDUAL: 'INDIVIDUAL',
  COMMERCIAL: 'COMMERCIAL',
} as const;

type UserTypeValue = 'INDIVIDUAL' | 'COMMERCIAL';

function RegisterDetailsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userType = useMemo<UserTypeValue>(() => {
    return searchParams.get('userType') === USER_TYPES.COMMERCIAL
      ? USER_TYPES.COMMERCIAL
      : USER_TYPES.INDIVIDUAL;
  }, [searchParams]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [companyTitle, setCompanyTitle] = useState('');
  const [tcIdentityNo, setTcIdentityNo] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

      await webAuthApi.register(request);

      router.push(`/register/verify?identifier=${encodeURIComponent(email || phone)}`);
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
    <AuthPageShell
      eyebrow={userType === USER_TYPES.COMMERCIAL ? 'Ticari Uyelik' : 'Bireysel Uyelik'}
      title="Uyelik bilgilerini tamamla"
      description="En az bir email veya telefon bilgisi gir. Ticari hesaplar icin firma ve vergi bilgileri de zorunludur."
      backHref="/register"
      backLabel="Uyelik secimine don"
    >
      <div className="form-grid">
        <TextField label="Ad" value={firstName} onChange={setFirstName} placeholder="Ahmet" />
        <TextField label="Soyad" value={lastName} onChange={setLastName} placeholder="Yilmaz" />
        <TextField
          label="Kullanici adi"
          value={username}
          onChange={setUsername}
          placeholder="ahmetyilmaz"
        />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="ahmet@example.com"
        />
        <TextField
          label="Telefon"
          value={phone}
          onChange={setPhone}
          placeholder="+905551112233"
        />
        <TextField
          label="Sifre"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="En az 8 karakter"
        />
        {userType === USER_TYPES.COMMERCIAL ? (
          <>
            <TextField
              label="Firma unvani"
              value={companyTitle}
              onChange={setCompanyTitle}
              placeholder="Carloi Otomotiv"
            />
            <TextField
              label="TC kimlik no"
              value={tcIdentityNo}
              onChange={setTcIdentityNo}
              placeholder="11 haneli TC kimlik no"
            />
            <TextField
              label="Vergi numarasi"
              value={taxNumber}
              onChange={setTaxNumber}
              placeholder="Vergi numarasi"
            />
          </>
        ) : null}
        {errorMessage ? <FormMessage tone="error" message={errorMessage} /> : null}
        <PrimaryCta
          label={loading ? 'Kayit olusturuluyor...' : 'Uyeligi olustur'}
          disabled={loading}
          onClick={() => {
            void handleSubmit();
          }}
        />
      </div>
    </AuthPageShell>
  );
}

export default function RegisterDetailsPage() {
  return (
    <Suspense fallback={null}>
      <RegisterDetailsPageContent />
    </Suspense>
  );
}
