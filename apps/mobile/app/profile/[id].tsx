import { useLocalSearchParams } from 'expo-router';
import { MobileProfileScreen } from '../../components/profile-screen';

export default function PublicProfileScreen() {
  const params = useLocalSearchParams<{ id: string }>();

  return <MobileProfileScreen identifier={params.id} />;
}
