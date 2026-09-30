import type { Cam } from './kit';

/** One animated day-end tableau, drawn on a 1600×900 virtual stage. */
export interface CityScene {
  caption: string;
  /** (Re)render the static layers at `px` device pixels per stage unit. */
  build(px: number): void;
  update(dt: number, t: number): void;
  draw(g: CanvasRenderingContext2D, t: number, cam: Cam): void;
}
