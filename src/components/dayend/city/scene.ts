import type { Cam } from './kit';

/** 1600×900 sanal sahneye çizilen, hareketli tek bir gün sonu tablosu. */
export interface CityScene {
  caption: string;
  /** Sabit katmanları sahne birimi başına `px` cihaz pikseliyle (yeniden) çiz. */
  build(px: number): void;
  update(dt: number, t: number): void;
  draw(g: CanvasRenderingContext2D, t: number, cam: Cam): void;
}
