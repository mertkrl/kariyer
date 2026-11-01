import type { PackSpec } from './packSpecs';

/*
 * Rafın ve dolabın sade köy malları: kutu, torba, şişe, rulo, küçük paket. Her biri
 * rengi ve etiketiyle ayrılır. Gölge ve etiket yazısı Goods.tsx'teki çizimlerle ortaktır.
 */

export const Shadow = ({ w }: { w: number }) => <ellipse cx="0" cy="0" rx={w} ry="3" fill="rgba(0,0,0,.35)" />;
/**
 * Etiketteki küçük yazı: ürünün genişliğine (maxW) sığmazsa harfler sıkıştırılır, yazı etiketten
 * taşmaz. Genişlik kalın Arial büyük harfin ortalama eninden kestirilir.
 */
export const Tiny = ({ y, text, fill = '#fff', size = 6.5, maxW }: { y: number; text: string; fill?: string; size?: number; maxW: number }) => {
  const fits = text.length * size * 0.7 <= maxW;
  return (
    <text x="0" y={y} textAnchor="middle" fontSize={size} fontWeight="800" fill={fill} fontFamily="Arial, sans-serif" letterSpacing={fits ? '.2' : undefined} textLength={fits ? undefined : maxW} lengthAdjust="spacingAndGlyphs">
      {text}
    </text>
  );
};

export function Pack({ spec, t }: { spec: PackSpec; t: string }) {
  const { shape, body, band, label, ink = '#fff' } = spec;
  const w = spec.w ?? 18;
  const h = spec.h ?? 30;
  if (shape === 'roll')
    return (
      <g transform={t}>
        <Shadow w={14} />
        {[-7, 7].map((dx) => (
          <g key={dx}>
            <rect x={dx - 7} y="-26" width="14" height="26" rx="3" fill={body} />
            <rect x={dx - 7} y="-17" width="14" height="6" fill={band} opacity=".7" />
            <ellipse cx={dx} cy="-26" rx="7" ry="2.5" fill="#e0e0e0" />
            <ellipse cx={dx} cy="-26" rx="2" ry="1" fill="#bdbdbd" />
          </g>
        ))}
      </g>
    );
  if (shape === 'small')
    return (
      <g transform={t}>
        <Shadow w={10} />
        <rect x="-10" y="-14" width="20" height="14" rx="1.5" fill={body} />
        <rect x="-10" y="-9" width="20" height="5" fill={band} />
        <Tiny y={-5} text={label} size={3.6} maxW={18} fill={ink} />
      </g>
    );
  if (shape === 'bag')
    return (
      <g transform={t}>
        <Shadow w={11} />
        <path d={`M${-w / 2} 0 V${-h + 4} L${-w / 2 + 2} ${-h} H${w / 2 - 2} L${w / 2} ${-h + 4} V0 Z`} fill={body} />
        <rect x={-w / 2 + 2} y={-h * 0.6} width={w - 4} height="9" rx="1" fill={band} />
        <Tiny y={-h * 0.6 + 6.5} text={label} size={3.6} maxW={w - 5} fill={ink} />
      </g>
    );
  if (shape === 'bottle')
    return (
      <g transform={t}>
        <Shadow w={w / 2 + 2} />
        <path d={`M${-w / 2} 0 V${-h + 10} Q${-w / 2} ${-h + 4} -3 ${-h + 2} V${-h - 4} H3 V${-h + 2} Q${w / 2} ${-h + 4} ${w / 2} ${-h + 10} V0 Z`} fill={body} />
        <rect x="-3.5" y={-h - 8} width="7" height="5" rx="1" fill={band} />
        <rect x={-w / 2} y={-h * 0.55} width={w} height="10" fill={band} />
        <Tiny y={-h * 0.55 + 7} text={label} size={3.4} maxW={w - 2} fill={ink} />
        <path d={`M${-w / 2} 0 V${-h + 10} Q${-w / 2} ${-h + 4} -3 ${-h + 2} V${-h - 4} H3 V${-h + 2} Q${w / 2} ${-h + 4} ${w / 2} ${-h + 10} V0 Z`} fill="url(#cyl)" opacity=".6" />
      </g>
    );
  return (
    <g transform={t}>
      <Shadow w={w / 2 + 1} />
      <rect x={-w / 2} y={-h} width={w} height={h} rx="1.5" fill={body} />
      <rect x={-w / 2} y={-h * 0.6} width={w} height="8" fill={band} />
      <Tiny y={-h * 0.6 + 6} text={label} size={4} maxW={w - 2} fill={ink} />
    </g>
  );
}
