import { useEffect, useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';
import { FIT_H, FIT_W, STAGE_H, STAGE_W } from '../desk/DeskRoom';

/** Masa sahnesindeki monitör ekranının merkezi ve boyutu: kameranın yaklaştığı yer. */
const SCREEN_CENTER = { x: 720, y: 269.5 };
const SCREEN_SIZE = { w: 596, h: 335 };
const EASE = 'cubic-bezier(0.65, 0, 0.25, 1)';

/**
 * Masa ile bilgisayar arasındaki kamera: masa monitöre yaklaşırken sistem arayüzü onun ekranından
 * büyür. Bildirim yığınlarının yükseldiği yer de burası: masadaki cep telefonu (sağ), sabit hat
 * (sol) ya da bilgisayardayken sağ alt.
 */
export function useDeskCamera(areaRef: RefObject<HTMLDivElement | null>, atPc: boolean, screenOff = false, appOpen = false) {
  // ilk açılışta katmanlar yerlerine animasyonsuz oturur (yoksa siyah bir ekran monitöre küçülür);
  // ilk çizimden sonra masa ↔ bilgisayar geçişi her zaman kayar
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // ilk çizimin bitmesini bekle; sonrasında geçişler açılır
    const id = window.setTimeout(() => setReady(true), 60);
    return () => window.clearTimeout(id);
  }, []);

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

  // bir adım geride oturmuş: bütün masa (ve duvardaki saat) her zaman kadrajda;
  // telefon darlığındaki bir ekranda her şeyi bir pul boyutuna küçültmek yerine kenarlar kırpılabilir
  const stageScale = area.w < 820 ? Math.max(area.w / FIT_W, area.h / 1300) : Math.min(area.w / FIT_W, area.h / FIT_H);
  const onStage = (x: number, y: number) => ({ x: area.w / 2 + (x - STAGE_W / 2) * stageScale, y: area.h / 2 + (y - STAGE_H / 2) * stageScale });
  const { x: ox, y: oy } = onStage(SCREEN_CENTER.x, SCREEN_CENTER.y);
  const zoom = Math.max(area.w / (SCREEN_SIZE.w * stageScale), area.h / (SCREEN_SIZE.h * stageScale));

  const deskStyle: CSSProperties = {
    transformOrigin: `${ox}px ${oy}px`,
    transform: atPc ? `translate(${area.w / 2 - ox}px, ${area.h / 2 - oy}px) scale(${zoom})` : 'none',
    transition: ready ? `transform 0.7s ${EASE}, filter 0.7s ease` : 'none',
    filter: atPc ? 'blur(3px) brightness(0.7)' : 'none',
  };
  // masadan bakarken açık bir uygulama varsa aynı bilgisayar görünür: monitörün çerçevesine birebir
  // oturur, kalktığın ekran (açık CV, e-posta…) olduğu gibi kalır (pencere ile monitörün oranı farklıysa
  // görüntü o kadar esner). Uygulama açık değilse masanın kendi küçük masaüstü görünür; o zaman katman
  // eskisi gibi orantılı küçülür ve monitöre yaklaşırken simgeler ikiye görünmesin diye ancak kamera
  // yarı yoldayken belirir.
  const mirror = appOpen && !screenOff;
  const fitX = (SCREEN_SIZE.w * stageScale) / area.w;
  const fitY = (SCREEN_SIZE.h * stageScale) / area.h;
  const shrink = mirror ? `scale(${fitX}, ${fitY})` : `scale(${1 / zoom})`;
  const pcStyle: CSSProperties = {
    transformOrigin: '50% 50%',
    transform: atPc ? 'none' : `translate(${ox - area.w / 2}px, ${oy - area.h / 2}px) ${shrink}`,
    opacity: atPc || mirror ? 1 : 0,
    transition: !ready ? 'none' : mirror ? `transform 0.7s ${EASE}` : atPc ? `transform 0.7s ${EASE}, opacity 0.35s ease 0.3s` : `transform 0.7s ${EASE}, opacity 0.25s ease`,
  };

  const mobile = onStage(1482, 636);
  const landline = onStage(245, 496);
  const callStackStyle: CSSProperties | undefined = atPc ? undefined : { left: Math.max(12, landline.x - 170), bottom: Math.max(12, area.h - landline.y + 6) };
  // bilgisayardayken sağ sütunun (günün sayımı) üstünde yükselirler, asla CV'nin ve
  // karar düğmelerinin üstünde değil
  const stackStyle: CSSProperties = atPc
    ? { right: 16, bottom: 'calc(var(--pc-taskbar) + 16px)', width: 'var(--pc-side)' }
    : { right: Math.max(12, area.w - mobile.x - 170), bottom: Math.max(12, area.h - mobile.y + 6) };

  return { area, stageScale, deskStyle, pcStyle, stackStyle, callStackStyle };
}
