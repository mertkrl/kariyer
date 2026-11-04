import type { Palette } from './palettes';
import s from './Scene.module.css';

/*
 * Karşıdan gelen vapur: siyah gövde, su hattında kızıl şerit, iki katlı beyaz üst yapı, önde
 * kaptan köşkü, ortada krem bacası (tepesi siyah) ve dumanı, pruva ve kıçta köpük. Gece pencereler
 * ve seyir fenerleri yanar. Altında suya düşen silik yansıması. Belli bir şirketin vapuru değil.
 */
export function Ferry({ p }: { p: Palette }) {
  const lit = p.lit;
  const win = lit ? '#ffd585' : '#3c4752';
  const white = lit ? '#cfd0d6' : '#f3f1ea';
  const whiteShade = lit ? '#9ea2ad' : '#d6d6d0';
  const hull = (
    <g>
      {/* gövde */}
      <path d="M10 92 L28 112 L392 112 L410 88 L398 84 L22 84 Z" fill="#1b1f24" />
      <path d="M28 112 L392 112 L396 106 L24 106 Z" fill="#8f2a22" />
      <path d="M22 84 L398 84 L396 88 L24 88 Z" fill="#3a4048" />
      {[60, 92, 124, 156, 188, 220, 252, 284, 316, 348].map((x) => (
        <circle key={x} cx={x} cy={96} r={2.6} fill={win} />
      ))}
      {/* üst yapı */}
      <rect x={52} y={56} width={320} height={28} fill={white} />
      <rect x={52} y={78} width={320} height={6} fill={whiteShade} />
      {Array.from({ length: 19 }, (_, i) => (
        <rect key={i} x={60 + i * 16.5} y={62} width={11} height={11} rx={1.5} fill={win} />
      ))}
      <rect x={90} y={34} width={250} height={22} fill={white} />
      <rect x={90} y={51} width={250} height={5} fill={whiteShade} />
      {Array.from({ length: 13 }, (_, i) => (
        <rect key={i} x={98 + i * 18.5} y={38} width={12} height={9} rx={1.5} fill={win} />
      ))}
      {/* korkuluk çizgileri */}
      <path d="M52 56h320M90 34h250" stroke={lit ? '#7c808a' : '#b9bab4'} strokeWidth={1.4} />
      {/* kaptan köşkü (pruva solda) */}
      <rect x={66} y={18} width={46} height={18} fill={white} />
      <rect x={70} y={22} width={38} height={7} fill={lit ? '#9fd0ff' : '#2b3640'} />
      {/* baca ve direk */}
      <rect x={214} y={-6} width={26} height={40} fill={lit ? '#bdb6a2' : '#efe6cc'} />
      <rect x={214} y={-6} width={26} height={9} fill="#14171a" />
      <rect x={214} y={10} width={26} height={4} fill="#a5372c" />
      <path d="M150 34 L154 -30 L156 34 Z" fill="#2a2f35" />
      <path d="M154 -24 L188 34" stroke="#2a2f35" strokeWidth={0.8} />
      {/* fenerler */}
      {lit && (
        <>
          <circle cx={155} cy={-30} r={2.6} fill="#fff6d6" />
          <circle cx={30} cy={86} r={2.6} fill="#ff4b3a" />
          <circle cx={395} cy={86} r={2.6} fill="#46e07a" />
        </>
      )}
    </g>
  );
  return (
    <div className={s.ferry}>
      <svg viewBox="0 -60 420 260" aria-hidden="true">
        {/* duman */}
        <g className={s.smoke} fill={lit ? 'rgba(120,125,140,.45)' : 'rgba(110,110,116,.38)'}>
          <circle cx={226} cy={-12} r={8} />
          <circle cx={240} cy={-24} r={11} />
          <circle cx={262} cy={-36} r={14} />
        </g>
        {hull}
        {/* yansıma */}
        <g transform="matrix(1 0 0 -0.6 0 179)" opacity={0.28}>
          {hull}
        </g>
        {/* köpük */}
        <path d="M2 110 q14 -8 30 2 q16 8 40 2 M380 110 q20 -6 40 6" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth={3} strokeLinecap="round" />
        <path d="M420 112 q40 -2 90 6" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth={4} strokeLinecap="round" />
      </svg>
    </div>
  );
}
