'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AuthPageShell, ChoiceToggle, PrimaryCta } from '../../components/auth-page-shell';

const USER_TYPES = {
  INDIVIDUAL: 'INDIVIDUAL',
  COMMERCIAL: 'COMMERCIAL',
} as const;

type UserTypeValue = (typeof USER_TYPES)[keyof typeof USER_TYPES];

export default function RegisterPage() {
  const router = useRouter();
  const [userType, setUserType] = useState<UserTypeValue>(USER_TYPES.INDIVIDUAL);

  return (
    <AuthPageShell
      title="Hesap olustur"
      description="Bireysel veya ticari hesap secerek devam et."
      backHref="/login"
    >
      <div className="form-grid">
        <div className="choice-row">
          <ChoiceToggle
            label="Bireysel"
            active={userType === USER_TYPES.INDIVIDUAL}
            onClick={() => setUserType(USER_TYPES.INDIVIDUAL)}
          />
          <ChoiceToggle
            label="Ticari"
            active={userType === USER_TYPES.COMMERCIAL}
            onClick={() => setUserType(USER_TYPES.COMMERCIAL)}
          />
        </div>
        <PrimaryCta
          label="Bilgi girisine gec"
          onClick={() => router.push(`/register/details?userType=${userType}`)}
        />
      </div>
    </AuthPageShell>
  );
}
