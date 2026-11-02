import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { prefersReducedMotion } from '../../components/ui/motion';
import { GAMES } from '../games';
import type { Progress } from '../progress';
import type { GameRoute } from '../slugs';
import * as sfx from '../mahalle/sfx';
import { nearestStop, STOPS, type Stop } from './stops';
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
  progress: Progress;
  leaving: Leaving | null;
  onEnter: (stop: Stop, route: GameRoute) => void;
  preload: (route: GameRoute) => void;
}

export function Model({ src, progress, leaving, onEnter, preload }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Stop | null>(null);
  const [pinned, setPinned] = useState<Stop | null>(null);
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
      setPinned(stop);
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
      className={`${s.model} ${active ? s.focus : ''} ${leaving ? s.diving : ''}`}
      style={vars}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onClick={onClick}
    >
      <div className={s.tilt} style={origin}>
        <img className={s.base} src={src} alt="İstanbul mahalle maketi: eski evler, bir bakkal, döviz bürosu, inşaat ve otobüs durağı" width={1152} height={928} decoding="async" fetchPriority="high" draggable={false} />
        <img className={s.lit} src={src} alt="" aria-hidden="true" width={1152} height={928} draggable={false} />

        <ul className={s.pins} aria-label="Mahallenin durakları">
          {STOPS.map((stop, i) => {
            const on = active === stop;
            const done = stop.routes.every((r) => progress.played[r]);
            return (
              <li key={stop.id} className={`${s.pin} ${on ? s.pinOn : ''} ${done ? s.pinDone : ''}`} style={{ left: `${stop.x}%`, top: `${stop.y}%`, animationDelay: `${0.7 + i * 0.07}s` }}>
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
                      if (stop.routes.length > 1) setPinned(stop);
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

      {active && !leaving && <Card key={active.id} stop={active} progress={progress} onEnter={onEnter} onClose={() => setPinned(null)} pinned={pinned === active} />}
    </div>
  );
}

function Card({ stop, progress, onEnter, onClose, pinned }: { stop: Stop; progress: Progress; onEnter: Props['onEnter']; onClose: () => void; pinned: boolean }) {
  // kart, durağın maketin hangi yarısında olduğuna göre öbür yana açılır
  const left = stop.x > 56;
  // ışığın dışında durur: aydınlanan yeri kapatmaz
  const edge = stop.x + (left ? -1 : 1) * stop.r * 0.6;
  const style = { left: `${edge}%`, top: `${Math.max(16, Math.min(78, stop.y))}%` } as CSSProperties;
  return (
    <div className={`${s.card} ${left ? s.cardLeft : ''} ${pinned ? s.cardPinned : ''}`} style={style} role="group" aria-label={stop.name}>
      <div className={s.cardHead}>
        <p className={s.where}>{stop.where}</p>
        {pinned && (
          <button type="button" className={s.cardClose} aria-label="Kartı kapat" onClick={onClose}>
            ×
          </button>
        )}
      </div>
      {stop.routes.map((route) => {
        const g = BY_ROUTE.get(route)!;
        const played = progress.played[route];
        return (
          <div key={route} className={s.game}>
            <h3>{g.title}</h3>
            <p className={s.meta}>
              {g.minutes} dk{played && <span className={s.played}> · ✓ {played.result}</span>}
            </p>
            {stop.routes.length > 1 && (
              <button type="button" className={s.play} onClick={() => onEnter(stop, route)}>
                {played ? 'Tekrar oyna' : 'Oyna'}
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            )}
          </div>
        );
      })}
      <p className={s.line}>{stop.line}</p>
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
