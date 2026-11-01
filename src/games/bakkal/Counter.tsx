import { COUNTER_Y, Cat } from './ShopDecor';
import { GumMachine } from './GumMachine';
import styles from './ShopScene.module.css';

/*
 * Tezgâh ve üstündekiler. Gövde tam genişlikte (CounterBody), eşyalar sahnenin ortalanmış
 * koordinatlarında (CounterTop): solda uyuyan kedi ve sakız makinesi; sağda yan yana
 * veresiye defteri ve hesap makinesi. İkisi de tıklanınca açılır. Yazar kasa tezgâhın ortasında, müşterinin önündedir; tıklanabilir ayrı bir bileşendir (Register.tsx).
 */

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


/** Tezgâhta yatan kalın, bez ciltli veresiye defteri: üstünde tükenmez, ağzından kırmızı ayraç sarkar. Tıklanınca açılır. */
function DeskLedger({ onOpen, glow }: { onOpen?: () => void; glow?: boolean }) {
  return (
    <g transform={`translate(1010 ${COUNTER_Y})`} data-tour="ledger" className={`${styles.desk} ${glow ? styles.coach : ''}`} onClick={onOpen} role="button" aria-label="Defteri aç">
      <ellipse cx="0" cy="2" rx="96" ry="8" fill="rgba(0,0,0,.32)" />
      {/* sayfa destesi: önden görünen kâğıt kenarları */}
      <path d="M-86 -4 L-80 -22 H80 L86 -4 V0 H-86 Z" fill="#efe6cc" />
      {[-18, -14, -10, -6].map((y) => (
        <path key={y} d={`M-84 ${y} H84`} stroke="rgba(150,120,70,.35)" strokeWidth="1" />
      ))}
      {/* alt ve üst cilt */}
      <rect x="-90" y="-3" width="180" height="5" rx="2" fill="#1f3428" />
      <path d="M-92 -22 L-74 -40 H74 L92 -22 Z" fill="#2f4a3a" />
      <path d="M-92 -22 L-74 -40 H-60 L-76 -22 Z" fill="#1f3428" />
      <path d="M92 -22 L74 -40 H62 L78 -22 Z" fill="#5a3a22" />
      <path d="M-30 -27 L-24 -35 H24 L30 -27 Z" fill="#d9bf72" opacity=".85" />
      {/* tükenmez ve ayraç */}
      <g transform="rotate(-8 10 -34)">
        <rect x="-26" y="-37" width="62" height="5" rx="2.5" fill="#f4f1e8" stroke="#333" strokeWidth=".8" />
        <rect x="30" y="-37" width="9" height="5" rx="2" fill="#1f3a8a" />
        <rect x="-34" y="-36" width="9" height="3" rx="1.5" fill="#1f3a8a" />
      </g>
      <path d="M54 -4 l4 22 l-4 -4 l-4 4 Z" fill="#a8231b" />
    </g>
  );
}

/** Tezgâhta duran hesap makinesi: tıklanınca büyüğü açılır. */
function DeskCalculator({ onOpen, glow }: { onOpen?: () => void; glow?: boolean }) {
  return (
    <g transform={`translate(1140 ${COUNTER_Y})`} data-tour="calc" className={`${styles.desk} ${glow ? styles.coach : ''}`} onClick={onOpen} role="button" aria-label="Hesap makinesini aç">
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


export function CounterTop({ onPet, onCalc, onBook, gum, gumActive, onGum, coach }: { onPet?: () => void; onCalc?: () => void; onBook?: () => void; gum: number; gumActive: boolean; onGum?: () => void; coach?: string | null }) {
  return (
    <g>
      <DeskCalculator onOpen={onCalc} glow={coach === 'calc'} />
      <g transform={`translate(600 ${COUNTER_Y}) scale(1.3)`}>
        <GumMachine count={gum} active={gumActive} onTurn={onGum} />
      </g>
      <DeskLedger onOpen={onBook} glow={coach === 'book'} />
      <Cat onPet={onPet} />
    </g>
  );
}
