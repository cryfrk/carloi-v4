import { ListingCreateClient } from '../../../components/listing-create-client';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ListingCreatePage({ searchParams }: PageProps) {
  const resolved = searchParams ? await searchParams : {};
  const vehicleIdValue = Array.isArray(resolved.vehicleId) ? resolved.vehicleId[0] : resolved.vehicleId;

  return <ListingCreateClient initialVehicleId={vehicleIdValue ?? ''} />;
}
