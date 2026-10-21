/** Defterin sayfaları: oyuncunun kendi mürekkebi ve klavyeyle yazdıkları. Oyun başında boştur. */

export type PageId = 'fiyat' | 'veresiye';

export interface Page {
  /** Mürekkep katmanı (PNG veri adresi). */
  ink: string | null;
  text: string;
}

export type Pages = Record<PageId, Page>;

export const EMPTY_PAGES: Pages = { fiyat: { ink: null, text: '' }, veresiye: { ink: null, text: '' } };
