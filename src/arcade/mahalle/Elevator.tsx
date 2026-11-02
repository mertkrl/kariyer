import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../components/ui/motion';
import type { ArcadeGame } from '../games';
import type { Progress } from '../progress';
import type { GameRoute } from '../slugs';
import * as sfx from './sfx';
import s from './Elevator.module.css';

/*
 * Plazanın asansörü: iki oyun iki kattadır. Kat düğmesine basınca düğme yanar, çelik kapılar
 * ekranı kapatır, gösterge katları sayar, zil çalar ve oyun açılır. Esc ya da "Z" lobiye döner.
 */

const FLOORS: Partial<Record<GameRoute, { n: number; dept: string }>> = {
  iseAlim: { n: 14, dept: 'İnsan Kaynakları' },
  test: { n: 3, dept: 'Değerlendirme Merkezi' },
};

export function Elevator({ games, progress, resume, onClose, onGo }: { games: ArcadeGame[]; progress: Progress; resume: (r: GameRoute) => boolean; onClose: () => void; onGo: (r: GameRoute) => void }) {
  const [target, setTarget] = useState<GameRoute | null>(null);
  const [floor, setFloor] = useState(0);
  const [shut, setShut] = useState(false);
  const first = useRef<HTMLButtonElement>(null);
  const floors = games.filter((g) => FLOORS[g.route]).sort((a, b) => FLOORS[b.route]!.n - FLOORS[a.route]!.n);

  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      back?.focus?.();
    };
  }, [onClose]);

  // kapı kapanır, katlar sayılır, zil çalar, oyun açılır
  useEffect(() => {
    if (!target) return;
    if (prefersReducedMotion()) {
      onGo(target);
      return;
    }
    const n = FLOORS[target]!.n;
    const timers: number[] = [];
    timers.push(window.setTimeout(() => (setShut(true), sfx.doors()), 30));
    for (let i = 1; i <= n; i++) timers.push(window.setTimeout(() => setFloor(i), 650 + i * (n > 5 ? 55 : 120)));
    const arrive = 650 + n * (n > 5 ? 55 : 120) + 120;
    timers.push(window.setTimeout(sfx.ding, arrive));
    timers.push(window.setTimeout(() => onGo(target), arrive + 420));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [target, onGo]);

  const pick = (r: GameRoute) => {
    if (target) return;
    sfx.press();
    setTarget(r);
  };

  return (
    <>
      <div className={s.liftBack} onClick={(e) => e.target === e.currentTarget && !target && onClose()}>
        <div className={s.lift} role="dialog" aria-modal="true" aria-labelledby="lift-title">
          <div className={s.liftHead}>
            <span className={s.liftBrand}>KASM PLAZA</span>
            <span className={s.led} aria-hidden="true">
              {target ? '▲' : ''} {floor === 0 ? 'Z' : floor}
            </span>
          </div>
          <h2 id="lift-title" className={s.liftTitle}>
            Hangi kata çıkıyorsun?
          </h2>
          <ul className={s.floors}>
            {floors.map((g, i) => {
              const f = FLOORS[g.route]!;
              const played = progress.played[g.route];
              return (
                <li key={g.route}>
                  <button ref={i === 0 ? first : undefined} type="button" className={`${s.floorBtn} ${target === g.route ? s.litBtn : ''}`} onClick={() => pick(g.route)} aria-label={`${f.n}. kat, ${f.dept}: ${g.title}, yaklaşık ${g.minutes} dakika`}>
                    <span className={s.knob}>{f.n}</span>
                    <span className={s.floorText}>
                      <span className={s.dept}>
                        {f.n}. kat · {f.dept}
                      </span>
                      <span className={s.floorTitle}>{g.title}</span>
                      <span className={s.floorBlurb}>{g.blurb}</span>
                      <span className={s.floorMeta}>
                        ~{g.minutes} dk
                        {resume(g.route) && <span className={s.resume}>Kaldığın yerden devam</span>}
                        {played && <span className={s.doneTag}>✓ {played.result}</span>}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" className={s.lobby} onClick={onClose} disabled={!!target}>
            <span className={`${s.knob} ${s.knobSmall}`}>Z</span>
            Lobiye dön
          </button>
        </div>
      </div>
      {target && (
        <div className={`${s.doors} ${shut ? s.shut : ''}`} aria-hidden="true">
          <div className={s.doorL} />
          <div className={s.doorR} />
          <div className={s.doorLed}>
            <span>▲</span> {floor === 0 ? 'Z' : floor}
          </div>
        </div>
      )}
    </>
  );
}
