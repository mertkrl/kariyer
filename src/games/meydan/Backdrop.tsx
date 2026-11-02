import { GROUND, H, W, type Backdrop as BackdropKind, type LandmarkKind } from './model';
import { rnd, url } from './paint';

/*
 * Her bölgenin kendi arka planı ve meydanın simgesi. Karadeniz'de bulutun indiği çay yamaçları,
 * Ege'de evlerin tırmandığı Kadifekale ve palmiyeler, İç Anadolu'da bozkır tepeleri, uzaktaki
 * kule ve vinçler, Güneydoğu'da bazalt surlar ve kare gövdeli minare, İstanbul'da pusta şehir.
 */

const SKY: Record<BackdropKind, [string, string, string]> = {
  istanbul: ['#4f93d6', '#9cc6ea', '#d4e6f3'],
  karadeniz: ['#8d999f', '#bcc6ca', '#e1e5e4'],
  ege: ['#2f86d6', '#86c0ec', '#d8ecf6'],
  bozkir: ['#9fb6c8', '#cdd6d8', '#ebe3d0'],
  sur: ['#7fb0d8', '#bcd4e2', '#f0e2c4'],
};

export function SkyDefs() {
  return (
    <>
      {Object.entries(SKY).map(([k, [a, b, c]]) => (
        <linearGradient key={k} id={`meydan-sky-${k}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="0.65" stopColor={b} />
          <stop offset="1" stopColor={c} />
        </linearGradient>
      ))}
    </>
  );
}

/** Uzaktaki şehir: pusta kaybolan bloklar. */
function City({ tone = '#b9c9d6', stripe = '#aabccb', from = 220 }: { tone?: string; stripe?: string; from?: number }) {
  return (
    <>
      {Array.from({ length: 12 }, (_, i) => {
        const x = i * 104 - 10;
        const w = 80 + rnd('city', i) * 60;
        const top = from + rnd('city', 20 + i) * 90;
        return (
          <g key={i}>
            <rect x={x} y={top} width={w} height={GROUND - top} fill={tone} />
            {Array.from({ length: Math.floor((GROUND - top - 20) / 22) }, (_, k) => (
              <rect key={k} x={x + 8} y={top + 10 + k * 22} width={w - 16} height="6" fill={stripe} />
            ))}
          </g>
        );
      })}
    </>
  );
}

function Cypress({ x, top, w = 16 }: { x: number; top: number; w?: number }) {
  const b = GROUND - 60;
  return (
    <g>
      <path d={`M${x} ${top} C${x + w} ${top + 60} ${x + w} ${b - 60} ${x + w * 0.6} ${b} L${x - w * 0.6} ${b} C${x - w} ${b - 60} ${x - w} ${top + 60} ${x} ${top} Z`} fill="#2f4a32" />
      <path d={`M${x} ${top} C${x - w} ${top + 60} ${x - w} ${b - 60} ${x - w * 0.6} ${b} L${x - w * 0.1} ${b} Z`} fill="#3f5f40" />
    </g>
  );
}

function Palm({ x, top }: { x: number; top: number }) {
  return (
    <g>
      <path d={`M${x} ${GROUND} Q${x - 8} ${(GROUND + top) / 2} ${x + 4} ${top}`} fill="none" stroke="#7a6248" strokeWidth="7" />
      {[-150, -110, -60, -20, 20, 60].map((a, i) => {
        const r = (a * Math.PI) / 180;
        return <path key={i} d={`M${x + 4} ${top} q${Math.cos(r) * 30} ${Math.sin(r) * 18 - 10} ${Math.cos(r) * 60} ${Math.sin(r) * 30 + 22}`} fill="none" stroke={i % 2 ? '#3f6b32' : '#56873f'} strokeWidth="7" strokeLinecap="round" />;
      })}
    </g>
  );
}

function Clouds({ y = 110, opacity = 0.55 }: { y?: number; opacity?: number }) {
  return (
    <>
      <path d={`M150 ${y} Q230 ${y - 50} 330 ${y - 16} Q380 ${y - 34} 420 ${y - 8} Q300 ${y + 8} 150 ${y} Z`} fill="#fff" opacity={opacity} />
      <path d={`M760 ${y - 40} Q820 ${y - 60} 880 ${y - 44} Q930 ${y - 52} 960 ${y - 38} Q860 ${y - 28} 760 ${y - 40} Z`} fill="#fff" opacity={opacity * 0.8} />
    </>
  );
}

export function Backdrop({ kind }: { kind: BackdropKind }) {
  return (
    <g pointerEvents="none">
      <rect width={W} height={GROUND} fill={`url(#meydan-sky-${kind})`} />
      {kind === 'istanbul' && (
        <>
          <Clouds />
          <City />
          <rect y={200} width={W} height={GROUND - 200} fill="#dbe8f1" opacity="0.35" />
          <Cypress x={40} top={300} />
          <Cypress x={72} top={270} w={18} />
          <Cypress x={1180} top={320} />
        </>
      )}
      {kind === 'karadeniz' && (
        <>
          {/* dik yamaçlar: arkada pusa gömülmüş, önde çay sıralarıyla çizgili */}
          <path d={`M0 160 Q120 60 260 110 Q380 30 520 90 Q660 20 800 80 Q960 10 1100 70 L${W} 60 V${GROUND} H0 Z`} fill="#6f8a73" />
          <rect y={60} width={W} height="120" fill="#e1e5e4" opacity="0.35" />
          <path d={`M0 240 Q150 150 300 210 Q460 120 640 190 Q820 110 980 170 Q1100 130 ${W} 160 V${GROUND} H0 Z`} fill="#3f6a3e" />
          {Array.from({ length: 14 }, (_, i) => (
            <path key={i} d={`M0 ${250 + i * 18} Q300 ${210 + i * 18} 600 ${236 + i * 18} T${W} ${214 + i * 18}`} fill="none" stroke="#5f8f4a" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
          ))}
          {Array.from({ length: 9 }, (_, i) => {
            const x = 60 + i * 130 + rnd('rize', i) * 40;
            const y = 200 + rnd('rize', 10 + i) * 80;
            return (
              <g key={i}>
                <rect x={x} y={y} width="22" height="16" fill="#e9e6dc" />
                <polygon points={`${x - 3},${y} ${x + 25},${y} ${x + 11},${y - 9}`} fill={i % 2 ? '#a83a32' : '#3f6fa8'} />
              </g>
            );
          })}
          <path d="M-20 200 Q200 170 420 196 Q640 222 860 190 Q1040 168 1220 196 L1220 230 Q900 214 640 244 Q300 270 -20 236 Z" fill="#fff" opacity="0.5" />
        </>
      )}
      {kind === 'ege' && (
        <>
          <Clouds y={90} opacity={0.4} />
          {/* Kadifekale: tepeye tırmanan renkli evler ve kalenin surları */}
          <path d={`M0 330 Q200 250 420 210 Q560 150 700 170 Q900 200 1050 260 Q1140 290 ${W} 300 V${GROUND} H0 Z`} fill="#c8a879" />
          <path d="M520 168 h40 v-14 h10 v14 h30 v-10 h10 v10 h40 v20 h-130 Z" fill="#a98c62" />
          {Array.from({ length: 70 }, (_, i) => {
            const x = (i * 97) % W;
            const base = 330 - 160 * Math.exp(-(((x - 640) / 380) ** 2));
            const y = base + 6 + rnd('kale', i) * (GROUND - base - 40);
            const c = ['#f1ebe0', '#e8d0a8', '#d9a88a', '#c9d3d9', '#e6dcc4'][i % 5];
            return <rect key={i} x={x} y={y} width={18 + rnd('kale', 100 + i) * 14} height="12" fill={c} />;
          })}
          <rect y={150} width={W} height={GROUND - 150} fill="#e7eef2" opacity="0.25" />
          <Palm x={176} top={300} />
          <Palm x={1004} top={330} />
        </>
      )}
      {kind === 'bozkir' && (
        <>
          <path d={`M0 330 Q240 270 480 300 Q760 250 1000 290 Q1120 280 ${W} 300 V${GROUND} H0 Z`} fill="#c9b895" />
          <City tone="#c9cdc8" stripe="#b9bdb8" from={250} />
          {/* uzaktaki kule ve vinçler */}
          <g fill="#9aa4ab">
            <rect x={1056} y={110} width="14" height={GROUND - 110} />
            <ellipse cx={1063} cy={104} rx="30" ry="12" />
            <rect x={1036} y={82} width="54" height="16" rx="6" />
            <rect x={1061} y={46} width="4" height="40" />
          </g>
          <g stroke="#d6a432" strokeWidth="3" fill="none">
            <path d="M380 340 V120 M340 124 H520 M380 124 L470 150" />
            <path d="M800 330 V150 M760 154 H920" />
          </g>
          <rect y={200} width={W} height={GROUND - 200} fill="#efe8d8" opacity="0.4" />
        </>
      )}
      {kind === 'sur' && (
        <>
          {/* kare gövdeli minare ve uzakta kubbeler */}
          <g fill="#6e6a64">
            <rect x={590} y={96} width="34" height={GROUND - 96} />
            <rect x={584} y={150} width="46" height="8" />
            <polygon points="586,96 628,96 607,70" />
            <ellipse cx={460} cy={300} rx="60" ry="40" />
            <ellipse cx={820} cy={310} rx="50" ry="34" />
          </g>
          {/* bazalt surlar: burçlar ve mazgallar */}
          <rect y={300} width={W} height={GROUND - 300} fill="#3e3b37" />
          {Array.from({ length: 30 }, (_, i) => (
            <rect key={i} x={i * 40} y={290} width="24" height="12" fill="#3e3b37" />
          ))}
          {[110, 470, 900].map((x) => (
            <g key={x}>
              <rect x={x} y={250} width="90" height={GROUND - 250} fill="#34312e" />
              {[0, 1, 2, 3].map((k) => (
                <rect key={k} x={x + k * 24} y={240} width="16" height="12" fill="#34312e" />
              ))}
              <rect x={x + 38} y={290} width="12" height="24" rx="6" fill="#1d1b19" />
            </g>
          ))}
          <rect y={300} width={W} height={GROUND - 300} fill={url('ashlar')} />
          <rect y={240} width={W} height={GROUND - 240} fill="#f0e2c4" opacity="0.18" />
        </>
      )}
    </g>
  );
}

/* ── Simgeler: tıklanmaz, tabelaların ve zeminin önünde durur ── */

export function Landmark({ kind }: { kind: LandmarkKind }) {
  if (kind === 'cay') return <TeaGlass />;
  if (kind === 'saat') return <ClockTower />;
  if (kind === 'metro') return <MetroTotem />;
  if (kind === 'cesme') return <Fountain />;
  return <Flag />;
}

/** Cumhuriyet Meydanı'nın yüksek bayrak direği ve dalgalanan dev bayrak. */
function Flag() {
  const px = 612;
  const base = H - 24;
  const fx = px + 4;
  const fy = 40;
  const fw = 150;
  const fh = 100;
  const wave = (k: number) => Math.sin(k * Math.PI * 2) * 6;
  const top = Array.from({ length: 9 }, (_, i) => `${fx + (fw * i) / 8},${fy + wave(i / 8) + (i / 8) * 8}`).join(' ');
  const bottom = Array.from({ length: 9 }, (_, i) => `${fx + fw - (fw * i) / 8},${fy + fh + wave(1 - i / 8) + (1 - i / 8) * 4}`).join(' ');
  const cy = fy + fh / 2 + 3;
  return (
    <g pointerEvents="none">
      <ellipse cx={px} cy={base + 6} rx="46" ry="9" fill="#000" opacity="0.2" />
      <rect x={px - 40} y={base - 10} width="80" height="16" rx="4" fill="#d6d2c9" />
      <rect x={px - 40} y={base - 10} width="80" height="4" rx="2" fill="#efece5" />
      <rect x={px - 4} y={30} width="8" height={base - 40} fill={url('steel')} />
      <circle cx={px} cy={28} r="6" fill="#e6c25a" />
      <polygon points={`${top} ${bottom}`} fill="#e30a17" />
      <polygon points={`${top} ${bottom}`} fill={url('flag')} />
      {/* ay yıldız: bayrak oranlarına göre */}
      <circle cx={fx + fh * 0.5} cy={cy} r={fh * 0.25} fill="#fff" />
      <circle cx={fx + fh * 0.5625} cy={cy} r={fh * 0.2} fill="#e30a17" />
      <polygon
        points={Array.from({ length: 10 }, (_, i) => {
          const a = (i * Math.PI) / 5 + Math.PI;
          const r = i % 2 ? fh * 0.05 : fh * 0.125;
          return `${fx + fh * 0.7667 + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
        }).join(' ')}
        fill="#fff"
      />
    </g>
  );
}

/** Rize: belediyenin ince belli çay bardağı biçimli süs havuzu. */
function TeaGlass() {
  const x = 600;
  const base = H - 24;
  return (
    <g pointerEvents="none">
      <ellipse cx={x} cy={base + 6} rx="80" ry="10" fill="#000" opacity="0.2" />
      <ellipse cx={x} cy={base - 4} rx="76" ry="14" fill="#d6d2c9" />
      <ellipse cx={x} cy={base - 8} rx="64" ry="9" fill="#7fb3c9" />
      {/* tabak */}
      <ellipse cx={x} cy={base - 22} rx="56" ry="9" fill="#f4f4f2" stroke="#c9ccce" strokeWidth="2" />
      {/* bardak: ince bel, demli çay */}
      <path d={`M${x - 36} ${base - 160} C${x - 40} ${base - 110} ${x - 16} ${base - 100} ${x - 20} ${base - 70} C${x - 24} ${base - 44} ${x - 32} ${base - 34} ${x - 26} ${base - 26} H${x + 26} C${x + 32} ${base - 34} ${x + 24} ${base - 44} ${x + 20} ${base - 70} C${x + 16} ${base - 100} ${x + 40} ${base - 110} ${x + 36} ${base - 160} Z`} fill="#a8321c" opacity="0.88" />
      <path d={`M${x - 36} ${base - 160} C${x - 40} ${base - 110} ${x - 16} ${base - 100} ${x - 20} ${base - 70}`} fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="3" />
      <ellipse cx={x} cy={base - 160} rx="36" ry="6" fill="#d9e6ec" opacity="0.8" />
      <path d={`M${x - 10} ${base - 176} q-8 -14 0 -26 M${x + 8} ${base - 178} q8 -14 0 -26`} stroke="#fff" strokeOpacity="0.7" strokeWidth="3" fill="none" />
    </g>
  );
}

/** İzmir: sekizgen gövdeli, dört katlı saat kulesi ve kaidesindeki çeşmeler. */
function ClockTower() {
  const x = 604;
  const base = H - 22;
  const tier = (y: number, w: number, h: number, arches: number) => (
    <g>
      <rect x={x - w / 2} y={y - h} width={w} height={h} fill="#e9dcc2" />
      <rect x={x - w / 2} y={y - h} width={w * 0.18} height={h} fill="#000" opacity="0.08" />
      {Array.from({ length: arches }, (_, i) => {
        const aw = (w - 12) / arches;
        const ax = x - w / 2 + 6 + i * aw + aw * 0.2;
        return <path key={i} d={`M${ax} ${y - 6} V${y - h + aw * 0.6} A${aw * 0.3} ${aw * 0.3} 0 0 1 ${ax + aw * 0.6} ${y - h + aw * 0.6} V${y - 6} Z`} fill="#5a6f7a" />;
      })}
      <rect x={x - w / 2 - 4} y={y - h - 5} width={w + 8} height="6" fill="#d2c3a4" />
    </g>
  );
  return (
    <g pointerEvents="none">
      <ellipse cx={x} cy={base + 6} rx="80" ry="10" fill="#000" opacity="0.2" />
      <rect x={x - 70} y={base - 16} width="140" height="18" fill="#d6cbb2" />
      <rect x={x - 62} y={base - 24} width="124" height="10" fill="#e3d8be" />
      {tier(base - 24, 70, 70, 3)}
      {tier(base - 99, 56, 70, 3)}
      <g>
        <rect x={x - 22} y={base - 234} width="44" height="60" fill="#e9dcc2" />
        <circle cx={x} cy={base - 206} r="16" fill="#f8f4ea" stroke="#3a3a3a" strokeWidth="2" />
        <path d={`M${x} ${base - 206} V${base - 218} M${x} ${base - 206} H${x + 9}`} stroke="#222" strokeWidth="2" />
        <rect x={x - 26} y={base - 239} width="52" height="6" fill="#d2c3a4" />
      </g>
      <path d={`M${x - 16} ${base - 239} Q${x - 16} ${base - 270} ${x} ${base - 278} Q${x + 16} ${base - 270} ${x + 16} ${base - 239} Z`} fill="#8aa0a6" />
      <rect x={x - 1.5} y={base - 296} width="3" height="18" fill="#b89a4a" />
    </g>
  );
}

/** Kızılay: metro girişinin totemi. */
function MetroTotem() {
  const x = 610;
  const base = H - 24;
  return (
    <g pointerEvents="none">
      <ellipse cx={x} cy={base + 6} rx="30" ry="6" fill="#000" opacity="0.2" />
      <rect x={x - 6} y={base - 170} width="12" height="176" fill={url('steel')} />
      <rect x={x - 34} y={base - 236} width="68" height="68" rx="10" fill="#c8102e" />
      <text x={x} y={base - 186} textAnchor="middle" fontSize="50" fontWeight="900" fill="#fff" fontFamily="sans-serif">
        M
      </text>
      <rect x={x - 60} y={base - 150} width="120" height="26" rx="4" fill="#1d2a44" />
      <text x={x} y={base - 132} textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff" fontFamily="sans-serif">
        KIZILAY
      </text>
    </g>
  );
}

/** Sur: siyah bazalt ve beyaz kalker şeritli (ablak), sivri kemerli sebil; üstünde kurşun külah. */
function Fountain() {
  const x = 610;
  const base = H - 24;
  return (
    <g pointerEvents="none">
      <ellipse cx={x} cy={base + 6} rx="60" ry="9" fill="#000" opacity="0.22" />
      <rect x={x - 46} y={base - 120} width="92" height="124" fill="#3a3734" />
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <rect key={k} x={x - 46} y={base - 114 + k * 20} width="92" height="10" fill="#e3dccd" />
      ))}
      <path d={`M${x - 24} ${base} V${base - 62} Q${x - 24} ${base - 88} ${x} ${base - 100} Q${x + 24} ${base - 88} ${x + 24} ${base - 62} V${base} Z`} fill="#24221f" stroke="#e3dccd" strokeWidth="4" />
      <rect x={x - 18} y={base - 20} width="36" height="16" fill="#7fb3c9" opacity="0.85" />
      <rect x={x - 3} y={base - 50} width="6" height="12" fill="#b89a4a" />
      <rect x={x - 54} y={base - 130} width="108" height="12" fill="#2e2c29" />
      <polygon points={`${x - 40},${base - 130} ${x + 40},${base - 130} ${x},${base - 178}`} fill="#8e9599" />
      <polygon points={`${x},${base - 178} ${x + 40},${base - 130} ${x + 14},${base - 130}`} fill="#000" opacity="0.15" />
      <rect x={x - 1.5} y={base - 194} width="3" height="16" fill="#b89a4a" />
    </g>
  );
}
