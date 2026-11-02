import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { GROUND, hasIllegalBox, topOf, type BuildingShape, type Spec } from './model';
import { rnd, url } from './paint';
import { Balcony, BarePatches, Bracing, Cracks, Eave, IllegalFloor, Lighting, LeanTo, Patch, Roof, Shopfront, Window } from './Parts';

/*
 * Binaların çizimi. Biçim ve kusurlar meydandan, renkler ve mimari seçimler oyuncudan gelir. Beş
 * cephe tipi var: 70'lerin balkonlu apartmanı, cumbalı apartman, tuğla bina, kemerli pencereli
 * eski kâgir bina ve cam giydirme. Cephe malzemesi seçilince duvarın rengi ve dokusu değişir;
 * bölgenin taşı `stone` ile gelir. Kusurlar, onları kapatan seçim yapılana dek görünür kalır.
 */

const MATERIAL: Partial<Record<Spec['cladding'], { fill?: string; tex?: string }>> = {
  tugla: { fill: '#9c5a41', tex: 'brick' },
  ahsap: { fill: '#8a5a36', tex: 'plank' },
  kompozit: { fill: '#aeb8c0', tex: 'panel' },
  tas: { tex: 'ashlar' },
};

const ROOF: Record<Exclude<Spec['roof'], 'mevcut'>, BuildingShape['roof'] | 'yesil'> = { kiremit: 'kirma', teras: 'duz', yesil: 'yesil', kornis: 'kornis' };

export function Building({ b: shape, s, stone, onDown }: { b: BuildingShape; s: Spec; stone: string; onDown?: (e: ReactPointerEvent) => void }) {
  const d = shape.defects ?? {};
  // ruhsatlanan kaçak kat binanın bir katı olur: aynı cephe, aynı pencereler
  const b = d.illegal && s.extra === 'uyumla' ? { ...shape, floors: shape.floors + 1 } : shape;
  const top = topOf(shape, s);
  const shopTop = GROUND - b.groundH;
  const floors = Array.from({ length: b.floors }, (_, i) => shopTop - (i + 1) * b.floorH);
  const fresh = s.cladding !== 'mevcut';
  const mat = MATERIAL[s.cladding];
  const wall = s.cladding === 'tas' ? stone : (mat?.fill ?? s.wall);
  const tex = mat?.tex ?? (s.cladding === 'mevcut' ? (b.facade === 'tugla' ? 'brick' : b.facade === 'tas' ? 'ashlar' : undefined) : undefined);
  const reveal = s.cladding === 'mantolama';
  const roof = s.roof === 'mevcut' ? b.roof : ROOF[s.roof];
  const enclosed = !!d.enclosed && s.railing === 'mevcut';
  let body: ReactNode;

  if (b.facade === 'cam') {
    const gap = b.w / b.cols;
    body = (
      <>
        <rect x={b.x} y={top} width={b.w} height={shopTop - top} fill={wall} />
        {floors.map((fy) => (
          <g key={fy}>
            <rect x={b.x + 6} y={fy + 4} width={b.w - 12} height={b.floorH - 16} fill={url('curtain')} />
            <rect x={b.x + 6} y={fy + b.floorH - 12} width={b.w - 12} height="12" fill={wall} />
            {tex && <rect x={b.x + 6} y={fy + b.floorH - 12} width={b.w - 12} height="12" fill={url(tex)} />}
            <rect x={b.x + 6} y={fy + b.floorH - 12} width={b.w - 12} height="2" fill="#000" opacity="0.15" />
            {Array.from({ length: b.cols + 1 }, (_, c) => (
              <rect key={c} x={b.x + 6 + c * ((b.w - 12) / b.cols) - 1.5} y={fy + 4} width="3" height={b.floorH - 16} fill={s.windows === 'mevcut' ? s.trim : s.windows === 'pvc' ? '#f4f4f2' : s.windows === 'ahsap' ? '#6b4524' : '#33383d'} />
            ))}
          </g>
        ))}
        {/* camda gökyüzünün yansıması */}
        <polygon points={`${b.x + gap * 1.2},${top} ${b.x + gap * 2.6},${top} ${b.x + gap * 1.4},${shopTop} ${b.x},${shopTop} ${b.x},${top + 120}`} fill="#fff" opacity="0.1" pointerEvents="none" />
      </>
    );
  } else if (b.facade === 'tas') {
    const gap = b.w / b.cols;
    const ww = Math.min(gap * 0.42, 34);
    body = (
      <>
        <rect x={b.x} y={top} width={b.w} height={shopTop - top} fill={wall} />
        {tex && <rect x={b.x} y={top} width={b.w} height={shopTop - top} fill={url(tex)} />}
        <rect x={b.x} y={top} width="10" height={shopTop - top} fill={s.trim} />
        <rect x={b.x + b.w - 10} y={top} width="10" height={shopTop - top} fill={s.trim} />
        {floors.map((fy, i) => (
          <g key={fy}>
            <rect x={b.x} y={fy + b.floorH - 6} width={b.w} height="6" fill={s.trim} />
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
                      <rect x={sx} y={wy + ww * 0.3} width={ww * 0.5} height={wh - ww * 0.3} fill={s.windows === 'ahsap' ? '#6b4524' : '#55634f'} />
                      {Array.from({ length: 6 }, (_, k) => (
                        <rect key={k} x={sx} y={wy + ww * 0.3 + 4 + k * ((wh - ww * 0.3) / 6)} width={ww * 0.5} height="1.2" fill="#000" opacity="0.25" />
                      ))}
                    </g>
                  ))}
                  <Window x={wx} y={wy} w={ww} h={wh} trim={s.trim} v={rnd(b.id, i * 10 + c)} arch kind={s.windows} reveal={reveal} />
                  <path d={`M${wx - 5} ${wy + ww / 2} A${ww / 2 + 5} ${ww / 2 + 5} 0 0 1 ${wx + ww + 5} ${wy + ww / 2}`} fill="none" stroke={s.trim} strokeWidth="4" />
                  <rect x={wx + ww / 2 - 3} y={wy - 7} width="6" height="8" fill={s.trim} />
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
        <rect x={b.x} y={top} width={b.w} height={shopTop - top} fill={wall} />
        {tex && <rect x={b.x} y={top} width={b.w} height={shopTop - top} fill={url(tex)} />}
        {cumba && (
          <g>
            <rect x={bay.x + bay.w} y={top} width="8" height={shopTop - top - 6} fill="#000" opacity="0.16" />
            <rect x={bay.x - 3} y={top} width={bay.w + 6} height={shopTop - top - 6} fill={wall} />
            {tex && <rect x={bay.x - 3} y={top} width={bay.w + 6} height={shopTop - top - 6} fill={url(tex)} />}
            <rect x={bay.x - 3} y={top} width={bay.w + 6} height={shopTop - top - 6} fill="#fff" opacity="0.08" />
            <rect x={bay.x - 3} y={top} width="3" height={shopTop - top - 6} fill="#fff" opacity="0.18" />
            <polygon points={`${bay.x - 3},${shopTop - 6} ${bay.x + bay.w + 3},${shopTop - 6} ${bay.x + bay.w - 10},${shopTop} ${bay.x + 10},${shopTop}`} fill="#000" opacity="0.22" />
          </g>
        )}
        {floors.map((fy, i) => (
          <g key={fy}>
            <rect x={b.x} y={fy + b.floorH - 4} width={b.w} height="4" fill={s.trim} opacity="0.55" />
            {cols.map((cx, c) => {
              const wx = cx - ww / 2;
              const wy = fy + b.floorH * 0.14;
              const wh = b.floorH * 0.6;
              const balcony = (b.balcony || d.enclosed) && !cumba && rnd(b.id, 100 + c) > 0.35;
              return (
                <g key={c}>
                  {b.facade === 'tugla' && <rect x={wx - 4} y={wy - 7} width={ww + 8} height="6" fill={s.trim} />}
                  <Window x={wx} y={wy} w={ww} h={wh} trim={s.trim} v={rnd(b.id, i * 10 + c)} panes={ww > 34 ? 3 : 2} kind={s.windows} reveal={reveal} />
                  {balcony && <Balcony x={wx - 8} y={fy + b.floorH - 6} w={ww + 16} h={b.floorH} kind={s.railing} wall={wall} enclosed={enclosed && rnd(b.id, 200 + i * 10 + c) > 0.25} v={rnd(b.id, 400 + i * 10 + c)} />}
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
      <Roof b={b} kind={roof} top={top} trim={s.trim} wall={wall} />
      {d.leanTo && s.roof === 'mevcut' && <LeanTo b={b} top={top - (roof === 'kirma' ? 0 : 10)} />}
      {hasIllegalBox(shape, s) && d.illegal && <IllegalFloor b={b} top={top - (roof === 'kirma' ? 30 : 10)} kind={d.illegal} />}
      {body}
      {!fresh && d.bare && <BarePatches b={b} top={top + 8} bottom={shopTop - 8} />}
      {!fresh && d.patch && b.floors > 0 && <Patch b={b} y={shopTop - b.floorH} h={b.floorH} kind={d.patch} />}
      {d.cracked && s.structure === 'yok' && <Cracks b={b} top={top} bottom={GROUND} />}
      <rect x={b.x} y={top} width={b.w} height={shopTop - top} fill={url('shade')} pointerEvents="none" />
      <rect x={b.x} y={top} width={b.w} height={shopTop - top} fill={url('side')} pointerEvents="none" />
      {/* eski cephede yağmur izleri; yenilenmiş cephe temiz */}
      {!fresh && <rect x={b.x} y={top} width={b.w} height={shopTop - top} fill={url('streaks')} pointerEvents="none" />}
      <rect x={b.x} y={top} width={b.w} height={GROUND - top} filter={url('grain')} pointerEvents="none" />
      <Eave b={b} top={roof === 'sundurma' ? top - 36 : top} kind={s.eave} />
      {s.structure === 'celik' && b.floors > 0 && <Bracing b={b} top={top} bottom={shopTop} />}
      <Shopfront b={b} shop={s.shop} kind={s.shopfront} />
      <Lighting b={b} top={top} kind={s.lighting} floors={floors} />
      <rect x={b.x + b.w - 2} y={top} width="2" height={GROUND - top} fill="#000" opacity="0.22" pointerEvents="none" />
    </g>
  );
}
