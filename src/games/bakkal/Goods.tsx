import type { Stock } from './week';
import { COUNTER_Y } from './layout';
import { Pack, Shadow, Tiny } from './Packs';
import { PACKS, labelOf } from './packSpecs';
import { CATEGORIES, FRIDGE, MADE, RACK } from './data';
import styles from './ShopScene.module.css';

/*
 * Raflar, ekmek dolabı ve içecek dolabı. Satılan mallar stoktaki adet kadar çizilir: satıldıkça
 * raf boşalır, sabah toptancı gelince dolar. Beş rafın her birinde üç mal; son göz süstür (reçel). Ürünler gerçek bakkal mallarına benzer: ayçiçek yağı şişesi, salça
 * konservesi, çay kutusu, makarna paketi, reçel ve bal kavanozu, deterjan, süt kutusu, bisküvi.
 * Yuvarlak ürünlere silindir gölgesi (#cyl), kutulara yan yüz, hepsine tabanda gölge düşer.
 * Etiketlerde ürünün enine sığan küçük yazılar vardır. Renkler tohumlu rastgeleyle seçilir; her açılışta aynıdır.
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

/** Rafa dizilen tek ürün: tabanı (x, y) noktasında. `v` renk çeşidini seçer. */
function Item({ kind, x, y, v, k = 1.3 }: { kind: number; x: number; y: number; v: number; k?: number }) {
  // raf aralığını dolduracak boyda: çizimler büyütülür
  const t = `translate(${x} ${y}) scale(${k})`;
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
          <Tiny y={-8} text={name} fill={ink} size={5} maxW={22} />
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
          <Tiny y={-24} text={name} fill={ink} size={7} maxW={20} />
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
          <Tiny y={-38} text={name} fill={ink} size={5} maxW={21} />
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
          <Tiny y={-16.5} text={name} fill="#5a3a1a" size={5} maxW={17} />
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
          <Tiny y={-17} text="SÜT" size={6} maxW={17} />
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
          <Tiny y={-6} text={name} fill={ink} size={5.5} maxW={30} />
          <rect x="-18" y="-16" width="36" height="5" rx="3" fill="rgba(255,255,255,.25)" />
        </g>
      );
    }
  }
}

/** Her malın büyütmesi: paketler bir göze (yaklaşık 40 birim) sığacak kadar büyür. */
const SCALE: Record<string, number> = { cay: 1, makarna: 1.15, sut: 1.25, seker: 1.5, cikolata: 1.6, sabun: 1.35, yumurta: 1.05, meyvesuyu: 1.6, peynir: 1, yag: 1, salca: 1.05, biskuvi: 0.95, deterjan: 1, un: 1.25, pirinc: 1.35, yogurt: 1, gazoz: 1 };

/** Satılan mal: tabanı (x, y) noktasında; eski çizimler ya da yeni paketler. */
export function Good({ id, x, y }: { id: string; x: number; y: number }) {
  const t = `translate(${x} ${y}) scale(${SCALE[id] ?? 1.3})`;
  if (PACKS[id]) return <Pack spec={PACKS[id]} t={t} />;
  switch (id) {
    case 'recel':
      return <Item kind={4} x={x} y={y} v={0} k={0.9} />;
    case 'zeytin':
      return <Item kind={4} x={x} y={y} v={2} k={0.9} />;
    case 'bal':
      return <Item kind={4} x={x} y={y} v={1} k={0.9} />;
    case 'maden':
      // küçük maden suyu şişesi: yeşil cam, kırmızı etiket
      return (
        <g transform={t}>
          <path d="M-5 0 V-20 Q-5 -26 -2 -28 V-33 H2 V-28 Q5 -26 5 -20 V0 Z" fill="#7cb342" opacity=".9" />
          <rect x="-5" y="-15" width="10" height="6" fill="#c62828" />
          <rect x="-2.5" y="-36" width="5" height="3" rx="1" fill="#c62828" />
        </g>
      );
    case 'sucuk':
      // nal sucuk: kırmızı kahve, iki ucu bağlı
      return (
        <g transform={t}>
          <path d="M-9 0 Q-11 -20 0 -22 Q11 -20 9 0" stroke="#8d2a1c" strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M-8 -4 Q-9 -18 0 -19" stroke="rgba(255,255,255,.25)" strokeWidth="1.5" fill="none" />
        </g>
      );
    case 'cay':
      return <Item kind={2} x={x} y={y} v={0} k={SCALE.cay} />;
    case 'makarna':
      return <Item kind={3} x={x} y={y} v={0} k={SCALE.makarna} />;
    case 'sut':
      return <Item kind={6} x={x} y={y} v={0} k={SCALE.sut} />;
    case 'yag':
      return <Item kind={0} x={x} y={y} v={0} k={SCALE.yag} />;
    case 'salca':
      return <Item kind={1} x={x} y={y} v={0} k={SCALE.salca} />;
    case 'deterjan':
      return <Item kind={5} x={x} y={y} v={0} k={SCALE.deterjan} />;
    case 'biskuvi':
      return <Item kind={7} x={x} y={y} v={0} k={SCALE.biskuvi} />;
    case 'un':
      // un çuvalı: bez torba, bağlı ağız, buğday başağı
      return (
        <g transform={t}>
          <Shadow w={13} />
          <path d="M-12 0 Q-14 -18 -11 -30 L-6 -34 H6 L11 -30 Q14 -18 12 0 Z" fill="#efe6cf" />
          <path d="M-6 -34 Q0 -38 6 -34" stroke="#a88b5a" strokeWidth="2" fill="none" />
          <rect x="-9" y="-22" width="18" height="9" fill="#c0392b" />
          <Tiny y={-15.5} text="UN" size={5.5} maxW={16} />
          <path d="M0 -10 v7 M0 -8 l-3 -2 M0 -6 l3 -2" stroke="#c9a04a" strokeWidth="1.2" />
        </g>
      );
    case 'pirinc':
      // pirinç paketi: şeffaf pencereli plastik, beyaz taneler
      return (
        <g transform={t}>
          <Shadow w={10} />
          <rect x="-9" y="-28" width="18" height="28" rx="2" fill="#2e7d32" />
          <rect x="-6" y="-20" width="12" height="12" rx="2" fill="#f7f3e8" />
          {[-3, 0, 3].map((dx) => (
            <ellipse key={dx} cx={dx} cy={-14 + (dx % 2)} rx="1.2" ry="0.7" fill="#d9d2bf" />
          ))}
          <Tiny y={-23} text="PİRİNÇ" size={4} maxW={16} />
        </g>
      );
    case 'yogurt':
      // yoğurt kovası: beyaz plastik, mavi kapak
      return (
        <g transform={t}>
          <Shadow w={10} />
          <path d="M-9 0 L-10 -20 H10 L9 0 Z" fill="#fbfbf7" />
          <rect x="-11" y="-23" width="22" height="4" rx="1" fill="#1e5aa8" />
          <Tiny y={-9} text="YOĞURT" size={3.8} maxW={16} fill="#1e5aa8" />
        </g>
      );
    case 'gazoz':
      // cam gazoz şişesi: yeşil cam, metal kapak
      return (
        <g transform={t}>
          <path d="M-7 0 V-30 Q-7 -38 -2.5 -42 V-50 H2.5 V-42 Q7 -38 7 -30 V0 Z" fill="#3f9a4a" />
          <rect x="-7" y="-24" width="14" height="10" fill="#fff" opacity=".9" />
          <Tiny y={-17} text="GAZOZ" size={3.6} maxW={13} fill="#2e7d32" />
          <rect x="-3" y="-54" width="6" height="4" rx="1" fill="#d4d8db" />
          <path d="M-7 0 V-30 Q-7 -38 -2.5 -42 V-50 H2.5 V-42 Q7 -38 7 -30 V0 Z" fill="url(#cyl)" />
        </g>
      );
    case 'seker':
      // kâğıt şeker paketi: beyaz, mavi bant
      return (
        <g transform={t}>
          <Shadow w={12} />
          <path d="M-11 0 V-30 L-9 -34 H9 L11 -30 V0 Z" fill="#f7f5ee" />
          <rect x="-11" y="-22" width="22" height="9" fill="#2f5fb0" />
          <Tiny y={-15.5} text="ŞEKER" size={5} maxW={18} />
          <path d="M-9 -34 H9" stroke="#d9d4c4" strokeWidth="2" />
          <path d="M-11 0 V-30 L-9 -34 H9 L11 -30 V0 Z" fill="url(#cyl)" opacity=".35" />
        </g>
      );
    case 'cikolata':
      // dik duran çikolata kutusu: mor ambalaj, yaldızlı şerit
      return (
        <g transform={t}>
          <Shadow w={10} />
          <rect x="-9" y="-30" width="18" height="30" rx="1.5" fill="#5b2a6e" />
          <rect x="-9" y="-12" width="18" height="3" fill="#e0b84a" />
          <Tiny y={-19} text="ÇİKOLATA" size={4} maxW={16} />
          <rect x="-9" y="-30" width="4" height="30" fill="rgba(255,255,255,.15)" />
        </g>
      );
    case 'sabun':
      // kutu sabun: pembe kutu, beyaz çiçek
      return (
        <g transform={t}>
          <Shadow w={13} />
          <rect x="-12" y="-17" width="24" height="17" rx="1.5" fill="#e98aa8" />
          <circle cx="-5" cy="-9" r="3.5" fill="#fff" opacity=".85" />
          <Tiny y={-4} text="SABUN" size={4.5} maxW={20} />
          <rect x="-12" y="-17" width="24" height="3" fill="rgba(255,255,255,.3)" />
        </g>
      );
    case 'yumurta':
      // 10'lu viyol: gri karton, kapağın altından yumurtalar görünür
      return (
        <g transform={t}>
          <Shadow w={16} />
          <path d="M-16 0 L-15 -9 H15 L16 0 Z" fill="#b9b2a2" />
          {[-11, -5.5, 0, 5.5, 11].map((ex) => (
            <ellipse key={ex} cx={ex} cy={-11} rx="2.8" ry="3.4" fill="#f1dcc0" />
          ))}
          <path d="M-16 -13 Q0 -19 16 -13 L15 -9 H-15 Z" fill="#cfc8b8" opacity=".9" />
        </g>
      );
    case 'meyvesuyu':
      // karton meyve suyu: turuncu kutu, pipet
      return (
        <g transform={t}>
          <Shadow w={9} />
          <rect x="-8" y="-28" width="16" height="28" rx="1" fill="#f08a24" />
          <circle cx="0" cy="-15" r="5" fill="#ffc94a" />
          <rect x="-8" y="-28" width="16" height="4" fill="#e06d12" />
          <path d="M4 -28 L6 -38" stroke="#e8e8e8" strokeWidth="1.6" />
        </g>
      );
    case 'peynir':
      // beyaz peynir tenekesi
      return (
        <g transform={`translate(${x} ${y})`}>
          <Shadow w={10} />
          <rect x="-9" y="-22" width="18" height="22" rx="1" fill="url(#tin)" />
          <rect x="-9" y="-16" width="18" height="10" fill="#f4f6f8" />
          <Tiny y={-9} text="PEYNİR" size={4} maxW={16} fill="#1e5aa8" />
        </g>
      );
    default:
      // listede çizimi olmayan mal: adının yazdığı sade kutu
      return <Pack spec={{ shape: 'box', body: '#e8dcc0', band: '#8a5a2b', label: labelOf(id) }} t={t} />;
  }
}

/**
 * Her malın rafta sabit bir yeri var, reyon sırasıyla: tavana kadar tek büyük raf, altı sıra, sırada
 * yedi mal. Atıştırmalık kapının yanındaki cips standında, soğuk mal dolapta durur. Mal bitse de
 * yeri ve etiketi kalır: oyuncu boşu görüp siparişini ona göre verir.
 */
const SHELF_IDS = CATEGORIES.flatMap((c) => c.ids).filter((id) => id !== 'ekmek' && !FRIDGE.includes(id) && !RACK.includes(id) && !MADE.includes(id));
/** Raftaki mallar biraz küçültülerek dizilir: her rafa yedi mal sığar. */
const SHRINK = 0.74;
const ROWS = [160, 258, 356, 454, 552, 650];
const PER_ROW = 7;
/** Büyük rafın sol ve sağ kenarı; yanında soğuk dolap, onun yanında ekmek dolabı. */
const SHELF_X = [470, 1080];

/**
 * Bir malın bölmesi: önce ön sıra dolar, sonra arka sıra (biraz yukarıda, gölgede), çok mal
 * varsa en arkada üçüncü sıra. Rafa yeni gelen mal küçük bir sıçramayla yerine oturur.
 */
function Section({ id, n, x, y }: { id: string; n: number; x: number; y: number }) {
  const gap = 26;
  const front = Math.min(n, 3);
  const back = Math.max(0, Math.min(3, n - 3));
  const far = Math.max(0, Math.min(3, n - 6));
  const at = (gx: number, gy: number, i: string) => (
    <g key={i} transform={`translate(${gx} ${gy}) scale(${SHRINK})`}>
      <g className={styles.stocked}>
        <Good id={id} x={0} y={0} />
      </g>
    </g>
  );
  return (
    <g>
      <g opacity=".5">{Array.from({ length: far }, (_, i) => at(x + 18 + i * gap, y - 13, `z${i}`))}</g>
      <g opacity=".72">{Array.from({ length: back }, (_, i) => at(x + 18 + i * gap + gap / 2, y - 7, `b${i}`))}</g>
      {Array.from({ length: front }, (_, i) => at(x + 18 + i * gap, y, `f${i}`))}
    </g>
  );
}

/** Bu kadar ya da daha az kalan mal "azaldı" diye işaretlenir. */
const LOW = 2;

/**
 * Rafın ön kenarındaki etiket: dolu malda krem, azalanda turuncu, bitende kırmızı "TÜKENDİ".
 * Yanındaki yuvarlak rozette raftaki adet yazar: rafa bakan siparişini sayıyla verir.
 */
function ShelfTag({ id, n, x, y }: { id: string; n: number; x: number; y: number }) {
  const out = n <= 0;
  const low = !out && n <= LOW;
  return (
    <g>
      <title>{`${labelOf(id)}: ${out ? 'tükendi' : `rafta ${n} tane`}`}</title>
      <rect x={x} y={y} width="50" height="8" rx="1" fill={out ? '#c62828' : low ? '#f59e0b' : '#fffdf2'} opacity=".95" />
      <text x={x + 25} y={y + 6.5} textAnchor="middle" fontSize="5.6" fontWeight="800" fill={out ? '#fff' : '#3a2a1a'} fontFamily="Arial, sans-serif">
        {out ? 'TÜKENDİ' : labelOf(id)}
      </text>
      {!out && (
        <g>
          <rect x={x + 52} y={y - 0.5} width="13" height="9" rx="4.5" fill={low ? '#b45309' : '#3a2a1a'} />
          <text x={x + 58.5} y={y + 6.4} textAnchor="middle" fontSize="6" fontWeight="800" fill="#fff" fontFamily="Arial, sans-serif">
            {n}
          </text>
        </g>
      )}
    </g>
  );
}

/** Ahşap raf ünitesi: koyu arka pano, damarlı raf tahtaları, ön kenarda etiketler; mallar sabit yerlerinde. */
function ShelfUnit({ stock, ids, x0, x1, perRow }: { stock: Stock; ids: string[]; x0: number; x1: number; perRow: number }) {
  const w = (x1 - x0 - 8) / perRow;
  return (
    <g data-tour="shelves">
      {/* ışık soldan: rafın duvara düşen gölgesi sağda, mürekkep tarama */}
      <rect x={x1 + 22} y="78" width="22" height={COUNTER_Y - 78} fill="url(#hatch)" stroke="none" />
      <rect x={x0 - 22} y="68" width={x1 - x0 + 44} height={COUNTER_Y - 68} fill="#4f321d" />
      <rect x={x0} y="90" width={x1 - x0} height={COUNTER_Y - 90} fill="url(#shelfBack)" />
      <rect x={x0} y="90" width={x1 - x0} height={COUNTER_Y - 90} fill="url(#woodGrainV)" stroke="none" />
      {/* arka panonun dikey tahta derzleri */}
      {Array.from({ length: Math.floor((x1 - x0) / 80) + 1 }, (_, i) => (
        <rect key={i} x={x0 + 80 * i} y="90" width="2" height={COUNTER_Y - 90} fill="rgba(0,0,0,.25)" />
      ))}
      <rect x={x0 - 30} y="56" width={x1 - x0 + 60} height="16" rx="2" fill="#7a4f2c" />
      <rect x={x0 - 30} y="56" width={x1 - x0 + 60} height="16" rx="2" fill="url(#woodGrain)" stroke="none" />
      <rect x={x0 - 30} y="70" width={x1 - x0 + 60} height="6" fill="#5c3b22" />
      {ROWS.map((y, row) => {
        const here = ids.slice(row * perRow, (row + 1) * perRow);
        return (
          <g key={y}>
            <rect x={x0} y={y - 90} width={x1 - x0} height="90" fill="url(#shelfShade)" />
            {here.map((id, i) => (
              <Section key={id} id={id} n={stock[id] ?? 0} x={x0 + 4 + i * w} y={y} />
            ))}
            {/* raf tahtası: üst yüz, ön kenar ve damarlar */}
            <path d={`M${x0 - 10} ${y} L${x0} ${y - 6} H${x1} L${x1 + 10} ${y} Z`} fill="#b07e50" />
            <rect x={x0 - 10} y={y} width={x1 - x0 + 20} height="12" fill="url(#plank)" />
            <rect x={x0 - 10} y={y} width={x1 - x0 + 20} height="12" fill="url(#woodGrain)" stroke="none" />
            <rect x={x0 - 10} y={y + 12} width={x1 - x0 + 20} height="10" fill="rgba(0,0,0,.35)" />
            <rect x={x0} y={y + 12} width={x1 - x0} height="10" fill="url(#hatch)" stroke="none" />
            {/* rafın ön kenarındaki etiketler: malın adı var, fiyatı yok. Biten malın etiketi kırmızı
                "TÜKENDİ", azalanınki turuncu olur */}
            {here.map((id, i) => (
              <ShelfTag key={`l${id}`} id={id} n={stock[id] ?? 0} x={x0 + 10 + i * w} y={y + 2} />
            ))}
          </g>
        );
      })}
      <rect x={x0 - 22} y="68" width="22" height={COUNTER_Y - 68} fill="url(#post)" />
      <rect x={x1} y="68" width="22" height={COUNTER_Y - 68} fill="url(#post)" />
      <rect x={x0 - 22} y="68" width="22" height={COUNTER_Y - 68} fill="url(#woodGrainV)" stroke="none" />
      <rect x={x1} y="68" width="22" height={COUNTER_Y - 68} fill="url(#woodGrainV)" stroke="none" />
    </g>
  );
}

/** Tavana kadar tek büyük raf: bütün raf malları reyon sırasıyla. */
export const Shelves = ({ stock }: { stock: Stock }) => <ShelfUnit stock={stock} ids={SHELF_IDS} x0={SHELF_X[0]} x1={SHELF_X[1]} perRow={PER_ROW} />;

/**
 * Işıklı soğuk dolap: metal gövde, buğulu cam kapı. Her soğuk malın sabit yeri var: içecekler ve
 * şarküteri; her maldan stoktaki kadar (en çok dört). Altta ızgara.
 */
export function Fridge({ stock }: { stock: Stock }) {
  const cold = FRIDGE;
  return (
    <g>
      <ellipse cx="1330" cy="712" rx="160" ry="8" fill="rgba(0,0,0,.3)" />
      <rect x="1484" y="160" width="20" height="550" fill="url(#hatch)" stroke="none" />
      <rect x="1180" y="150" width="300" height="560" rx="10" fill="url(#fridgeBody)" />
      <rect x="1460" y="222" width="20" height="458" fill="url(#hatch)" stroke="none" />
      <rect x="1180" y="150" width="300" height="70" rx="10" fill="#a8231b" />
      <rect x="1180" y="205" width="300" height="15" fill="#8e1c15" />
      <text x="1330" y="196" textAnchor="middle" fontSize="30" fontWeight="800" fill="#fff" fontStyle="italic" fontFamily="Georgia, serif">
        Soğuk İçecek
      </text>
      <rect x="1200" y="235" width="260" height="440" rx="4" fill="url(#fridgeGlow)" />
      {/* raflar: her soğuk malın sabit yeri, her rafta üç mal, her maldan en çok dört tane */}
      {[330, 430, 530, 630].map((y, row) => (
        <g key={y}>
          {cold.slice(row * 3, row * 3 + 3).map((id, i) =>
            Array.from({ length: Math.min(4, stock[id] ?? 0) }, (_, k) => <Good key={`${id}${k}`} id={id} x={1220 + i * 83 + k * 17} y={y} />),
          )}
          <rect x="1205" y={y} width="250" height="5" fill="#b9c2c8" />
          {/* raf kenarındaki etiketler: biten kırmızı, azalan turuncu */}
          {cold.slice(row * 3, row * 3 + 3).map((id, i) => (
            <ShelfTag key={`t${id}`} id={id} n={stock[id] ?? 0} x={1212 + i * 83} y={y + 5} />
          ))}
        </g>
      ))}
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
