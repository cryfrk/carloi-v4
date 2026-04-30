import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AuthScreen, ChoiceButton, GhostButton, PrimaryButton } from '../components/auth-ui';

const USER_TYPES = {
  INDIVIDUAL: 'INDIVIDUAL',
  COMMERCIAL: 'COMMERCIAL',
} as const;

type UserTypeValue = 'INDIVIDUAL' | 'COMMERCIAL';

export default function RegisterScreen() {
  const router = useRouter();
  const [userType, setUserType] = useState<UserTypeValue>(USER_TYPES.INDIVIDUAL);

  return (
    <AuthScreen
      eyebrow="Uyelik"
      title="Hesap turunu sec"
      description="Bireysel hesapla sosyal akis ve ilan deneyimine hemen basla. Ticari hesapta ek firma ve vergi bilgileri gerekir."
      footer={<GhostButton label="Zaten hesabim var" onPress={() => router.push('/login')} />}
    >
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <ChoiceButton
          label="Bireysel"
          active={userType === USER_TYPES.INDIVIDUAL}
          onPress={() => setUserType(USER_TYPES.INDIVIDUAL)}
        />
        <ChoiceButton
          label="Ticari"
          active={userType === USER_TYPES.COMMERCIAL}
          onPress={() => setUserType(USER_TYPES.COMMERCIAL)}
        />
      </View>
      <PrimaryButton
        label="Devam et"
        onPress={() =>
          router.push({
            pathname: '/register-details',
            params: {
              userType,
            },
          })
        }
      />
    </AuthScreen>
  );
}
