import { Redirect } from 'expo-router';
import { useAuth } from '../context/auth-context';
import { PlaceholderScreen } from './placeholder-screen';

export function ProtectedPlaceholderScreen(props: React.ComponentProps<typeof PlaceholderScreen>) {
  const { session } = useAuth();

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <PlaceholderScreen {...props} />;
}
