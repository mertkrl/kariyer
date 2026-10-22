import { forwardRef, type ReactNode } from 'react';
import { STOP_SECONDS, tripAt } from './lines';
import { clockText, dateText, nameFor, queueAt } from './live';
import { Overlay } from './overlays';
import { Scene } from './scenes';
import { FONTS, H, W, type Design, type PresetId, type Widget } from './model';

/*
 * Ekranın kendisi: tek bir SVG. Editör onu sahnede gösterir, paylaşılan bağlantı onu büyük açar,
 * PNG de aynı SVG'nin resmidir (bu yüzden yazı tipleri sistem yazı tipleridir, dışarıdan yüklenmez).
 * `seconds` canlı akışın saatidir: sıra numarası, kayan yazı ve saat ona göre çizilir.
 */

interface Props {
  design: Design;
  seconds: number;
  now: Date;
  className?: string;
}

const PAD = 14;
const up = (x: string) => x.toLocaleUpperCase('tr-TR');
const withPrefix = (prefix: string, value: string) => (prefix ? `${prefix} ${value}` : value);
/** Taşan içeriği kutusunda kesilen bileşenler. */
const CLIPPED = new Set(['ticker', 'video', 'stops', 'lineMap']);

function textX(wd: Widget) {
  if (wd.align === 'middle') return wd.x + wd.w / 2;
  return wd.align === 'end' ? wd.x + wd.w - PAD : wd.x + PAD;
}

/** Bir kutunun ortasına hizalanmış, gerekirse çok satırlı yazı. */
function Label({ wd, value, y, size, weight }: { wd: Widget; value: string; y?: number; size?: number; weight?: number }) {
  const lines = value.split('\n');
  const fs = size ?? wd.size;
  const lh = fs * 1.2;
  const cy = y ?? wd.y + wd.h / 2;
  const top = cy - ((lines.length - 1) * lh) / 2;
  return (
    <text x={textX(wd)} textAnchor={wd.align} dominantBaseline="central" fontSize={fs} fontWeight={weight ?? (wd.bold ? 700 : 400)} fill={wd.color} fontFamily={FONTS[wd.font].css}>
      {lines.map((line, i) => (
        <tspan key={i} x={textX(wd)} y={top + i * lh}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function Body({ wd, seconds, now, preset }: { wd: Widget; seconds: number; now: Date; preset: PresetId }): ReactNode {
  const q = queueAt(seconds);
  const trip = tripAt(seconds, preset);
  switch (wd.kind) {
    case 'box':
      return null;
    case 'text':
      return <Label wd={wd} value={wd.text} />;
    case 'clock':
      return <Label wd={wd} value={clockText(now)} />;
    case 'date':
      return <Label wd={wd} value={dateText(now)} />;
    case 'number':
      return <Label wd={wd} value={`${wd.text ? `${wd.text} ` : ''}${q.current.no}`} />;
    case 'patient':
      return <Label wd={wd} value={nameFor(q.current, wd.mask)} />;
    case 'queue': {
      const rowH = Math.max(wd.size * 1.7, 12);
      const rows = Math.max(1, Math.floor(wd.h / rowH));
      const numX = wd.x + PAD;
      const nameX = numX + wd.size * (wd.text ? wd.text.length * 0.6 + 3.4 : 3.2);
      return (
        <g fontFamily={FONTS[wd.font].css} fontSize={wd.size} fill={wd.color}>
          {q.next.slice(0, rows).map((p, i) => {
            const y = wd.y + i * rowH + rowH / 2;
            return (
              <g key={p.no}>
                {i > 0 && <line x1={wd.x + PAD} x2={wd.x + wd.w - PAD} y1={wd.y + i * rowH} y2={wd.y + i * rowH} stroke={wd.color} strokeOpacity={0.15} />}
                <text x={numX} y={y} dominantBaseline="central" fontWeight={700}>
                  {wd.text ? `${wd.text}  ${p.no}` : p.no}
                </text>
                <text x={nameX} y={y} dominantBaseline="central" fontWeight={wd.bold ? 700 : 400}>
                  {nameFor(p, wd.mask)}
                </text>
              </g>
            );
          })}
        </g>
      );
    }
    case 'ticker': {
      // yazı sağdan girer, soldan çıkar; genişliği yaklaşık hesaplanır (ölçmek SVG'yi DOM'a bağlardı)
      const len = wd.text.length * wd.size * 0.56;
      const span = wd.w + len;
      const x = wd.x + wd.w - ((seconds * 110) % span);
      return (
        <g clipPath={`url(#clip-${wd.id})`}>
          <text x={x} y={wd.y + wd.h / 2} dominantBaseline="central" fontSize={wd.size} fontWeight={wd.bold ? 700 : 400} fill={wd.color} fontFamily={FONTS[wd.font].css}>
            {wd.text}
          </text>
        </g>
      );
    }
    case 'nextStop':
      return <Label wd={wd} value={withPrefix(wd.text, up(trip.next))} />;
    case 'terminus':
      return <Label wd={wd} value={withPrefix(wd.text, up(trip.terminus))} />;
    case 'stops': {
      const rowH = Math.max(wd.size * 1.9, 12);
      const rows = Math.max(1, Math.floor(wd.h / rowH));
      const list = trip.line.stops.slice(trip.at, trip.at + rows);
      return (
        <g clipPath={`url(#clip-${wd.id})`} fontFamily={FONTS[wd.font].css} fontSize={wd.size} fontWeight={wd.bold ? 700 : 400} fill={wd.color}>
          {list.map((name, i) => (
            <g key={trip.at + i}>
              {i === 0 ? <rect x={wd.x} y={wd.y} width={wd.w} height={rowH} fill={wd.accent} /> : <line x1={wd.x + 8} x2={wd.x + wd.w - 8} y1={wd.y + i * rowH} y2={wd.y + i * rowH} stroke={wd.color} strokeOpacity={0.15} />}
              <text x={wd.x + PAD} y={wd.y + i * rowH + rowH / 2} dominantBaseline="central">
                {up(name)}
              </text>
            </g>
          ))}
        </g>
      );
    }
    case 'lineMap':
      return <LineMap wd={wd} seconds={seconds} preset={preset} />;
    case 'video':
      return (
        <g clipPath={`url(#clip-${wd.id})`}>
          <Scene wd={wd} seconds={seconds} scene={wd.scene} />
          {wd.text && (
            <g>
              <rect x={wd.x + 12} y={wd.y + 12} width={wd.text.length * wd.size * 0.62 + 20} height={wd.size * 1.5} rx={wd.size * 0.3} fill="#000000" fillOpacity={0.45} />
              <text x={wd.x + 22} y={wd.y + 12 + wd.size * 0.75} dominantBaseline="central" fontSize={wd.size} fontWeight={700} fill="#ffffff" fontFamily={FONTS[wd.font].css}>
                {wd.text}
              </text>
            </g>
          )}
        </g>
      );
    case 'logo': {
      const s = Math.min(wd.w, wd.h);
      return (
        <text x={wd.x + wd.w / 2} y={wd.y + wd.h / 2} textAnchor="middle" dominantBaseline="central" fontSize={wd.text.length > 2 ? s * 0.3 : s * 0.62} fontWeight={900} fill={wd.color} fontFamily={FONTS[wd.font].css}>
          {wd.text}
        </text>
      );
    }
    case 'taskbar': {
      const b = wd.h - 8;
      return (
        <g>
          <rect x={wd.x + 4} y={wd.y + 4} width={b * 2.4} height={b} rx={3} fill="#3c8d2f" />
          <text x={wd.x + 4 + b * 1.2} y={wd.y + wd.h / 2} textAnchor="middle" dominantBaseline="central" fontSize={b * 0.5} fontWeight={700} fill="#ffffff" fontFamily="Tahoma, sans-serif" fontStyle="italic">
            başlat
          </text>
          {[0, 1, 2, 3].map((k) => (
            <rect key={k} x={wd.x + 16 + b * 2.6 + k * (b + 8)} y={wd.y + 6} width={b - 4} height={b - 4} rx={3} fill={wd.color} fillOpacity={0.25} />
          ))}
          <text x={wd.x + wd.w - 12} y={wd.y + wd.h / 2} textAnchor="end" dominantBaseline="central" fontSize={wd.size} fill={wd.color} fontFamily="Tahoma, sans-serif">
            {clockText(now)}
          </text>
        </g>
      );
    }
  }
}

/**
 * Hat haritası: duraklar satırlara bölünür ve yılan gibi kıvrılır (Marmaray ekranındaki gibi ilk
 * satır sağdan sola). Geçilen duraklar gri, şimdiki vurgulu; araç iki durak arasında ilerler.
 */
function LineMap({ wd, seconds, preset }: { wd: Widget; seconds: number; preset: PresetId }) {
  const trip = tripAt(seconds, preset);
  const all = trip.line.stops;
  // çok uzun hatta (98G'nin 57 durağı) bütün hat sığmaz: aracın çevresindeki 18 durak görünür, pencere araçla kayar
  const WINDOW = 18;
  const first = all.length > 45 ? Math.min(Math.max(0, trip.at - 3), all.length - WINDOW) : 0;
  const stops = all.length > 45 ? all.slice(first, first + WINDOW) : all;
  const at = trip.at - first;
  const rows = stops.length > 16 ? (stops.length > 18 ? 3 : 2) : stops.length > 8 ? 2 : 1;
  const per = Math.ceil(stops.length / rows);
  // eğik isimler sağa doğru uzar: sağda daha çok boşluk kalır
  const ml = 40;
  const mr = 130;
  const step = per > 1 ? (wd.w - ml - mr) / (per - 1) : 0;
  const pts = stops.map((_, i) => {
    const r = Math.floor(i / per);
    const k = i % per;
    const rtl = rows > 1 && r % 2 === 0;
    return { x: rtl ? wd.x + wd.w - mr - k * step : wd.x + ml + k * step, y: wd.y + (wd.h * (r + 0.72)) / rows };
  });
  const grey = '#8a8f98';
  const f = (seconds % STOP_SECONDS) / STOP_SECONDS;
  const a = pts[at];
  const b = pts[at + 1] ?? a;
  const train = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  return (
    <g clipPath={`url(#clip-${wd.id})`} fontFamily={FONTS[wd.font].css} fontSize={wd.size} fontWeight={wd.bold ? 700 : 400}>
      {pts.slice(1).map((p, i) => (
        <line key={i} x1={pts[i].x} y1={pts[i].y} x2={p.x} y2={p.y} stroke={i < at ? grey : wd.color} strokeWidth={5} strokeLinecap="round" />
      ))}
      {pts.map((p, i) => {
        const now = i === at;
        const fill = i < at ? grey : now ? wd.accent : wd.color;
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={now ? 10 : 6} fill={i < at ? grey : now ? wd.accent : '#f5c518'} stroke={now ? '#ffffff' : 'none'} strokeWidth={2} />
            <text x={p.x + 4} y={p.y - 14} transform={`rotate(-32 ${p.x + 4} ${p.y - 14})`} fill={fill}>
              {up(stops[i]).length > 22 ? `${up(stops[i]).slice(0, 21)}…` : up(stops[i])}
            </text>
          </g>
        );
      })}
      {/* araç: hattın üstünde, iki durak arasında ilerler */}
      <g transform={`translate(${train.x} ${train.y})`}>
        <rect x={-15} y={-8} width={30} height={16} rx={5} fill={wd.accent} stroke="#ffffff" strokeWidth={2} />
        <rect x={-10} y={-4} width={6} height={5} rx={1} fill="#ffffff" />
        <rect x={-2} y={-4} width={6} height={5} rx={1} fill="#ffffff" />
        <rect x={6} y={-4} width={5} height={5} rx={1} fill="#ffffff" />
      </g>
    </g>
  );
}

export const Screen = forwardRef<SVGSVGElement, Props>(function Screen({ design, seconds, now, className }, ref) {
  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} className={className} role="img" aria-label="Ekran tasarımı">
      <defs>
        {design.widgets
          .filter((wd) => CLIPPED.has(wd.kind))
          .map((wd) => (
            <clipPath key={wd.id} id={`clip-${wd.id}`}>
              <rect x={wd.x} y={wd.y} width={wd.w} height={wd.h} />
            </clipPath>
          ))}
      </defs>
      <rect width={W} height={H} fill={design.bg} />
      {design.widgets.map((wd) => (
        <g key={wd.id}>
          {wd.fill !== 'none' && <rect x={wd.x} y={wd.y} width={wd.w} height={wd.h} rx={wd.radius} fill={wd.fill} />}
          <Body wd={wd} seconds={seconds} now={now} preset={design.preset} />
        </g>
      ))}
      <Overlay design={design} seconds={seconds} now={now} />
    </svg>
  );
});
