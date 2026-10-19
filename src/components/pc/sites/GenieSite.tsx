import { useEffect, useState } from 'react';
import { prefersReducedMotion } from '../../ui/motion';
import { useLater } from './kit';
import type { SiteProps } from './registry';
import s from './GenieSite.module.css';

/*
 * Serkan'ın "portfolyosu": bir site üreticisinin ajans şablonu, içi doldurulmamış. Uzaktan parlak
 * görünür; kurcalayınca dağılır ve bunu bir İK uzmanı da görür: kayıt formu boş bırakılınca
 * "Welcome, undefined!" der, sayaçlardan biri "NaN+" gösterir, proje görselleri kırık, "View Case
 * Study" 404'e gider, iletişim formu yapılandırılmamış, köşede "Made with SiteGenie". Her şirkete
 * uyan slogan, "LOGO" yazan müşteriler, John Doe yorumları; Türkçe tek kelime yok.
 */
const STATS: [number, string][] = [
  [500, 'Happy Clients'],
  [1200, 'Projects'],
  [Number.NaN, 'Countries'],
];

function Counter({ to }: { to: number }) {
  const [n, setN] = useState(() => (prefersReducedMotion() ? to : 0));
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1200);
      setN(Math.round(to * t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{`${n.toLocaleString('en-US')}+`}</>;
}

export function GenieSite({ page, go }: SiteProps) {
  const later = useLater();
  const [modal, setModal] = useState(false);
  const [first, setFirst] = useState<string | undefined>(undefined);
  const [welcome, setWelcome] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const nothing = (e: { preventDefault: () => void }) => e.preventDefault();

  if (page === '404') {
    return (
      <div className={`${s.site} ${s.notFound}`}>
        <b>404</b>
        <h1>Page not found</h1>
        <p>The page you are looking for doesn't exist or has been moved.</p>
        <button className={s.cta} onClick={() => go('home')}>
          Back to Home
        </button>
        <small>Powered by SiteGenie · Template: Agency Pro</small>
      </div>
    );
  }

  return (
    <div className={s.site}>
      {welcome !== null && (
        <div className={s.toast} role="status">
          🎉 Welcome, {welcome}! Your account is ready.
        </div>
      )}
      <header className={s.head}>
        <a className={s.logo} href="#" onClick={nothing}>
          <i aria-hidden="true" />
          NexaFlow
        </a>
        <nav className={s.nav}>
          {['Home', 'About', 'Services', 'Portfolio', 'Contact'].map((n) => (
            <a key={n} href="#" onClick={nothing}>
              {n}
            </a>
          ))}
          <a href="#" onClick={nothing} className={s.lang}>
            🌐 EN ▾
          </a>
        </nav>
      </header>

      <section className={s.hero}>
        <h1>
          Elevate Your Digital Future with <span>Innovative Solutions</span>
        </h1>
        <p>We empower businesses to unlock their full potential through cutting-edge technology and data-driven synergy.</p>
        <button className={s.cta} onClick={() => setModal(true)}>
          Get Started
        </button>
        {/* şablonun hazır "ürün ekranı" görseli: hiçbir şeyin ekranı değil */}
        <svg viewBox="0 0 640 260" className={s.mock} role="img" aria-label="Örnek panel görseli">
          <rect width="640" height="260" rx="14" fill="#15152e" stroke="#2a2a44" />
          <rect width="640" height="30" rx="14" fill="#1c1c3a" />
          {[22, 38, 54].map((x) => (
            <circle key={x} cx={x} cy="15" r="4.5" fill="#3b3b5c" />
          ))}
          <rect x="20" y="48" width="120" height="192" rx="10" fill="#1c1c3a" />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x="34" y={66 + i * 30} width={84 - i * 8} height="9" rx="4.5" fill="#2e2e50" />
          ))}
          <rect x="156" y="48" width="220" height="110" rx="10" fill="#1c1c3a" />
          <path d="M172 136 L212 110 L252 120 L292 88 L356 96" fill="none" stroke="#8b5cf6" strokeWidth="4" strokeLinecap="round" />
          <rect x="392" y="48" width="228" height="110" rx="10" fill="#1c1c3a" />
          {[40, 62, 34, 76, 54, 88].map((h, i) => (
            <rect key={i} x={410 + i * 34} y={140 - h} width="20" height={h} rx="4" fill="#22d3ee" opacity="0.8" />
          ))}
          <rect x="156" y="174" width="464" height="66" rx="10" fill="#1c1c3a" />
          {[0, 1].map((i) => (
            <rect key={i} x="174" y={192 + i * 22} width={380 - i * 120} height="9" rx="4.5" fill="#2e2e50" />
          ))}
        </svg>
      </section>

      <section className={s.band}>
        <div className={s.logos}>
          <small>Trusted by</small>
          {['LOGO', 'LOGO', 'Company', 'LOGO'].map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
        <div className={s.stats}>
          {STATS.map(([n, l]) => (
            <div key={l}>
              <b>
                <Counter to={n} />
              </b>
              <span>{l}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={s.section}>
        <h2>Our Services</h2>
        <div className={s.cards}>
          {['Web Development', 'AI Solutions', 'Blockchain Consulting'].map((t) => (
            <div key={t} className={s.card}>
              <b>{t}</b>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.</p>
            </div>
          ))}
        </div>
      </section>

      <section className={s.section}>
        <h2>Featured Projects</h2>
        <div className={s.cards}>
          {['Project One', 'Project Two', 'Project Three'].map((t) => (
            <div key={t} className={s.card}>
              {/* görsel yolu şablonun örnek klasörünü gösteriyor: yüklenmiyor */}
              <div className={s.broken} role="img" aria-label={t}>
                <span aria-hidden="true">🖼︎</span>
                {t.toLowerCase().replace(' ', '-')}.jpg
              </div>
              <b>{t}</b>
              <p>A short description of your project goes here.</p>
              <button className={s.link} onClick={() => go('404')}>
                View Case Study →
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className={s.section}>
        <h2>What Our Clients Say</h2>
        <div className={s.quotes}>
          {[
            ['John Doe', 'CEO, Company Inc.'],
            ['Jane Smith', 'Marketing Director, Brand Co.'],
          ].map(([n, r]) => (
            <blockquote key={n} className={s.card}>
              <span className={s.stars}>★★★★★</span>
              <p>"Working with this team transformed our business. Highly recommended!"</p>
              <footer>
                <b>{n}</b>
                <small>{r}</small>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section className={s.section}>
        <h2>Get In Touch</h2>
        <form
          className={s.form}
          onSubmit={(e) => {
            e.preventDefault();
            setSending(true);
            setSent(false);
            later(() => {
              setSending(false);
              setSent(true);
            }, 1400);
          }}
        >
          <input placeholder="Your Name" aria-label="Your Name" />
          <input placeholder="your@email.com" aria-label="Email" />
          <textarea placeholder="Your message" aria-label="Message" />
          <button className={s.cta} disabled={sending}>
            {sending ? 'Sending…' : 'Send Message'}
          </button>
          {sent && (
            <p className={s.formError} role="alert">
              Error 500: Form endpoint not configured. Please set up your form in SiteGenie settings.
            </p>
          )}
        </form>
      </section>

      <footer className={s.foot}>
        <span>© 2023 Your Company Name. All rights reserved.</span>
        <span>📍 123 Business Street, City, Country</span>
      </footer>
      <a className={s.badge} href="#" onClick={nothing}>
        ◆ Made with SiteGenie
      </a>

      {modal && (
        <div className={s.modalBack} onClick={() => setModal(false)}>
          <form
            className={s.modal}
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              // şablonun formu doğrulama yapmaz; boş alan "undefined" olarak gider
              setWelcome(String(first));
              setModal(false);
              later(() => setWelcome(null), 4000);
            }}
          >
            <h3>Create your account</h3>
            <input placeholder="First name" aria-label="First name" onChange={(e) => setFirst(e.target.value || undefined)} />
            <input placeholder="Email" aria-label="Email" />
            <input placeholder="Password" aria-label="Password" type="password" />
            <button className={s.cta}>Sign Up</button>
            <small>By signing up you agree to our Terms of Service.</small>
          </form>
        </div>
      )}
    </div>
  );
}
