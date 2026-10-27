import type { IconId } from './icons';

/** Cüzdan TL'nin uygulamaları: masaüstünde simge ve pencere, telefonda ana ekran ızgarası. */
export type AppId = 'gunluk' | 'gecmis' | 'ucuz' | 'web' | 'not' | 'saat' | 'muzik' | 'karne';

export const ICONS: { id: AppId & IconId; label: string }[] = [
  { id: 'gunluk', label: 'Günün Sepeti' },
  { id: 'gecmis', label: 'Geçmişi Bil' },
  { id: 'ucuz', label: 'Hangisi Ucuz?' },
  { id: 'web', label: 'Zaman Bakkalı' },
  { id: 'not', label: 'bordro.txt' },
  { id: 'saat', label: 'Saati Geri Al' },
  { id: 'muzik', label: 'Medya Çalar' },
];
