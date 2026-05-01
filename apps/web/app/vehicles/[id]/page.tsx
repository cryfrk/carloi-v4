import { VehicleShowcaseDetailClient } from '../../../components/vehicle-showcase-detail-client';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function VehicleDetailPage({ params }: PageProps) {
  const resolved = await params;
  return <VehicleShowcaseDetailClient vehicleId={resolved.id} />;
}

