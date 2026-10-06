import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { H, W } from './trafficModel';

/** Trafik haritasının SVG'si için kaydırma (sürükleme) ve yakınlaştırma (düğmeler, imlecin çevresinde tekerlek). */

// açılışta ofis (Levent) ile ev (Bağcılar) birlikte görünür
export const HOME_VIEW = { x: 0, y: -25, k: 1.4 };

export interface View {
  x: number;
  y: number;
  k: number;
}

export function clampView(v: View): View {
  const k = Math.min(3.2, Math.max(1, v.k));
  return { k, x: Math.min(0, Math.max(W * (1 - k), v.x)), y: Math.min(0, Math.max(H * (1 - k), v.y)) };
}

export function useMapView() {
  const [view, setView] = useState<View>(HOME_VIEW);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ px: number; py: number; v: View } | null>(null);

  function zoom(factor: number, cx = W / 2, cy = H / 2) {
    setView((v) => {
      const k = Math.min(3.2, Math.max(1, v.k * factor));
      return clampView({ k, x: cx - ((cx - v.x) * k) / v.k, y: cy - ((cy - v.y) * k) / v.k });
    });
  }

  function toMap(e: { clientX: number; clientY: number }) {
    const rect = svgRef.current!.getBoundingClientRect();
    // viewBox geniş eksene göre kesilir
    const s = Math.max(W / rect.width, H / rect.height);
    return { s, x: (e.clientX - rect.left) * s - (rect.width * s - W) / 2, y: (e.clientY - rect.top) * s - (rect.height * s - H) / 2 };
  }

  function onPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    drag.current = { px: e.clientX, py: e.clientY, v: view };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (!drag.current) return;
    const { s } = toMap(e);
    const { px, py, v } = drag.current;
    setView(clampView({ ...v, x: v.x + (e.clientX - px) * s, y: v.y + (e.clientY - py) * s }));
  }

  // İmlecin çevresinde tekerlekle yakınlaştırma (pasif değil, uygulamanın gövdesi kaymasın diye).
  const zoomRef = useRef({ zoom, toMap });
  useEffect(() => {
    zoomRef.current = { zoom, toMap };
  });
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = zoomRef.current.toMap(e);
      zoomRef.current.zoom(e.deltaY < 0 ? 1.18 : 1 / 1.18, p.x, p.y);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const endDrag = () => {
    drag.current = null;
  };

  return {
    view,
    svgRef,
    zoom,
    reset: () => setView(HOME_VIEW),
    handlers: { onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag },
  };
}
