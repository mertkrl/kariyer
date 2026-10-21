import { rng } from './data';
import { COUNTER_Y } from './ShopDecor';

/*
 * Raflar ve içecek dolabı. Ürünler gerçek bakkal mallarına benzer: ayçiçek yağı şişesi, salça
 * konservesi, çay kutusu, makarna paketi, reçel ve bal kavanozu, deterjan, süt kutusu, bisküvi.
 * Yuvarlak ürünlere silindir gölgesi (#cyl), kutulara yan yüz, hepsine tabanda gölge düşer.
 * Etiketlerde küçük yazılar vardır. Renkler tohumlu rastgeleyle seçilir; her açılışta aynıdır.
 */

const LABELS = {
  oil: [
    ['#f2c230', '#2f7d32'],
    ['#ffd84d', '#c0392b'],
  ],
  can: [
    ['#c0392b', '#f1c40f', 'SALÇA'],
    ['#2e7d32', '#f5f0e1', 'BEZELYE'],
    ['#e67e22', '#fff', 'MISIR'],
  ],
  tea: [
    ['#b71c1c', '#f4c542', 'ÇAY'],
    ['#1b5e20', '#f4c542', 'ÇAY'],
    ['#0d47a1', '#fff', 'KAHVE'],
  ],
  pasta: [
    ['#1565c0', '#fff', 'MAKARNA'],
    ['#c62828', '#fff', 'ERİŞTE'],
  ],
  jar: [
    ['#9b1b30', 'REÇEL'],
    ['#d98e04', 'BAL'],
    ['#556b2f', 'ZEYTİN'],
  ],
  soap: [
    ['#1e88e5', '#fff'],
    ['#43a047', '#fff'],
    ['#d81b60', '#fff'],
  ],
  biscuit: [
    ['#6d4c2f', '#f4c542', 'BİSKÜVİ'],
    ['#b3261e', '#fff', 'GOFRET'],
  ],
} as const;

const Shadow = ({ w }: { w: number }) => <ellipse cx="0" cy="0" rx={w} ry="3" fill="rgba(0,0,0,.35)" />;
const Tiny = ({ y, text, fill = '#fff', size = 6.5 }: { y: number; text: string; fill?: string; size?: number }) => (
  <text x="0" y={y} textAnchor="middle" fontSize={size} fontWeight="800" fill={fill} fontFamily="Arial, sans-serif" letterSpacing=".2">
    {text}
  </text>
);

/** Rafa dizilen tek ürün: tabanı (x, y) noktasında. `v` renk çeşidini seçer. */
function Item({ kind, x, y, v }: { kind: number; x: number; y: number; v: number }) {
  // raf aralığını dolduracak boyda: çizimler 1,3 kat büyütülür
  const t = `translate(${x} ${y}) scale(1.3)`;
  switch (kind) {
    case 0: {
      // ayçiçek yağı: altın sarısı yağ, omuzlu PET şişe, kırmızı kapak, ayçiçekli etiket
      const [lab, band] = LABELS.oil[v % 2];
      return (
        <g transform={t}>
          <Shadow w={12} />
          <path d="M-11 0 V-46 Q-11 -56 -5 -60 V-68 H5 V-60 Q11 -56 11 -46 V0 Z" fill="#e3a91c" />
          <path d="M-11 -6 H11" stroke="rgba(255,255,255,.3)" strokeWidth="1" />
          <rect x="-6" y="-74" width="12" height="7" rx="1.5" fill="#c62828" />
          <rect x="-11" y="-38" width="22" height="22" fill={lab} />
          <rect x="-11" y="-21" width="22" height="5" fill={band} />
          <circle cx="0" cy="-29" r="5" fill="#f9a825" stroke="#6d4c2f" strokeWidth="1.5" />
          <path d="M-11 0 V-46 Q-11 -56 -5 -60 V-68 H5 V-60 Q11 -56 11 -46 V0 Z" fill="url(#cyl)" />
          <rect x="-8" y="-56" width="2.5" height="50" rx="1" fill="rgba(255,255,255,.45)" />
        </g>
      );
    }
    case 1: {
      // konserve: metal kapak ve dip, kâğıt etiket, silindir gölgesi
      const [lab, ink, name] = LABELS.can[v % 3];
      return (
        <g transform={t}>
          <Shadow w={14} />
          <rect x="-13" y="-32" width="26" height="32" rx="2" fill="#b8c0c6" />
          <rect x="-13" y="-27" width="26" height="22" fill={lab} />
          <ellipse cx="0" cy="-17" rx="7" ry="5" fill="rgba(255,255,255,.85)" />
          <Tiny y={-8} text={name} fill={ink} size={5} />
          <rect x="-13" y="-32" width="26" height="32" rx="2" fill="url(#cyl)" />
          <ellipse cx="0" cy="-32" rx="13" ry="3" fill="#dfe4e8" stroke="#9aa3a9" strokeWidth="1" />
          <ellipse cx="0" cy="-32" rx="8" ry="1.5" fill="none" stroke="#a7b0b6" strokeWidth="1" />
        </g>
      );
    }
    case 2: {
      // çay/kahve kutusu: ön yüz, koyu yan yüz, açık üst yüz, yaldızlı bant
      const [lab, ink, name] = LABELS.tea[v % 3];
      return (
        <g transform={t}>
          <Shadow w={18} />
          <path d="M10 0 L18 -5 V-55 L10 -50 Z" fill={lab} />
          <path d="M10 0 L18 -5 V-55 L10 -50 Z" fill="rgba(0,0,0,.35)" />
          <path d="M-14 -50 L-6 -55 H18 L10 -50 Z" fill={lab} />
          <path d="M-14 -50 L-6 -55 H18 L10 -50 Z" fill="rgba(255,255,255,.25)" />
          <rect x="-14" y="-50" width="24" height="50" fill={lab} />
          <rect x="-14" y="-40" width="24" height="5" fill={ink} />
          <Tiny y={-24} text={name} fill={ink} size={7} />
          <path d="M-8 -16 q6 -5 12 0" stroke={ink} strokeWidth="1.5" fill="none" />
          <rect x="-14" y="-50" width="4" height="50" fill="rgba(255,255,255,.18)" />
        </g>
      );
    }
    case 3: {
      // makarna: şeffaf pencereli plastik paket, tırtıklı üst kaynak
      const [lab, ink, name] = LABELS.pasta[v % 2];
      return (
        <g transform={t}>
          <Shadow w={14} />
          <path d="M-14 0 Q-15 -24 -12 -46 H12 Q15 -24 14 0 Z" fill={lab} />
          <path d="M-12 -46 H12 V-50 H-12 Z" fill={lab} />
          <path d="M-12 -50 l2 -2 l2 2 l2 -2 l2 2 l2 -2 l2 2 l2 -2 l2 2 l2 -2 l2 2 l2 -2 l2 2" stroke="rgba(0,0,0,.25)" strokeWidth="1" fill="none" />
          <rect x="-9" y="-32" width="18" height="16" rx="4" fill="#f3d98b" />
          {[-28, -24, -20].map((yy) => (
            <path key={yy} d={`M-7 ${yy} q3.5 -2 7 0 t7 0`} stroke="#d4a743" strokeWidth="1.3" fill="none" />
          ))}
          <Tiny y={-38} text={name} fill={ink} size={5} />
          <path d="M-14 0 Q-15 -24 -12 -46 H12 Q15 -24 14 0 Z" fill="url(#cyl)" opacity=".6" />
          <path d="M-10 -44 Q-12 -22 -10 -4" stroke="rgba(255,255,255,.45)" strokeWidth="2" fill="none" />
        </g>
      );
    }
    case 4: {
      // kavanoz: cam içinde reçel/bal/zeytin, oluklu metal kapak, kâğıt etiket, cam parlaması
      const [fill, name] = LABELS.jar[v % 3];
      return (
        <g transform={t}>
          <Shadow w={14} />
          <rect x="-13" y="-36" width="26" height="36" rx="6" fill={fill} />
          {v % 3 === 2 && [-6, 2, -2, 6].map((cx, i) => <circle key={i} cx={cx} cy={-8 - i * 6} r="3.5" fill="#3b4a1e" />)}
          <rect x="-13" y="-36" width="26" height="36" rx="6" fill="url(#cyl)" opacity=".7" />
          <rect x="-10" y="-25" width="20" height="13" fill="#f6ecd2" />
          <Tiny y={-16.5} text={name} fill="#5a3a1a" size={5} />
          <rect x="-14" y="-44" width="28" height="9" rx="2" fill="#c9b072" />
          {[-10, -6, -2, 2, 6, 10].map((xx) => (
            <path key={xx} d={`M${xx} -44 v9`} stroke="rgba(0,0,0,.18)" strokeWidth="1" />
          ))}
          <rect x="-10" y="-33" width="3" height="28" rx="1.5" fill="rgba(255,255,255,.5)" />
        </g>
      );
    }
    case 5: {
      // deterjan: saplı şişe, büyük kapak, beyaz etiket
      const [body, lab] = LABELS.soap[v % 3];
      return (
        <g transform={t}>
          <Shadow w={15} />
          <path d="M-14 0 V-42 Q-14 -50 -6 -52 H4 Q14 -52 14 -40 V0 Z" fill={body} />
          <path d="M6 -50 Q14 -50 14 -40 V-30 Q8 -30 8 -38 Q8 -44 6 -44 Z" fill="rgba(0,0,0,.25)" />
          <rect x="-7" y="-62" width="11" height="11" rx="2" fill="#f5f5f5" />
          <rect x="-11" y="-32" width="20" height="22" rx="3" fill={lab} />
          <circle cx="-1" cy="-24" r="4" fill={body} opacity=".6" />
          <path d="M-14 0 V-42 Q-14 -50 -6 -52 H4 Q14 -52 14 -40 V0 Z" fill="url(#cyl)" opacity=".7" />
        </g>
      );
    }
    case 6:
      // süt kutusu: çatı tepeli karton
      return (
        <g transform={t}>
          <Shadow w={13} />
          <path d="M8 0 L13 -4 V-44 L8 -40 Z" fill="#c7d3df" />
          <path d="M-12 -40 L-2 -54 L8 -40 Z" fill="#e8eef4" />
          <path d="M8 -40 L13 -44 L3 -58 L-2 -54 Z" fill="#b8c6d3" />
          <rect x="-12" y="-40" width="20" height="40" fill="#f7fafc" />
          <rect x="-12" y="-24" width="20" height="10" fill="#1e5aa8" />
          <Tiny y={-17} text="SÜT" size={6} />
          <path d="M-12 -6 q5 -4 10 0 t10 0" stroke="#7fb3e0" strokeWidth="1.5" fill="none" />
        </g>
      );
    default: {
      // bisküvi: yatık paket, iki ucu kıvrımlı
      const [lab, ink, name] = LABELS.biscuit[v % 2];
      return (
        <g transform={t}>
          <Shadow w={20} />
          <rect x="-18" y="-16" width="36" height="16" rx="5" fill={lab} />
          <path d="M-18 -16 l-3 3 l3 3 l-3 3 l3 3 l-3 3 M18 -16 l3 3 l-3 3 l3 3 l-3 3 l3 3" stroke={lab} strokeWidth="2" fill="none" />
          <Tiny y={-6} text={name} fill={ink} size={5.5} />
          <rect x="-18" y="-16" width="36" height="5" rx="3" fill="rgba(255,255,255,.25)" />
        </g>
      );
    }
  }
}

const WIDTH = [30, 30, 36, 30, 30, 32, 28, 42].map((w) => Math.round(w * 1.3));

/** Ahşap raf ünitesi: koyu arka pano, damarlı raf tahtaları, tahtanın altında gölge. */
export function Shelves() {
  const r = rng(11);
  const x0 = 470;
  const x1 = 1110;
  const rows = [190, 300, 410, 520, 630];
  return (
    <g>
      <rect x={x0 - 22} y="68" width={x1 - x0 + 44} height={COUNTER_Y - 68} fill="#4f321d" />
      <rect x={x0} y="90" width={x1 - x0} height={COUNTER_Y - 90} fill="url(#shelfBack)" />
      {/* arka panonun dikey tahta derzleri */}
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={x0 + 80 * i} y="90" width="2" height={COUNTER_Y - 90} fill="rgba(0,0,0,.25)" />
      ))}
      <rect x={x0 - 30} y="56" width={x1 - x0 + 60} height="16" rx="2" fill="#7a4f2c" />
      <rect x={x0 - 30} y="70" width={x1 - x0 + 60} height="6" fill="#5c3b22" />
      {rows.map((y) => {
        const items = [];
        let x = x0 + 24;
        while (x < x1 - 24) {
          const kind = Math.floor(r() * 8);
          const v = Math.floor(r() * 6);
          // aynı üründen yan yana iki üç tane: gerçek raflardaki gibi
          const n = 1 + Math.floor(r() * 3);
          for (let k = 0; k < n && x < x1 - 24; k++) {
            items.push(<Item key={x} kind={kind} x={x} y={y} v={v} />);
            x += WIDTH[kind];
          }
          x += 6;
        }
        return (
          <g key={y}>
            <rect x={x0} y={y - 90} width={x1 - x0} height="90" fill="url(#shelfShade)" />
            {items}
            {/* raf tahtası: üst yüz, ön kenar ve damarlar */}
            <path d={`M${x0 - 10} ${y} L${x0} ${y - 6} H${x1} L${x1 + 10} ${y} Z`} fill="#b07e50" />
            <rect x={x0 - 10} y={y} width={x1 - x0 + 20} height="12" fill="url(#plank)" />
            <path d={`M${x0} ${y + 4} q160 3 320 0 t320 1 M${x0 + 40} ${y + 8} q140 -2 280 0 t300 -1`} stroke="rgba(60,30,10,.25)" strokeWidth="1" fill="none" />
            <rect x={x0 - 10} y={y + 12} width={x1 - x0 + 20} height="10" fill="rgba(0,0,0,.35)" />
            {/* boş fiyat etiketleri: oyunun konusu bu */}
            {[0.15, 0.4, 0.65, 0.88].map((f) => (
              <rect key={f} x={x0 + (x1 - x0) * f} y={y + 2} width="24" height="8" rx="1" fill="#fffdf2" opacity=".9" />
            ))}
          </g>
        );
      })}
      <rect x={x0 - 22} y="68" width="22" height={COUNTER_Y - 68} fill="url(#post)" />
      <rect x={x1} y="68" width="22" height={COUNTER_Y - 68} fill="url(#post)" />
    </g>
  );
}

/** Işıklı içecek dolabı: metal gövde, buğulu cam kapı, cam şişeler ve kutular, altta ızgara. */
export function Fridge() {
  const bottles = ['#7a1a12', '#e65100', '#2e7d32', '#1565c0', '#f9a825', '#6a1b9a', '#b71c1c'];
  return (
    <g>
      <ellipse cx="1330" cy="712" rx="160" ry="8" fill="rgba(0,0,0,.3)" />
      <rect x="1180" y="150" width="300" height="560" rx="10" fill="url(#fridgeBody)" />
      <rect x="1180" y="150" width="300" height="70" rx="10" fill="#a8231b" />
      <rect x="1180" y="205" width="300" height="15" fill="#8e1c15" />
      <text x="1330" y="196" textAnchor="middle" fontSize="30" fontWeight="800" fill="#fff" fontStyle="italic" fontFamily="Georgia, serif">
        Soğuk İçecek
      </text>
      <rect x="1200" y="235" width="260" height="440" rx="4" fill="url(#fridgeGlow)" />
      {[330, 430, 530].map((y, row) => (
        <g key={y}>
          {Array.from({ length: 9 }, (_, i) => {
            const c = bottles[(i + row * 3) % bottles.length];
            const bx = 1218 + i * 27;
            return (
              <g key={i}>
                <path d={`M${bx - 8} ${y} V${y - 38} Q${bx - 8} ${y - 48} ${bx - 3} ${y - 52} V${y - 62} H${bx + 3} V${y - 52} Q${bx + 8} ${y - 48} ${bx + 8} ${y - 38} V${y}Z`} fill={c} />
                <rect x={bx - 8} y={y - 30} width="16" height="13" fill="#fff" opacity=".85" />
                <rect x={bx - 8} y={y - 26} width="16" height="3" fill={c} opacity=".8" />
                <path d={`M${bx - 8} ${y} V${y - 38} Q${bx - 8} ${y - 48} ${bx - 3} ${y - 52} V${y - 62} H${bx + 3} V${y - 52} Q${bx + 8} ${y - 48} ${bx + 8} ${y - 38} V${y}Z`} fill="url(#cyl)" />
                <rect x={bx - 3.5} y={y - 67} width="7" height="5" rx="1" fill="#d4d8db" />
              </g>
            );
          })}
          <rect x="1205" y={y} width="250" height="5" fill="#b9c2c8" />
        </g>
      ))}
      {/* alt raf: kutu içecekler */}
      {Array.from({ length: 10 }, (_, i) => {
        const bx = 1216 + i * 24;
        const c = bottles[(i * 2) % bottles.length];
        return (
          <g key={i}>
            <rect x={bx - 10} y="596" width="20" height="34" rx="3" fill={c} />
            <rect x={bx - 10} y="596" width="20" height="34" rx="3" fill="url(#cyl)" />
            <ellipse cx={bx} cy="596" rx="10" ry="2.5" fill="#d9dee2" />
          </g>
        );
      })}
      <rect x="1205" y="630" width="250" height="5" fill="#b9c2c8" />
      {/* cam kapı: buğu, yansımalar, conta ve kol */}
      <rect x="1200" y="235" width="260" height="440" rx="4" fill="rgba(220,235,245,.12)" />
      <path d="M1215 240 L1300 240 L1222 670 L1205 670 Z" fill="rgba(255,255,255,.16)" />
      <path d="M1330 240 L1350 240 L1290 670 L1270 670 Z" fill="rgba(255,255,255,.08)" />
      <rect x="1200" y="640" width="260" height="35" fill="rgba(255,255,255,.18)" />
      <rect x="1200" y="235" width="260" height="440" rx="4" fill="none" stroke="#8c969c" strokeWidth="9" />
      <rect x="1440" y="390" width="9" height="100" rx="4" fill="url(#metal)" />
      {/* alt ızgara */}
      <rect x="1180" y="682" width="300" height="28" fill="#5f686e" />
      {Array.from({ length: 14 }, (_, i) => (
        <rect key={i} x={1192 + i * 20} y="688" width="12" height="16" rx="2" fill="#3c4347" />
      ))}
    </g>
  );
}
