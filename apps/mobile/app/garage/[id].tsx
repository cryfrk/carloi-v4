import { Redirect, useLocalSearchParams } from 'expo-router';

export default function GarageVehicleRedirectScreen() {
  const params = useLocalSearchParams<{ id?: string }>();

  if (!params.id) {
    return <Redirect href="/profile?tab=vehicles" />;
  }

  return <Redirect href={`/vehicles/${params.id}`} />;
}

