import { PRODUCTS } from './data';

/* Sade köy mallarının çizim tarifleri (Packs.tsx çizer): biçim, renk, etiket. */

/** Rafın ön kenarındaki ve paketteki kısa ad: parantezsiz, büyük harf, en çok on harf. */
export function labelOf(id: string) {
  const name = PRODUCTS.find((p) => p.id === id)?.name.replace(/ \(.*\)$/, '') ?? id;
  const up = name.toLocaleUpperCase('tr-TR');
  return up.length <= 10 ? up : up.split(' ')[0].slice(0, 10);
}

export type PackSpec = { shape: 'box' | 'bag' | 'bottle' | 'roll' | 'small'; body: string; band: string; label: string; ink?: string; w?: number; h?: number };

export const PACKS: Record<string, PackSpec> = {
  tuz: { shape: 'box', body: '#f4f6f8', band: '#1e88e5', label: 'TUZ', w: 14, h: 24 },
  kibrit: { shape: 'small', body: '#c0392b', band: '#f1c40f', label: 'KİBRİT', ink: '#3a2a1a' },
  mercimek: { shape: 'bag', body: '#e67e22', band: '#fff3e0', label: 'MERCİMEK', ink: '#a84300' },
  bulgur: { shape: 'bag', body: '#c9a04a', band: '#fff8e1', label: 'BULGUR', ink: '#6d4c2f' },
  nohut: { shape: 'bag', body: '#e0c48a', band: '#5d4037', label: 'NOHUT' },
  fasulye: { shape: 'bag', body: '#f5f1e6', band: '#2e7d32', label: 'FASULYE' },
  camasir: { shape: 'bottle', body: '#e3f2fd', band: '#1565c0', label: 'ÇAMAŞIR' },
  sampuan: { shape: 'bottle', body: '#8e24aa', band: '#f3e5f5', label: 'ŞAMPUAN', ink: '#6a1b9a', w: 16, h: 36 },
  kolonya: { shape: 'bottle', body: '#fff59d', band: '#2e7d32', label: 'KOLONYA', w: 14, h: 34 },
  ketcap: { shape: 'bottle', body: '#c62828', band: '#fff', label: 'KETÇAP', ink: '#c62828', w: 14, h: 32 },
  mayonez: { shape: 'bottle', body: '#fff3cd', band: '#1565c0', label: 'MAYONEZ', w: 14, h: 32 },
  su: { shape: 'bottle', body: '#d6ecfa', band: '#0277bd', label: 'SU', w: 14, h: 40 },
  tuvalet: { shape: 'roll', body: '#fafafa', band: '#80cbc4', label: '' },
  pil: { shape: 'small', body: '#212121', band: '#ffb300', label: 'PİL', ink: '#212121' },
  tereyag: { shape: 'small', body: '#ffe082', band: '#2e7d32', label: 'TEREYAĞ', ink: '#fff' },
  kasar: { shape: 'small', body: '#f9d65c', band: '#c62828', label: 'KAŞAR' },
  margarin: { shape: 'small', body: '#fff176', band: '#1565c0', label: 'MARGARİN' },
  ton: { shape: 'small', body: '#1565c0', band: '#fff', label: 'TON', ink: '#1565c0' },
  helva: { shape: 'small', body: '#8d6e63', band: '#f5f0e1', label: 'HELVA', ink: '#5d4037' },
  dismacunu: { shape: 'small', body: '#fff', band: '#e53935', label: 'DİŞ MAC.' },
  cakmak: { shape: 'small', body: '#ff7043', band: '#263238', label: 'ÇAKMAK' },
  ampul: { shape: 'small', body: '#fffde7', band: '#f9a825', label: 'AMPUL', ink: '#5d4037' },
  kahve: { shape: 'box', body: '#4e342e', band: '#d7b56d', label: 'KAHVE', ink: '#4e342e', w: 16, h: 26 },
  tahin: { shape: 'box', body: '#d7b56d', band: '#5d4037', label: 'TAHİN', w: 16, h: 24 },
  lokum: { shape: 'box', body: '#f8bbd0', band: '#ad1457', label: 'LOKUM', w: 22, h: 14 },
  cips: { shape: 'bag', body: '#fdd835', band: '#e53935', label: 'CİPS', w: 18, h: 30 },
  kraker: { shape: 'small', body: '#ffcc80', band: '#6d4c2f', label: 'KRAKER' },
  irmik: { shape: 'bag', body: '#fff8e1', band: '#f9a825', label: 'İRMİK', ink: '#8d6e00' },
  zeytinyagi: { shape: 'bottle', body: '#9e9d24', band: '#1b5e20', label: 'Z.YAĞI', w: 14, h: 40 },
  sirke: { shape: 'bottle', body: '#7b1f3a', band: '#f5f0e1', label: 'SİRKE', ink: '#7b1f3a', w: 13, h: 36 },
  pulbiber: { shape: 'bag', body: '#c62828', band: '#fff3e0', label: 'PUL BİBER', ink: '#b71c1c', w: 16, h: 24 },
  pekmez: { shape: 'bottle', body: '#3e2723', band: '#d7b56d', label: 'PEKMEZ', ink: '#3e2723', w: 15, h: 30 },
  yumusatici: { shape: 'bottle', body: '#f8bbd0', band: '#7b1fa2', label: 'YUMUŞAT.', w: 17, h: 38 },
  mendil: { shape: 'box', body: '#e1f5fe', band: '#29b6f6', label: 'MENDİL', ink: '#01579b', w: 22, h: 12 },
  kola: { shape: 'bottle', body: '#3b1d12', band: '#d32f2f', label: 'KOLA', w: 13, h: 38 },
  salam: { shape: 'small', body: '#e57373', band: '#fff', label: 'SALAM', ink: '#b71c1c' },
  ayran: { shape: 'small', body: '#fafafa', band: '#1e88e5', label: 'AYRAN', ink: '#fff' },
};

