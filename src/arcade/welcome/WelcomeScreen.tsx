import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { audioEngine } from '../../audio/audioEngine';
import { storeMuted } from '../../game/lib/prefs';
import { prefersReducedMotion } from '../../components/ui/motion';
import { GAMES, loadingBgOf } from '../games';
import { loadProgress } from '../progress';
import { hrefOf } from '../route';
import type { GameRoute } from '../slugs';
import { Model, type Leaving } from './Model';
import { darkness, windowsOn } from './nightClock';
import { STOPS, type Stop } from './stops';
import * as sfx from '../mahalle/sfx';
import './fonts.css';
import s from './Welcome.module.css';

/*
 * Mesai Dışı'nın ilk ekranı, Figma'daki "İzometrik Mahalle / Mimari Maket" çerçevesi (1600×1000)
 * birebir: solda karşılama, sağda mahallenin etkileşimli maketi (Model.tsx). Maketteki bir yere
 * tıklayan doğrudan o yerin oyununa dalar (dövizci → Cüzdan Zamanı). Sitenin ana sayfasıdır;
 * oyunlardan dönüş de buraya gelir.
 */

/** Figma'daki ikonlar (lucide): 18×18, 1.5 kalınlık. */
const ICONS = {
  volume:
    'M12 6.75a3.75 3.75 0 0 1 0 4.5M14.52 13.77a6.75 6.75 0 0 0 0-9.54M8.25 3.53a.53.53 0 0 0-.9-.37L4.8 5.69a1.05 1.05 0 0 1-.75.31H2.25a.75.75 0 0 0-.75.75v4.5c0 .41.34.75.75.75h1.81c.28 0 .55.11.75.31l2.54 2.54a.53.53 0 0 0 .9-.38z',
  help: 'M6.82 6.75a2.25 2.25 0 0 1 4.37.75c0 1.5-2.25 2.25-2.25 2.25M9 12.75h.01M16.5 9A7.5 7.5 0 1 1 1.5 9a7.5 7.5 0 0 1 15 0z',
  settings: 'M7.5 3.75H2.25M9 14.25H2.25M10.5 2.25v3M10.5 3.75h5.25M12 12.75v3M12 14.25h3.75M15.75 9H9M6 7.5v3M6 9H2.25',
};

function ToolButton({ label, pressed, onClick, children }: { label: string; pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={s.tool} aria-label={label} aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  );
}

function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  // açılınca odak panele geçer: klavyeyle gelen içeriği hemen okur, Esc kapatır
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => close.current?.focus(), []);
  return (
    <aside className={s.panel} role="dialog" aria-label={title}>
      <div className={s.panelHead}>
        <h2>{title}</h2>
        <button ref={close} type="button" className={s.close} aria-label="Paneli kapat" onClick={onClose}>
          ×
        </button>
      </div>
      <div className={s.panelBody}>{children}</div>
    </aside>
  );
}

// rehber ve ayarlar yalnızca açılınca iner: ilk açılış paketine girmez
const Help = lazy(() => import('./WelcomePanels').then((m) => ({ default: m.Help })));
const Settings = lazy(() => import('./WelcomePanels').then((m) => ({ default: m.Settings })));

/** Şimdiki saat; geliştirirken `?saat=22` (ya da `?saat=cmt`) ile başka bir an denenir. */
function readNow(): Date {
  const d = new Date();
  if (!import.meta.env.DEV) return d;
  const q = new URLSearchParams(window.location.search).get('saat');
  if (q === 'cmt') d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
  else if (q && /^\d{1,2}(:\d{2})?$/.test(q)) {
    const [h, m = '0'] = q.split(':');
    d.setHours(Number(h), Number(m));
  }
  return d;
}

/** Mesai saati: hafta içi 08:00–18:00. */
function isWorkHours(d: Date): boolean {
  const day = d.getDay();
  const h = d.getHours();
  // GEÇİCİ TEST: mesai 08:00–09:00'a daraltıldı, gün içinde soru denenebilsin. Geri al: h >= 8 && h < 18
  return day >= 1 && day <= 5 && h >= 8 && h < 9;
}

function shiftNote(d: Date): string {
  const day = d.getDay();
  const h = d.getHours();
  if (isWorkHours(d)) return 'Şu an mesai saatindesin. Sekmeyi küçük tut.';
  if (day === 0 || day === 6) return 'Hafta sonu. Kimse bakmıyor.';
  if (h < 8) return 'Mesai henüz başlamadı. Kimse bakmıyor.';
  return 'Mesai bitti. Kimse bakmıyor.';
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Fazla mesai sayacı: 00:03:12. */
function elapsed(from: number, to: number): string {
  const sec = Math.max(0, Math.floor((to - from) / 1000));
  return `${pad(Math.floor(sec / 3600))}:${pad(Math.floor(sec / 60) % 60)}:${pad(sec % 60)}`;
}

type Ask = 'idle' | 'asking' | 'relieved';

/*
 * Üst çubuğun ortasındaki saat. Mesai dışında "Kimse bakmıyor" yazısının üstüne gelen (telefonda
 * dokunan) kişiye saat sorar: "…sen çalışmıyorsun, değil mi?" Hayır derse yazı yerine döner, bir
 * dahaki sefere soru kuşkulanır. Evet derse site fazla mesai moduna geçer ve saat sayaca döner.
 */
function ShiftClock({ overtimeSince, onConfess }: { overtimeSince: number | null; onConfess: () => void }) {
  const [now, setNow] = useState(readNow);
  const [ask, setAsk] = useState<Ask>('idle');
  const [denied, setDenied] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setNow(readNow()), overtimeSince ? 1000 : 15_000);
    return () => window.clearInterval(id);
  }, [overtimeSince]);
  useEffect(() => {
    if (ask !== 'relieved') return;
    const id = window.setTimeout(() => setAsk('idle'), 2200);
    return () => window.clearTimeout(id);
  }, [ask]);

  const work = isWorkHours(now);
  const time = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  if (overtimeSince) {
    return (
      <p className={`${s.clock} ${s.clockOvertime}`}>
        <span className={`${s.dot} ${s.dotWork}`} aria-hidden="true" />
        <span className={s.clockTime}>{time}</span>
        <span className={s.clockText}>
          Fazla mesai: <span className={s.clockTime}>{elapsed(overtimeSince, now.getTime())}</span>
        </span>
      </p>
    );
  }

  const open = () => !work && ask === 'idle' && setAsk('asking');
  const question = denied ? 'Emin misin? Sekmende Excel açık gibi.' : '…sen çalışmıyorsun, değil mi?';
  return (
    <div className={`${s.clock} ${ask === 'asking' ? s.clockAsking : ''}`} onPointerEnter={(e) => e.pointerType !== 'touch' && open()} onPointerLeave={() => ask === 'asking' && setAsk('idle')}>
      <span className={`${s.dot} ${work ? s.dotWork : ''} ${ask === 'relieved' ? s.dotWink : ''}`} aria-hidden="true" />
      <span className={s.clockTime}>{time}</span>
      {work ? (
        <span className={s.clockText}>{shiftNote(now)}</span>
      ) : ask === 'idle' ? (
        <button type="button" className={`${s.clockText} ${s.clockBait}`} onClick={open}>
          {shiftNote(now)}
        </button>
      ) : ask === 'relieved' ? (
        <span className={s.clockText} role="status">
          İyi. Öyle kalsın.
        </span>
      ) : (
        <span className={s.ask} role="group" aria-label={question}>
          <span className={s.askText}>{question}</span>
          <button
            type="button"
            className={s.askBtn}
            onClick={() => {
              setDenied((n) => n + 1);
              setAsk('relieved');
            }}
          >
            Hayır
          </button>
          <button type="button" className={`${s.askBtn} ${s.askYes}`} onClick={onConfess}>
            Evet
          </button>
        </span>
      )}
    </div>
  );
}

/** Saat: yarım dakikada bir ilerler (maketin ışıkları ve sitenin rengi buna bakar). */
function useNow(): Date {
  const [now, setNow] = useState(readNow);
  useEffect(() => {
    const id = window.setInterval(() => setNow(readNow()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/**
 * Sitenin akşamı: zemin 0…1 karanlıkla koyulaşır. Yazı rengi yarıda döner; o anda zemin ara tondan
 * atlar ki iki renk de ara tonda okunaksız kalmasın (gündüz zemini en çok %25, gece en az %75 koyu).
 */
const shadeOf = (dark: number) => (dark < 0.5 ? dark * 0.5 : 0.75 + (dark - 0.5) * 0.5);

export function WelcomeScreen({ preload }: { preload: (route: string) => void }) {
  const [muted, setMuted] = useState(() => audioEngine.isMuted());
  const [panel, setPanel] = useState<'help' | 'settings' | null>(null);
  const toggle = (p: 'help' | 'settings') => setPanel((cur) => (cur === p ? null : p));
  const [progress] = useState(loadProgress);
  const [leaving, setLeaving] = useState<Leaving | null>(null);
  const [overtimeSince, setOvertimeSince] = useState<number | null>(null);
  const now = useNow();
  // fazla mesaide de ışık dışarıdaki saati izler: gündüz aydınlık, akşam yavaşça kararır
  const dark = darkness(now);
  const lights = windowsOn(now, overtimeSince !== null);

  // kamera durağa dalar, ekran oyunun zemin rengine döner, sonra oyun açılır
  const enterGame = (stop: Stop, route: GameRoute) => {
    if (leaving) return;
    sfx.wake();
    sfx.enter();
    preload(route);
    setPanel(null);
    if (prefersReducedMotion()) {
      window.location.hash = hrefOf(route);
      return;
    }
    setLeaving({ stop, route });
    window.setTimeout(() => (window.location.hash = hrefOf(route)), 900);
  };

  useEffect(() => {
    audioEngine.setMusicMood('off');
  }, []);
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPanel(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel]);

  return (
    <div
      className={`${s.page} ${leaving ? s.leaving : ''} ${dark >= 0.5 ? s.dusk : ''} ${overtimeSince ? s.overtime : ''}`}
      style={{ '--shade': shadeOf(dark) } as CSSProperties}
    >
      <div className={s.frame}>
        <div className={s.model}>
          <Model
            src={`${import.meta.env.BASE_URL}mahalle/giris.webp`}
            nightSrc={`${import.meta.env.BASE_URL}mahalle/giris-gece.webp`}
            litSrc={`${import.meta.env.BASE_URL}mahalle/giris-gece-isik.webp`}
            dark={dark} lights={lights} muted={muted} overtime={overtimeSince !== null} progress={progress} leaving={leaving} onEnter={enterGame} preload={preload} />
        </div>

        {/* data-safe-top: maketteki kart bu çubuğun altında açılır */}
        {/* telefonda maketin işaretleri sık durur: oyunlar altında bir de liste olarak */}
        <nav className={s.list} aria-label="Oyunlar">
          {GAMES.map((g) => {
            const stop = STOPS.find((st) => st.routes.includes(g.route))!;
            return (
              <button key={g.route} type="button" className={s.chip} onClick={() => enterGame(stop, g.route)}>
                {progress.played[g.route] && (
                  <svg viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M3 6.2l2 2 4-4.4" />
                  </svg>
                )}
                {g.title}
                {progress.played[g.route] && <span className="sr-only"> (bitirildi)</span>}
              </button>
            );
          })}
        </nav>

        <header className={s.top} data-safe-top>
          <a className={s.identity} href={hrefOf('arcade')} aria-label="KASM Mahallesi, Mesai Dışı Sk.">
            <span className={s.brand}>
              <b>KASM</b>
              <small>MAHALLESİ</small>
            </span>
            <span className={s.divider} aria-hidden="true" />
            <span className={s.street}>Mesai Dışı Sk.</span>
          </a>
          <ShiftClock
            overtimeSince={overtimeSince}
            onConfess={() => {
              sfx.wake();
              setOvertimeSince(Date.now());
            }}
          />
          <nav className={s.tools} aria-label="Oyun araçları">
            <ToolButton
              label={muted ? 'Sesi aç' : 'Sesi kapat'}
              pressed={muted}
              onClick={() => {
                audioEngine.init();
                audioEngine.setMuted(!muted);
                storeMuted(!muted);
                setMuted(!muted);
              }}
            >
              <svg viewBox="0 0 18 18" aria-hidden="true">
                <path d={ICONS.volume} />
              </svg>
              {muted && <span className={s.slash} aria-hidden="true" />}
            </ToolButton>
            <ToolButton label="Yardım" pressed={panel === 'help'} onClick={() => toggle('help')}>
              <svg viewBox="0 0 18 18" aria-hidden="true">
                <path d={ICONS.help} />
              </svg>
            </ToolButton>
            <ToolButton label="Ayarlar" pressed={panel === 'settings'} onClick={() => toggle('settings')}>
              <svg viewBox="0 0 18 18" aria-hidden="true">
                <path d={ICONS.settings} />
              </svg>
            </ToolButton>
          </nav>
        </header>

        <section className={s.intro}>
          <p className={s.kicker}>
            <span className={s.kickerOld}>MESAİ BİTTİ, OYUN BAŞLASIN.</span>
            {overtimeSince && <span className={s.kickerNew}>MESAİ BİTMEDİ.</span>}
          </p>
          <h1 className={s.title}>
            Mahalleye{' '}
            <br />
            hoş geldin.
          </h1>
          <p className={s.lead}>Her köşede başka bir hikâye, her durakta yeni bir oyun.</p>
          <span className={s.rule} aria-hidden="true" />
        </section>

        <footer className={s.foot}>
          <svg viewBox="0 0 13 13" aria-hidden="true">
            <path d="M10.83 5.42c0 2.7-3 5.52-4 6.39a.54.54 0 0 1-.66 0c-1-.87-4-3.69-4-6.39a4.33 4.33 0 0 1 8.66 0z" />
            <circle cx="6.5" cy="5.42" r="1.63" />
          </svg>
          MESAİ DIŞI SK. / İSTANBUL
          <span className={s.labs} aria-label="KASM Labs">
            <b>KASM</b>
            <small>LABS</small>
          </span>
        </footer>
      </div>

      <div className={s.fade} style={leaving ? { background: loadingBgOf(leaving.route) } : undefined} />

      {panel === 'help' && (
        <Panel title="Mahalle rehberi" onClose={() => setPanel(null)}>
          <Suspense fallback={null}>
            <Help />
          </Suspense>
        </Panel>
      )}
      {panel === 'settings' && (
        <Panel title="Ayarlar" onClose={() => setPanel(null)}>
          <Suspense fallback={null}>
            <Settings />
          </Suspense>
        </Panel>
      )}
    </div>
  );
}
