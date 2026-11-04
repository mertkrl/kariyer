import { lazy, Suspense, useId, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { prefersReducedMotion } from '../../shared/motion';
import { GAMES } from '../games';
import type { Progress } from '../progress';
import type { GameRoute } from '../slugs';
import * as sfx from '../mahalle/sfx';
import { nearestStop, STOPS, type Stop } from './stops';
import { WINDOWS } from './windows';
// seçim ekranı yalnızca plazaya tıklanınca iner: ilk açılış paketine girmez
const SidePicker = lazy(() => import('./SidePicker').then((m) => ({ default: m.SidePicker })));
import s from './Model.module.css';

/*
 * Etkileşimli maket. İmleç maketin üstünde gezerken maket hafifçe ona doğru eğilir; bir yere
 * yaklaşınca o yere ışık düşer (geri kalanı solar), işareti büyür ve yanında oyunun kartı açılır.
 * Tıklayınca kamera o noktaya dalar ve oyun açılır (WelcomeScreen). Dokunmatikte ilk dokunuş
 * kartı açar, karttaki düğme oyuna götürür. Klavyede her durak bir düğmedir.
 */

const BY_ROUTE = new Map(GAMES.map((g) => [g.route, g]));

export interface Leaving {
  stop: Stop;
  route: GameRoute;
}

interface Props {
  src: string;
  /** Gecenin görseli: gündüzle birebir aynı kadraj; `dark` kadar üstüne biner. */
  nightSrc: string;
  /** Pencereleri yanık gece görseli: yalnızca `lights`ta yanan pencerelerin yerinde görünür. */
  litSrc: string;
  /** 0 gündüz, 1 tam gece. */
  dark: number;
  /** WINDOWS sırasıyla hangi pencerenin ışığı yanık. */
  lights: boolean[];
  progress: Progress;
  leaving: Leaving | null;
  onEnter: (stop: Stop, route: GameRoute) => void;
  preload: (route: GameRoute) => void;
}

export function Model({ src, nightSrc, litSrc, dark, lights, progress, leaving, onEnter, preload }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const maskId = `maket-isik-${useId().replace(/\W/g, '')}`;
  const night = dark >= 0.5;
  const [hover, setHover] = useState<Stop | null>(null);
  const [pinned, setPinned] = useState<Stop | null>(null);
  // plaza gibi iki oyunlu durak: tıklanınca ekran ikiye bölünür, oyuncu tarafını seçer
  const [split, setSplit] = useState<Stop | null>(null);
  const active = leaving?.stop ?? pinned ?? hover;
  // ışık son durağında kalır: sönerken yerinden kaymasın
  const [lastLit, setLastLit] = useState<Stop>(STOPS[0]);
  if (active && active !== lastLit) setLastLit(active);

  const activate = (stop: Stop | null) => {
    if (stop === hover) return;
    setHover(stop);
    if (stop) {
      sfx.hover();
      stop.routes.forEach(preload);
      if (stop.routes.length > 1) void import('./SidePicker');
    }
  };

  const local = (e: ReactPointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  };

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (leaving || e.pointerType === 'touch') return;
    const p = local(e);
    // eğilme: maketin ortasına göre -1…1
    if (!prefersReducedMotion()) {
      box.current!.style.setProperty('--tx', String(Math.max(-1, Math.min(1, (p.x - 50) / 50))));
      box.current!.style.setProperty('--ty', String(Math.max(-1, Math.min(1, (p.y - 50) / 50))));
    }
    // kartın üstündeyken durak değişmez
    if ((e.target as Element).closest(`.${s.card}`)) return;
    activate(nearestStop(p.x, p.y));
  };

  const onLeave = () => {
    box.current?.style.setProperty('--tx', '0');
    box.current?.style.setProperty('--ty', '0');
    if (!leaving) setHover(null);
  };

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (leaving || (e.target as Element).closest(`.${s.card}`) || (e.target as Element).closest(`.${s.pin}`)) return;
    const r = box.current!.getBoundingClientRect();
    const stop = nearestStop(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
    if (!stop) {
      setPinned(null);
      return;
    }
    choose(stop, (e.nativeEvent as PointerEvent).pointerType === 'touch');
  };

  /** Bir durağa basıldı: tek oyunluysa doğrudan girer; dokunmatikte ya da iki oyunluysa kartı açar. */
  const choose = (stop: Stop, touch: boolean) => {
    sfx.wake();
    if (touch && pinned !== stop) {
      setPinned(stop);
      stop.routes.forEach(preload);
      sfx.hover();
      return;
    }
    if (stop.routes.length > 1) {
      setPinned(null);
      setSplit(stop);
      return;
    }
    onEnter(stop, stop.routes[0]);
  };

  const lit = active ?? lastLit;
  const vars = { '--lx': lit.x, '--ly': lit.y, '--lr': lit.r } as CSSProperties;
  const origin = leaving ? { transformOrigin: `${leaving.stop.x}% ${leaving.stop.y}%` } : undefined;

  return (
    <div
      ref={box}
      className={`${s.model} ${active ? s.focus : ''} ${leaving ? s.diving : ''} ${night ? s.isNight : ''} ${dark >= 1 ? s.fullNight : ''}`}
      style={vars}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onClick={onClick}
    >
      <div className={s.tilt} style={origin}>
        <img className={s.base} src={src} alt="İstanbul mahalle maketi: eski evler, bir bakkal, döviz bürosu, inşaat ve otobüs durağı" width={1152} height={928} decoding="async" fetchPriority="high" draggable={false} />
        {/* gece katmanı: gece görseli ve pencere ışıkları birlikte biner. Ayrı ayrı solarlarsa
            pencerelerin çevresindeki gece pikselleri gündüzün üstünde kara kareler olarak görünür. */}
        <div className={`${s.base} ${s.nightImg}`} style={{ opacity: dark }} aria-hidden="true">
          <img className={s.fill} src={nightSrc} alt="" width={1152} height={928} decoding="async" draggable={false} />
          <svg className={s.fill} viewBox="0 0 1152 928" preserveAspectRatio="xMidYMid slice">
            <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="1152" height="928">
              {WINDOWS.map(([, points], i) => (
                <polygon key={i} points={points} className={lights[i] ? s.on : undefined} />
              ))}
            </mask>
            <image href={litSrc} width="1152" height="928" mask={`url(#${maskId})`} />
          </svg>
        </div>
        <div className={s.lit} aria-hidden="true">
          <img className={s.fill} src={night ? nightSrc : src} alt="" width={1152} height={928} draggable={false} />
          {night && (
            <svg className={s.fill} viewBox="0 0 1152 928" preserveAspectRatio="xMidYMid slice">
              <image href={litSrc} width="1152" height="928" mask={`url(#${maskId})`} />
            </svg>
          )}
        </div>

        <ul className={s.pins} aria-label="Mahallenin durakları">
          {STOPS.map((stop, i) => {
            const on = active === stop;
            const done = stop.routes.every((r) => progress.played[r]);
            return (
              <li key={stop.id} className={`${s.pin} ${on ? s.pinOn : ''} ${done ? s.pinDone : ''}`} style={{ left: `${stop.x}%`, top: `${stop.y}%`, animationDelay: `${0.3 + i * 0.04}s` }}>
                <button
                  type="button"
                  aria-label={`${stop.name}: ${stop.routes.map((r) => BY_ROUTE.get(r)?.title).join(' ya da ')}`}
                  aria-expanded={on}
                  onFocus={() => activate(stop)}
                  onBlur={() => setHover(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (e.detail === 0) {
                      // klavye: iki oyunluysa kartı aç, değilse gir
                      if (stop.routes.length > 1) setSplit(stop);
                      else onEnter(stop, stop.routes[0]);
                      return;
                    }
                    choose(stop, (e.nativeEvent as PointerEvent).pointerType === 'touch');
                  }}
                >
                  <span className={s.ring} />
                  <span className={s.dot}>{done && <svg viewBox="0 0 12 12"><path d="M3 6.2l2 2 4-4.4" /></svg>}</span>
                  <span className={s.tag}>{stop.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {active && !leaving && !split && (
        <Card
          key={active.id}
          stop={active}
          progress={progress}
          onEnter={onEnter}
          onSplit={() => {
            setPinned(null);
            setSplit(active);
          }}
          onClose={() => setPinned(null)}
          pinned={pinned === active}
        />
      )}
      {split && !leaving && (
        <Suspense fallback={null}>
          <SidePicker
            played={progress.played}
            onClose={() => setSplit(null)}
            onPick={(route) => {
              const stop = split;
              setSplit(null);
              onEnter(stop, route);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

function Card({ stop, progress, onEnter, onSplit, onClose, pinned }: { stop: Stop; progress: Progress; onEnter: Props['onEnter']; onSplit: () => void; onClose: () => void; pinned: boolean }) {
  // kart, durağın maketin hangi yarısında olduğuna göre öbür yana açılır
  const left = stop.x > 56;
  // ışığın dışında durur: aydınlanan yeri kapatmaz
  const edge = stop.x + (left ? -1 : 1) * stop.r * 0.6;
  const style = { left: `${edge}%`, top: `${Math.max(16, Math.min(78, stop.y))}%` } as CSSProperties;
  // kart üst menünün ya da ekranın altına taşmaz: dikeyde içeri kayar, bağlantı çizgisi durakta kalır
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    // dar ekranda kart zaten ekranın altına sabit
    if (!el || getComputedStyle(el).position === 'fixed') return;
    el.style.setProperty('--shift', '0px');
    const r = el.getBoundingClientRect();
    const top = (document.querySelector('[data-safe-top]')?.getBoundingClientRect().bottom ?? 0) + 12;
    const bottom = window.innerHeight - 12;
    const shift = r.top < top ? top - r.top : r.bottom > bottom ? Math.max(top - r.top, bottom - r.bottom) : 0;
    el.style.setProperty('--shift', `${shift}px`);
  }, [stop]);
  return (
    <div ref={ref} className={`${s.card} ${left ? s.cardLeft : ''} ${pinned ? s.cardPinned : ''}`} style={style} role="group" aria-label={stop.name}>
      <div className={s.cardHead}>
        <p className={s.where}>{stop.where}</p>
        {pinned && (
          <button type="button" className={s.cardClose} aria-label="Kartı kapat" onClick={onClose}>
            ×
          </button>
        )}
      </div>
      {stop.routes.length > 1 ? (
        // iki oyunlu durak: kartta tek soru, seçim bölünmüş ekranda
        <div className={s.game}>
          <h3>İK mısın, aday mı?</h3>
          <p className={s.line}>Asansör 14. katta durdu. Masanın hangi tarafına oturacağına içeride karar ver.</p>
          <button type="button" className={s.play} onClick={onSplit}>
            Asansörden in
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      ) : (
        stop.routes.map((route) => {
          const g = BY_ROUTE.get(route)!;
          return (
            <div key={route} className={s.game}>
              <h3>{g.title}</h3>
              <p className={s.line}>{g.quip}</p>
            </div>
          );
        })
      )}
      {stop.routes.length === 1 && (
        <button type="button" className={s.play} onClick={() => onEnter(stop, stop.routes[0])}>
          {progress.played[stop.routes[0]] ? 'Tekrar oyna' : 'Oyna'}
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      )}
    </div>
  );
}
