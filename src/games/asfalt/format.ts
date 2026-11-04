/* İşin ve hakediş fişinin birimleri: lira, ton ve litre. */

/** Bir hücre yapıştırıcı kaç litre bitüm emülsiyonu. */
export const TACK_LITRE = 0.6;
/** Bir hücre kaç kilo. */
export const KG_PER_CELL = 25;

export const money = (n: number) => `${Math.round(n).toLocaleString('tr-TR')} ₺`;
export const tons = (cells: number) => `${((cells * KG_PER_CELL) / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} t`;
