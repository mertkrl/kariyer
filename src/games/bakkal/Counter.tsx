import { COUNTER_Y, Cat } from './ShopDecor';
import styles from './ShopScene.module.css';

/*
 * Tezgâh ve üstündekiler. Gövde tam genişlikte (CounterBody), eşyalar sahnenin ortalanmış
 * koordinatlarında (CounterTop): eski tip metal yazar kasa (rakamlı tuşlar, fiş rulosu, satışta
 * öne kayan çekmece), cam şeker kavanozları, gazete, hasır ekmek sepeti, uyuyan kedi ve ibreli
 * pirinç terazi.
 */

/** Yazar kasanın ekranı ve çekmecesi: satış olunca tutar yazar, çekmece açılır. */
export interface Till {
  amount: number | null;
  open: boolean;
}

export function CounterBody({ y, width, height }: { y: number; width: number; height: number }) {
  return (
    <g>
      <rect x="0" y={y - 4} width={width} height="8" fill="#d8ab78" />
      <rect x="0" y={y + 4} width={width} height="18" fill="url(#counterTop)" />
      <rect x="0" y={y + 22} width={width} height={height - y - 22} fill="url(#counterFront)" />
      <rect x="0" y={y + 22} width={width} height="6" fill="rgba(0,0,0,.35)" />
      {/* tahta kapaklar: çerçeve, iç pano, damar ve kulp */}
      {Array.from({ length: 8 }, (_, i) => {
        const x = 12 + i * 200;
        const h = height - y - 60;
        return (
          <g key={i}>
            <rect x={x} y={y + 40} width="176" height={h} rx="5" fill="rgba(0,0,0,.18)" />
            <rect x={x + 6} y={y + 46} width="164" height={h - 12} rx="3" fill="url(#panel)" />
            <path d={`M${x + 14} ${y + 60} q60 8 150 0 M${x + 14} ${y + 90} q70 -6 150 2`} stroke="rgba(40,20,5,.25)" strokeWidth="1.5" fill="none" />
            <rect x={x + 76} y={y + 52} width="24" height="6" rx="3" fill="url(#brass)" />
          </g>
        );
      })}
    </g>
  );
}

function Register({ till }: { till: Till }) {
  return (
    <g transform={`translate(70 ${COUNTER_Y})`}>
      <ellipse cx="110" cy="2" rx="125" ry="9" fill="rgba(0,0,0,.35)" />
      {/* çekmece: kasanın altından öne kayar, içinde banknot ve bozuk para */}
      <g className={`${styles.drawer} ${till.open ? styles.drawerOpen : ''}`}>
        <rect x="8" y="-28" width="204" height="28" rx="3" fill="#3a444d" />
        <rect x="22" y="-24" width="176" height="13" rx="2" fill="#20262c" />
        {['#8db86a', '#c9a75a', '#7aa0c9', '#c97a6a'].map((c, i) => (
          <rect key={i} x={28 + i * 40} y="-23" width="34" height="10" rx="1.5" fill={c} />
        ))}
        <rect x="88" y="-8" width="44" height="5" rx="2.5" fill="url(#metal)" />
      </g>
      {/* gövde */}
      <path d="M0 0 L18 -92 H202 L220 0 Z" fill="url(#registerBody)" />
      <path d="M18 -92 H202 L196 -72 H24 Z" fill="#8797a6" />
      <rect x="0" y="-6" width="220" height="6" fill="rgba(0,0,0,.25)" />
      {/* tuşlar: rakamlı, yuvarlak, gölgeli */}
      {Array.from({ length: 15 }, (_, i) => {
        const cx = 54 + (i % 5) * 28;
        const cy = -58 + Math.floor(i / 5) * 18;
        const label = ['7', '8', '9', 'C', '+', '4', '5', '6', '0', '×', '1', '2', '3', '00', '='][i];
        const special = i % 5 >= 3;
        return (
          <g key={i}>
            <ellipse cx={cx} cy={cy + 2} rx="11" ry="7" fill="rgba(0,0,0,.35)" />
            <ellipse cx={cx} cy={cy} rx="11" ry="7" fill={special ? (label === '=' ? '#c0392b' : '#e6c46a') : '#f1f2f0'} />
            <text x={cx} y={cy + 3} textAnchor="middle" fontSize="8" fontWeight="700" fill="#333" fontFamily="Arial, sans-serif">
              {label}
            </text>
          </g>
        );
      })}
      {/* ekran ve fiş rulosu */}
      <rect x="56" y="-146" width="108" height="56" rx="5" fill="url(#registerBody)" />
      <rect x="66" y="-138" width="88" height="28" rx="3" fill="#0f1a12" />
      <text x="110" y="-118" textAnchor="middle" fontSize="18" fill="#7CFC9A" fontFamily="var(--font-mono)">
        {till.amount === null ? '0,00' : `${till.amount},00`}
      </text>
      <rect x="170" y="-120" width="34" height="26" rx="4" fill="#4a5866" />
      <ellipse cx="187" cy="-120" rx="15" ry="7" fill="#f4f1e8" />
      <path d="M180 -120 Q186 -140 196 -150" stroke="#f4f1e8" strokeWidth="9" fill="none" />
    </g>
  );
}

function Jar({ x, c }: { x: number; c: string }) {
  return (
    <g transform={`translate(${x} ${COUNTER_Y})`}>
      <ellipse cx="0" cy="2" rx="34" ry="6" fill="rgba(0,0,0,.3)" />
      {Array.from({ length: 16 }, (_, i) => (
        <g key={i}>
          <circle cx={-19 + (i % 5) * 9.5} cy={-8 - Math.floor(i / 5) * 11} r="5.5" fill={c} />
          <circle cx={-21 + (i % 5) * 9.5} cy={-10 - Math.floor(i / 5) * 11} r="1.8" fill="rgba(255,255,255,.6)" />
        </g>
      ))}
      <path d="M-28 0 V-58 Q-28 -74 -16 -76 H16 Q28 -74 28 -58 V0 Z" fill="url(#glass)" stroke="rgba(255,255,255,.55)" strokeWidth="2" />
      <rect x="-22" y="-90" width="44" height="14" rx="4" fill="url(#metal)" />
      <rect x="-12" y="-96" width="24" height="7" rx="3" fill="#9aa3a9" />
      <rect x="-22" y="-68" width="5" height="62" rx="2.5" fill="rgba(255,255,255,.45)" />
    </g>
  );
}

/** Hasır ekmek sepeti: somunlar sepetin içinde yatar, ön kenarın arkasında kalır; uçları taşmaz. */
function BreadBasket() {
  const loaves = [
    { x: -52, y: -30, r: -4 },
    { x: 34, y: -32, r: 5 },
    { x: -8, y: -42, r: -2 },
  ];
  return (
    <g transform={`translate(1000 ${COUNTER_Y})`}>
      <ellipse cx="0" cy="2" rx="104" ry="9" fill="rgba(0,0,0,.3)" />
      {/* sepetin iç arka duvarı */}
      <path d="M-96 -34 Q0 -50 96 -34 L90 -20 H-90 Z" fill="#7d5428" />
      {loaves.map((l, i) => (
        <g key={i} transform={`rotate(${l.r} ${l.x} ${l.y})`}>
          <ellipse cx={l.x} cy={l.y} rx="48" ry="17" fill="url(#bread)" />
          {[-24, -6, 12].map((dx) => (
            <path key={dx} d={`M${l.x + dx} ${l.y - 9} q8 6 14 0`} stroke="#8a4f17" strokeWidth="3" fill="none" strokeLinecap="round" />
          ))}
          <ellipse cx={l.x - 8} cy={l.y - 8} rx="22" ry="4" fill="rgba(255,240,210,.35)" />
        </g>
      ))}
      {/* sepetin ön yüzü ekmeklerin önünde */}
      <path d="M-100 -26 L-88 0 H88 L100 -26 Z" fill="#b8874a" />
      <path d="M-100 -26 L-88 0 H88 L100 -26 Z" fill="url(#weave)" />
      <rect x="-104" y="-30" width="208" height="8" rx="4" fill="#9a6a34" />
    </g>
  );
}

/** Tezgâhta duran hesap makinesi: tıklanınca büyüğü açılır. */
function DeskCalculator({ onOpen }: { onOpen?: () => void }) {
  return (
    <g transform={`translate(332 ${COUNTER_Y})`} className={styles.cat} onClick={onOpen} role="button" aria-label="Hesap makinesini aç">
      <ellipse cx="0" cy="1" rx="34" ry="5" fill="rgba(0,0,0,.3)" />
      <path d="M-28 0 L-22 -58 H22 L28 0 Z" fill="#2c3035" />
      <path d="M-22 -58 H22 L21 -54 H-21 Z" fill="#4a5056" />
      <rect x="-17" y="-52" width="34" height="12" rx="2" fill="#a9b78f" />
      <rect x="6" y="-56" width="12" height="3" fill="#3b3410" />
      {Array.from({ length: 16 }, (_, i) => (
        <rect key={i} x={-19 + (i % 4) * 10} y={-35 + Math.floor(i / 4) * 8.5} width="8" height="6" rx="1.5" fill={i % 4 === 3 ? '#e09a2a' : '#6a7077'} />
      ))}
    </g>
  );
}

function Scale() {
  return (
    <g transform={`translate(1380 ${COUNTER_Y})`}>
      <ellipse cx="0" cy="2" rx="100" ry="9" fill="rgba(0,0,0,.3)" />
      <path d="M-86 0 L-76 -28 H76 L86 0 Z" fill="#2f4a3f" />
      <rect x="-86" y="-4" width="172" height="4" fill="rgba(0,0,0,.3)" />
      {/* ibreli kadran */}
      <circle cx="0" cy="-58" r="30" fill="#2f4a3f" />
      <circle cx="0" cy="-58" r="24" fill="#fbf6e6" />
      {Array.from({ length: 11 }, (_, i) => {
        const a = (-120 + i * 24) * (Math.PI / 180);
        return <path key={i} d={`M${Math.sin(a) * 20} ${-58 - Math.cos(a) * 20} L${Math.sin(a) * 16} ${-58 - Math.cos(a) * 16}`} stroke="#333" strokeWidth="1.5" />;
      })}
      <path d="M0 -58 L10 -74" stroke="#c0392b" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="0" cy="-58" r="3" fill="#333" />
      <rect x="-90" y="-102" width="180" height="8" rx="4" fill="url(#brass)" />
      <rect x="-6" y="-96" width="12" height="10" fill="#2f4a3f" />
      <ellipse cx="-62" cy="-108" rx="40" ry="9" fill="url(#brass)" />
      <ellipse cx="62" cy="-108" rx="40" ry="9" fill="url(#brass)" />
      {/* ağırlık */}
      <path d="M50 -110 h24 l-3 -20 h-18 z" fill="#5f686e" />
      <rect x="57" y="-136" width="10" height="7" rx="3" fill="#5f686e" />
    </g>
  );
}

function Newspaper() {
  return (
    <g transform={`translate(760 ${COUNTER_Y})`}>
      <ellipse cx="0" cy="1" rx="76" ry="5" fill="rgba(0,0,0,.25)" />
      <rect x="-72" y="-12" width="144" height="12" fill="#e2dccb" />
      <g transform="rotate(-3)">
        <rect x="-68" y="-24" width="140" height="12" fill="#f3eee0" />
        <rect x="-60" y="-22" width="60" height="4" fill="#333" />
        <rect x="6" y="-22" width="58" height="3" fill="#888" />
        <rect x="-60" y="-16" width="120" height="2" fill="#aaa" />
      </g>
    </g>
  );
}

export function CounterTop({ till, catAwake, onPet, onCalc }: { till: Till; catAwake: boolean; onPet?: () => void; onCalc?: () => void }) {
  return (
    <g>
      <Register till={till} />
      <DeskCalculator onOpen={onCalc} />
      <Jar x={420} c="#e74c3c" />
      <Jar x={490} c="#f39c12" />
      <Jar x={560} c="#27ae60" />
      <Newspaper />
      <BreadBasket />
      <Cat awake={catAwake} onPet={onPet} />
      <Scale />
    </g>
  );
}
