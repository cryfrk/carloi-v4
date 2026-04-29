'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { PaymentResultResponse } from '@carloi-v4/types';
import { AppShell } from './app-shell';
import { webPaymentsApi } from '../lib/payments-api';

export function PaymentResultClient({ paymentId }: { paymentId: string }) {
  const [result, setResult] = useState<PaymentResultResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void webPaymentsApi
      .getPaymentResult(paymentId)
      .then((response) => setResult(response))
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Odeme sonucu yuklenemedi.');
      });
  }, [paymentId]);

  return (
    <AppShell>
      <section className="insurance-page">
        {errorMessage ? <div className="auth-message error">{errorMessage}</div> : null}
        {!result ? (
          <section className="detail-card gate-card">
            <h3 className="card-title">Odeme sonucu aliniyor</h3>
          </section>
        ) : (
          <section className="detail-card insurance-header">
            <p className="brand-kicker">{result.status}</p>
            <h2>Odeme sonucu</h2>
            <p className="card-copy">
              {result.amount.toLocaleString('tr-TR')} {result.currency}
            </p>
            {result.failureReason ? <p className="card-copy">{result.failureReason}</p> : null}
            {result.listing ? (
              <Link className="session-link" href={`/insurance/${result.insuranceRequestId ?? ''}`}>
                {result.listing.title} talebine don
              </Link>
            ) : null}
          </section>
        )}
      </section>
    </AppShell>
  );
}
