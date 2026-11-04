import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../shared/motion';
import styles from './ShopScene.module.css';

/*
 * Tezgâhtaki sakız makinesi: kırmızı ayak, sarı para plakası ve çevrilen kol, üstte cam fanus.
 * Fanusta kavanozdaki sakız kadar renkli top vardır; toplar yer çekimiyle düşer, birbirine ve
 * camın içine çarpıp yerleşir (Verlet ile basit fizik). Para üstü sakızla verilecekken makine
 * parlar; kol her çevrildiğinde en alttaki top boyundan aşağı, oluktan tezgâha yuvarlanır,
 * kalanlar boşluğa kayar. Sabah yeni paket gelince toplar fanusun üstünden dökülür. Hareket
 * azaltılmışsa toplar anında yerine oturur, düşen top görünmez.
 * Sahnenin koordinatlarında, tabanı tezgâhın üstünde (0, 0) çizilir.
 */

/** Fanusun merkezi, iç yarıçapı ve topun yarıçapı. */
const CY = -130;
const R = 52;
const BALL = 5;
const COLORS = ['#e5484d', '#f5a524', '#30a46c', '#2f9be8', '#ef4a86', '#f7f7f2', '#8e4ec6', '#ffd60a'];

interface Ball {
  x: number;
  y: number;
  px: number;
  py: number;
  c: string;
}

interface Out {
  c: string;
  t: number;
  x: number;
  y: number;
}

const spawn = (i: number, top: boolean): Ball => {
  // tohum gibi: aynı sırada aynı renk ve yer
  const c = COLORS[(i * 5 + 3) % COLORS.length];
  const x = top ? (((i * 37) % 50) - 25) * 0.8 : ((i % 9) - 4) * 10.4 + (Math.floor(i / 9) % 2) * 3;
  const y = top ? -R + BALL + (i % 3) * 3 : 42 - Math.floor(i / 9) * 9;
  return { x, y, px: x, py: y, c };
};

/** Bir fizik adımı: yer çekimi, toplar arası itme, camın içinde kalma. Hareket sürüyorsa doğru. */
function step(balls: Ball[]): boolean {
  let moving = false;
  for (const b of balls) {
    const vx = (b.x - b.px) * 0.985;
    const vy = (b.y - b.py) * 0.985;
    b.px = b.x;
    b.py = b.y;
    b.x += vx;
    b.y += vy + 0.32;
  }
  for (let k = 0; k < 4; k++) {
    for (let i = 0; i < balls.length; i++)
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d < BALL * 2) {
          const push = (BALL * 2 - d) / 2;
          a.x -= (dx / d) * push;
          a.y -= (dy / d) * push;
          b.x += (dx / d) * push;
          b.y += (dy / d) * push;
        }
      }
    for (const b of balls) {
      const d = Math.hypot(b.x, b.y) || 0.01;
      const lim = R - BALL;
      if (d > lim) {
        b.x *= lim / d;
        b.y *= lim / d;
      }
    }
  }
  for (const b of balls) if (Math.hypot(b.x - b.px, b.y - b.py) > 0.06) moving = true;
  return moving;
}

/** Düşen topun yolu (fanus merkezine göre): boyun, ayağın içi, oluk, tezgâh. */
function chute(t: number, from: { x: number; y: number }): { x: number; y: number } {
  const neck = R + 4;
  const exit = -CY - 22;
  if (t < 0.25) {
    const k = t / 0.25;
    return { x: from.x * (1 - k), y: from.y + (neck - from.y) * k * k };
  }
  if (t < 0.55) return { x: 0, y: neck + (exit - neck) * ((t - 0.25) / 0.3) };
  const k = (t - 0.55) / 0.45;
  return { x: 22 * k, y: exit + (-CY - BALL - exit) * Math.min(1, k * 1.6) };
}

export function GumMachine({ count, active, onTurn }: { count: number; active: boolean; onTurn?: () => void }) {
  const balls = useRef<Ball[]>([]);
  const out = useRef<Out[]>([]);
  const spawned = useRef(0);
  const raf = useRef(0);
  // çizilen kare: fizik ref'lerde akar, her karede kopyası çizilir
  const [view, setView] = useState<{ balls: Ball[]; out: Out[] }>({ balls: [], out: [] });
  const show = () => setView({ balls: balls.current.map((b) => ({ ...b })), out: out.current.map((o) => ({ ...o })) });
  const [turns, setTurns] = useState(0);

  // fizik döngüsü: hareket bitince durur, yeni top ya da düşen top gelince yeniden başlar
  const run = () => {
    if (prefersReducedMotion()) {
      for (let i = 0; i < 600 && step(balls.current); i++);
      out.current = [];
      return show();
    }
    show();
    if (raf.current) return;
    let still = 0;
    const tick = () => {
      const moving = step(balls.current);
      out.current = out.current.map((o) => ({ ...o, t: o.t + 0.022 })).filter((o) => o.t < 1.6);
      still = moving || out.current.length ? 0 : still + 1;
      show();
      raf.current = still > 20 ? 0 : requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  // sayı artınca toplar fanusun üstünden dökülür; ilk kurulumda dibe dizilip yerleşir
  useEffect(() => {
    const first = spawned.current === 0;
    while (balls.current.length < count) balls.current.push(spawn(spawned.current++, !first));
    // dışarıdan azalırsa (yeni oyun) fazlası çıkar
    if (balls.current.length > count) balls.current.length = count;
    if (first) for (let i = 0; i < 240; i++) step(balls.current);
    run();
  }, [count]);

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    },
    [],
  );

  /** Kol çevrilir: en alttaki top düşer. Kalan sayıyı oyun azaltır. */
  const turn = () => {
    if (!active || !balls.current.length) return;
    let low = 0;
    balls.current.forEach((b, i) => b.y > balls.current[low].y && (low = i));
    const [b] = balls.current.splice(low, 1);
    out.current.push({ c: b.c, t: 0, x: b.x, y: b.y });
    setTurns((n) => n + 1);
    run();
    onTurn?.();
  };

  return (
    <g className={`${styles.desk} ${active ? styles.gumLive : ''}`} onClick={turn} role="button" aria-label={active ? 'Sakız makinesinin kolunu çevir' : 'Sakız makinesi'}>
      <defs>
        <linearGradient id="gmRed" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7d0f0b" />
          <stop offset=".22" stopColor="#d42a22" />
          <stop offset=".38" stopColor="#f2584d" />
          <stop offset=".55" stopColor="#c8211c" />
          <stop offset="1" stopColor="#6e0c09" />
        </linearGradient>
        <linearGradient id="gmYellow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe066" />
          <stop offset=".6" stopColor="#f2c230" />
          <stop offset="1" stopColor="#c99a12" />
        </linearGradient>
        <linearGradient id="gmChrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7f8f9" />
          <stop offset=".5" stopColor="#a9b0b5" />
          <stop offset="1" stopColor="#e1e5e8" />
        </linearGradient>
        <radialGradient id="gmGlass" cx=".5" cy=".5" r=".5">
          <stop offset=".72" stopColor="rgba(220,238,250,.08)" />
          <stop offset=".93" stopColor="rgba(170,205,230,.32)" />
          <stop offset="1" stopColor="rgba(120,160,190,.55)" />
        </radialGradient>
        <radialGradient id="gmShine" cx=".32" cy=".3" r=".7">
          <stop offset="0" stopColor="rgba(255,255,255,.85)" />
          <stop offset=".35" stopColor="rgba(255,255,255,.15)" />
          <stop offset="1" stopColor="rgba(0,0,0,.28)" />
        </radialGradient>
      </defs>
      <ellipse cx="0" cy="3" rx="48" ry="6" fill="rgba(0,0,0,.32)" />
      {/* ayak: yayvan taban, yukarı daralan gövde, omuz */}
      <path d="M-44 0 Q-44 -7 -36 -9 Q-30 -12 -28 -22 L-24 -62 Q-24 -68 -16 -70 H16 Q24 -68 24 -62 L28 -22 Q30 -12 36 -9 Q44 -7 44 0 Z" fill="url(#gmRed)" />
      <ellipse cx="0" cy="-1" rx="44" ry="3.5" fill="#8f140f" />
      <path d="M-36 -9 Q0 -14 36 -9" stroke="rgba(0,0,0,.25)" strokeWidth="1.5" fill="none" />
      {/* para mekanizması: sarı plaka, krom yarık, beyaz kol */}
      <rect x="-15" y="-60" width="30" height="34" rx="3" fill="url(#gmYellow)" stroke="#b8890e" strokeWidth="1" />
      <rect x="-12" y="-57" width="24" height="5" rx="1.5" fill="url(#gmChrome)" />
      <rect x="-6" y="-55.5" width="12" height="1.6" rx=".8" fill="#2b2b2b" />
      <circle cx="0" cy="-40" r="7.5" fill="url(#gmChrome)" stroke="#8d969c" strokeWidth=".8" />
      <g style={{ transform: `translate(0px, -40px) rotate(${turns * 360}deg)` }} className={styles.crank}>
        <path d="M-13 -3 Q-15 0 -13 3 L13 3 Q15 0 13 -3 Z" fill="#f6f6f2" stroke="#b9b9b2" strokeWidth=".8" />
        <rect x="-12" y="-1" width="24" height="1.4" fill="rgba(0,0,0,.08)" />
        <circle r="3.2" fill="#e4e4de" stroke="#a9a9a2" strokeWidth=".8" />
      </g>
      {/* oluk: koyu ağız, yarı açık metal kapak */}
      <path d="M-9 -22 H9 V-11 Q9 -9 7 -9 H-7 Q-9 -9 -9 -11 Z" fill="#3a0806" />
      <path d="M-9 -22 H9 L8 -17 H-8 Z" fill="url(#gmChrome)" opacity=".9" />
      {/* boyun halkası */}
      <rect x="-26" y={CY + R - 4} width="52" height="10" rx="4" fill="url(#gmRed)" />
      <rect x="-26" y={CY + R - 4} width="52" height="2.5" rx="1.2" fill="rgba(255,255,255,.25)" />
      {/* fanus: toplar camın arkasında, cam ve parlamalar önde */}
      <g transform={`translate(0 ${CY})`}>
        <circle r={R + 2} fill="rgba(225,240,250,.18)" />
        {view.balls.map((b, i) => (
          <g key={i}>
            <circle cx={b.x} cy={b.y} r={BALL} fill={b.c} />
            <circle cx={b.x} cy={b.y} r={BALL} fill="url(#gmShine)" />
          </g>
        ))}
        {view.out.map((o, i) => {
          const p = chute(Math.min(1, o.t), o);
          // ayağın içinden geçerken görünmez; oluktan çıkıp tezgâhta durur, sonra müşteriye gider
          const hidden = o.t > 0.27 && o.t < 0.55;
          const op = hidden ? 0 : o.t > 1.3 ? (1.6 - o.t) / 0.3 : 1;
          return (
            <g key={`o${i}`} opacity={op}>
              <circle cx={p.x} cy={p.y} r={BALL} fill={o.c} />
              <circle cx={p.x} cy={p.y} r={BALL} fill="url(#gmShine)" />
            </g>
          );
        })}
        <circle r={R + 2} fill="url(#gmGlass)" stroke="rgba(255,255,255,.6)" strokeWidth="1.5" />
        {/* iki yarım kürenin ek yeri */}
        <ellipse cx="0" cy="-2" rx={R + 1} ry="5" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="1.2" />
        <path d={`M${-R * 0.72} ${-R * 0.42} A${R * 0.82} ${R * 0.82} 0 0 1 ${-R * 0.12} ${-R * 0.86}`} stroke="rgba(255,255,255,.8)" strokeWidth="5" fill="none" strokeLinecap="round" />
        <ellipse cx={R * 0.42} cy={-R * 0.5} rx="4" ry="2.4" fill="rgba(255,255,255,.75)" transform={`rotate(35 ${R * 0.42} ${-R * 0.5})`} />
        <path d={`M${R * 0.78} ${R * 0.2} A${R * 0.82} ${R * 0.82} 0 0 1 ${R * 0.35} ${R * 0.74}`} stroke="rgba(255,255,255,.35)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {/* tepedeki kapak ve topuz */}
        <ellipse cx="0" cy={-R - 1} rx="14" ry="4" fill="#8f140f" />
        <path d={`M-14 ${-R - 1} Q-14 ${-R - 9} 0 ${-R - 10} Q14 ${-R - 9} 14 ${-R - 1} Z`} fill="url(#gmRed)" />
        <circle cx="0" cy={-R - 12} r="3.5" fill="url(#gmRed)" />
      </g>
    </g>
  );
}
