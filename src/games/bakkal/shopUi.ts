import { useState } from 'react';
import { PRICE_PAGE } from './pages';
import { TOUR } from './tourSteps';
import { loadView, saveView, type View } from './access';
import * as sfx from './sfx';

/*
 * Bakkalın yalnızca ekranla ilgili hâli: defter (açık mı, hangi sayfada), hesap makinesi, fiş
 * çekmecesi, görünüm ayarları, ses ve ilk günün tanıtımı. Oyunun sonucunu değiştirmez; dükkânın
 * hâli (kasa, raf, defterdeki borçlar) shopState.ts'te, tezgâhtaki işler BakkalGame.tsx'te.
 */

/** Tanıtımın beklemeli adımları: defteri açmak, levhayı çevirmek, ilk satış. */
export const TOUR_BOOK = TOUR.findIndex((s) => s.wait === 'book');
export const TOUR_SIGN = TOUR.findIndex((s) => s.wait === 'sign');
export const TOUR_SALE = TOUR.findIndex((s) => s.wait === 'sale');

export function useShopUi() {
  const [book, setBook] = useState(false);
  const [bookAt, setBookAt] = useState(1);
  const [calc, setCalc] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [muted, setMuted] = useState(sfx.isMuted());
  const [volume, setVolume] = useState(sfx.getVolume());
  /** Görünüm ayarları: yazı boyutu, kontrast, büyük tuşlar, sakin hareket (access.ts). */
  const [view, setViewState] = useState(loadView);
  /** İlk günün tanıtımında hangi adımdayız (Tour.tsx); null: tanıtım yok ya da bitti. */
  const [tour, setTour] = useState<number | null>(null);

  const setView = (v: View) => {
    setViewState(v);
    saveView(v);
  };

  /** Deftere bir sayfada açık bakılır (veresiye yazarken, tanıtımda fiyat sayfası). */
  const openBookAt = (page: number) => {
    setBookAt(page);
    setBook(true);
  };

  /** Defter: tanıtımda geçen yılın etiket fiyatlarında açılır ve bir sonraki adıma geçilir. */
  const openBook = () => {
    if (tour === TOUR_BOOK) {
      openBookAt(PRICE_PAGE);
      return setTour(TOUR_BOOK + 1);
    }
    setBook((b) => !b);
  };

  /** Tanıtımda ileri, geri ve atla: defter adımının öncesinde ve sonrasında defter açılıp kapanır. */
  const tourTo = (at: number | null) => {
    const reading = at === TOUR_BOOK + 1;
    if (reading) setBookAt(PRICE_PAGE);
    setBook(reading);
    setTour(at === null || at >= TOUR.length ? null : at);
  };

  /** Levha çevrildi: tanıtımda ilk satış adımına geçilir, değilse tanıtım yoktur. */
  const signTurned = () => setTour((at) => (at === TOUR_SIGN ? TOUR_SALE : null));

  const toggleMute = () => {
    sfx.setMuted(!muted);
    setMuted(!muted);
  };
  const changeVolume = (v: number) => {
    sfx.setVolume(v);
    setVolume(v);
  };

  return { book, setBook, bookAt, setBookAt, openBook, openBookAt, calc, setCalc, drawer, setDrawer, view, setView, muted, toggleMute, volume, changeVolume, tour, setTour, tourTo, signTurned };
}

export type ShopUi = ReturnType<typeof useShopUi>;
