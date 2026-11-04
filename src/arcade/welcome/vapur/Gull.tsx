import type { Ref } from 'react';

/*
 * Martı (gümüş martı): beyaz gövde ve baş, gri kanatlar, siyah kanat uçlarında beyaz benekler,
 * sarı gaga ve gagada kırmızı benek. Kanatlar omuzdan döner (Flight.ts çırpar); gövde uçtuğu
 * yöne bakar. Kanat açıklığı 170 birim; sahnede küçültülerek kullanılır.
 */

export interface GullParts {
  root: Ref<SVGGElement>;
  body: Ref<SVGGElement>;
  left: Ref<SVGGElement>;
  right: Ref<SVGGElement>;
}

const WING = 'M3 -3 C 16 -19 36 -24 53 -17 C 64 -13 75 -7 88 0 C 74 3 60 6 47 6.5 C 30 8.5 15 8.5 3 6 Z';
const TIP = 'M63 -11 C 72 -7.6 80 -4 88 0 C 79 2 71 3.4 61 4.2 Z';
const COVERT = 'M6 -1 C 18 -10 32 -13 44 -10 C 34 -6 20 -3 6 2 Z';

function Wing({ tint, refEl }: { tint: string; refEl: Ref<SVGGElement> }) {
  return (
    <g ref={refEl}>
      <path d={WING} fill="url(#vapur-gull-wing)" stroke="rgba(40,44,52,.45)" strokeWidth={0.8} />
      <path d={COVERT} fill={tint} opacity={0.35} />
      <path d={TIP} fill="#1d1f24" />
      <circle cx={78} cy={-0.6} r={1.6} fill="#f4f4f2" />
      <circle cx={71} cy={-1.8} r={1.3} fill="#f4f4f2" />
    </g>
  );
}

export function GullDefs({ tint }: { tint: string }) {
  return (
    <>
      <linearGradient id="vapur-gull-wing" x1="0" y1="-18" x2="0" y2="6" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#c3cad1" />
        <stop offset="0.55" stopColor="#9aa4ae" />
        <stop offset="1" stopColor="#7f8994" />
      </linearGradient>
      <radialGradient id="vapur-gull-body" cx="45%" cy="35%" r="70%">
        <stop offset="0" stopColor={tint} />
        <stop offset="0.7" stopColor={tint} />
        <stop offset="1" stopColor="#b9bec6" />
      </radialGradient>
    </>
  );
}

export function Gull({ rootRef, bodyRef, leftRef, rightRef, tint }: { rootRef: Ref<SVGGElement>; bodyRef: Ref<SVGGElement>; leftRef: Ref<SVGGElement>; rightRef: Ref<SVGGElement>; tint: string }) {
  return (
    <g ref={rootRef} style={{ display: 'none' }}>
      {/* uzaktaki kanat önce: gövdenin arkasında kalır */}
      <g transform="scale(-1 1)">
        <Wing tint={tint} refEl={leftRef} />
      </g>
      <g ref={bodyRef}>
        <path d="M-30 1 C -22 -4 -8 -7 6 -6 C 16 -5 22 -2 24 1 C 18 6 2 8 -10 7 C -20 6 -27 4 -30 1 Z" fill="url(#vapur-gull-body)" />
        <path d="M-30 1 L -42 -2 L -40 5 Z" fill={tint} stroke="rgba(40,44,52,.3)" strokeWidth={0.6} />
        <path d="M-41 -1.5 L -36 -0.5 L -36 3.5 L -40 4.6 Z" fill="#1d1f24" />
        <circle cx={24} cy={-4} r={7} fill={tint} />
        <circle cx={26.5} cy={-5.5} r={1.2} fill="#16181c" />
        <path d="M30 -4.5 L 41 -2.4 L 40.5 -1 L 30.5 -0.6 Z" fill="#f2c331" />
        <circle cx={38.2} cy={-1.4} r={1} fill="#d4392a" />
      </g>
      <Wing tint={tint} refEl={rightRef} />
    </g>
  );
}
