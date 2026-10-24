import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { GROUND, topOf, type BuildingShape, type Paint } from './model';
import { rnd, url } from './paint';

/*
 * Binaların çizimi. Biçim meydandan, renkler oyuncudan gelir. Beş cephe tipi var: 70'lerin
 * balkonlu apartmanı, cumbalı apartman, tuğla bina, kemerli pencereli eski kâgir bina ve cam
 * giydirme. Hepsinin altında aynı dükkân katı durur: kaplamalı ayaklar, kepenk kutusu, vitrin.
 */

function Window({ x, y, w, h, trim, v, arch = false, panes = 2 }: { x: number; y: number; w: number; h: number; trim: string; v: number; arch?: boolean; panes?: number }) {
  const shape = arch ? `M${x} ${y + h} V${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} V${y + h} Z` : `M${x} ${y} H${x + w} V${y + h} H${x} Z`;
  // pencerenin içi: tül perde, yarı inik stor, karanlık oda ya da yanan bir lamba
  let inside: ReactNode = null;
  if (v < 0.32) inside = <rect x={x + 2} y={y + h * 0.18} width={w - 4} height={h * 0.8} fill="#f3efe6" opacity="0.5" />;
  else if (v < 0.55) inside = <rect x={x} y={y + (arch ? w / 2 : 0)} width={w} height={h * (0.2 + (v - 0.32) * 2)} fill="#d8cab0" opacity="0.92" />;
  else if (v < 0.66) inside = <rect x={x + 2} y={y + h * 0.3} width={w - 4} height={h * 0.66} fill="#f6d79b" opacity="0.45" />;
  return (
    <g>
      <rect x={x} y={y + h + 3} width={w} height="14" fill={url('stain')} />
      <path d={shape} fill={url('glass')} />
      {inside}
      <path d={`M${x + 3} ${y + h - 3} L${x + w * 0.45} ${y + (arch ? w / 2 : 3)} L${x + w * 0.62} ${y + (arch ? w / 2 : 3)} L${x + w * 0.2} ${y + h - 3} Z`} fill="#fff" opacity="0.1" />
      <path d={shape} fill="none" stroke={trim} strokeWidth="3" />
      {Array.from({ length: panes - 1 }, (_, i) => (
        <rect key={i} x={x + (w * (i + 1)) / panes - 1.25} y={y + (arch ? w / 2 : 0)} width="2.5" height={h - (arch ? w / 2 : 0)} fill={trim} />
      ))}
      <rect x={x} y={y + (arch ? w / 2 : h * 0.3)} width={w} height="2" fill={trim} />
      <rect x={x - 4} y={y + h + 1} width={w + 8} height="4" fill={trim} />
      <rect x={x - 4} y={y + h + 5} width={w + 8} height="2" fill="#000" opacity="0.18" />
    </g>
  );
}

function Balcony({ x, y, w }: { x: number; y: number; w: number }) {
  // y: döşemenin üst yüzü
  return (
    <g>
      <rect x={x} y={y + 5} width={w} height="10" fill={url('drop')} />
      {Array.from({ length: Math.floor(w / 6) }, (_, i) => (
        <rect key={i} x={x + 3 + i * 6} y={y - 20} width="1.4" height="20" fill="#3b3f43" opacity="0.85" />
      ))}
      <rect x={x} y={y - 22} width={w} height="2.5" fill="#3b3f43" />
      <rect x={x - 2} y={y} width={w + 4} height="5" fill="#d9d5cc" />
      <rect x={x - 2} y={y + 3.5} width={w + 4} height="1.5" fill="#000" opacity="0.2" />
    </g>
  );
}

export function Building({ b, p, onDown }: { b: BuildingShape; p: Paint; onDown?: (e: ReactPointerEvent) => void }) {
  const top = topOf(b);
  const shopTop = GROUND - b.groundH;
  const floors = Array.from({ length: b.floors }, (_, i) => shopTop - (i + 1) * b.floorH);
  let body: ReactNode;

  if (b.facade === 'cam') {
    const gap = b.w / b.cols;
    body = (
      <>
        <rect x={b.x} y={top} width={b.w} height={shopTop - top} fill={p.wall} />
        {floors.map((fy) => (
          <g key={fy}>
            <rect x={b.x + 6} y={fy + 4} width={b.w - 12} height={b.floorH - 16} fill={url('curtain')} />
            <rect x={b.x + 6} y={fy + b.floorH - 12} width={b.w - 12} height="12" fill={p.wall} />
            <rect x={b.x + 6} y={fy + b.floorH - 12} width={b.w - 12} height="2" fill="#000" opacity="0.15" />
            {Array.from({ length: b.cols + 1 }, (_, c) => (
              <rect key={c} x={b.x + 6 + c * ((b.w - 12) / b.cols) - 1.5} y={fy + 4} width="3" height={b.floorH - 16} fill={p.trim} />
            ))}
          </g>
        ))}
        {/* camda gökyüzünün yansıması */}
        <polygon points={`${b.x + gap * 1.2},${top} ${b.x + gap * 2.6},${top} ${b.x + gap * 1.4},${shopTop} ${b.x},${shopTop} ${b.x},${top + 120}`} fill="#fff" opacity="0.1" pointerEvents="none" />
        <polygon points={`${b.x + gap * 4},${top} ${b.x + gap * 4.5},${top} ${b.x + gap * 3.2},${shopTop} ${b.x + gap * 2.7},${shopTop}`} fill="#fff" opacity="0.08" pointerEvents="none" />
      </>
    );
  } else if (b.facade === 'tas') {
    const gap = b.w / b.cols;
    const ww = Math.min(gap * 0.42, 34);
    body = (
      <>
        <rect x={b.x} y={top} width={b.w} height={shopTop - top} fill={p.wall} />
        <rect x={b.x} y={top} width={b.w} height={shopTop - top} fill={url('ashlar')} />
        <rect x={b.x} y={top} width="10" height={shopTop - top} fill={p.trim} />
        <rect x={b.x + b.w - 10} y={top} width="10" height={shopTop - top} fill={p.trim} />
        {floors.map((fy, i) => (
          <g key={fy}>
            <rect x={b.x} y={fy + b.floorH - 6} width={b.w} height="6" fill={p.trim} />
            <rect x={b.x} y={fy + b.floorH} width={b.w} height="5" fill={url('drop')} />
            {Array.from({ length: b.cols }, (_, c) => {
              const wx = b.x + gap * (c + 0.5) - ww / 2;
              const wy = fy + b.floorH * 0.12;
              const wh = b.floorH * 0.68;
              return (
                <g key={c}>
                  {/* ahşap panjurlar */}
                  {[wx - ww * 0.5 - 3, wx + ww + 3].map((sx) => (
                    <g key={sx}>
                      <rect x={sx} y={wy + ww * 0.3} width={ww * 0.5} height={wh - ww * 0.3} fill="#55634f" />
                      {Array.from({ length: 6 }, (_, k) => (
                        <rect key={k} x={sx} y={wy + ww * 0.3 + 4 + k * ((wh - ww * 0.3) / 6)} width={ww * 0.5} height="1.2" fill="#000" opacity="0.25" />
                      ))}
                    </g>
                  ))}
                  <Window x={wx} y={wy} w={ww} h={wh} trim={p.trim} v={rnd(b.id, i * 10 + c)} arch />
                  <path d={`M${wx - 5} ${wy + ww / 2} A${ww / 2 + 5} ${ww / 2 + 5} 0 0 1 ${wx + ww + 5} ${wy + ww / 2}`} fill="none" stroke={p.trim} strokeWidth="4" />
                  <rect x={wx + ww / 2 - 3} y={wy - 7} width="6" height="8" fill={p.trim} />
                </g>
              );
            })}
          </g>
        ))}
      </>
    );
  } else {
    // apartman, cumbalı apartman ve tuğla bina aynı pencere düzeninden çıkar
    const cumba = b.facade === 'cumba';
    const bay = { x: b.x + b.w * 0.27, w: b.w * 0.46 };
    const cols = cumba ? [b.x + b.w * 0.135, bay.x + bay.w * 0.27, bay.x + bay.w * 0.73, b.x + b.w * 0.865] : Array.from({ length: b.cols }, (_, c) => b.x + (b.w / b.cols) * (c + 0.5));
    const ww = cumba ? b.w * 0.15 : Math.min((b.w / b.cols) * 0.58, 46);
    body = (
      <>
        <rect x={b.x} y={top} width={b.w} height={shopTop - top} fill={p.wall} />
        {b.facade === 'tugla' && <rect x={b.x} y={top} width={b.w} height={shopTop - top} fill={url('brick')} />}
        {cumba && (
          <g>
            <rect x={bay.x + bay.w} y={top} width="8" height={shopTop - top - 6} fill="#000" opacity="0.16" />
            <rect x={bay.x - 3} y={top} width={bay.w + 6} height={shopTop - top - 6} fill={p.wall} />
            <rect x={bay.x - 3} y={top} width={bay.w + 6} height={shopTop - top - 6} fill="#fff" opacity="0.08" />
            <rect x={bay.x - 3} y={top} width="3" height={shopTop - top - 6} fill="#fff" opacity="0.18" />
            <polygon points={`${bay.x - 3},${shopTop - 6} ${bay.x + bay.w + 3},${shopTop - 6} ${bay.x + bay.w - 10},${shopTop} ${bay.x + 10},${shopTop}`} fill="#000" opacity="0.22" />
          </g>
        )}
        {floors.map((fy, i) => (
          <g key={fy}>
            <rect x={b.x} y={fy + b.floorH - 4} width={b.w} height="4" fill={p.trim} opacity="0.55" />
            {cols.map((cx, c) => {
              const wx = cx - ww / 2;
              const wy = fy + b.floorH * 0.14;
              const wh = b.floorH * 0.6;
              return (
                <g key={c}>
                  {b.facade === 'tugla' && <rect x={wx - 4} y={wy - 7} width={ww + 8} height="6" fill={p.trim} />}
                  <Window x={wx} y={wy} w={ww} h={wh} trim={p.trim} v={rnd(b.id, i * 10 + c)} panes={ww > 34 ? 3 : 2} />
                  {b.balcony && rnd(b.id, 100 + c) > 0.35 && <Balcony x={wx - 8} y={fy + b.floorH - 6} w={ww + 16} />}
                </g>
              );
            })}
          </g>
        ))}
      </>
    );
  }

  return (
    <g onPointerDown={onDown} style={onDown && { cursor: 'pointer' }}>
      <Roof b={b} top={top} p={p} />
      {body}
      <rect x={b.x} y={top} width={b.w} height={shopTop - top} fill={url('shade')} pointerEvents="none" />
      <rect x={b.x} y={top} width={b.w} height={shopTop - top} fill={url('side')} pointerEvents="none" />
      <rect x={b.x} y={top} width={b.w} height={GROUND - top} filter={url('grain')} pointerEvents="none" />
      <Shopfront b={b} p={p} />
      <rect x={b.x + b.w - 2} y={top} width="2" height={GROUND - top} fill="#000" opacity="0.22" pointerEvents="none" />
    </g>
  );
}

function Roof({ b, top, p }: { b: BuildingShape; top: number; p: Paint }) {
  if (b.roof === 'kirma')
    return (
      <g>
        <polygon points={`${b.x - 8},${top} ${b.x + b.w + 8},${top} ${b.x + b.w - 26},${top - 40} ${b.x + 26},${top - 40}`} fill={url('tile')} />
        {[0.25, 0.5, 0.75].map((k) => (
          <line key={k} x1={b.x - 8 + k * 8} y1={top - 40 * (1 - k)} x2={b.x + b.w + 8 - k * 34} y2={top - 40 * (1 - k)} stroke="#000" strokeOpacity="0.15" />
        ))}
        <rect x={b.x - 8} y={top - 4} width={b.w + 16} height="5" fill={p.trim} />
        <rect x={b.x} y={top + 1} width={b.w} height="8" fill={url('drop')} />
        <rect x={b.x + b.w * 0.7} y={top - 54} width="12" height="22" fill="#8c7b6b" />
      </g>
    );
  if (b.roof === 'sundurma')
    // tek katlı dükkânların sac sundurması: önde eğimli saçak, arkasında tabela bandı
    return (
      <g>
        <rect x={b.x} y={top - 36} width={b.w} height="36" fill={p.wall} />
        <rect x={b.x} y={top - 36} width={b.w} height="36" fill={url('face')} opacity="0.6" />
        <polygon points={`${b.x - 10},${top - 36} ${b.x + b.w + 10},${top - 36} ${b.x + b.w + 4},${top - 54} ${b.x - 4},${top - 54}`} fill={p.trim} />
        {Array.from({ length: Math.floor(b.w / 14) }, (_, i) => (
          <line key={i} x1={b.x + 4 + i * 14} y1={top - 53} x2={b.x - 6 + i * 14.6} y2={top - 37} stroke="#000" strokeOpacity="0.18" />
        ))}
        <rect x={b.x - 10} y={top - 38} width={b.w + 20} height="4" fill="#fff" opacity="0.25" />
        <rect x={b.x} y={top - 34} width={b.w} height="8" fill={url('drop')} />
      </g>
    );
  if (b.roof === 'kornis')
    return (
      <g>
        <rect x={b.x} y={top - 20} width={b.w} height="12" fill={p.wall} />
        <rect x={b.x - 5} y={top - 9} width={b.w + 10} height="9" fill={p.trim} />
        {Array.from({ length: Math.floor((b.w + 10) / 8) }, (_, i) => (
          <rect key={i} x={b.x - 4 + i * 8} y={top - 1} width="4" height="4" fill={p.trim} />
        ))}
        <rect x={b.x - 5} y={top + 3} width={b.w + 10} height="8" fill={url('drop')} />
        <rect x={b.x - 2} y={top - 24} width={b.w + 4} height="5" fill={p.trim} />
      </g>
    );
  return (
    <g>
      {b.penthouse && (
        <g>
          <rect x={b.x + b.w * 0.18} y={top - 40} width={b.w * 0.64} height="40" fill={p.wall} />
          <rect x={b.x + b.w * 0.18} y={top - 40} width={b.w * 0.64} height="40" fill="#000" opacity="0.08" />
          <rect x={b.x + b.w * 0.3} y={top - 32} width={b.w * 0.4} height="20" fill={url('glass')} stroke={p.trim} strokeWidth="2.5" />
          <rect x={b.x + b.w * 0.15} y={top - 44} width={b.w * 0.7} height="5" fill={p.trim} />
          {/* çatıdaki su deposu */}
          <rect x={b.x + b.w * 0.86 - 14} y={top - 24} width="22" height="14" rx="3" fill="#9aa0a5" />
          <rect x={b.x + b.w * 0.86 - 14} y={top - 24} width="22" height="4" rx="2" fill="#b7bcc0" />
        </g>
      )}
      <rect x={b.x - 2} y={top - 10} width={b.w + 4} height="10" fill={p.trim} />
      <rect x={b.x - 2} y={top - 10} width={b.w + 4} height="2" fill="#fff" opacity="0.3" />
      <rect x={b.x} y={top} width={b.w} height="6" fill={url('drop')} />
    </g>
  );
}

/** Zemin kat: kaplamalı ayaklar, kepenk kutusu, içi loş vitrinler ve cam kapı. */
function Shopfront({ b, p }: { b: BuildingShape; p: Paint }) {
  const top = GROUND - b.groundH;
  const glassTop = top + 34;
  const door = b.x + Math.round(b.w * 0.64);
  const doorW = Math.min(30, b.w * 0.2);
  const lights = Math.max(2, Math.round(b.w / 40));
  return (
    <g>
      <rect x={b.x} y={top} width={b.w} height={b.groundH} fill={p.shop} />
      <rect x={b.x} y={top} width={b.w} height={b.groundH} fill={url('face')} opacity="0.7" />
      {/* kepenk kutusu */}
      <rect x={b.x + 6} y={glassTop - 10} width={b.w - 12} height="10" fill="#8f9398" />
      <rect x={b.x + 6} y={glassTop - 10} width={b.w - 12} height="2" fill="#b9bdc1" />
      <rect x={b.x + 6} y={glassTop - 2} width={b.w - 12} height="2" fill="#000" opacity="0.3" />
      <rect x={b.x + 6} y={glassTop} width={b.w - 12} height={GROUND - glassTop - 4} fill={url('shop')} />
      {/* dükkânın içi: tavan ışıkları ve raflar */}
      {Array.from({ length: lights }, (_, i) => (
        <ellipse key={i} cx={b.x + ((i + 0.5) * b.w) / lights} cy={glassTop + 6} rx="9" ry="3" fill="#ffe8b0" opacity="0.55" />
      ))}
      {[0.45, 0.68].map((k) => (
        <rect key={k} x={b.x + 10} y={glassTop + (GROUND - glassTop) * k} width={door - b.x - 18} height="2" fill="#6f655a" opacity="0.6" />
      ))}
      <rect x={b.x + 6} y={glassTop} width={b.w - 12} height={(GROUND - glassTop) * 0.4} fill="#fff" opacity="0.06" />
      {/* doğrama: kapı ve camları bölen dikmeler */}
      <rect x={door - 3} y={glassTop} width="3" height={GROUND - glassTop - 4} fill="#2b2e31" />
      <rect x={door + doorW} y={glassTop} width="3" height={GROUND - glassTop - 4} fill="#2b2e31" />
      <rect x={door + doorW / 2 - 6} y={glassTop + 30} width="12" height="2.5" fill="#b9bdc1" />
      <rect x={b.x + 6} y={glassTop} width="3" height={GROUND - glassTop - 4} fill="#2b2e31" />
      <rect x={b.x + b.w - 9} y={glassTop} width="3" height={GROUND - glassTop - 4} fill="#2b2e31" />
      <rect x={b.x} y={GROUND - 5} width={b.w} height="5" fill="#77736c" />
    </g>
  );
}

