import type { VehicleKind } from './model';

/** Araçların ölçüsü (hücre): boy, iki tekerin soldan yeri, gövde yüksekliği, teker yarıçapı. */
export const VEHICLE: Record<VehicleKind, { len: number; wheels: [number, number]; h: number; r: number }> = {
  car: { len: 20, wheels: [4, 16], h: 7, r: 2.2 },
  dolmus: { len: 26, wheels: [5, 21], h: 12, r: 2.6 },
  bus: { len: 42, wheels: [8, 34], h: 15, r: 3 },
  truck: { len: 36, wheels: [6, 29], h: 14, r: 3 },
};
