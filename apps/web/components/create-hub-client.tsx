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
            <h2>Ne paylasmak istiyorsun?</h2>
            <p>Dynamic island akisini bozmadan gonderi, hikaye ve ilan olusturma merkezini buradan baslat.</p>
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
            <p className="card-copy">Garajindaki araclardan birini secip yayin akisina al.</p>
          </Link>
        </section>
      </section>
    </AppShell>
  );
}
