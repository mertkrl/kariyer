import { isRecord } from '../../arcade/saveSlot';
import type { Debt, LogEntry, Memories } from './data';
import type { Pages } from './pages';
import type { Receipt } from './returns';
import type { Flow, Stock } from './week';

/*
 * Dükkânın kaydı: her akşam kepenk inince (gün sonu kartı açıkken) yazılır, dükkân Şükrü Amca'ya
 * teslim edilince ya da batınca silinir. Oyuncu döndüğünde aynı akşamın gün sonu kartından,
 * siparişini vermeden devam eder. Gün ortası kaydedilmez: müşteri sırası yarıda kalmaz.
 */

export const SAVE_KEY = 'kariyerweb-bakkal-v1';

export interface ShopSave {
  v: 1;
  seed: number;
  day: number;
  rep: number;
  repAtDayStart: number;
  money: number;
  flow: Flow;
  history: number[];
  daySales: number;
  log: LogEntry[];
  pages: Pages;
  memories: Memories;
  away: string[];
  debts: Debt[];
  paidToday: Debt[];
  lostToday: Debt[];
  stock: Stock;
  bread: number;
  order: Stock;
  stale: number;
  spoiled: Stock;
  /** Raftaki bayat mal, rafta tutulacaklar ve bugün satılan bayat (eski kayıtlarda yok). */
  old?: Stock;
  keep?: Record<string, boolean>;
  staleSold?: number;
  /** Dükkânın tuttuğu mallar (eski kayıtlarda yok). */
  carried?: string[];
  short: boolean;
  coins: number;
  ethics: number;
  verdicts: string[];
  deeds: string[];
  lent: boolean;
  /** Çekmecedeki fişler (eski kayıtlarda yok). */
  receipts?: Receipt[];
  /** Kasaya atılıp Z raporuna girmeyen para (eski kayıtlarda yok). */
  hidden?: number;
}

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Kendi kaydımız mı: sürüm, sayılar ve listeler yerinde mi. Gerisi oyunun kendi yazdığı veridir. */
export function isShopSave(v: unknown): v is ShopSave {
  if (!isRecord(v) || v.v !== 1) return false;
  const nums = ['seed', 'day', 'rep', 'repAtDayStart', 'money', 'daySales', 'bread', 'stale', 'coins', 'ethics'] as const;
  const lists = ['history', 'log', 'away', 'debts', 'paidToday', 'lostToday', 'verdicts', 'deeds'] as const;
  const maps = ['flow', 'pages', 'memories', 'stock', 'order', 'spoiled'] as const;
  return nums.every((k) => num(v[k])) && lists.every((k) => Array.isArray(v[k])) && maps.every((k) => isRecord(v[k])) && typeof v.short === 'boolean' && typeof v.lent === 'boolean' && (v.day as number) >= 1;
}
