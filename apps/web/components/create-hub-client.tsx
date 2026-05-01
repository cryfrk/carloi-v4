'use client';

import Link from 'next/link';
import { AppShell } from './app-shell';

export function CreateHubClient() {
  return (
    <AppShell>
      <section className="settings-stack">
        <article className="settings-card settings-hero">
          <div>
            <div className="settings-kicker">Create</div>
            <h2>Ne yapmak istiyorsun?</h2>
            <p>Gonderi, hikaye, ilan veya arac ekleme akisini tek bir merkezden baslat.</p>
          </div>
        </article>
        <section className="cards-grid profile-cards-grid">
          <Link className="bullet-card" href="/create-post">
            <div className="card-label">Social</div>
            <h3 className="card-title">Gonderi olustur</h3>
            <p className="card-copy">Coklu medya, caption ve konumla sosyal paylasim ac.</p>
          </Link>
          <Link className="bullet-card" href="/stories/create">
            <div className="card-label">Stories</div>
            <h3 className="card-title">Hikaye olustur</h3>
            <p className="card-copy">Gercek medya upload ile 24 saatlik hikaye paylasimini baslat.</p>
          </Link>
          <Link className="bullet-card" href="/listings/create">
            <div className="card-label">Marketplace</div>
            <h3 className="card-title">Ilan olustur</h3>
            <p className="card-copy">Profilindeki arac koleksiyonundan bir araci secip yayin akisina al.</p>
          </Link>
          <Link className="bullet-card" href="/vehicles/create">
            <div className="card-label">Vehicles</div>
            <h3 className="card-title">Arac ekle</h3>
            <p className="card-copy">Profilindeki Araclar sekmesini dolduracak yeni bir araci wizard ile ekle.</p>
          </Link>
        </section>
      </section>
    </AppShell>
  );
}
