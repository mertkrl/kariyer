import { useEffect, useState } from 'react';
import { AirCon, Dish, LitWindows, Person, Roof, Windows, type GridProps } from './kit';
import { hash, type PlaceId } from './places';
import s from './Scene.module.css';

/*
 * Tıklanan yerlerin çizimleri. Her biri `body` (günün ışığıyla süzülür) ve `emit` (kendi ışığı
 * olan: tabela, ekran, lamba) katmanlarından oluşur; Scene her birini bir bağlantıya sarar.
 */

// ── Şantiye: İnşaat İzleme ───────────────────────────────────────

function Santiye() {
  const cols = [22, 88, 154, 220];
  const slabs = [404, 484, 564, 644];
  return (
    <g>
      <g className={s.body}>
        {/* vinç: kule, kabin, bom ve asılı yük */}
        <g>
          <rect x="266" y="120" width="16" height="602" fill="none" />
          <path d="M266 722 V120 M282 722 V120" stroke="#d9a520" strokeWidth="3" />
          {Array.from({ length: 30 }, (_, i) => (
            <path key={i} d={`M266 ${722 - i * 20} L282 ${702 - i * 20}`} stroke="#d9a520" strokeWidth="1.6" />
          ))}
          <path d="M273 64 L262 112 M273 64 L286 112" stroke="#d9a520" strokeWidth="3" />
          <path d="M273 64 L470 112 M273 64 L70 112" stroke="#6b6b6b" strokeWidth="1" />
          <rect x="60" y="110" width="414" height="10" fill="#e8b923" />
          <path d={Array.from({ length: 20 }, (_, i) => `M${60 + i * 20.7} 120 L${70 + i * 20.7} 110`).join(' ')} stroke="#b88f14" strokeWidth="1.4" />
          <rect x="70" y="120" width="40" height="30" fill="#8d8a84" />
          <rect x="70" y="120" width="40" height="5" fill="#a8a59e" />
          <rect x="250" y="120" width="34" height="28" rx="2" fill="#e8b923" />
          <rect x="256" y="125" width="18" height="12" fill="#9fc6dd" className={s.carGlass} />
          <rect x="374" y="118" width="14" height="8" fill="#555" />
        </g>
        <g className={s.sway}>
          <path d="M381 126 V318" stroke="#3a3a3a" strokeWidth="1.5" />
          <path d="M376 318 h10 l-2 8 q-3 6 -6 0Z" fill="#c33a2c" />
          <path d="M381 326 L358 340 M381 326 L404 340" stroke="#3a3a3a" strokeWidth="1" />
          <rect x="354" y="340" width="54" height="22" fill="#c4704e" />
          <path d="M354 347 H408 M354 354 H408 M372 340 V347 M390 347 V354 M366 354 V362 M396 354 V362" stroke="#9a5238" strokeWidth="1" />
          <rect x="352" y="362" width="58" height="4" fill="#8a6a42" />
        </g>
        {/* betonarme iskelet */}
        <rect x="16" y="416" width="230" height="306" fill="#9b968c" opacity="0.35" />
        {cols.map((x) => (
          <g key={x}>
            <rect x={x} y="404" width="14" height="318" fill="#bbb6ab" />
            <rect x={x + 10} y="404" width="4" height="318" fill="#a29d92" />
            <path d={`M${x + 3} 404 v-20 M${x + 7} 404 v-24 M${x + 11} 404 v-18`} stroke="#7a5640" strokeWidth="1.4" />
          </g>
        ))}
        {slabs.map((y) => (
          <g key={y}>
            <rect x="12" y={y} width="240" height="12" fill="#c7c2b7" />
            <rect x="12" y={y + 9} width="240" height="3" fill="#9d988d" />
          </g>
        ))}
        {/* tuğla duvar: alt iki kat örülmüş, üst kat ağla örtülü */}
        {[
          [36, 656, 52, 66],
          [102, 656, 52, 66],
          [168, 656, 52, 66],
          [36, 576, 52, 68],
          [102, 576, 52, 68],
        ].map(([x, y, w, h]) => (
          <g key={`${x}-${y}`}>
            <rect x={x} y={y} width={w} height={h} fill="#c4704e" />
            {Array.from({ length: Math.floor(h / 8) }, (_, r) => (
              <path key={r} d={`M${x} ${y + r * 8 + 8} H${x + w}`} stroke="#a85a3d" strokeWidth="1" />
            ))}
            <rect x={x + 14} y={y + 16} width={w - 28} height={h - 30} fill="#3b3631" />
          </g>
        ))}
        <rect x="14" y="416" width="236" height="68" fill="#3f8f5a" opacity="0.55" />
        <rect x="14" y="416" width="236" height="68" fill="url(#mh-net)" />
        <path d="M14 416 H250" stroke="#2f6e44" strokeWidth="2" />
        {/* çit ve pano */}
        <rect x="0" y="652" width="290" height="70" fill="#2f5f8a" />
        <rect x="0" y="662" width="290" height="4" fill="#f2efe6" />
        <rect x="0" y="708" width="290" height="4" fill="#f2efe6" />
        <text x="16" y="690" fontSize="15" fontWeight="800" fill="#fff" fontFamily="var(--font-display)" letterSpacing="1">KASM REZİDANS</text>
        <text x="16" y="702" fontSize="8.5" fill="#d6e4f2" fontFamily="var(--font-body)" letterSpacing="1.5">YAKINDA · 2019’DAN BERİ</text>
        <rect x="190" y="670" width="82" height="34" rx="2" fill="#f2c230" />
        <text x="231" y="684" fontSize="8.5" textAnchor="middle" fontWeight="800" fill="#222" fontFamily="var(--font-body)">BARETSİZ</text>
        <text x="231" y="696" fontSize="8.5" textAnchor="middle" fontWeight="800" fill="#222" fontFamily="var(--font-body)">GİRİLMEZ</text>
        {/* ellerini arkasına koymuş izleyen amca */}
        <Person x={128} y={752} coat="#7d7a72" cap="#4a4740" hands="back" />
      </g>
      <g className={s.emit}>
        <circle className={s.blink} cx="273" cy="62" r="3.5" fill="#ff4a3a" />
      </g>
    </g>
  );
}

// ── Bakkal: Köy Bakkalı ──────────────────────────────────────────

const SHELF = Array.from({ length: 36 }, (_, i) => ({ x: 310 + (i % 12) * 9, y: 664 + Math.floor(i / 12) * 17, c: ['#e05b3c', '#f2c230', '#4c7fb0', '#6fa37a', '#e9e2cf', '#b3766b'][Math.floor(hash(i + 5) * 6)], h: 8 + hash(i) * 6 }));

function Bakkal() {
  const up: GridProps = { x: 322, y: 480, cols: 2, rows: 1, w: 48, h: 66, gx: 58, gy: 0, seed: 21, ratio: 0.9 };
  const stripes = 12;
  return (
    <g>
      <g className={s.body}>
        <rect x="452" y="392" width="22" height="44" fill="#9b5a44" />
        <rect x="448" y="388" width="30" height="7" fill="#7f4634" />
        <Roof x1={280} x2={514} y={452} h={44} inset={24} />
        <rect x="292" y="452" width="210" height="270" fill="#ecd6a6" />
        <path d="M300 520 l10 14 l-4 10 M490 470 l-8 12" stroke="rgba(120,90,50,.35)" strokeWidth="1.2" fill="none" />
        <rect x="292" y="574" width="210" height="10" fill="#d6bd8a" />
        <Windows {...up} frame="#f6efe0" />
        {[322, 428].map((x) => (
          <g key={x}>
            <rect x={x - 16} y="476" width="12" height="74" fill="#3c6b4a" />
            <rect x={x + 52} y="476" width="12" height="74" fill="#3c6b4a" />
            {[0, 1, 2, 3, 4, 5].map((k) => (
              <path key={k} d={`M${x - 15} ${482 + k * 12} h10 M${x + 53} ${482 + k * 12} h10`} stroke="#2d5238" strokeWidth="1.2" />
            ))}
            <rect x={x - 4} y="552" width="56" height="12" fill="#8a5a34" />
            {[0, 1, 2, 3].map((k) => (
              <g key={k}>
                <circle cx={x + 4 + k * 14} cy="549" r="7" fill="#4f7d3f" />
                <circle cx={x + 4 + k * 14} cy="545" r="3.6" fill={k % 2 ? '#e2445a' : '#f07a4a'} />
              </g>
            ))}
          </g>
        ))}
        {/* tabela ve tente */}
        <rect x="298" y="588" width="198" height="36" fill="#2e6a4e" />
        <rect x="301" y="591" width="192" height="30" fill="none" stroke="#f3e6c4" strokeWidth="1.5" />
        <text x="397" y="616" fontSize="24" textAnchor="middle" fontWeight="800" fill="#f6ecd0" fontFamily="var(--font-display)" letterSpacing="5">BAKKAL</text>
        <path d="M296 626 H498 L508 652 H286Z" fill="#f3ead6" />
        {Array.from({ length: stripes }, (_, i) =>
          i % 2 ? null : <path key={i} d={`M${296 + (i * 202) / stripes} 626 H${296 + ((i + 1) * 202) / stripes} L${286 + ((i + 1) * 222) / stripes} 652 H${286 + (i * 222) / stripes}Z`} fill="#c8402f" />,
        )}
        {Array.from({ length: stripes }, (_, i) => (
          <path key={i} d={`M${286 + (i * 222) / stripes} 652 a${222 / stripes / 2} 7 0 0 0 ${222 / stripes} 0`} fill={i % 2 ? '#f3ead6' : '#c8402f'} />
        ))}
        {/* vitrin ve kapı */}
        <rect x="304" y="660" width="116" height="62" fill="#3a3328" />
        {[672, 689, 706].map((y) => (
          <rect key={y} x="306" y={y} width="112" height="2" fill="#8a6a42" />
        ))}
        {SHELF.map((p, i) => (
          <rect key={i} x={p.x} y={p.y + (14 - p.h) - 6} width="6" height={p.h} fill={p.c} />
        ))}
        <path d="M306 662 L330 662 L306 700Z" fill="rgba(255,255,255,.12)" />
        <rect x="302" y="658" width="120" height="4" fill="#6b4a2d" />
        <rect x="430" y="658" width="62" height="64" fill="#7a4e2d" />
        <rect x="438" y="666" width="46" height="30" fill="#2b2620" />
        <circle cx="478" cy="704" r="2.5" fill="#e8c46a" />
        <rect x="446" y="672" width="30" height="13" rx="2" fill="#c8402f" />
        <text x="461" y="681.5" fontSize="7.5" textAnchor="middle" fill="#fff" fontWeight="800" fontFamily="var(--font-body)">AÇIK</text>
        {/* kasalar ve kedi */}
        {[
          [298, '#f08a24'],
          [348, '#d63a2c'],
          [398, '#86b04a'],
        ].map(([x, c]) => (
          <g key={x as number}>
            <rect x={x as number} y="722" width="46" height="26" fill="#b68752" />
            <path d={`M${x} 731 h46 M${x} 740 h46`} stroke="#8e6538" strokeWidth="1.2" />
            {[0, 1, 2, 3].map((k) => (
              <circle key={k} cx={(x as number) + 7 + k * 11} cy="720" r="6" fill={c as string} />
            ))}
            <circle cx={(x as number) + 12} cy="713" r="5.5" fill={c as string} />
            <circle cx={(x as number) + 30} cy="713" r="5.5" fill={c as string} />
          </g>
        ))}
        <g transform="translate(470 748)">
          <path className={s.tail} d="M12 -8 C 26 -10, 28 -26, 20 -30" stroke="#d9822b" strokeWidth="4" fill="none" strokeLinecap="round" />
          <ellipse cx="0" cy="-9" rx="15" ry="9" fill="#e08f35" />
          <circle cx="-12" cy="-20" r="8" fill="#e08f35" />
          <path d="M-18 -25 l2 -9 l5 6Z M-9 -26 l3 -8 l3 8Z" fill="#e08f35" />
          <path d="M-16 -20 q2 1 4 0 M-10 -20 q2 1 4 0" stroke="#5a3a1a" strokeWidth="1.1" fill="none" />
          <path d="M-6 -12 h10 M-2 -6 h10" stroke="#c06f22" strokeWidth="1.6" />
        </g>
      </g>
      <g className={s.emit}>
        <LitWindows {...up} />
        <rect className={s.lit} x="304" y="660" width="116" height="62" fill="#ffcf7a" fillOpacity="0.35" />
        <rect className={s.lit} x="438" y="666" width="46" height="30" fill="#ffcf7a" fillOpacity="0.5" />
        <circle className={s.lamp} cx="397" cy="656" r="22" fill="url(#mh-glow)" />
      </g>
    </g>
  );
}

// ── Meydan: Meydan Islahı ────────────────────────────────────────

function Laundry({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  const colors = ['#e05b3c', '#f3f1ea', '#4c7fb0', '#f2c230', '#7c6a8c'];
  return (
    <g>
      <path d={`M${x1} ${y} Q${(x1 + x2) / 2} ${y + 8} ${x2} ${y}`} stroke="#555" strokeWidth="1" fill="none" />
      {colors.map((c, i) => {
        const x = x1 + 6 + i * ((x2 - x1 - 12) / colors.length);
        return i % 2 ? <rect key={i} x={x} y={y + 2} width="9" height="16" fill={c} /> : <path key={i} d={`M${x} ${y + 3} h12 l3 5 l-3 1 v10 h-12 v-10 l-3 -1Z`} fill={c} />;
      })}
    </g>
  );
}

function Meydan() {
  const grid: GridProps = { x: 532, y: 316, cols: 3, rows: 4, w: 44, h: 50, gx: 32, gy: 30, seed: 41, ratio: 0.55 };
  return (
    <g>
      <g className={s.body}>
        {/* kaçak kat, güneş paneli, çanaklar */}
        <rect x="540" y="248" width="130" height="50" fill="#b4664a" />
        {Array.from({ length: 6 }, (_, r) => (
          <path key={r} d={`M540 ${256 + r * 8} H670`} stroke="#94503a" strokeWidth="1" />
        ))}
        <rect x="560" y="262" width="30" height="24" fill="#3b3631" />
        <rect x="612" y="262" width="40" height="36" fill="#6c757c" />
        <path d="M534 250 L676 242 L676 236 L534 244Z" fill="#9ea4a8" />
        <path d={Array.from({ length: 12 }, (_, i) => `M${538 + i * 12} 244 L${538 + i * 12} 250`).join(' ')} stroke="#7c8287" strokeWidth="1" />
        <rect x="688" y="258" width="50" height="12" rx="6" fill="#2f3338" />
        <path d="M682 296 L692 270 L744 270 L736 296Z" fill="#2c4a73" />
        <path d="M694 276 H740 M690 284 H738" stroke="#5f84b0" strokeWidth="1" />
        <rect x="508" y="292" width="244" height="10" fill="#c3b08b" />
        <Dish x={524} y={292} />
        <Dish x={600} y={248} flip />
        <rect x="512" y="300" width="236" height="422" fill="#d8c6a0" />
        <rect x="512" y="460" width="236" height="80" fill="#e3a593" />
        <path d="M520 330 q30 40 10 90 M720 480 q-14 30 6 60" stroke="rgba(90,70,40,.18)" strokeWidth="9" fill="none" />
        {[380, 460, 540, 620].map((y) => (
          <rect key={y} x="512" y={y - 3} width="236" height="6" fill="rgba(0,0,0,.1)" />
        ))}
        <Windows {...grid} />
        {/* kapatılmış balkon */}
        <rect x="522" y="546" width="86" height="70" fill="#c9d2d6" />
        {[0, 1, 2, 3].map((k) => (
          <rect key={k} x={526 + k * 20.5} y="550" width="17" height="48" fill="#8fb4c8" className={s.glass} />
        ))}
        <rect x="522" y="600" width="86" height="16" fill="#b0babf" />
        <Laundry x1={680} x2={746} y={442} />
        <AirCon x={578} y={336} />
        <AirCon x={654} y={420} />
        <AirCon x={700} y={500} />
        <AirCon x={570} y={418} stain={false} />
        <AirCon x={652} y={572} />
        {/* sarkan kablolar */}
        <path d="M512 372 C 560 392, 640 380, 748 398 M512 452 C 600 470, 660 446, 748 474" stroke="#222" strokeWidth="1.3" fill="none" />
        {/* zemin: kuaför ve dev emlak tabelası */}
        <rect x="512" y="620" width="236" height="102" fill="#cbb791" />
        <rect x="520" y="662" width="100" height="60" fill="#3a3a40" />
        <rect x="560" y="662" width="2" height="60" fill="#888" />
        <rect x="632" y="660" width="54" height="62" fill="#4a4740" />
        <rect x="694" y="662" width="48" height="60" fill="#5d6a72" className={s.glass} />
        <rect x="518" y="630" width="106" height="26" rx="3" fill="#6c3f8f" />
        <text x="571" y="648" fontSize="12" textAnchor="middle" fill="#fff" fontWeight="800" fontFamily="var(--font-body)" letterSpacing="1">KUAFÖR ŞÖHRET</text>
        <rect x="628" y="592" width="120" height="64" fill="#f2c230" />
        <rect x="628" y="592" width="120" height="64" fill="none" stroke="#c8402f" strokeWidth="3" />
        <text x="688" y="626" fontSize="26" textAnchor="middle" fill="#c8402f" fontWeight="900" fontFamily="var(--font-body)">EMLAK</text>
        <text x="688" y="644" fontSize="8.5" textAnchor="middle" fill="#222" fontWeight="700" fontFamily="var(--font-body)" letterSpacing="1">SATILIK · KİRALIK · TAKAS</text>
        <rect x="684" y="318" width="44" height="14" fill="#c8402f" />
        <text x="706" y="328.5" fontSize="8" textAnchor="middle" fill="#fff" fontWeight="800" fontFamily="var(--font-body)">SATILIK</text>
      </g>
      <g className={s.emit}>
        <LitWindows {...grid} />
        <rect className={s.neon} x="518" y="630" width="106" height="26" rx="3" fill="none" stroke="#e59cff" strokeWidth="2.5" />
      </g>
    </g>
  );
}

// ── Plaza: Sen İK'sin ve Genel Yetenek Testi ─────────────────────

function Plaza() {
  const lit: GridProps = { x: 802, y: 64, cols: 10, rows: 26, w: 16, h: 17, gx: 3, gy: 5, seed: 71, ratio: 0.33 };
  return (
    <g>
      <g className={s.body}>
        <rect x="1000" y="190" width="94" height="532" fill="url(#mh-tower2)" />
        <rect x="1000" y="190" width="94" height="532" fill="url(#mh-mullion)" opacity="0.6" />
        <rect x="996" y="182" width="102" height="10" fill="#33485c" />
        <path d="M988 66 L1012 82 V722 H988Z" fill="#22405f" />
        <rect x="800" y="60" width="188" height="662" fill="url(#mh-tower)" />
        <rect x="800" y="60" width="188" height="662" fill="url(#mh-mullion)" />
        <path className={s.shine} d="M800 380 L940 60 L968 60 L800 444Z" fill="#fff" opacity="0.14" />
        <path d="M800 560 L988 250 L988 280 L800 600Z" fill="#fff" opacity="0.07" />
        <rect x="812" y="42" width="164" height="20" fill="#284a70" />
        <rect x="842" y="26" width="104" height="18" fill="#203d5d" />
        <path d="M894 26 V-20" stroke="#203d5d" strokeWidth="3" />
        <text x="894" y="38.5" fontSize="11" textAnchor="middle" fill="#e8f2fb" fontWeight="900" letterSpacing="4" fontFamily="'Arial Black', var(--font-body)">KASM</text>
        {/* lobi */}
        <rect x="790" y="634" width="222" height="88" fill="#26303b" />
        <rect x="800" y="648" width="200" height="74" fill="#bcd3e0" className={s.glass} />
        {[840, 960].map((x) => (
          <rect key={x} x={x} y="648" width="3" height="74" fill="#26303b" />
        ))}
        <rect x="872" y="660" width="46" height="62" rx="3" fill="#8fb2c6" stroke="#26303b" strokeWidth="2" />
        <path d="M884 662 V720 M895 662 V720 M906 662 V720" stroke="#26303b" strokeWidth="1.5" />
        <rect x="806" y="624" width="190" height="11" fill="#e8e6e0" />
        <rect x="806" y="633" width="190" height="2" fill="#9b9a96" />
        <text x="901" y="620" fontSize="13" textAnchor="middle" fill="#e9eef3" fontWeight="800" letterSpacing="4" fontFamily="var(--font-body)">KASM PLAZA</text>
        {[808, 968].map((x) => (
          <g key={x}>
            <rect x={x} y="700" width="22" height="22" fill="#4a4f57" />
            <circle cx={x + 11} cy="690" r="14" fill="#4f7d3f" />
            <circle cx={x + 8} cy="682" r="8" fill="#6c9c5b" />
          </g>
        ))}
        <Person x={930} y={750} coat="#2b2f3a" />
      </g>
      <g className={s.emit}>
        <LitWindows {...lit} />
        <rect className={s.lit} x="800" y="648" width="200" height="74" fill="#ffe2a8" fillOpacity="0.55" />
        <circle className={s.blink} cx="894" cy="-18" r="3.5" fill="#ff4a3a" />
      </g>
    </g>
  );
}

// ── Döviz bürosu: Cüzdan Zamanı ──────────────────────────────────

/** 2002'nin kurları, eski lirayla: son haneler birkaç saniyede bir oynar. */
const RATES = [
  { k: 'USD', v: 1_642_500 },
  { k: 'EUR', v: 1_551_300 },
  { k: 'ALT', v: 15_250_000 },
];

function Rates() {
  const [rows, setRows] = useState(() => RATES.map((r) => ({ ...r, up: true })));
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.hidden) return;
      setRows((rs) => {
        const i = Math.floor(Math.random() * rs.length);
        return rs.map((r, k) => {
          if (k !== i) return r;
          const step = (1 + Math.floor(Math.random() * 9)) * (r.k === 'ALT' ? 5000 : 500);
          const up = Math.random() > 0.4;
          return { ...r, v: r.v + (up ? step : -step), up };
        });
      });
    }, 2400);
    return () => window.clearInterval(t);
  }, []);
  return (
    <g fontFamily="var(--font-mono)" fontSize="8.6" fontWeight="700">
      {rows.map((r, i) => (
        <g key={r.k}>
          <text x="1032" y={664 + i * 18} fill="#ffb23c">
            {r.k}
          </text>
          <text x="1106" y={664 + i * 18} fill="#ff4d3a" textAnchor="end">
            {r.v.toLocaleString('tr-TR')}
          </text>
          <text x="1116" y={664 + i * 18} fill={r.up ? '#4be37a' : '#ff4d3a'} textAnchor="middle">
            {r.up ? '▲' : '▼'}
          </text>
        </g>
      ))}
    </g>
  );
}

function Doviz() {
  const grid: GridProps = { x: 1040, y: 488, cols: 3, rows: 2, w: 30, h: 46, gx: 30, gy: 38, seed: 91, ratio: 0.5 };
  return (
    <g>
      <g className={s.body}>
        <rect x="1012" y="470" width="186" height="252" fill="#c87650" />
        <rect x="1006" y="462" width="198" height="12" fill="#e6d6b8" />
        <rect x="1006" y="474" width="198" height="4" fill="rgba(0,0,0,.18)" />
        <rect x="1012" y="554" width="186" height="5" fill="#e6d6b8" />
        <Windows {...grid} frame="#efe6d4" />
        <path d="M1034 616 H1176 M1034 606 H1176 M1034 606 V616 M1176 606 V616" stroke="#2c2c2c" strokeWidth="1.6" fill="none" />
        {Array.from({ length: 15 }, (_, i) => (
          <path key={i} d={`M${1036 + i * 10} 606 V616`} stroke="#2c2c2c" strokeWidth="1" />
        ))}
        <rect x="1012" y="620" width="186" height="102" fill="#a85f3f" />
        <rect x="1016" y="624" width="178" height="18" fill="#1d2944" />
        <rect x="1018" y="626" width="174" height="14" fill="none" stroke="#c9a227" strokeWidth="1" />
        <text x="1105" y="637.5" fontSize="11" textAnchor="middle" fill="#e7c45a" fontWeight="800" letterSpacing="3" fontFamily="var(--font-display)">DÖVİZ · ALTIN</text>
        <rect x="1024" y="648" width="100" height="62" rx="3" fill="#121214" stroke="#555" strokeWidth="2" />
        <rect x="1132" y="648" width="58" height="74" fill="#3a3f45" />
        <rect x="1137" y="653" width="48" height="69" fill="#9fc3d6" className={s.glass} />
        <rect x="1142" y="672" width="38" height="14" fill="#fff" opacity="0.92" />
        <text x="1161" y="682" fontSize="6.4" textAnchor="middle" fill="#1d2944" fontWeight="800" fontFamily="var(--font-body)">ALIŞ·SATIŞ</text>
        <rect x="1024" y="712" width="100" height="10" fill="#7d4a33" />
      </g>
      <g className={s.emit}>
        <LitWindows {...grid} />
        <Rates />
        <text className={s.lit} x="1105" y="637.5" fontSize="11" textAnchor="middle" fill="#ffd968" fontWeight="800" letterSpacing="3" fontFamily="var(--font-display)">DÖVİZ · ALTIN</text>
      </g>
    </g>
  );
}

// ── Durak: Ekran İhalesi ─────────────────────────────────────────

function Durak() {
  return (
    <g>
      <g className={s.body}>
        <rect x="1352" y="598" width="208" height="12" rx="2" fill="#2a2f36" />
        <rect x="1352" y="608" width="208" height="3" fill="#c8402f" />
        <rect x="1358" y="611" width="6" height="140" fill="#3a3f46" />
        <rect x="1548" y="611" width="6" height="140" fill="#3a3f46" />
        <rect x="1364" y="614" width="128" height="122" fill="rgba(205,230,245,.32)" stroke="rgba(255,255,255,.55)" strokeWidth="1.5" />
        <rect x="1494" y="614" width="52" height="122" fill="#26303b" />
        <rect x="1498" y="618" width="44" height="114" fill="#f2c230" />
        <circle cx="1520" cy="652" r="15" fill="#c8402f" />
        <text x="1520" y="657" fontSize="15" textAnchor="middle" fill="#fff" fontWeight="900" fontFamily="var(--font-body)">?</text>
        <text x="1520" y="690" fontSize="7.5" textAnchor="middle" fill="#222" fontWeight="900" fontFamily="var(--font-body)">MESAİ</text>
        <text x="1520" y="700" fontSize="7.5" textAnchor="middle" fill="#222" fontWeight="900" fontFamily="var(--font-body)">DIŞI</text>
        <text x="1520" y="716" fontSize="5" textAnchor="middle" fill="#333" fontFamily="var(--font-body)">kısa, tuhaf oyunlar</text>
        <rect x="1384" y="706" width="94" height="7" rx="2" fill="#8a8f96" />
        <path d="M1392 713 v24 M1470 713 v24" stroke="#555" strokeWidth="3" />
        <rect x="1370" y="614" width="116" height="38" rx="3" fill="#0e0f12" stroke="#444" strokeWidth="2" />
        <Person x={1430} y={748} coat="#b3766b" />
        <rect x="1426" y="694" width="5" height="8" fill="#1d1d1d" />
        <rect x="1574" y="520" width="4" height="230" fill="#596069" />
        <rect x="1556" y="512" width="40" height="40" rx="4" fill="#fff" stroke="#2f6fb5" strokeWidth="3" />
        <rect x="1564" y="522" width="24" height="15" rx="3" fill="#2f6fb5" />
        <circle cx="1569" cy="539" r="2.5" fill="#2f6fb5" />
        <circle cx="1583" cy="539" r="2.5" fill="#2f6fb5" />
        <text x="1576" y="550" fontSize="5.5" textAnchor="middle" fill="#2f6fb5" fontWeight="900" fontFamily="var(--font-body)">DURAK</text>
      </g>
      <g className={s.emit}>
        <rect className={s.lit} x="1498" y="618" width="44" height="114" fill="#fff6c8" fillOpacity="0.35" />
        <g fontFamily="var(--font-mono)" fontWeight="700">
          <text x="1376" y="628" fontSize="8" fill="#ffb23c">
            34
          </text>
          <text x="1392" y="628" fontSize="8" fill="#ffb23c">
            ZİNCİRLİKUYU
          </text>
          <text className={s.blinkSlow} x="1480" y="628" fontSize="8" fill="#ffb23c" textAnchor="end">
            2 dk
          </text>
          <svg x="1374" y="634" width="108" height="14" viewBox="0 0 108 14">
            <text className={s.marquee} x="108" y="10" fontSize="7.5" fill="#ff5a3c">
              HATTIMIZDA YAŞANAN TEKNİK ARIZA NEDENİYLE BİLGİ VERİLEMEMEKTEDİR · ERR_0x0042 · LÜTFEN BEKLEYİNİZ
            </text>
          </svg>
        </g>
      </g>
    </g>
  );
}

// ── Çukur: Yama Ekibi ────────────────────────────────────────────

function Cukur() {
  return (
    <g>
      <path d="M478 862 H660 V910 H620 V982 H500 V910 H478Z" fill="transparent" />
      <g className={s.body}>
        <ellipse cx="560" cy="886" rx="74" ry="17" fill="none" stroke="#f4f1e6" strokeWidth="3" strokeDasharray="12 7" opacity="0.85" />
        <path d="M502 884 C 506 872, 530 868, 548 871 C 566 866, 600 868, 614 878 C 622 888, 604 898, 576 899 C 548 902, 512 898, 504 892Z" fill="#26272b" />
        <path d="M510 886 C 516 878, 540 876, 556 878 C 576 874, 600 878, 606 884 C 600 892, 574 894, 552 894 C 530 895, 514 892, 510 886Z" className={s.puddle} />
        <path d="M502 884 l-14 -6 M614 878 l14 -4 M590 899 l6 8" stroke="#2a2b2f" strokeWidth="1.6" />
        <g className={s.boat}>
          <path d="M546 884 L570 884 L565 890 L551 890Z" fill="#f4f1e6" />
          <path d="M556 884 L558 872 L566 884Z" fill="#ffffff" />
        </g>
        <text x="640" y="868" fontSize="13" fill="#f4f1e6" fontWeight="800" fontFamily="'Caveat', cursive" transform="rotate(-6 640 868)" opacity="0.9">
          3 AY!
        </text>
        {/* kaldırımdaki bariyer ve karton */}
        <ellipse cx="560" cy="976" rx="54" ry="5" fill="rgba(0,0,0,.18)" />
        <path d="M520 976 L530 936 L540 976 M580 976 L590 936 L600 976" stroke="#3a3a3a" strokeWidth="4" fill="none" />
        <rect x="510" y="928" width="100" height="14" fill="#fff" />
        {[0, 1, 2, 3, 4].map((k) => (
          <path key={k} d={`M${514 + k * 20} 942 L${524 + k * 20} 928 L${532 + k * 20} 928 L${522 + k * 20} 942Z`} fill="#d63a2c" />
        ))}
        <rect x="530" y="944" width="62" height="26" fill="#d4b588" transform="rotate(3 561 957)" />
        <text x="561" y="961" fontSize="12" textAnchor="middle" fill="#2a1c10" fontWeight="700" fontFamily="'Caveat', cursive" transform="rotate(3 561 957)">
          dikkat çukur
        </text>
      </g>
    </g>
  );
}

// ── Işık: Kavşak Amiri ───────────────────────────────────────────

function Isik() {
  const lamps = [
    { y: 566, off: '#3d2523', cls: s.red, on: '#ff3b30' },
    { y: 594, off: '#3d3622', cls: s.amber, on: '#ffb22e' },
    { y: 622, off: '#1f3a2a', cls: s.green, on: '#35e27a' },
  ];
  return (
    <g>
      <rect x="1176" y="530" width="58" height="452" fill="transparent" />
      <g className={s.body}>
        <ellipse cx="1205" cy="978" rx="16" ry="4" fill="rgba(0,0,0,.22)" />
        <rect x="1201" y="560" width="8" height="418" fill="#2d3036" />
        <rect x="1196" y="950" width="18" height="28" rx="3" fill="#25282d" />
        <rect x="1197" y="840" width="16" height="22" rx="2" fill="#f2c230" />
        <circle cx="1205" cy="851" r="4" fill="#2d3036" />
        <rect x="1185" y="542" width="40" height="104" rx="6" fill="#1b1d21" stroke="#e9e6dc" strokeWidth="2" />
        {lamps.map((l) => (
          <g key={l.y}>
            <circle cx="1205" cy={l.y} r="10" fill={l.off} />
            <path d={`M1192 ${l.y - 6} Q1205 ${l.y - 18} 1218 ${l.y - 6}`} fill="#111" />
          </g>
        ))}
      </g>
      <g className={s.emit}>
        {lamps.map((l) => (
          <g key={l.y} className={l.cls}>
            <circle cx="1205" cy={l.y} r="24" fill={l.on} opacity="0.25" />
            <circle cx="1205" cy={l.y} r="10" fill={l.on} />
            <circle cx="1202" cy={l.y - 3} r="3" fill="#fff" opacity="0.6" />
          </g>
        ))}
      </g>
    </g>
  );
}

const ART: Record<PlaceId, () => React.JSX.Element> = {
  santiye: Santiye,
  bakkal: Bakkal,
  meydan: Meydan,
  plaza: Plaza,
  doviz: Doviz,
  durak: Durak,
  cukur: Cukur,
  isik: Isik,
};

export function PlaceArt({ id }: { id: PlaceId }) {
  const Art = ART[id];
  return <Art />;
}
