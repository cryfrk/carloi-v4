'use client';

import Link from 'next/link';
import { AppShell } from './app-shell';
import { useAuth } from './auth-provider';
import { screenMap, webScreens } from '../lib/screen-map';

const roadmap = [
  ['Domain modules', 'Ready'],
  ['Shared types package', 'Ready'],
  ['Prisma schema foundation', 'Ready'],
  ['Feature implementation', 'Planned'],
] as const;

export function ScreenView({ slug }: { slug: keyof typeof screenMap }) {
  const { session, isReady } = useAuth();
  const fallbackScreen = webScreens[0];

  if (!fallbackScreen) {
    return null;
  }

  const screen = screenMap[slug] ?? fallbackScreen;

  if (!isReady) {
    return (
      <AppShell>
        <section className="detail-card gate-card">
          <div className="card-label">Auth status</div>
          <h3 className="card-title">Oturum kontrol ediliyor</h3>
          <p className="card-copy">Carloi V4 istemcisi mevcut oturumu yukluyor.</p>
        </section>
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell>
        <section className="detail-card gate-card">
          <div className="card-label">Auth required</div>
          <h3 className="card-title">Bu alana erismek icin giris yapin</h3>
          <p className="card-copy">
            Web uygulamasi auth akisi artik aktif. Kayit olup hesabinizi dogruladiktan sonra ana ekranlara gecis yapabilirsiniz.
          </p>
          <div className="gate-actions">
            <Link className="primary-link" href="/login">
              Giris yap
            </Link>
            <Link className="secondary-link" href="/register">
              Uye ol
            </Link>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="hero-card">
        <div className="hero-grid">
          <div className="hero-copy">
            <div className="hero-kicker">{screen.eyebrow}</div>
            <h2 className="hero-title">{screen.title}</h2>
            <p className="hero-description">{screen.description}</p>
          </div>
          <div className="metrics">
            <div className="metric">
              <strong>01</strong>
              Placeholder route hazir
            </div>
            <div className="metric">
              <strong>02</strong>
              Gercek modullere donusecek klasor yapisi kuruldu
            </div>
            <div className="metric">
              <strong>03</strong>
              Monorepo ile paylasimli gelisim zeminine baglandi
            </div>
          </div>
        </div>
      </section>

      <section className="cards-grid">
        {screen.bullets.map((bullet) => (
          <article key={bullet} className="bullet-card">
            <div className="card-label">Future slice</div>
            <h3 className="card-title">{bullet}</h3>
            <p className="card-copy">
              Bu alan sonraki sprintlerde gercek veri, form state ve API baglantilariyla zenginlestirilecek.
            </p>
          </article>
        ))}
      </section>

      <section className="detail-card roadmap">
        {roadmap.map(([label, status]) => (
          <div className="roadmap-item" key={label}>
            <span>{label}</span>
            <span>{status}</span>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
