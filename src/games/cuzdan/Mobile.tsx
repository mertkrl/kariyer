import type { ReactNode } from 'react';
import { hrefOf } from '../../arcade/route';
import { YEAR_NOTE, isOldLira, type Year } from './data';
import type { AppId } from './appList';
import { AppIcon, type IconId } from './icons';
import { money, walletOf, type Persona, type Theme } from './model';
import m from './Mobile.module.css';

/*
 * Telefonda Cüzdan TL: masaüstü yerine dönemin cep ekranı. Üstte durum çubuğu (operatör, saat, yıl,
 * pil), ana ekranda kullanıcı kartı, öne çıkan Günün Sepeti ve uygulama ızgarası; uygulama tam
 * sayfa açılır, başlıktaki ‹ ile ana ekrana dönülür. Altta sabit çubuk: ana ekran, yıl, ses,
 * mesaiyi bitir. Görünüş masaüstüyle aynı temadan gelir (2002 mavi, 2009–2012 cam, 2016 sonrası düz).
 */

interface App {
  title: string;
  short: string;
  body: ReactNode;
}

export function Mobile({
  theme,
  year,
  persona,
  clock,
  sound,
  onSound,
  current,
  apps,
  icons,
  onOpen,
  onBack,
  onLogout,
  errors,
  onErrorsDone,
  toast,
  saver,
}: {
  theme: Theme;
  year: Year;
  persona: Persona;
  clock: Date;
  sound: boolean;
  onSound: () => void;
  current: AppId | null;
  apps: Partial<Record<AppId, App>>;
  icons: { id: AppId & IconId; label: string }[];
  onOpen: (id: AppId) => void;
  onBack: () => void;
  onLogout: () => void;
  errors: { id: number; text: string; icon: string }[];
  onErrorsDone: () => void;
  toast: ReactNode;
  saver: ReactNode;
}) {
  const app = current ? apps[current] : null;
  const cur = isOldLira(year) ? 'eski TL' : year < 2009 ? 'YTL' : 'TL';
  const lastError = errors[errors.length - 1];

  return (
    <div className={m.phone}>
      <div className={m.status} aria-hidden="true">
        <span>CüzdanCell</span>
        <span>{clock.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
        <span>
          {year} · ▮▮▮▯
        </span>
      </div>

      {app && current ? (
        <section className={m.page} aria-label={app.title}>
          <div className={m.pageBar}>
            <button type="button" className={m.back} onClick={onBack} aria-label="Ana ekrana dön">
              ‹
            </button>
            <AppIcon id={current} theme={theme} size={22} />
            <b>{app.short}</b>
          </div>
          <div className={m.pageBody}>{app.body}</div>
        </section>
      ) : (
        <main className={m.home}>
          <div className={m.card}>
            <span className={m.avatar} aria-hidden="true">
              {persona.avatar}
            </span>
            <span>
              <b>{persona.name}</b>
              <small>
                {persona.role} · cepte {money(walletOf(year, persona), year)}
              </small>
              <small>
                {year} · {cur} · {YEAR_NOTE[year]}
              </small>
            </span>
          </div>

          <button type="button" className={m.hero} onClick={() => onOpen('gunluk')}>
            <AppIcon id="gunluk" theme={theme} size={48} />
            <span>
              <b>Günün Sepeti</b>
              <small>Bugünün 5 sorusu, herkese aynı. Arkadaşınla kıyasla.</small>
            </span>
            <span aria-hidden="true">›</span>
          </button>

          <ul className={m.grid} aria-label="Uygulamalar">
            {icons
              .filter((i) => i.id !== 'gunluk')
              .map((i) => (
                <li key={i.id}>
                  <button type="button" onClick={() => onOpen(i.id)}>
                    <span className={m.tile}>
                      <AppIcon id={i.id} theme={theme} size={44} />
                    </span>
                    <span>{i.label}</span>
                  </button>
                </li>
              ))}
            {apps.karne && (
              <li>
                <button type="button" onClick={() => onOpen('karne')}>
                  <span className={m.tile}>
                    <AppIcon id="karne" theme={theme} size={44} />
                  </span>
                  <span>Karne</span>
                </button>
              </li>
            )}
          </ul>
        </main>
      )}

      {lastError && (
        <div className={m.alert} role="alertdialog" aria-label={lastError.text}>
          <div>
            <span aria-hidden="true">{errors.length > 1 ? errors[0].icon : lastError.icon}</span>
            <p>
              {errors.length > 1 && <b>{errors[0].text}</b>}
              {errors.length > 1 && <br />}
              {lastError.text}
            </p>
            <button type="button" onClick={onErrorsDone} autoFocus>
              Tamam
            </button>
          </div>
        </div>
      )}

      {toast}

      <nav className={m.nav} aria-label="Telefon">
        <button type="button" onClick={() => current && onBack()} aria-label="Ana ekran">
          <span aria-hidden="true">⌂</span>
          Ana ekran
        </button>
        <button type="button" onClick={() => onOpen('saat')} aria-label={`Yıl: ${year}. Değiştir`}>
          <span aria-hidden="true">🕰️</span>
          {year}
        </button>
        <button type="button" onClick={onSound} aria-label={sound ? 'Sesi kapat' : 'Sesi aç'}>
          <span aria-hidden="true">{sound ? '🔊' : '🔇'}</span>
          Ses
        </button>
        <button type="button" onClick={onLogout} aria-label="Kullanıcı değiştir">
          <span aria-hidden="true">👤</span>
          Kullanıcı
        </button>
        <a href={hrefOf('arcade')} aria-label="Mesaiyi bitir">
          <span aria-hidden="true">⏻</span>
          Çıkış
        </a>
      </nav>

      {saver}
    </div>
  );
}
