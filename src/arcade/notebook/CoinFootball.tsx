import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../components/ui/motion';
import {
  COIN_R,
  COIN_X,
  FINGER_H,
  FINGER_R,
  LEVELS,
  SHOTS,
  TABLE_W,
  fingers,
  keeperAt,
  flick,
  goalFor,
  loadLevel,
  moving,
  restingCoin,
  saveLevel,
  simulate,
  stepCoin,
  type Coin,
  type CoinResult,
  type Goal,
} from './paperGames';
import * as sfx from './sfx';
import s from './PaperBoards.module.css';

/*
 * Demir para futbolu, yandan ve kurşun kalemle: zemin yatay çizgi, para solda dik durur, kale sağda
 * zemine dik basan iki parmak. Çekip bırakılan para (hangi yöne çekilirse çekilsin) hep kaleye doğru,
 * döne döne yay çizer; iki
 * parmağın arasına düşerse gol. Bölüm bölüm şartlar zorlaşır. Fizik ve bölümler paperGames.ts'te.
 */

const GRAPHITE = '#3b3a36';
const SHOT_PAUSE_MS = 1700;
const MIN_ANGLE = (12 * Math.PI) / 180;
const MAX_ANGLE = (75 * Math.PI) / 180;

const RESULT_TEXT: Record<CoinResult, string> = {
  gol: 'GOOOL! İki parmağın arasına düştü.',
  direk: 'Parmağa çarptı, döndü.',
  kısa: 'Kısa kaldı.',
  uzun: 'Kalenin üstünden aştı.',
  düştü: 'Para sıradan düştü!',
  kitap: 'Kitaba çarptı.',
  raf: 'Rafa çarptı, düştü.',
  kaleci: 'Kaleci kurtardı!',
};

/** Kurşun kalem çizgisi: grafit, uçları yuvarlak. */
const PENCIL = { stroke: GRAPHITE, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };

/** Yandan bakış: zemin (sıranın üstü) yatay çizgi; fizikte y zeminden yukarı, ekranda aşağı. */
const VIEW_H = 340;
const GROUND = 280;
const sy = (y: number) => GROUND - y;

/** Kale: zemine dik basan iki parmak; tepeleri yuvarlak, tırnak ve boğum çizgileriyle. */
/** Parmak: zemine basan, ucu yuvarlak dik çubuk. `down`: el yukarıda, tırnak zemin tarafında. */
function Finger({ x, down }: { x: number; down: boolean }) {
  const top = sy(FINGER_H - FINGER_R);
  const nail = down ? GROUND - 13 : top - 2;
  return (
    <g>
      <path d={`M${x - FINGER_R} ${GROUND + 1} L${x - FINGER_R + 0.5} ${top} A${FINGER_R} ${FINGER_R} 0 0 1 ${x + FINGER_R} ${top - 1} L${x + FINGER_R + 1} ${GROUND + 1}`} {...PENCIL} fill="#fff" strokeWidth="2.2" />
      {/* tırnak ve boğumlar */}
      <path d={`M${x - 6} ${nail} C${x - 5} ${nail - 7}, ${x + 5} ${nail - 7}, ${x + 6} ${nail} L${x + 5} ${nail + 8} L${x - 5} ${nail + 8} Z`} {...PENCIL} strokeWidth="1.1" />
      <path d={`M${x - 6} ${sy(FINGER_H * 0.5)} q6 3 12 0 M${x - 5} ${sy(FINGER_H * 0.5) + 4} q5 2 10 0 M${x - 6} ${sy(FINGER_H * 0.22)} q6 3 12 0`} {...PENCIL} strokeWidth="1" opacity=".7" />
      {/* gölge: kalem taraması */}
      <rect x={x + FINGER_R - 6} y={top} width="5" height={GROUND - top} fill="url(#tarama)" opacity=".5" />
    </g>
  );
}

/**
 * Yukarıdan inen el (fotoğraftaki gibi): yumruk parmağın üstünde, bilek ve kol kâğıdın üstüne
 * çıkar. `side` -1 sol el (kol sola yatar), +1 sağ el.
 */
function Hand({ x, side }: { x: number; side: number }) {
  const b = sy(FINGER_H - 6);
  const top = sy(FINGER_H + 50);
  const inner = x - side * 16;
  const outer = x + side * 30;
  const fist = `M${inner} ${b} C${inner - side * 2} ${b - 20}, ${inner} ${top + 8}, ${inner + side * 6} ${top} L${outer - side * 2} ${top - 4} C${outer + side * 8} ${top + 14}, ${outer + side * 6} ${b - 10}, ${outer - side * 6} ${b + 2} C${x + side * 10} ${b + 6}, ${x - side * 4} ${b + 6}, ${inner} ${b} Z`;
  return (
    <g>
      {/* kol: yumruktan kâğıdın üstüne doğru, dışa yatık */}
      <path d={`M${inner + side * 6} ${top + 2} L${inner + side * 48} 6 M${outer - side * 2} ${top - 2} L${outer + side * 56} 6`} {...PENCIL} strokeWidth="2" />
      <path d={fist} {...PENCIL} fill="#fff" strokeWidth="2.2" />
      <path d={fist} fill="url(#tarama)" opacity=".22" />
      {/* bükülü parmakların boğumları */}
      <path d={`M${x + side * 4} ${b - 4} q${side * 6} -9 ${side * 13} -2 M${x + side * 16} ${b - 6} q${side * 5} -8 ${side * 11} -1`} {...PENCIL} strokeWidth="1.2" />
    </g>
  );
}

/** Kale: zemine basan iki parmak; ileri bölümlerde iki el ve ortada gidip gelen kaleci. */
function Fingers({ g, t }: { g: Goal; t: number }) {
  const [near, far] = fingers(g, t);
  const kx = keeperAt(g, t);
  if (kx === null)
    return (
      <g>
        <Finger x={near} down={false} />
        <Finger x={far} down={false} />
      </g>
    );
  // kaleci sağ elin parmağıdır: yumruktan bükülerek iner, el yerinde kalır
  const knuckle: [number, number] = [far - 14, sy(FINGER_H + 4)];
  return (
    <g>
      <Hand x={near} side={-1} />
      <Hand x={far} side={1} />
      <path d={`M${kx} ${sy(FINGER_H - 14)} C${kx} ${sy(FINGER_H + 18)}, ${knuckle[0] - 10} ${knuckle[1] - 6}, ${knuckle[0]} ${knuckle[1]}`} stroke={GRAPHITE} strokeWidth={FINGER_R * 2 + 3.4} strokeLinecap="round" fill="none" />
      <path d={`M${kx} ${sy(FINGER_H - 14)} C${kx} ${sy(FINGER_H + 18)}, ${knuckle[0] - 10} ${knuckle[1] - 6}, ${knuckle[0]} ${knuckle[1]}`} stroke="#fff" strokeWidth={FINGER_R * 2 - 1} strokeLinecap="round" fill="none" />
      <Finger x={kx} down />
      <Finger x={near} down />
      <Finger x={far} down />
    </g>
  );
}

/** Bölümün şartları: rüzgârlı pencere, dikili kitap, alçak raf. */
function Conditions({ g }: { g: Goal }) {
  const dir = Math.sign(g.wind);
  const chevrons = Math.min(3, Math.ceil(Math.abs(g.wind) / 80));
  return (
    <g>
      {g.wind !== 0 && (
        <g>
          {/* açık pencere ve uçuşan perde */}
          <path d="M600 22 L740 22 L740 112 L600 112 Z M670 22 L670 112 M600 67 L740 67" {...PENCIL} strokeWidth="1.6" />
          <path d={dir > 0 ? 'M604 26 C620 50, 612 80, 640 108 M612 26 C630 46, 626 74, 652 104' : 'M736 26 C720 50, 728 80, 700 108 M728 26 C710 46, 714 74, 688 104'} {...PENCIL} strokeWidth="1.2" opacity=".7" />
          <text x="606" y="134" className={s.coinPower}>
            rüzgâr
          </text>
          <text x={dir > 0 ? 662 : 662} y="134" className={s.wind}>
            {(dir > 0 ? '›' : '‹').repeat(chevrons)}
          </text>
        </g>
      )}
      {g.book && (
        <g>
          <rect x={g.book.x} y={sy(g.book.h)} width={g.book.w} height={g.book.h} {...PENCIL} fill="#fff" strokeWidth="2" />
          <rect x={g.book.x} y={sy(g.book.h)} width={g.book.w} height={g.book.h} fill="url(#tarama)" opacity=".35" />
          <path d={`M${g.book.x + 4} ${sy(g.book.h) + 6} L${g.book.x + 4} ${GROUND - 6} M${g.book.x + g.book.w - 4} ${sy(g.book.h) + 6} L${g.book.x + g.book.w - 4} ${GROUND - 6}`} {...PENCIL} strokeWidth="1" />
          <text x={g.book.x + g.book.w / 2 + 4} y={sy(g.book.h / 2)} textAnchor="middle" className={s.bookTitle} transform={`rotate(-90 ${g.book.x + g.book.w / 2} ${sy(g.book.h / 2)})`}>
            MATEMATİK
          </text>
        </g>
      )}
      {g.ceiling !== null && (
        <g>
          <rect x="10" y={sy(g.ceiling) - 14} width={TABLE_W - 20} height="14" {...PENCIL} fill="#fff" strokeWidth="2" />
          <rect x="10" y={sy(g.ceiling) - 14} width={TABLE_W - 20} height="14" fill="url(#tarama)" opacity=".5" />
          <text x="20" y={sy(g.ceiling) - 20} className={s.coinPower}>
            raf
          </text>
        </g>
      )}
    </g>
  );
}

/** Demir para: zeminde dik durur (yüzü bize dönük), havada döne döne gider; yerdeki gölgesi küçülür. */
function CoinMark({ c, ready }: { c: Coin; ready: boolean }) {
  const cx = c.x;
  const cy = sy(c.y);
  const w = ready || c.result ? COIN_R : Math.max(2, COIN_R * Math.abs(Math.cos(c.spin)));
  const lift = Math.max(0, c.y - COIN_R);
  return (
    <g className={c.result === 'gol' ? s.pop : undefined}>
      <ellipse cx={cx} cy={GROUND + 2} rx={Math.max(3, COIN_R - lift / 14)} ry="2.6" fill="url(#tarama)" opacity={Math.max(0.15, 0.7 - lift / 300)} />
      <ellipse cx={cx} cy={cy} rx={w} ry={COIN_R} {...PENCIL} fill="#fff" />
      {w > 4 && <ellipse cx={cx} cy={cy} rx={w * 0.64} ry={COIN_R * 0.64} fill="url(#tarama)" stroke={GRAPHITE} strokeWidth=".9" />}
      {w > 7 && (
        <text x={cx} y={cy + 4.5} textAnchor="middle" className={s.coinText}>
          1
        </text>
      )}
    </g>
  );
}

export function CoinFootball() {
  const svg = useRef<SVGSVGElement>(null);
  // ulaşılan en ileri bölüm kayıtlıdır; oyun oradan açılır
  const [unlocked, setUnlocked] = useState(loadLevel);
  const [level, setLevel] = useState(unlocked);
  const L = LEVELS[level];
  const [goals, setGoals] = useState(0);
  const [shot, setShot] = useState(0);
  const [goal, setGoal] = useState<Goal>(() => goalFor(LEVELS[level], Math.random));
  const [coin, setCoin] = useState<Coin>(restingCoin);
  // paranın havada çizdiği yol: kurşun kalemle noktalı iz
  const [trail, setTrail] = useState<string[]>([]);
  const [aim, setAimState] = useState<{ from: [number, number]; to: [number, number] } | null>(null);
  // hızlı bir fiskede olaylar çizimi beklemez: nişan ref'te de tutulur
  const aimRef = useRef(aim);
  const setAim = (a: typeof aim) => {
    aimRef.current = a;
    setAimState(a);
  };
  const [said, setSaid] = useState<CoinResult | null>(null);
  const over = shot >= SHOTS;
  const passed = over && goals >= L.need;
  const rolling = moving(coin);
  const ready = !over && !rolling && !said;

  // sallanan el: atış beklenirken de kıpırdar (hareketi azaltmayı seçende durur)
  const [clock, setClock] = useState(0);
  useEffect(() => {
    if ((!goal.sway && !goal.keeper) || rolling || prefersReducedMotion()) return;
    let raf = 0;
    const start = performance.now() - clock * 1000;
    const tick = (now: number) => {
      setClock((now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- saat kaldığı yerden sürer
  }, [goal.sway, goal.keeper, rolling]);
  const handT = rolling || coin.result ? coin.t : clock - goal.phase;

  // fizik döngüsü: kare geç gelse de para gerçek zamanda ilerler
  useEffect(() => {
    if (!rolling) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const steps = Math.max(1, Math.ceil(dt * 240));
      setCoin((c) => {
        let n = c;
        for (let i = 0; i < steps; i++) {
          const prev = n.post;
          n = stepCoin(n, goal, dt / steps);
          if (n.post && !prev) sfx.clink();
        }
        return n;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [rolling, goal]);

  // para uçtukça izi uzar
  useEffect(() => {
    if (rolling) setTrail((tr) => [...tr, `${coin.x.toFixed(1)} ${sy(coin.y).toFixed(1)}`]);
  }, [coin, rolling]);

  // atış bitti: sonucu söyle, biraz bekle, sonraki atışa geç. Zamanlayıcı yalnız sonuca bağlıdır:
  // sonucu yazmak (said) onu silmesin, yoksa oyun sonuçta takılı kalır.
  const result = coin.result;
  useEffect(() => {
    if (!result) return;
    setSaid(result);
    if (result === 'gol') sfx.goal();
    const t = window.setTimeout(() => {
      if (result === 'gol') setGoals((n) => n + 1);
      setShot((n) => n + 1);
      setGoal(goalFor(L, Math.random));
      setCoin(restingCoin());
      setTrail([]);
      setSaid(null);
    }, SHOT_PAUSE_MS);
    return () => window.clearTimeout(t);
  }, [result, L]);

  // bölüm bitti ve geçildi: sonraki bölümün kilidi açılır
  useEffect(() => {
    if (!passed) return;
    saveLevel(level + 1);
    setUnlocked((u) => Math.max(u, Math.min(level + 1, LEVELS.length - 1)));
  }, [passed, level]);

  // ekran noktası fizik koordinatına (y zeminden yukarı): SVG ölçeklense de doğru
  const at = (e: { clientX: number; clientY: number }): [number, number] => {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.current!.getScreenCTM()!.inverse());
    return [p.x, GROUND - p.y];
  };
  /**
   * Çekiş: ileri itmek de (fiske), geri çekmek de (sapan) aynı atışı verir; para hiç ters gitmez,
   * hep ileri ve yukarı, kaleye doğru uçar. Çekişin dikliği açıyı, uzunluğu gücü belirler.
   */
  const vec = (a: NonNullable<typeof aim>) => {
    const dx = Math.abs(a.to[0] - a.from[0]);
    const dy = Math.abs(a.to[1] - a.from[1]);
    // dimdik ya da yerde sürünen atış olmasın: açı 12°–75° arasında
    const angle = Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, Math.atan2(dy, dx)));
    return { angle, power: Math.min(1, Math.hypot(dx, dy) / 190), len: Math.hypot(dx, dy) };
  };

  /** Bir bölümü baştan başlatır. */
  const play = (n: number) => {
    setLevel(n);
    setGoals(0);
    setShot(0);
    setGoal(goalFor(LEVELS[n], Math.random));
    setCoin(restingCoin());
    setTrail([]);
    setSaid(null);
  };
  const last = level === LEVELS.length - 1;

  const v = aim ? vec(aim) : null;
  // yolun ilk parçası: nereye kalkacağının ipucu, gerisini oyuncu kestirir
  const preview = (() => {
    if (!v || v.len < 8) return '';
    let c = flick(restingCoin(), v.angle, v.power);
    const pts: string[] = [];
    for (let i = 0; i < 14 && moving(c); i++) {
      c = stepCoin(c, { ...goal, phase: clock }, 1 / 60);
      pts.push(`${c.x.toFixed(1)} ${sy(c.y).toFixed(1)}`);
    }
    return pts.length ? `M${COIN_X} ${sy(COIN_R)} L${pts.join(' L')}` : '';
  })();

  return (
    <div className={`${s.board} ${s.coinGame}`}>
      <div className={s.levels} role="group" aria-label="Bölümler">
        {LEVELS.map((lv, i) => (
          <button key={lv.name} type="button" className={`${s.level} ${i === level ? s.levelOn : ''}`} disabled={i > unlocked || rolling} onClick={() => play(i)} title={lv.name}>
            {i + 1}
          </button>
        ))}
      </div>
      <p className={s.coinHud}>
        <span>
          {level + 1}. bölüm: {L.name}
        </span>
        <span>
          Atış {Math.min(shot + 1, SHOTS)}/{SHOTS} · Gol {goals}/{L.need}
        </span>
      </p>
      <svg
        ref={svg}
        className={`${s.svg} ${s.table}`}
        viewBox={`0 0 ${TABLE_W} ${VIEW_H}`}
        width={TABLE_W}
        height={VIEW_H}
        role="img"
        aria-label="Demir para futbolu: çek ve bırak, para kaleye doğru uçar; bombeli atıp iki parmağın arasına düşür"
        onPointerDown={(e) => {
          if (!ready) return;
          // sürüklerken sayfada metin seçilmesin, görsel sürüklenmesin
          e.preventDefault();
          window.getSelection()?.removeAllRanges();
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // yakalanamayan dokunuş: sürükleme yine çalışır
          }
          const p = at(e);
          setAim({ from: p, to: p });
        }}
        onPointerMove={(e) => aimRef.current && setAim({ ...aimRef.current, to: at(e) })}
        onPointerUp={(e) => {
          const cur = aimRef.current;
          if (!cur) return;
          // bırakırken parmağın son anki kayması yönü bozmasın: son çekiş kullanılır
          const a = vec(e.pointerType === 'mouse' ? { ...cur, to: at(e) } : cur);
          setAim(null);
          if (a.len < 12) return;
          sfx.flick();
          const shotCoin = flick(coin, a.angle, a.power);
          // sallanan el atış anındaki yerinden sallanmaya devam eder
          const g = { ...goal, phase: clock };
          setGoal(g);
          setTrail([]);
          // hareketi azaltmayı seçene para uçmadan varır: sonuç hemen görünür
          setCoin(prefersReducedMotion() ? simulate(shotCoin, g) : shotCoin);
        }}
        onPointerCancel={() => setAim(null)}
      >
        <defs>
          <pattern id="tarama" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
            <line x1="0" y1="0" x2="0" y2="5" stroke={GRAPHITE} strokeWidth="1" opacity=".6" />
          </pattern>
        </defs>
        {/* zemin: elle çekilmiş uzun kalem çizgisi */}
        <path d={`M14 ${GROUND + 1} C200 ${GROUND - 2}, 420 ${GROUND + 4}, ${TABLE_W - 14} ${GROUND}`} {...PENCIL} strokeWidth="2.6" />
        <path d={`M30 ${GROUND + 7} L${TABLE_W - 40} ${GROUND + 8}`} {...PENCIL} strokeWidth="1" opacity=".25" />
        {trail.length > 1 && <path d={`M${trail.join(' L')}`} {...PENCIL} strokeWidth="1.2" strokeDasharray="2 7" opacity=".55" />}
        {v && v.len > 8 && (
          <g pointerEvents="none">
            <path d={preview} {...PENCIL} strokeWidth="1.4" strokeDasharray="2 6" opacity=".7" />
            <path d={`M${COIN_X} ${sy(COIN_R)} l${Math.cos(v.angle) * (24 + v.power * 60)} ${-Math.sin(v.angle) * (24 + v.power * 60)}`} {...PENCIL} strokeWidth={v.power > 0.9 ? 3 : 2.2} />
            <text x={COIN_X - 30} y={GROUND + 22} className={s.coinPower}>
              {v.power > 0.9 ? 'çok sert!' : v.power > 0.6 ? 'sert' : v.power > 0.3 ? 'orta' : 'hafif'}
            </text>
          </g>
        )}
        <Conditions g={goal} />
        <Fingers g={goal} t={handT} />
        <CoinMark c={coin} ready={ready} />
      </svg>
      <p className={s.status} aria-live="polite">
        {over
          ? passed
            ? last
              ? `${goals} gol! Bütün bölümler bitti: Mesai Dışı para futbolu şampiyonu.`
              : `${goals} gol: ${level + 1}. bölüm geçildi!`
            : `${goals} gol, ${L.need} gerekiyordu. Bir daha dene.`
          : said
            ? RESULT_TEXT[said]
            : rolling
              ? 'Dönüyor…'
              : shot === 0
                ? level === 0
                  ? `${L.note} Parmağını kâğıda bas, çek ve bırak: para hep kaleye doğru uçar. Dik çekersen yüksek, yatık çekersen alçak gider; ne kadar uzun çekersen o kadar sert. Para döne döne yay çizer, iki parmağın arasına düşsün. ${L.need} gol bölümü geçirir.`
                  : `${L.note} ${L.need} gol gerekiyor.`
                : 'Sıradaki atış: kale yer değiştirdi.'}
        {over && passed && !last && (
          <button type="button" className={s.again} onClick={() => play(level + 1)}>
            sonraki bölüm →
          </button>
        )}
        {over && (
          <button type="button" className={s.again} onClick={() => play(passed && last ? 0 : level)}>
            {passed && last ? 'baştan oyna →' : 'bölümü tekrarla →'}
          </button>
        )}
      </p>
    </div>
  );
}
