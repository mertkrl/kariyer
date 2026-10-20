/*
 * Adayların gönderdiği siteler. Her site oyunun içinde çizilen bir bileşendir. İpuçları sayfanın
 * kendisinde durur, kodda değil: bakan bir İK uzmanı da görebilmeli.
 */
import type { ComponentType } from 'react';
import type { SiteId } from '../../../game/data/portfolios';
import { CafeSite } from './CafeSite';
import { DenizSite } from './DenizSite';
import { FerhatSite } from './FerhatSite';
import { GenieSite } from './GenieSite';
import { MertSite } from './MertSite';
import { TolgaSite } from './TolgaSite';
import { VolkanSite } from './VolkanSite';
import { ZeynepSite } from './ZeynepSite';

export type { SiteId };

export interface SiteProps {
  page: string;
  /** Aynı sitede başka bir sayfaya geç. */
  go: (page: string) => void;
  /** Başka bir siteye geç. */
  visit: (site: SiteId) => void;
}

interface SiteDef {
  url: string;
  /** İlki ana sayfa: adres çubuğunda yolu görünmez. */
  pages: string[];
  Component: ComponentType<SiteProps>;
}

export const SITES: Record<SiteId, SiteDef> = {
  cafe: { url: 'durakkahve.test', pages: ['menu', 'subeler', 'kampanyalar', 'siparis'], Component: CafeSite },
  genie: { url: 'serkanucar.sitegenie.test', pages: ['home', '404'], Component: GenieSite },
  mert: { url: 'mertaydin.test', pages: ['home', 'lavanta', 'kitap', 'seramik', 'tasima', 'lab', 'iletisim'], Component: MertSite },
  tolga: { url: 'isikdernegi.test', pages: ['home', 'etkinlikler', 'gonullu'], Component: TolgaSite },
  zeynep: { url: 'egesepeti.test', pages: ['home', 'sepet'], Component: ZeynepSite },
  ferhat: { url: 'gulerhirdavat.test', pages: ['home', 'liste', 'adres'], Component: FerhatSite },
  volkan: { url: 'narlokanta.test', pages: ['home', 'menu', 'rezervasyon'], Component: VolkanSite },
  deniz: { url: 'kargotakip.denizarslan.test', pages: ['home', 'fiyat'], Component: DenizSite },
};
