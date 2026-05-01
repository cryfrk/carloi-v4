import { useLocalSearchParams } from 'expo-router';
import { MobileProfileScreen } from '../components/profile-screen';

export default function ProfileScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const initialTab = params.tab === 'listings' || params.tab === 'vehicles' ? params.tab : 'vehicles';

  return <MobileProfileScreen initialTab={initialTab} />;
}

