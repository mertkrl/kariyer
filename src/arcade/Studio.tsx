import { useId, useState } from 'react';
import styles from './Studio.module.css';

/*
 * KASM logosu: geniş, içi boş harfler. Açılış animasyonu üç adımdır: harflerin dış çizgisi
 * kalemle çizilir; içlerine soldan mavi, sağdan sarı, kenarları dalgalı iki sıvı akar; ikisi
 * ortada çarpışınca yeşil bir sıçrama yayılır ve yüzey mavi-yeşil-sarı geçişe oturur (mavi ile
 * sarı karışınca yeşil). Hareket azaltılmışsa doğrudan son hâl görünür (global.css). Yazı tipi
 * kalın bir sistem yazı tipidir: değişken yazı tiplerinin üst üste binen konturları dış çizgide
 * iz bırakıyordu.
 */

/** Sıvının çarpışan kenarı: iki dalga evresi arasında gidip gelir (SMIL, birkaç tur sonra durur). */
const WAVE_L = ['M-10 0H178Q192 11 180 22Q168 34 180 45Q192 56 180 67Q168 79 180 90H-10Z', 'M-10 0H182Q168 11 180 22Q192 34 180 45Q168 56 180 67Q192 79 180 90H-10Z'];
const WAVE_R = ['M370 0H182Q168 11 180 22Q192 34 180 45Q168 56 180 67Q192 79 180 90H370Z', 'M370 0H178Q192 11 180 22Q168 34 180 45Q192 56 180 67Q168 79 180 90H370Z'];

export function KasmLogo({ className, small = false }: { className?: string; small?: boolean }) {
  const id = useId().replace(/:/g, '');
  const text = (
    <text x="180" y="74" textAnchor="middle" textLength="344" lengthAdjust="spacingAndGlyphs" fontSize="84" fontWeight="900" fontFamily="'Arial Black', 'Helvetica Neue', Helvetica, Arial, sans-serif">
      KASM
    </text>
  );
  const wave = (d: string[]) => (
    <path d={d[0]}>
      <animate attributeName="d" values={`${d[0]};${d[1]};${d[0]}`} dur="0.6s" repeatCount="4" />
    </path>
  );
  return (
    <svg className={`${styles.logo} ${small ? styles.small : ''} ${className ?? ''}`} viewBox="0 0 360 90" role="img" aria-label="KASM">
      <defs>
        <linearGradient id={`${id}-mix`} gradientUnits="userSpaceOnUse" x1="8" y1="0" x2="352" y2="0">
          <stop offset="0" stopColor="#1f6fe5" />
          <stop offset="0.3" stopColor="#1e8fd0" />
          <stop offset="0.5" stopColor="#2bb35f" />
          <stop offset="0.7" stopColor="#9ccf2f" />
          <stop offset="1" stopColor="#ffc928" />
        </linearGradient>
        <clipPath id={`${id}-letters`}>{text}</clipPath>
      </defs>
      <g clipPath={`url(#${id}-letters)`}>
        <g className={styles.liquidL} fill="#1f6fe5">
          {wave(WAVE_L)}
        </g>
        <g className={styles.liquidR} fill="#ffc928">
          {wave(WAVE_R)}
        </g>
        <circle className={styles.splash} cx="180" cy="45" r="14" fill="#2bb35f" />
        <rect className={styles.settled} x="0" y="0" width="360" height="90" fill={`url(#${id}-mix)`} />
      </g>
      <g className={styles.outline}>{text}</g>
    </svg>
  );
}

/**
 * Oyunların giriş ekranında ve salonda sağ altta duran stüdyo imzası. `tone`: zemin koyuysa
 * "dark". Üstüne gelince logo yeniden çizilir ve bir kez zıplar.
 */
export function StudioMark({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const [play, setPlay] = useState(0);
  return (
    <span className={`${styles.mark} ${tone === 'dark' ? styles.onDark : ''}`} onPointerEnter={() => setPlay((n) => n + 1)}>
      <span key={play} className={play ? styles.hop : undefined}>
        <KasmLogo small />
      </span>
      {/* büyük harfle yazılır: Türkçe sayfada otomatik büyütme "İ" yapabilir */}
      <span className={styles.studio}>LABS</span>
    </span>
  );
}
