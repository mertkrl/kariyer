import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';
import { FIT_H, FIT_W, STAGE_H, STAGE_W } from '../desk/DeskRoom';

/** Centre and size of the monitor's screen on the desk stage — where the camera zooms in. */
const SCREEN_CENTER = { x: 720, y: 269.5 };
const SCREEN_SIZE = { w: 596, h: 335 };
const EASE = 'cubic-bezier(0.65, 0, 0.25, 1)';

/**
 * The camera between the desk and the computer: the desk zooms into the monitor while the
 * system UI grows out of its screen. Also where the notification stacks rise from — the mobile
 * on the desk (right), the landline (left), or bottom-right at the computer.
 */
export function useDeskCamera(areaRef: RefObject<HTMLDivElement | null>, atPc: boolean) {
  const [area, setArea] = useState({ w: 1280, h: 720 });
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const measure = () => setArea({ w: el.clientWidth || 1, h: el.clientHeight || 1 });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [areaRef]);

  // seated a step back: the whole desk (and the clock on the wall) always in frame;
  // on a phone-narrow screen the sides may crop rather than shrinking everything to a stamp
  const stageScale = area.w < 820 ? Math.max(area.w / FIT_W, area.h / 1300) : Math.min(area.w / FIT_W, area.h / FIT_H);
  const onStage = (x: number, y: number) => ({ x: area.w / 2 + (x - STAGE_W / 2) * stageScale, y: area.h / 2 + (y - STAGE_H / 2) * stageScale });
  const { x: ox, y: oy } = onStage(SCREEN_CENTER.x, SCREEN_CENTER.y);
  const zoom = Math.max(area.w / (SCREEN_SIZE.w * stageScale), area.h / (SCREEN_SIZE.h * stageScale));

  const deskStyle: CSSProperties = {
    transformOrigin: `${ox}px ${oy}px`,
    transform: atPc ? `translate(${area.w / 2 - ox}px, ${area.h / 2 - oy}px) scale(${zoom})` : 'none',
    transition: `transform 0.7s ${EASE}, filter 0.7s ease`,
    filter: atPc ? 'blur(3px) brightness(0.7)' : 'none',
  };
  const pcStyle: CSSProperties = {
    transformOrigin: '50% 50%',
    transform: atPc ? 'none' : `translate(${ox - area.w / 2}px, ${oy - area.h / 2}px) scale(${1 / zoom})`,
    opacity: atPc ? 1 : 0,
    transition: atPc ? `transform 0.7s ${EASE}, opacity 0.35s ease 0.3s` : `transform 0.7s ${EASE}, opacity 0.25s ease`,
  };

  const mobile = onStage(1482, 636);
  const landline = onStage(245, 496);
  const callStackStyle: CSSProperties | undefined = atPc ? undefined : { left: Math.max(12, landline.x - 170), bottom: Math.max(12, area.h - landline.y + 6) };
  // at the computer they rise over the right column (the day's tally), never over the CV and
  // its decision buttons
  const stackStyle: CSSProperties = atPc
    ? { right: 16, bottom: 58, width: 'var(--pc-side)' }
    : { right: Math.max(12, area.w - mobile.x - 170), bottom: Math.max(12, area.h - mobile.y + 6) };

  return { area, stageScale, deskStyle, pcStyle, stackStyle, callStackStyle };
}
