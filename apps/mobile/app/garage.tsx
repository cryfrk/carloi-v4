import { Redirect } from 'expo-router';

export default function GarageRedirectScreen() {
  return <Redirect href="/profile?tab=vehicles" />;
}

