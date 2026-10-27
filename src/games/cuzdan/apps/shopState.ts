import type { Item, Year } from '../data';
import type { Basket, Persona } from '../model';

/** Zaman Bakkalı'nın üç çağının (portal, Web 2.0, uygulama) paylaştığı sepet durumu. */
export interface Shop {
  year: Year;
  persona: Persona;
  wallet: number;
  left: number;
  basket: Basket;
  count: number;
  spent: number;
  /** Aynı sepetin bugünkü tutarı ve kaç kat pahalandığı. */
  now: number;
  k: number;
  lines: Item[];
  paid: boolean;
  warn: string;
  add: (it: Item) => void;
  remove: (it: Item) => void;
  pay: () => void;
  reset: () => void;
}
