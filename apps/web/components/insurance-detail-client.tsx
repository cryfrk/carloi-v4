'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CreateInsurancePaymentResponse, InsuranceRequestView } from '@carloi-v4/types';
import { AppShell } from './app-shell';
import { useAuth } from './auth-provider';
import { webInsuranceApi } from '../lib/insurance-api';
import { webPaymentsApi } from '../lib/payments-api';

export function InsuranceDetailClient({ requestId }: { requestId: string }) {
  const { session, isReady } = useAuth();
  const [request, setRequest] = useState<InsuranceRequestView | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [paymentSession, setPaymentSession] = useState<CreateInsurancePaymentResponse | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    void webInsuranceApi
      .getRequest(session.accessToken, requestId)
      .then((response) => setRequest(response))
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Sigorta talebi yuklenemedi.');
      });
  }, [requestId, session?.accessToken]);

  useEffect(() => {
    if (!paymentSession || !formRef.current) {
      return;
    }

    formRef.current.submit();
  }, [paymentSession]);

  const canAcceptOffer = useMemo(
    () => Boolean(request?.currentOffer && request.currentOffer.status === 'ACTIVE'),
    [request],
  );

  if (!isReady) {
    return (
      <AppShell>
        <section className="detail-card gate-card">
          <h3 className="card-title">Sigorta detaylari hazirlaniyor</h3>
        </section>
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell>
        <section className="detail-card gate-card">
          <h3 className="card-title">Bu alan icin giris gerekli</h3>
        </section>
      </AppShell>
    );
  }

  const accessToken = session.accessToken;

  async function refreshRequest() {
    const nextRequest = await webInsuranceApi.getRequest(accessToken, requestId);
    setRequest(nextRequest);
  }

  async function acceptOffer() {
    if (!request?.currentOffer) {
      return;
    }

    try {
      const response = await webInsuranceApi.acceptOffer(accessToken, request.currentOffer.id);
      setNotice('Teklif kabul edildi. Odeme ekranina gecebilirsiniz.');
      await refreshRequest();

      if (response.paymentId) {
        await startPayment();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Teklif kabul edilemedi.');
    }
  }

  async function rejectOffer() {
    if (!request?.currentOffer) {
      return;
    }

    try {
      await webInsuranceApi.rejectOffer(accessToken, request.currentOffer.id);
      setNotice('Teklif reddedildi.');
      await refreshRequest();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Teklif reddedilemedi.');
    }
  }

  async function startPayment() {
    try {
      const response = await webPaymentsApi.createInsurancePayment(accessToken, requestId);
      setPaymentSession(response);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Odeme baslatilamadi.');
    }
  }

  return (
    <AppShell>
      <section className="insurance-page">
        {notice ? <div className="auth-message success">{notice}</div> : null}
        {errorMessage ? <div className="auth-message error">{errorMessage}</div> : null}

        {!request ? (
          <section className="detail-card gate-card">
            <h3 className="card-title">Talep yukleniyor</h3>
          </section>
        ) : (
          <>
            <header className="detail-card insurance-header">
              <div>
                <p className="brand-kicker">{request.status}</p>
                <h2>{request.listing.title}</h2>
                <p className="card-copy">
                  {request.listing.listingNo} · {request.vehicle.brand ?? '-'} {request.vehicle.model ?? '-'}
                </p>
              </div>
              <div className="insurance-actions">
                {canAcceptOffer ? (
                  <>
                    <button className="primary-cta" type="button" onClick={() => void acceptOffer()}>
                      Teklifi kabul et
                    </button>
                    <button className="secondary-cta" type="button" onClick={() => void rejectOffer()}>
                      Teklifi reddet
                    </button>
                  </>
                ) : null}
                {request.status === 'ACCEPTED' || request.status === 'PAID' || request.status === 'POLICY_UPLOADED' ? (
                  <button className="primary-cta" type="button" onClick={() => void startPayment()}>
                    Odemeyi baslat
                  </button>
                ) : null}
              </div>
            </header>

            <div className="insurance-grid">
              <article className="detail-card insurance-card">
                <span className="brand-kicker">Teklif</span>
                {request.currentOffer ? (
                  <>
                    <h3>
                      {request.currentOffer.amount.toLocaleString('tr-TR')} {request.currentOffer.currency}
                    </h3>
                    <p className="card-copy">Durum: {request.currentOffer.status}</p>
                    {request.currentOffer.offerFileUrl ? (
                      <a className="session-link" href={request.currentOffer.offerFileUrl} target="_blank" rel="noreferrer">
                        Teklif dosyasini ac
                      </a>
                    ) : null}
                  </>
                ) : (
                  <p className="card-copy">Henuz aktif sigorta teklifi yok.</p>
                )}
              </article>

              <article className="detail-card insurance-card">
                <span className="brand-kicker">Odeme</span>
                <h3>{request.payment?.status ?? 'PENDING'}</h3>
                <p className="card-copy">
                  {request.payment
                    ? `${request.payment.amount.toLocaleString('tr-TR')} ${request.payment.currency}`
                    : 'Odeme kaydi teklif kabulunden sonra olusur.'}
                </p>
                {request.payment?.failureReason ? <p className="card-copy">{request.payment.failureReason}</p> : null}
              </article>

              <article className="detail-card insurance-card">
                <span className="brand-kicker">Belgeler</span>
                {request.documents.length > 0 ? (
                  <div className="insurance-document-list">
                    {request.documents.map((document) => (
                      <a
                        key={document.id}
                        className="session-link"
                        href={document.fileUrl ?? '#'}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {document.documentType}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="card-copy">Odeme tamamlandiktan sonra police ve fatura burada acilacak.</p>
                )}
              </article>

              <article className="detail-card insurance-card">
                <span className="brand-kicker">Ruhsat bilgisi</span>
                <p className="card-copy">Sahip: {request.licenseInfo.ownerName ?? '-'}</p>
                <p className="card-copy">TC: {request.licenseInfo.maskedTcNo ?? '-'}</p>
                <p className="card-copy">Plaka: {request.licenseInfo.maskedPlate ?? '-'}</p>
              </article>
            </div>

            {request.sourceThreadId ? (
              <Link className="secondary-cta inline-link-button" href={`/messages?thread=${request.sourceThreadId}`}>
                Mesajlasma threadine don
              </Link>
            ) : null}

            {paymentSession ? (
              <form ref={formRef} action={paymentSession.checkout.actionUrl} method={paymentSession.checkout.method} className="hidden-payment-form">
                {Object.entries(paymentSession.checkout.fields).map(([key, value]) => (
                  <input key={key} type="hidden" name={key} value={value} />
                ))}
              </form>
            ) : null}
          </>
        )}
      </section>
    </AppShell>
  );
}
