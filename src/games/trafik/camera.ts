import { WORLD } from './scenery';

/*
 * Haritanın kamerası: yakınlık sınırları ve kameranın haritanın dışına kaçmasını engelleyen sınır.
 * Scene çizer, Play oyuncunun ayarını tutar; ikisi de buradan okur.
 */

/**
 * Yakınlık sınırları: en yakında tek şerit; en uzak (bütün harita) ekrana göre hesaplanır, kolların
 * ucu görünür ama çizilmiş mahallenin dışı görünmez. ZOOM_MIN onun hiç inmeyeceği taban.
 */
export const ZOOM_MIN = 0.04;
export const ZOOM_MAX = 4;
/** Uç kavşaktan kameranın gidebileceği en uzak yer (m): şehrin kenarına yakın. */
const REACH = WORLD - 150;

/** Kameranın oyuncu ayarı: yakınlık (1 = bütün ağ) ve merkezin kayması (m). */
export interface Camera {
  zoom: number;
  dx: number;
  dy: number;
}

/**
 * Kamera haritanın dışına kaçmasın: en uzakta (`floor`, bütün harita) hiç kaymaz; yakınlaştıkça kayabileceği
 * yol, şehrin kenarına (REACH) kadar açılır.
 */
export function clampCam(c: Camera, xs: number[], floor = ZOOM_MIN): Camera {
  const zoom = Math.max(floor, Math.min(ZOOM_MAX, c.zoom));
  const room = 1 - floor / zoom;
  const half = ((xs[xs.length - 1] - xs[0]) / 2 + REACH) * room;
  return { zoom, dx: Math.max(-half, Math.min(half, c.dx)), dy: Math.max(-REACH * room, Math.min(REACH * room, c.dy)) };
}
