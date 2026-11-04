import { useMemo, useState, type CSSProperties } from 'react';
import { GullDefs } from './Gull';
import { rng } from './paint';
import { SIMIT, useFlight } from './Flight';
import * as snd from './sounds';
import s from './Deck.module.css';

/*
 * Güvertenin önü: vernikli tik küpeşte (üst yüzü ışıkta, ön yüzü gölgede, damarlı), beyaz boyalı
 * çelik dikmeler ve borular, dikmeye asılı can simidi. Küpeştede yağlı kâğıdın üstünde susamlı
 * simit; altın yaldızlı porselen tabakta iki küp şeker ve ince belli bardakta çay, içinde kaşık.
 *
 * Çay: bardağa dokununca bir yudum alınır (bardak kalkar, eğilir, azalarak geri konur). Bardak
 * boşalınca çaycının demliği gelir, çay ince bir sicim halinde dökülür, bardak dolar. Şekere
 * dokununca küp bardağa düşer, çayın yüzü halkalanır, kaşık karıştırır. Simide dokununca simit
 * dört parçaya bölünür ve havaya atılır, martılar parçaları havada kapar (Flight.tsx).
 */

const RAIL = 784;
const TEA: [number, number] = [930, 785];
const POSTS = [120, 350, 580, 810, 1040, 1270, 1500];
const CUBES: [number, number][] = [
  [-52, -1],
  [-36, 4],
];
const SIP_MS = 1900;
const POUR_MS = 3200;

/** Bardağın iç yarı genişliği (yüksekliğe göre): altta geniş, belde dar, ağızda geniş. */
const LEVEL = (l: number) => -(6 + l * 100);

function grain() {
  const rand = rng(61);
  const a: string[] = [];
  for (let i = 0; i < 38; i++) {
    const y = RAIL + 14 + rand() * 22;
    const x = rand() * 1600;
    const w = 120 + rand() * 380;
    a.push(`M${x.toFixed(0)} ${y.toFixed(1)}c${(w * 0.3).toFixed(0)} ${(rand() * 2 - 1).toFixed(1)} ${(w * 0.6).toFixed(0)} ${(rand() * 2 - 1).toFixed(1)} ${w.toFixed(0)} 0`);
  }
  return a.join('');
}

/** Bütün simit: halka, burgu çizgileri, susamlar, ışık. */
function Simit() {
  const seeds = useMemo(() => {
    const rand = rng(12);
    const a: string[] = [];
    for (let i = 0; i < 70; i++) {
      const ang = rand() * Math.PI * 2;
      const r = 0.2 + rand() * 0.75;
      const x = (17 + 29 * r) * Math.cos(ang);
      const y = (5.5 + 9.5 * r) * Math.sin(ang) - 3;
      if (y > 9) continue;
      const rot = (rand() * 180).toFixed(0);
      a.push(`M${x.toFixed(1)} ${y.toFixed(1)}m-1.7 0a1.7 0.9 ${rot} 1 0 3.4 0a1.7 0.9 ${rot} 1 0 -3.4 0`);
    }
    return a.join('');
  }, []);
  const twists = [];
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    const x0 = 19 * Math.cos(a);
    const y0 = 6 * Math.sin(a) - 1.5;
    const x1 = 45 * Math.cos(a + 0.28);
    const y1 = 15 * Math.sin(a + 0.28);
    twists.push(`M${x0.toFixed(1)} ${y0.toFixed(1)}Q${((x0 + x1) / 2 + 5 * Math.cos(a + 1.6)).toFixed(1)} ${((y0 + y1) / 2).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`);
  }
  return (
    <g transform={`translate(${SIMIT[0]} ${SIMIT[1]})`}>
      <ellipse cx={2} cy={12} rx={50} ry={7} fill="rgba(40,22,10,.35)" />
      <path d="M-46 0 a46 15 0 1 0 92 0 a46 15 0 1 0 -92 0 Z M-17 -1.5 a17 5.5 0 1 1 34 0 a17 5.5 0 1 1 -34 0 Z" fillRule="evenodd" fill="url(#vapur-simit)" stroke="#5a3215" strokeWidth={1.2} />
      <path d={twists.join('')} fill="none" stroke="rgba(90,46,18,.45)" strokeWidth={1.6} />
      <path d={seeds} fill="#f6e7bf" />
      <path d="M-38 -6 C -28 -14 -6 -16 12 -14" fill="none" stroke="rgba(255,236,200,.55)" strokeWidth={2.4} strokeLinecap="round" />
      {/* deliğin içi */}
      <ellipse cx={0} cy={-1} rx={15} ry={4.2} fill="rgba(30,18,10,.45)" />
    </g>
  );
}

function Teapot() {
  return (
    <g>
      <path d="M-30 -2 C -46 -2 -54 -14 -64 -11 L -61 -4 C -52 -7 -45 10 -30 12 Z" fill="url(#vapur-steel)" stroke="#4f565d" strokeWidth={1} />
      <path d="M-34 -40 C -42 -10 -36 22 -10 27 L 18 27 C 40 22 44 -10 36 -40 Z" fill="url(#vapur-steel)" stroke="#4f565d" strokeWidth={1.2} />
      <path d="M-22 -34 C -26 -10 -22 10 -12 20" fill="none" stroke="rgba(255,255,255,.75)" strokeWidth={4} strokeLinecap="round" />
      <ellipse cx={1} cy={-41} rx={36} ry={7} fill="#c5cbd0" stroke="#4f565d" strokeWidth={1} />
      <ellipse cx={1} cy={-44} rx={26} ry={5} fill="url(#vapur-steel)" />
      <circle cx={1} cy={-52} r={5} fill="#1d1f22" />
      <path d="M36 -32 C 62 -32 64 12 34 16" fill="none" stroke="#1d1f22" strokeWidth={7} strokeLinecap="round" />
    </g>
  );
}

/** Çay bardağı: ince bel, kalın dip, ağız halkası; içinde çay ve kaşık. */
function Glass({ level, sugarIn, stir }: { level: number; sugarIn: number; stir: number }) {
  const surface = LEVEL(level);
  const outer = 'M-25 0 C -25 -18 -15 -36 -16 -58 C -17 -80 -29 -96 -29 -112 L 29 -112 C 29 -96 17 -80 16 -58 C 15 -36 25 -18 25 0 Z';
  return (
    <g>
      <defs>
        <clipPath id="vapur-glass-in">
          <path d="M-22.5 -4 C -22.5 -18 -12.5 -36 -13.5 -58 C -14.5 -80 -26.5 -96 -26.5 -110 L 26.5 -110 C 26.5 -96 14.5 -80 13.5 -58 C 12.5 -36 22.5 -18 22.5 -4 Z" />
        </clipPath>
        <clipPath id="vapur-above">
          <rect x={-40} y={-200} width={80} height={200 + surface} />
        </clipPath>
      </defs>
      <path d={outer} fill="rgba(255,255,255,.12)" />
      <g clipPath="url(#vapur-glass-in)">
        {/* çay: dolu bardak çizilir, seviyesine göre aşağı kayar; yüzeyi ufukla sallanır */}
        <g className={s.liquid} style={{ transform: `translateY(${(1 - level) * 100}px)` } as CSSProperties}>
          <g transform="translate(0 -106)">
            <g className={s.slosh}>
              <rect x={-40} y={0} width={80} height={120} fill="url(#vapur-tea)" />
              <rect x={-40} y={60} width={80} height={60} fill="rgba(40,6,0,.35)" />
              <ellipse cx={0} cy={0} rx={40} ry={3.4} fill="#c45a2c" />
              <ellipse cx={-6} cy={-0.5} rx={14} ry={1.4} fill="rgba(255,214,170,.55)" />
              {stir > 0 && <ellipse key={stir} className={s.ripple} cx={0} cy={0} rx={14} ry={2} fill="none" stroke="rgba(255,220,180,.8)" strokeWidth={1.2} />}
            </g>
          </g>
        </g>
        {sugarIn > 0 && <circle cx={0} cy={-8} r={3} fill="rgba(255,240,220,.35)" />}
      </g>
      {/* kaşık: çayın içinde kalan kısmı soluk görünür */}
      <g className={stir > 0 ? s.stir : undefined} key={`k${stir}`}>
        <g opacity={0.35}>
          <path d="M14 -150 L 5 -22" stroke="url(#vapur-silver)" strokeWidth={3.2} strokeLinecap="round" />
          <ellipse cx={4} cy={-16} rx={4.5} ry={8} fill="#c9ced4" />
        </g>
        <g clipPath="url(#vapur-above)">
          <path d="M14 -150 L 5 -22" stroke="url(#vapur-silver)" strokeWidth={3.2} strokeLinecap="round" />
          <circle cx={14} cy={-151} r={2.6} fill="#e3e7ea" />
        </g>
      </g>
      {/* cam: kenar, dip, ağız ve parlamalar */}
      <path d={outer} fill="none" stroke="rgba(255,255,255,.55)" strokeWidth={1.4} />
      <path d={outer} fill="none" stroke="rgba(30,20,20,.25)" strokeWidth={0.6} />
      <ellipse cx={0} cy={-1} rx={25} ry={4.5} fill="rgba(255,255,255,.25)" stroke="rgba(255,255,255,.5)" strokeWidth={1} />
      <ellipse cx={0} cy={-112} rx={29} ry={4.2} fill="none" stroke="rgba(255,255,255,.75)" strokeWidth={1.4} />
      <path d="M-24 -104 C -24 -88 -12 -76 -12 -60 C -12 -44 -20 -30 -20 -10" fill="none" stroke="rgba(255,255,255,.65)" strokeWidth={3} strokeLinecap="round" />
      <path d="M21 -100 C 20 -88 12 -78 11 -64" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

export function Deck({ still, tint, facing, onSay }: { still: boolean; tint: string; facing: 1 | -1; onSay: (who: string, text: string) => void }) {
  const wood = useMemo(() => grain(), []);
  const flight = useFlight({ still, tint, facing });
  const [level, setLevel] = useState(0.86);
  const [act, setAct] = useState<'idle' | 'sip' | 'pour' | 'sugar'>('idle');
  const [sips, setSips] = useState(0);
  const [cubes, setCubes] = useState([true, true]);
  const [dropping, setDropping] = useState(-1);
  const [sugarIn, setSugarIn] = useState(0);
  const [stir, setStir] = useState(0);
  const [simit, setSimit] = useState(true);
  const [pours, setPours] = useState(0);

  const surface = LEVEL(level);
  const busy = act !== 'idle';

  const onGlass = () => {
    if (busy) return;
    if (level < 0.25) {
      // çaycı gelir: demlik eğilir, bardak dolar
      setAct('pour');
      setPours((n) => n + 1);
      onSay('Çaycı', pours === 0 ? 'Taze demledim abi, buyur. Şekerin tabağında.' : pours < 3 ? 'Bir çay daha! Mesai uzun, haklısın.' : 'Abi çay ocağında da bu kadar içilmez, maşallah.');
      window.setTimeout(() => {
        snd.pour(1.1);
        setLevel(0.9);
      }, POUR_MS * 0.38);
      window.setTimeout(() => {
        setAct('idle');
        setCubes([true, true]);
        setSugarIn(0);
      }, POUR_MS);
      return;
    }
    setAct('sip');
    setSips((n) => n + 1);
    snd.clink();
    window.setTimeout(snd.sip, 650);
    window.setTimeout(() => setLevel((l) => Math.max(0.1, l - 0.3)), 800);
    window.setTimeout(() => {
      snd.clink();
      setAct('idle');
    }, SIP_MS - 150);
    if (sips === 0) onSay('Yan koltuktaki amca', 'Vapurda çay başka içilir. Bardağın beli ince, demi koyu olacak.');
  };

  const onCube = (i: number) => {
    if (busy || !cubes[i] || level < 0.15) return;
    setAct('sugar');
    setDropping(i);
    window.setTimeout(() => {
      snd.plop();
      setCubes((c) => c.map((v, k) => (k === i ? false : v)));
      setDropping(-1);
      setSugarIn((n) => n + 1);
      setStir((n) => n + 1);
      // kaşık karıştırır: çın çın
      for (let k = 0; k < 6; k++) window.setTimeout(snd.spoon, 180 + k * 210);
    }, still ? 0 : 900);
    window.setTimeout(() => setAct('idle'), still ? 400 : 2500);
  };

  const onSimit = () => {
    if (!simit) return;
    setSimit(false);
    flight.throwSimit();
    onSay('Martılar', 'Simidi parça parça attın, hepsini havada kaptılar. Vapurun gerçek yolcuları onlar.');
    window.setTimeout(() => {
      setSimit(true);
      onSay('Simitçi', 'Buyur abi, yenisi. Martılar da müşterimiz sayılır.');
    }, 9000);
  };

  const key = (f: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      f();
    }
  };

  return (
    <svg className={`${s.deck} ${still ? s.deckStill : ''}`} viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" role="group" aria-label="Küpeşte: çay ve simit">
      <defs>
        <GullDefs tint={tint} />
        <linearGradient id="vapur-top" x1="0" y1={RAIL - 2} x2="0" y2={RAIL + 12} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#d9a26a" />
          <stop offset="1" stopColor="#a8693a" />
        </linearGradient>
        <linearGradient id="vapur-face" x1="0" y1={RAIL + 12} x2="0" y2={RAIL + 40} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8a522a" />
          <stop offset="0.6" stopColor="#6c3d1e" />
          <stop offset="1" stopColor="#4a2812" />
        </linearGradient>
        <linearGradient id="vapur-post" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8f969c" />
          <stop offset="0.35" stopColor="#f6f6f3" />
          <stop offset="0.6" stopColor="#d8dadb" />
          <stop offset="1" stopColor="#868c92" />
        </linearGradient>
        <linearGradient id="vapur-tube" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6f6f3" />
          <stop offset="0.5" stopColor="#d4d6d7" />
          <stop offset="1" stopColor="#7d8389" />
        </linearGradient>
        <radialGradient id="vapur-simit" cx="45%" cy="30%" r="75%">
          <stop offset="0" stopColor="#d98b45" />
          <stop offset="0.55" stopColor="#a65a24" />
          <stop offset="1" stopColor="#6b3612" />
        </radialGradient>
        <linearGradient id="vapur-tea" x1="-40" y1="0" x2="40" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3f0e04" />
          <stop offset="0.3" stopColor="#952f0e" />
          <stop offset="0.48" stopColor="#d0602b" />
          <stop offset="0.7" stopColor="#952f0e" />
          <stop offset="1" stopColor="#3f0e04" />
        </linearGradient>
        <radialGradient id="vapur-saucer" cx="45%" cy="40%" r="65%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.75" stopColor="#ecebe6" />
          <stop offset="1" stopColor="#c9c6bd" />
        </radialGradient>
        <linearGradient id="vapur-steel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6d747b" />
          <stop offset="0.3" stopColor="#eef1f3" />
          <stop offset="0.55" stopColor="#aab1b7" />
          <stop offset="1" stopColor="#5b6268" />
        </linearGradient>
        <linearGradient id="vapur-silver" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f5f7f8" />
          <stop offset="1" stopColor="#8d949a" />
        </linearGradient>
      </defs>

      {/* küpeştenin ardındaki martılar */}
      {flight.gulls}

      {/* dikmeler, borular */}
      {POSTS.map((x) => (
        <rect key={x} x={x - 8} y={RAIL + 38} width={16} height={900 - RAIL - 38} fill="url(#vapur-post)" />
      ))}
      <rect x={-10} y={RAIL + 66} width={1620} height={11} rx={5.5} fill="url(#vapur-tube)" />
      <rect x={-10} y={RAIL + 98} width={1620} height={10} rx={5} fill="url(#vapur-tube)" />
      {/* can simidi */}
      <g transform={`translate(1330 ${RAIL + 74})`}>
        <path d="M-16 -36 L -8 -42 M 16 -36 L 8 -42" stroke="#e8dcc0" strokeWidth={2.4} />
        <circle r={33} fill="none" stroke="#f3efe6" strokeWidth={13} />
        <circle r={33} fill="none" stroke="#d63a2a" strokeWidth={13} strokeDasharray="25.9 25.9" transform="rotate(22)" />
        <circle r={39.5} fill="none" stroke="rgba(0,0,0,.25)" strokeWidth={1} />
        <circle r={26.5} fill="none" stroke="rgba(0,0,0,.25)" strokeWidth={1} />
        <circle r={33} fill="none" stroke="#efe3c4" strokeWidth={1.4} strokeDasharray="4 6" />
        <path d="M-25 -15 A 28 28 0 0 1 -7 -30" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth={3.4} strokeLinecap="round" />
      </g>
      {/* tik küpeşte: üst yüz, ön yüz, damarlar */}
      <rect x={-10} y={RAIL - 2} width={1620} height={14} fill="url(#vapur-top)" />
      <rect x={-10} y={RAIL + 12} width={1620} height={28} fill="url(#vapur-face)" />
      <path d={wood} fill="none" stroke="rgba(40,18,6,.28)" strokeWidth={1.1} />
      <rect x={-10} y={RAIL - 2} width={1620} height={2.5} fill="rgba(255,236,206,.6)" />
      <rect x={-10} y={RAIL + 11} width={1620} height={1.5} fill="rgba(255,226,186,.35)" />
      <rect x={-10} y={RAIL + 40} width={1620} height={5} fill="rgba(0,0,0,.25)" />

      {/* yağlı kâğıt ve simit */}
      <path d={`M${SIMIT[0] - 74} ${RAIL + 8} L ${SIMIT[0] - 52} ${RAIL - 6} L ${SIMIT[0] + 78} ${RAIL - 7} L ${SIMIT[0] + 64} ${RAIL + 9} Z`} fill="rgba(247,238,214,.92)" stroke="rgba(120,100,70,.35)" strokeWidth={1} />
      <path d={`M${SIMIT[0] - 30} ${RAIL - 6} L ${SIMIT[0] - 40} ${RAIL + 8}`} stroke="rgba(150,130,100,.3)" strokeWidth={1} />
      <g className={s.prop} role="button" tabIndex={0} aria-label="Simit: böl, martılara at" onClick={onSimit} onKeyDown={key(onSimit)}>
        {simit ? <g className={s.simitIn}><Simit /></g> : null}
        <rect x={SIMIT[0] - 60} y={RAIL - 40} width={120} height={50} fill="transparent" />
      </g>
      {flight.pieces}

      {/* çay takımı */}
      <g transform={`translate(${TEA[0]} ${TEA[1]})`}>
        <ellipse cx={4} cy={9} rx={80} ry={9} fill="rgba(40,20,8,.35)" />
        <ellipse cx={0} cy={3} rx={72} ry={14} fill="url(#vapur-saucer)" stroke="rgba(90,80,60,.35)" strokeWidth={1} />
        <ellipse cx={0} cy={2} rx={68} ry={12.4} fill="none" stroke="#c9a24a" strokeWidth={1.6} />
        <ellipse cx={0} cy={1} rx={44} ry={7.5} fill="rgba(0,0,0,.05)" />
        {CUBES.map(([x, y], i) =>
          cubes[i] ? (
            <g
              key={i}
              className={s.prop}
              role="button"
              tabIndex={0}
              aria-label="Küp şeker: çaya at"
              onClick={() => onCube(i)}
              onKeyDown={key(() => onCube(i))}
              transform={`translate(${x} ${y})`}
            >
              <g className={dropping === i ? s.drop : undefined} style={{ '--tx': `${-x}px`, '--ty': `${surface - y}px` } as CSSProperties}>
                <path d="M0 -14 L 9 -18 L 18 -14 L 9 -10 Z" fill="#fdfcf8" />
                <path d="M0 -14 L 9 -10 L 9 1 L 0 -3 Z" fill="#e6e2d9" />
                <path d="M9 -10 L 18 -14 L 18 -3 L 9 1 Z" fill="#cdc8bd" />
                <path d="M2 -12 h1 M6 -6 h1 M12 -8 h1 M14 -12 h1 M4 -2 h1" stroke="rgba(150,140,120,.6)" strokeWidth={1} />
                <rect x={-6} y={-24} width={30} height={30} fill="transparent" />
              </g>
            </g>
          ) : null,
        )}
        <g className={`${s.prop} ${act === 'sip' ? s.sip : ''}`} role="button" tabIndex={0} aria-label={level < 0.25 ? 'Çay bardağı: çaycıyı çağır' : 'Çay bardağı: bir yudum al'} onClick={onGlass} onKeyDown={key(onGlass)}>
          <Glass level={level} sugarIn={sugarIn} stir={stir} />
          {/* buhar */}
          <g className={s.steam} fill="none" stroke="rgba(255,255,255,.6)" strokeWidth={2.4} strokeLinecap="round">
            <path d="M-8 -126 c-8 -10 8 -18 0 -30" />
            <path d="M8 -130 c-8 -10 8 -18 0 -30" />
          </g>
          <rect x={-40} y={-160} width={80} height={170} fill="transparent" />
        </g>
        {act === 'pour' && (
          <>
            <path className={s.stream} d={`M0 -128 C 1 -110 -1 ${surface - 20} 0 ${surface}`} fill="none" stroke="url(#vapur-tea)" strokeWidth={4} strokeLinecap="round" />
            <g className={s.pour}>
              <Teapot />
            </g>
          </>
        )}
      </g>
    </svg>
  );
}
