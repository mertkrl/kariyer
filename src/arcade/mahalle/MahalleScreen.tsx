import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { audioEngine } from '../../audio/audioEngine';
import { prefersReducedMotion } from '../../components/ui/motion';
import { hasSave } from '../../game/store/save';
import { fileNo } from '../gameArt';
import { GAMES, isWorkHours, SITE_NAME, SITE_TAGLINE, type ArcadeGame } from '../games';
import { dayGame } from '../notebook/notebook';
import { loadProgress } from '../progress';
import { hrefOf } from '../route';
import type { GameRoute } from '../slugs';
import { StudioMark } from '../Studio';
import { usePointerVars } from '../usePointerVars';
import { Elevator } from './Elevator';
import { PHASE_NAMES, PHASES, phaseOf, PLACES, VIEW_H, VIEW_W, type Phase, type Place, type PlaceId } from './places';
import { Scene } from './Scene';
import * as sfx from './sfx';
import s from './Mahalle.module.css';

/*
 * Giriş ekranı bir mahalle: her oyun mahallede bir yerdir. Bakkala tıklayan Köy Bakkalı'na,
 * yoldaki çukura tıklayan Yama Ekibi'ne girer; plazada asansör iki kat sorar (Sen İK'sin, Genel
 * Yetenek Testi). Sahne günün saatine göre ışır (sağ üstteki düğme değiştirir); bitirilen yerin
 * tabelasına tik, günün oyununa yıldız konur. Dar ekranda sokak yana kayar.
 */

const BY_ROUTE = new Map(GAMES.map((g) => [g.route, g]));
const gamesOf = (p: Place) => p.routes.map((r) => BY_ROUTE.get(r)!).filter(Boolean);

/** Oyun açılırken ekranın son rengi: her oyunun yüklenirken gösterdiği zemin (Root.tsx). */
const LOADING_BG: Record<GameRoute, string> = { iseAlim: '#100e0b', test: '#f4f6fa', insaat: '#bcd9ea', bakkal: '#f4e6c8', ekran: '#23262d', meydan: '#ece6da', asfalt: '#e9e4d8', trafik: '#1d2128', cuzdan: '#efe9da' };

/** Tabeladaki küçük işaretler: yerin kendisini anlatan birkaç çizgi. */
const PIN_ICON: Record<PlaceId, React.JSX.Element> = {
  santiye: <path d="M4 20V5h2v15M6 6h13M9 6v5h4" />,
  bakkal: <path d="M3 9l2-5h14l2 5M3 9h18M5 9v11h14V9M10 20v-6h4v6" />,
  meydan: <path d="M5 21V4h14v17M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M11 21v-3h2v3" />,
  plaza: <path d="M8 21V3h8v18M5 21h14M10 6h4M10 9h4M10 12h4M10 15h4" />,
  doviz: <path d="M12 3v18M17 7.5C16 5.5 14 5 12 5c-3 0-5 1.4-5 3.5S9 12 12 12s5 1.3 5 3.5S15 19 12 19c-2.3 0-4.3-.8-5.2-2.7" />,
  durak: <path d="M4 5h16v10H4zM7 9h6M7 12h10M8 15v4M16 15v4" />,
  cukur: <path d="M3 17c2-3 5-4 9-4s7 1 9 4M7 17c1-1 3-1.6 5-1.6s4 .6 5 1.6M10 3l-3 9M14 3l3 9M8.6 7.5h6.8" />,
  isik: <path d="M9 2h6v14H9zM12 16v6M12 5.5v.01M12 9v.01M12 12.5v.01" />,
};

export function MahalleScreen({ preload }: { preload: (route: string) => void }) {
  // bir oyundan geri dönülünce onun müziği susar
  useEffect(() => {
    audioEngine.setMusicMood('off');
  }, []);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  const [override, setOverride] = useState<Phase | null>(null);
  const phase = override ?? phaseOf(now);
  const work = isWorkHours(now);
  const [today] = useState(() => dayGame(new Date()));

  const [progress] = useState(loadProgress);
  const [saved] = useState(hasSave);
  // Cüzdan Zamanı: profil seçilip oturum açıldıysa "devam et" der
  const [cuzdanSaved] = useState(() => {
    try {
      return localStorage.getItem('kariyerweb-cuzdan-oturum-v1') !== null;
    } catch {
      return false;
    }
  });
  const resume = useCallback((r: GameRoute) => (r === 'iseAlim' && saved) || (r === 'cuzdan' && cuzdanSaved), [saved, cuzdanSaved]);
  const done = GAMES.filter((g) => progress.played[g.route]).length;

  const [hover, setHover] = useState<PlaceId | null>(null);
  const [pinned, setPinned] = useState<PlaceId | null>(null);
  const [lift, setLift] = useState(false);
  const [leaving, setLeaving] = useState<{ x: number; y: number; color: string } | null>(null);
  const [touch, setTouch] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [page, trackPointer] = usePointerVars<HTMLDivElement>(true);
  const scroller = useRef<HTMLDivElement>(null);

  const active = hover ?? pinned;
  const activePlace = PLACES.find((p) => p.id === active) ?? null;

  // dar ekranda sokak plazanın önünden açılır
  useLayoutEffect(() => {
    const el = scroller.current;
    const world = el?.firstElementChild as HTMLElement | null;
    if (!el || !world) return;
    // açılış animasyonu sahneyi biraz büyütür: ölçü dönüşümsüz genişlikten alınır
    const center = () => (el.scrollLeft = world.offsetWidth * (880 / VIEW_W) - el.clientWidth / 2);
    center();
    const t = window.setTimeout(center, 80);
    return () => window.clearTimeout(t);
  }, []);

  const onHover = useCallback(
    (id: PlaceId | null) => {
      setHover(id);
      if (!id) return;
      sfx.hover();
      PLACES.find((p) => p.id === id)?.routes.forEach((r) => preload(r));
    },
    [preload],
  );

  const enter = useCallback((route: GameRoute, p: Place) => {
    sfx.enter();
    const href = hrefOf(route);
    if (prefersReducedMotion()) {
      window.location.hash = href;
      return;
    }
    setLeaving({ x: (p.pin.x / VIEW_W) * 100, y: (p.pin.y / VIEW_H) * 100, color: LOADING_BG[route] });
    window.setTimeout(() => (window.location.hash = href), 560);
  }, []);

  const go = useCallback(
    (p: Place) => {
      setPinned(null);
      if (p.routes.length > 1) {
        setHover(null);
        setLift(true);
      } else enter(p.routes[0], p);
    },
    [enter],
  );

  const onPick = useCallback(
    (e: MouseEvent<Element>, p: Place) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      // dokunmatikte ilk dokunuş yerin kartını açar, ikincisi (ya da karttaki düğme) içeri sokar
      if (touch && e.detail !== 0 && pinned !== p.id) {
        setPinned(p.id);
        sfx.hover();
        p.routes.forEach((r) => preload(r));
        return;
      }
      go(p);
    },
    [touch, pinned, go, preload],
  );

  const labelOf = useCallback(
    (p: Place) => {
      const gs = gamesOf(p);
      const names = gs.map((g) => `${g.title}${progress.played[g.route] ? ' (bitirildi)' : ''}`).join(' ya da ');
      return `${p.name}: ${names}`;
    },
    [progress],
  );
  const placeHref = useCallback((p: Place) => hrefOf(p.routes[0]), []);
  const closeLift = useCallback(() => setLift(false), []);
  const goFloor = useCallback((r: GameRoute) => {
    window.location.hash = hrefOf(r);
  }, []);

  const cyclePhase = () => {
    const i = override ? PHASES.indexOf(override) : -1;
    setOverride(i === PHASES.length - 1 ? null : PHASES[i + 1]);
  };

  return (
    <div
      ref={page}
      className={`${s.page} ${s[phase]}`}
      onPointerMove={trackPointer}
      onPointerDown={(e) => {
        sfx.wake();
        setTouch(e.pointerType === 'touch');
      }}
    >
      <div
        ref={scroller}
        className={s.scroller}
        onScroll={() => setScrolled(true)}
        onWheel={(e) => {
          const el = scroller.current;
          if (!el || el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
          el.scrollLeft += e.deltaY;
        }}
        onClick={() => setPinned(null)}
      >
        <div className={`${s.world} ${leaving ? s.leaving : ''}`} style={leaving ? { transformOrigin: `${leaving.x}% ${leaving.y}%` } : undefined}>
          <Scene phase={phase} active={active} hrefOf={placeHref} labelOf={labelOf} onHover={onHover} onPick={onPick} />
          <div className={s.pins} aria-hidden="true">
            {PLACES.map((p, i) => {
              const gs = gamesOf(p);
              const isDone = gs.every((g) => progress.played[g.route]);
              const isToday = p.routes.includes(today);
              return (
                <button
                  key={p.id}
                  type="button"
                  tabIndex={-1}
                  className={`${s.pin} ${active === p.id ? s.pinOn : ''} ${isToday ? s.pinToday : ''}`}
                  style={{ left: `${(p.pin.x / VIEW_W) * 100}%`, top: `${(p.pin.y / VIEW_H) * 100}%`, ['--i' as string]: i }}
                  onPointerEnter={() => !touch && onHover(p.id)}
                  onPointerLeave={() => !touch && onHover(null)}
                  onClick={(e) => onPick(e, p)}
                >
                  <svg className={s.pinIcon} viewBox="0 0 24 24">
                    {PIN_ICON[p.id]}
                  </svg>
                  <span>{p.name}</span>
                  {isDone && <span className={s.pinDone}>✓</span>}
                  {isToday && !isDone && <span className={s.pinStar}>★</span>}
                </button>
              );
            })}
          </div>
          {activePlace && !touch && !lift && !leaving && <PlaceCard place={activePlace} today={today} progress={progress} resume={resume} />}
        </div>
      </div>

      {activePlace && touch && pinned && !lift && !leaving && (
        <div className={s.sheet} onClick={(e) => e.stopPropagation()}>
          <PlaceCard place={activePlace} today={today} progress={progress} resume={resume} sheet />
          <div className={s.sheetActions}>
            <button type="button" className={s.sheetClose} onClick={() => setPinned(null)}>
              Vazgeç
            </button>
            <button type="button" className={s.sheetGo} onClick={() => go(activePlace)}>
              {activePlace.routes.length > 1 ? 'Asansöre bin ↑' : 'İçeri gir →'}
            </button>
          </div>
        </div>
      )}

      <header className={s.hud}>
        <div className={s.brand}>
          <h1 className={s.sign}>
            <span className={s.signTop}>KASM Mahallesi</span>
            <span className={s.signMain}>{SITE_NAME} Sk.</span>
          </h1>
          <p className={s.tagline}>
            {SITE_TAGLINE} <span className={s.taglineHint}>{touch ? 'Bir yere dokun.' : 'Mahallede bir yere tıkla.'}</span>
          </p>
        </div>
        <div className={s.hudRight}>
          <p className={s.clock}>
            <span className={`${s.dot} ${work ? s.dotWork : ''}`} aria-hidden="true" />
            <span className="mono">{now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
            <span className={s.clockText}>{work ? 'Mesai devam ediyor' : 'Mesai bitti'}</span>
          </p>
          <button type="button" className={s.phaseBtn} onClick={cyclePhase} aria-label={`Günün saati: ${PHASE_NAMES[phase]}${override ? '' : ' (otomatik)'}. Değiştir`}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {phase === 'gece' ? <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /> : <path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM12 1.5v2.5M12 20v2.5M1.5 12H4M20 12h2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" />}
            </svg>
            <span>{PHASE_NAMES[phase]}</span>
            {!override && <small>oto</small>}
          </button>
        </div>
      </header>

      <div className={s.tally} aria-label={`${GAMES.length} oyundan ${done} tanesi bitirildi`}>
        <span className={s.tallyBar}>
          <span style={{ width: `${(done / GAMES.length) * 100}%` }} />
        </span>
        <span>
          <b>{done}</b>/{GAMES.length} dosya kapandı
        </span>
      </div>
      {touch && !scrolled && <p className={s.swipe}>← Sokakta kaydır →</p>}

      {lift && <Elevator games={gamesOf(PLACES.find((p) => p.id === 'plaza')!)} progress={progress} resume={resume} onClose={closeLift} onGo={goFloor} />}
      <div className={`${s.fade} ${leaving ? s.fadeOn : ''}`} style={leaving ? { background: leaving.color } : undefined} />
      <StudioMark />
    </div>
  );
}

function PlaceCard({ place, today, progress, resume, sheet = false }: { place: Place; today: GameRoute; progress: ReturnType<typeof loadProgress>; resume: (r: GameRoute) => boolean; sheet?: boolean }) {
  const gs = gamesOf(place);
  const x = (place.pin.x / VIEW_W) * 100;
  const y = (place.pin.y / VIEW_H) * 100;
  const pos = sheet ? undefined : { left: `${x}%`, top: `${y}%` };
  const cls = sheet ? s.cardSheet : `${y < 40 ? s.below : ''} ${x < 16 ? s.alignL : x > 84 ? s.alignR : ''}`;
  const single = gs.length === 1;
  return (
    <div className={`${s.card} ${cls}`} style={{ ...pos, ['--c' as string]: gs[0].color }} role="status">
      <p className={s.where}>
        <span>{place.where}</span>
        {gs.some((g) => g.route === today) && <span className={s.todayTag}>★ Bugünün oyunu</span>}
      </p>
      {gs.map((g) => (
        <GameLine key={g.route} game={g} full={single} played={progress.played[g.route]?.result} resume={resume(g.route)} />
      ))}
      <p className={s.cta}>{single ? (resume(gs[0].route) ? 'Kaldığın yerden devam →' : sheet ? '' : 'Tıkla, içeri gir →') : sheet ? '' : 'Tıkla, asansöre bin ↑'}</p>
    </div>
  );
}

function GameLine({ game, full, played, resume }: { game: ArcadeGame; full: boolean; played?: string; resume: boolean }) {
  return (
    <div className={s.gameLine}>
      <h2 className={s.cardTitle}>{game.title}</h2>
      <p className={`${s.cardMeta} mono`}>
        ~{game.minutes} dk · {fileNo(game.file)}
        {!full && resume && <span className={s.resume}>devam et</span>}
      </p>
      {full && <p className={s.blurb}>{game.blurb}</p>}
      {played && <p className={s.played}>✓ Bitirdin: {played}</p>}
    </div>
  );
}
