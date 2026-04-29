import { InsuranceDetailClient } from '../../../components/insurance-detail-client';

export default async function InsuranceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InsuranceDetailClient requestId={id} />;
}
