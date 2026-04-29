import { PaymentResultClient } from '../../../components/payment-result-client';

export default async function PaymentsResultPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentId?: string }>;
}) {
  const params = await searchParams;
  return <PaymentResultClient paymentId={params.paymentId ?? ''} />;
}
