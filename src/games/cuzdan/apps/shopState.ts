import type { Category, Year } from '../data';
import type { Basket, Persona } from '../model';

/** Raftaki bir ürün: o yılın fiyatıyla; dönem ürünleri `donem` rafında, etiketiyle. */
export interface Goods {
  id: string;
  name: string;
  unit: string;
  emoji: string;
  cat: Category | 'donem';
  price: number;
  tag?: string;
  soldOut?: boolean;
  /** Kişi başı satış sınırı (2022'de ayçiçek yağı gibi). */
  limit?: number;
}

/** Fişin bir satırı: bugün satılmıyorsa `now` null, yerine ne geldiği `nowNote`. */
export interface Line {
  id: string;
  name: string;
  n: number;
  then: number;
  now: number | null;
  nowNote?: string;
}

/** Zaman Bakkalı'nın üç çağının (portal, Web 2.0, uygulama) paylaştığı sepet durumu. */
export interface Shop {
  year: Year;
  persona: Persona;
  goods: Goods[];
  /** O yılın manşeti ve kayan haberleri. */
  headline: string;
  news: string[];
  wallet: number;
  left: number;
  basket: Basket;
  count: number;
  spent: number;
  /** Bugün hâlâ satılanların o yılki ve bugünkü tutarı, kaç kat pahalandığı. */
  then: number;
  now: number;
  k: number;
  lines: Line[];
  paid: boolean;
  warn: string;
  add: (g: Goods) => void;
  remove: (g: Goods) => void;
  pay: () => void;
  reset: () => void;
}
