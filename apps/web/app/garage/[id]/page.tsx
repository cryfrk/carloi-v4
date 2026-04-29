import { GarageDetailClient } from '../../../components/garage-detail-client';

export default async function GarageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GarageDetailClient vehicleId={id} />;
}
