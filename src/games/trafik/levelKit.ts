import type { MoveId, NetSpec } from './model';

/* Bölümlerin ortak parçaları: bölümün biçimi, iki yönün hareketleri ve bütün araçlar açık. */

export interface Level {
  spec: NetSpec;
  title: string;
  place: string;
  /** Vardiya emri: bir iki cümle. */
  order: string;
  /** Tek cümlelik ipucu: emrin altında ve oyunun başında. */
  tip: string;
  /** Tutanakta: bu işi gerçekte kim, nasıl yapar. */
  job: string;
}

export const NS: MoveId[] = ['N.L', 'N.T', 'N.R', 'S.L', 'S.T', 'S.R'];
export const EW: MoveId[] = ['E.L', 'E.T', 'E.R', 'W.L', 'W.T', 'W.R'];
export const ALL = { timing: true, roads: true, detect: true } as const;

