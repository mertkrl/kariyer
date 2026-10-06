import type { CSSProperties } from 'react';
import type { FlowerState } from '../../game/desk';

/*
 * Hoş geldin orkidesi: saksıdaki bir phalaenopsis'in gerçek fotoğrafı (Unsplash Lisansı: kullanmak
 * ve değiştirmek serbest, atıf gerekmez), siyah fonundan kesilmiş. Saksı sağda durur, çiçek dalı
 * sola doğru kavis çizer. Susuz geçen her gün biraz daha ileri gider: renk solar, dal daha da
 * sarkar, taç yapraklar masaya düşer ve sonunda saksının üstünde yalnızca bükülmüş bir sap kalır.
 */

/*
 * Aynı fotoğrafın iki katmanı: yapraklar ve saksı (SPLIT'in altı), çiçek dalı (üstü). Susuzluk
 * gerçek bir orkidedeki gibi görünür: dal dibinden (sapın yapraklardan ayrıldığı yer, SPIKE_BASE)
 * eğilir ve daha çok sarkar, çiçekler kahverengileşip büzülür, yapraklar çiçeklerden daha geç
 * gevşeyip sararır.
 */
/** Yaprakların başladığı yer, resmin yüksekliğinin payı olarak. */
const SPLIT = 55;
const SPIKE_BASE = `90% ${SPLIT}%`;
/** Saksının orta çizgisi (genişliğin payı): yapraklar ona doğru sarkar, gölgesi altına düşer. */
const POT_X = 75.5;
const SPIKE: Record<FlowerState, CSSProperties> = {
  fresh: {},
  tired: { transform: 'rotate(-4deg) translateY(1%)', filter: 'saturate(0.8) sepia(0.12)' },
  wilted: { transform: 'rotate(-12deg) translate(-2%, 4%) scale(0.96)', filter: 'saturate(0.45) sepia(0.5) hue-rotate(-12deg) brightness(0.88)' },
  dead: { transform: 'rotate(-24deg) translate(-3%, 9%) scale(0.88)', filter: 'grayscale(0.4) sepia(0.85) brightness(0.62) contrast(1.1)', opacity: 0.85 },
};
const LEAVES: Record<FlowerState, CSSProperties> = {
  fresh: {},
  tired: {},
  wilted: { filter: 'saturate(0.8) sepia(0.18)', transform: 'scaleY(0.97)' },
  dead: { filter: 'saturate(0.5) sepia(0.55) hue-rotate(-18deg) brightness(0.8)', transform: 'scaleY(0.93)' },
};

const FALLEN: Record<FlowerState, number> = { fresh: 0, tired: 2, wilted: 6, dead: 10 };
const PETALS: [number, number, number][] = [
  [18, 96, 20],
  [78, 97, -30],
  [88, 94, 60],
  [8, 98, 110],
  [95, 98, 15],
  [26, 99, 80],
  [70, 99, -60],
  [4, 95, 140],
  [84, 99, 35],
  [14, 97, -20],
];

/**
 * Stüdyo fotoğrafına ofis ışığı: odaya otursun diye biraz daha sıcak ve yumuşak; soldaki pencere
 * sağa yumuşak bir gölge düşürür, biri yakın temas gölgesi, biri arkadaki duvarda geniş.
 */
const CAST = 'sepia(0.08) saturate(0.92) contrast(0.96) drop-shadow(2px 1px 1.5px rgba(45, 28, 12, 0.28)) drop-shadow(14px 6px 10px rgba(45, 28, 12, 0.16))';
const withCast = (style: CSSProperties): CSSProperties => ({ ...style, filter: [style.filter, CAST].filter(Boolean).join(' ') });

const IMG: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  objectPosition: 'bottom',
  transition: 'filter 0.8s ease, transform 0.8s ease',
};

export function OrchidArt({ state }: { state: FlowerState }) {
  const tone = state === 'fresh' || state === 'tired' ? '#c690c8' : state === 'wilted' ? '#8a5a4a' : '#6e5a44';
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
        {/* tabağın masaya değdiği yer: geniş yumuşak bir gölge ve altında sıkı koyu bir çizgi */}
        <ellipse cx={POT_X + 1.5} cy={98.8} rx={27} ry={1.8} fill="rgba(40,24,10,0.32)" filter="url(#deskBlur)" />
        <ellipse cx={POT_X} cy={99.5} rx={21} ry={0.7} fill="rgba(30,18,8,0.55)" filter="url(#deskBlur)" />
        {PETALS.slice(0, FALLEN[state]).map(([x, y, r], i) => (
          <ellipse key={i} cx={x} cy={y} rx={3.4} ry={0.9} transform={`rotate(${r * 0.15} ${x} ${y})`} fill={i % 3 === 0 ? '#f3e6f0' : tone} opacity={0.9} />
        ))}
      </svg>
      {/* yapraklar ve saksı */}
      <img
        src={`${import.meta.env.BASE_URL}desk/orchid.webp`}
        alt=""
        draggable={false}
        style={{ ...IMG, clipPath: `inset(${SPLIT}% 0 0 0)`, transformOrigin: `${POT_X}% 72%`, ...withCast(LEAVES[state]) }}
      />
      {/* çiçek dalı, yapraklardan ayrıldığı yerden menteşeli */}
      <img
        src={`${import.meta.env.BASE_URL}desk/orchid.webp`}
        alt=""
        draggable={false}
        style={{ ...IMG, clipPath: `inset(0 0 ${100 - SPLIT}% 0)`, transformOrigin: SPIKE_BASE, ...withCast(SPIKE[state]) }}
      />
      {/* plastik çatalındaki hediye kartı */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
        <defs>
          <linearGradient id="orchidCard" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fffdf8" />
            <stop offset="1" stopColor="#efe8da" />
          </linearGradient>
        </defs>
        <line x1={68.5} y1={73} x2={63} y2={65.5} stroke="#bfc3c6" strokeWidth={0.45} strokeLinecap="round" />
        <g transform="rotate(-7 60 62)">
          <rect x={52.6} y={59.4} width={15} height={5.6} rx={0.3} fill="rgba(40,24,10,0.22)" transform="translate(0.5 0.45)" />
          <rect x={52.6} y={59.4} width={15} height={5.6} rx={0.3} fill="url(#orchidCard)" />
          <text x={60.1} y={63.1} textAnchor="middle" fontSize={2.4} fill="#6d5a3a" fontStyle="italic" fontFamily="Fraunces, serif">
            Hoş geldin
          </text>
        </g>
      </svg>
    </div>
  );
}
