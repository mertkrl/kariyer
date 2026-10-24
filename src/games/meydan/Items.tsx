import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { Item } from './model';
import { url } from './paint';

/*
 * Cepheye asılanların çizimi: tabelalar, tente, cam folyo, vinil afiş ve sonradan eklenmiş
 * klima, anten, kablolar. Her biri duvara gölge düşürür; klimanın altında su izi kalır.
 */

const FONT = '"Arial Black", "Helvetica Neue", Arial, sans-serif';

/** Tek satırlık tabela yazısı: sığmazsa sıkıştırılır, taşmaz. */
function Label({ x, y, room, size, color, text, vertical = false }: { x: number; y: number; room: number; size: number; color: string; text: string; vertical?: boolean }) {
  if (!text.trim() || room <= 0 || size < 4) return null;
  const fit = text.length * size * 0.68 > room;
  return (
    <text
      x={x}
      y={y}
      fill={color}
      fontFamily={FONT}
      fontWeight="900"
      fontSize={size}
      textAnchor="middle"
      dominantBaseline="central"
      textLength={fit ? room : undefined}
      lengthAdjust={fit ? 'spacingAndGlyphs' : undefined}
      transform={vertical ? `rotate(-90 ${x} ${y})` : undefined}
      pointerEvents="none"
    >
      {text}
    </text>
  );
}

export function ItemView({ it, onDown }: { it: Item; onDown?: (e: ReactPointerEvent) => void }) {
  const { x, y, w, h, fill, color, text } = it;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const hit = onDown && { onPointerDown: onDown, style: { cursor: 'move' } };
  // cepheden taşan kutuların duvara düşen gölgesi
  const drop = <rect x={x + 3} y={y + h} width={w} height={Math.min(10, h * 0.4)} fill={url('drop')} />;
  let body: ReactNode;
  switch (it.kind) {
    case 'pano':
      body = (
        <>
          {drop}
          <rect x={x} y={y} width={w} height={h} fill={fill} />
          <rect x={x} y={y} width={w} height={h} fill={url('face')} />
          <rect x={x} y={y} width={w} height="2" fill="#fff" opacity="0.35" />
          <rect x={x} y={y + h - 2.5} width={w} height="2.5" fill="#000" opacity="0.3" />
          <Label x={cx} y={cy} room={w - 14} size={Math.min(h * 0.55, 40)} color={color} text={text} />
        </>
      );
      break;
    case 'bayrak':
      body = (
        <>
          <rect x={x - 6} y={y + 6} width="8" height="3" fill="#3a3a3a" />
          <rect x={x - 6} y={y + h - 9} width="8" height="3" fill="#3a3a3a" />
          <rect x={x + 3} y={y + 4} width={w} height={h} fill="#000" opacity="0.18" />
          <rect x={x} y={y} width={w} height={h} rx="2" fill={fill} stroke="#2a2a2a" strokeWidth="2" />
          <rect x={x} y={y} width={w} height={h} rx="2" fill={url('face')} />
          <Label x={cx} y={cy} room={h - 12} size={Math.min(w * 0.58, 30)} color={color} text={text} vertical />
        </>
      );
      break;
    case 'kutu':
      body = (
        <>
          {drop}
          <rect x={x} y={y} width={w} height={h} rx="3" fill="#262626" />
          <rect x={x + 3} y={y + 3} width={Math.max(0, w - 6)} height={Math.max(0, h - 6)} rx="1.5" fill={fill} />
          <rect x={x + 3} y={y + 3} width={Math.max(0, w - 6)} height={Math.max(0, h - 6)} rx="1.5" fill={url('glow')} />
          <Label x={cx} y={cy} room={w - 14} size={Math.min(h * 0.52, 40)} color={color} text={text} />
        </>
      );
      break;
    case 'tente': {
      const d = h * 0.66;
      const n = Math.max(2, Math.round(w / 16));
      const top = (k: number) => x + (k * w) / n;
      const bot = (k: number) => x - 8 + (k * (w + 16)) / n;
      const scallops = Math.max(3, Math.round((w + 16) / 14));
      return (
        <g {...hit}>
          <rect x={x - 4} y={y + h} width={w + 8} height="16" fill={url('drop')} />
          <polygon points={`${x},${y} ${x + w},${y} ${x + w + 8},${y + d} ${x - 8},${y + d}`} fill={fill} />
          {Array.from({ length: n }, (_, k) => k)
            .filter((k) => k % 2 === 1)
            .map((k) => (
              <polygon key={k} points={`${top(k)},${y} ${top(k + 1)},${y} ${bot(k + 1)},${y + d} ${bot(k)},${y + d}`} fill={color} opacity="0.9" />
            ))}
          <polygon points={`${x},${y} ${x + w},${y} ${x + w + 8},${y + d} ${x - 8},${y + d}`} fill={url('face')} />
          <path
            d={`M${x - 8} ${y + d} H${x + w + 8} V${y + h - 3} ${Array.from({ length: scallops }, (_, k) => {
              const sx = x + w + 8 - ((k + 1) * (w + 16)) / scallops;
              return `Q${sx + (w + 16) / scallops / 2} ${y + h + 3} ${sx} ${y + h - 3}`;
            }).join(' ')} Z`}
            fill={fill}
          />
          <rect x={x - 8} y={y + d} width={w + 16} height="1.5" fill="#000" opacity="0.25" />
          <Label x={cx} y={y + d + (h - d) / 2 - 1} room={w} size={(h - d) * 0.7} color={color} text={text} />
          {onDown && <rect x={x - 8} y={y - 4} width={w + 16} height={h + 8} fill="transparent" />}
        </g>
      );
    }
    case 'folyo':
      body = (
        <>
          <rect x={x} y={y} width={w} height={h} fill={fill} opacity="0.88" />
          <Label x={cx} y={cy} room={w - 8} size={Math.min(h * 0.42, 30)} color={color} text={text} />
          <polygon points={`${x + w * 0.15},${y} ${x + w * 0.3},${y} ${x + w * 0.18},${y + h} ${x + w * 0.03},${y + h}`} fill="#fff" opacity="0.14" />
        </>
      );
      break;
    case 'afis':
      body = (
        <>
          <path d={`M${x + 4} ${y + 4} L${x - 8} ${y - 12} M${x + w - 4} ${y + 4} L${x + w + 8} ${y - 12} M${x + 4} ${y + h - 4} L${x - 6} ${y + h + 8}`} stroke="#555" strokeWidth="1.3" />
          <path d={`M${x + 3} ${y + 3} L${x + w + 3} ${y + 3} L${x + w + 3} ${y + h + 3} Q${cx + 3} ${y + h - 3} ${x + 3} ${y + h + 3} Z`} fill="#000" opacity="0.15" />
          <path d={`M${x} ${y} Q${cx} ${y + 4} ${x + w} ${y} L${x + w} ${y + h} Q${cx} ${y + h - 6} ${x} ${y + h} Z`} fill={fill} />
          {/* vinilin kırışıkları */}
          <path d={`M${x + w * 0.18} ${y + 2} L${x + w * 0.42} ${y + h - 3} M${x + w * 0.66} ${y + 2} L${x + w * 0.82} ${y + h - 4}`} stroke="#000" strokeOpacity="0.1" strokeWidth="5" />
          <path d={`M${x + w * 0.21} ${y + 2} L${x + w * 0.45} ${y + h - 3}`} stroke="#fff" strokeOpacity="0.16" strokeWidth="3" />
          {[x + 5, x + w - 5].map((gx) => (
            <circle key={gx} cx={gx} cy={y + 5} r="2.2" fill="#a8a8a8" stroke="#666" strokeWidth="0.6" />
          ))}
          <Label x={cx} y={cy} room={w - 14} size={Math.min(h * 0.3, 34)} color={color} text={text} />
        </>
      );
      break;
    case 'klima':
      body = (
        <>
          {/* yoğuşma suyunun duvarda bıraktığı iz */}
          <rect x={x + 4} y={y + h} width="6" height="70" fill={url('stain')} />
          <path d={`M${x + 7} ${y + h} V${y + h + 22}`} stroke="#c9c9c3" strokeWidth="2.5" />
          <path d={`M${x + 4} ${y + h} L${x + 4} ${y + h + 6} L${x + 14} ${y + h + 6} M${x + w - 4} ${y + h} L${x + w - 4} ${y + h + 6} L${x + w - 14} ${y + h + 6}`} stroke="#4a4a4a" strokeWidth="2" fill="none" />
          <rect x={x + 3} y={y + 3} width={w} height={h} rx="2" fill="#000" opacity="0.2" />
          <rect x={x} y={y} width={w} height={h} rx="2" fill={fill} />
          <rect x={x} y={y} width={w} height={h} rx="2" fill={url('face')} />
          {Array.from({ length: 5 }, (_, k) => (
            <rect key={k} x={x + 4} y={y + 5 + k * ((h - 10) / 4)} width={w * 0.3} height="1.2" fill={color} />
          ))}
          <circle cx={x + w * 0.66} cy={cy} r={Math.min(w, h) * 0.36} fill="#cfcfc8" stroke={color} strokeWidth="1.5" />
          {[0, 45, 90, 135].map((a) => (
            <line key={a} x1={x + w * 0.66} y1={cy - Math.min(w, h) * 0.36} x2={x + w * 0.66} y2={cy + Math.min(w, h) * 0.36} stroke={color} strokeWidth="0.8" transform={`rotate(${a} ${x + w * 0.66} ${cy})`} />
          ))}
          <circle cx={x + w * 0.66} cy={cy} r="2.5" fill="#555" />
        </>
      );
      break;
    case 'anten':
      body = (
        <>
          <path d={`M${x + w * 0.45} ${y + h * 0.66} L${x + w * 0.45} ${y + h} M${x + w * 0.3} ${y + h} H${x + w * 0.62}`} stroke="#4a4a4a" strokeWidth="2.5" />
          <ellipse cx={x + w * 0.42} cy={y + h * 0.42} rx={w * 0.4} ry={h * 0.38} transform={`rotate(-22 ${x + w * 0.42} ${y + h * 0.42})`} fill={fill} stroke={color} strokeWidth="1.5" />
          <ellipse cx={x + w * 0.36} cy={y + h * 0.36} rx={w * 0.2} ry={h * 0.18} transform={`rotate(-22 ${x + w * 0.42} ${y + h * 0.42})`} fill="#fff" opacity="0.4" />
          <path d={`M${x + w * 0.42} ${y + h * 0.42} L${x + w * 0.94} ${y + h * 0.14}`} stroke="#4a4a4a" strokeWidth="1.6" />
          <rect x={x + w * 0.9} y={y + h * 0.08} width="5" height="7" fill="#333" transform={`rotate(-22 ${x + w * 0.92} ${y + h * 0.12})`} />
        </>
      );
      break;
    case 'kablo': {
      const a = `M${x} ${y + 2} Q${cx} ${y + h * 1.6} ${x + w} ${y + 4}`;
      return (
        <g {...hit}>
          <path d={a} fill="none" stroke={fill} strokeWidth="2" />
          <path d={`M${x} ${y + 7} Q${cx} ${y + h * 1.9} ${x + w} ${y + 10}`} fill="none" stroke={fill} strokeWidth="1.5" opacity="0.85" />
          <path d={`M${x} ${y + 12} Q${cx + 20} ${y + h * 1.5} ${x + w} ${y + 14}`} fill="none" stroke={fill} strokeWidth="1.2" opacity="0.7" />
          {onDown && <path d={a} fill="none" stroke="transparent" strokeWidth="16" />}
        </g>
      );
    }
  }
  return (
    <g {...hit}>
      {body}
      {onDown && <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} fill="transparent" />}
    </g>
  );
}

