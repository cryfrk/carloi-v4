'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { InsuranceRequestView } from '@carloi-v4/types';
import { AppShell } from './app-shell';
import { useAuth } from './auth-provider';
import { webInsuranceApi } from '../lib/insurance-api';

export function InsuranceHomeClient() {
  const { session, isReady } = useAuth();
  const [items, setItems] = useState<InsuranceRequestView[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    void webInsuranceApi
      .getRequests(session.accessToken)
      .then((response) => setItems(response.items))
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Sigorta talepleri yuklenemedi.');
      });
  }, [session?.accessToken]);

  return (
    <AppShell>
      {!isReady ? (
        <section className="detail-card gate-card">
          <h3 className="card-title">Sigorta alani hazirlaniyor</h3>
        </section>
      ) : !session ? (
        <section className="detail-card gate-card">
          <div className="card-label">Auth required</div>
          <h3 className="card-title">Sigorta taleplerini gormek icin giris yapin</h3>
        </section>
      ) : (
        <section className="insurance-page">
          <header className="detail-card insurance-header">
            <div>
              <p className="brand-kicker">Insurance Center</p>
              <h2>Sigorta taleplerim</h2>
              <p className="card-copy">
                Teklifleri inceleyin, odemeyi baslatin ve police belgelerinize ulasin.
              </p>
            </div>
          </header>

          {errorMessage ? <div className="auth-message error">{errorMessage}</div> : null}

          <div className="insurance-grid">
            {items.map((item) => (
              <Link key={item.id} href={`/insurance/${item.id}`} className="detail-card insurance-card">
                <div className="insurance-card-head">
                  <span className="brand-kicker">{item.status}</span>
                  <strong>{item.listing.title}</strong>
                </div>
                <p className="card-copy">
                  {item.listing.listingNo} · {item.listing.city}
                  {item.listing.district ? ` / ${item.listing.district}` : ''}
                </p>
                <div className="ai-chip-row">
                  <span className="ai-chip">{item.vehicle.brand ?? '-'}</span>
                  <span className="ai-chip">{item.vehicle.model ?? '-'}</span>
                  <span className="ai-chip">
                    {item.currentOffer
                      ? `${item.currentOffer.amount.toLocaleString('tr-TR')} ${item.currentOffer.currency}`
                      : 'Teklif bekleniyor'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}
