import { useLocalSearchParams } from 'expo-router';
import { MobileProfileScreen } from '../../components/profile-screen';

export default function ProfileDetailScreen() {
  const params = useLocalSearchParams<{ id: string; tab?: string }>();
  const initialTab = params.tab === 'listings' || params.tab === 'vehicles' ? params.tab : 'posts';

  return <MobileProfileScreen identifier={params.id} initialTab={initialTab} />;
}

