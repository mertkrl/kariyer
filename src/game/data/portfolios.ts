/*
 * CV'deki site bağlantıları: yalnızca sitesi olan adaylar. Yapay zekâ bunları açmaz, yalnızca
 * CV'deki kelimeleri sayar; oyuncu açarsa CV'nin dolu mu, ilana göre cilalanmış bir kâğıt mı
 * olduğunu sitenin kendisinden görür. Siteler components/pc/sites altında çizilir.
 */

/** Oyunun içinde açılan siteler. */
export type SiteId = 'cafe' | 'genie' | 'mert' | 'deniz' | 'tolga' | 'zeynep' | 'ferhat' | 'volkan';

export interface Portfolio {
  /** CV'de görünen adres. */
  link: string;
  site: SiteId;
  /** CV'nin Projeler bölümündeki adı ve tek cümlelik açıklaması. */
  name: string;
  desc: string;
}

/** Sitesi olmayan, yalnızca CV'de anlatılan bir proje. */
export interface Project {
  name: string;
  desc: string;
}

const PORTFOLIOS: Record<string, Portfolio> = {
  // emek verilmiş küçük bir iş: gerçek bir kafenin baştan sona çalışan sipariş sitesi
  selin: { link: 'durakkahve.com.tr', site: 'cafe', name: 'Durak Kahve sipariş sitesi', desc: 'Üç şubeli bir kafe için telefondan sipariş ve sıra takibi (freelance, 2025).' },
  // cilalı boş: site üreticisinin şablonu, içi doldurulmamış
  serkan: { link: 'serkanucar.sitegenie.app', site: 'genie', name: 'NexaFlow', desc: 'Innovative full-stack digital solutions platform.' },
  // güçlü: gerçek müşteriler, her projede kendi payı ayrı yazılmış
  mert: { link: 'mertaydin.studio', site: 'mert', name: 'Stüdyo portfolyosu', desc: 'Dört yılda yaptığım 23 müşteri işi; her birinde kendi payım ayrı yazılı.' },
  // yapay zekâyla yapmış ama işini anlıyor: çalışan bir demo
  deniz: { link: 'kargotakip.denizarslan.dev', site: 'deniz', name: 'Hızlı Kargo takip', desc: 'Bir kargo firmasının Ankara bölgesinde denediği takip ve fiyat hesaplama sitesi.' },
  // "maaşlı deneyim 0": gönüllü yaptığı, herkesin kullanabildiği bir dernek sitesi
  tolga: { link: 'isikdernegi.org.tr', site: 'tolga', name: 'Işık Derneği sitesi', desc: 'Görme engelliler derneği için ekran okuyucuyla kullanılabilen site (gönüllü).' },
  // "Java bulunamadı": stoku, indirimi, kargosu düzgün çalışan küçük bir market
  zeynep: { link: 'egesepeti.com', site: 'zeynep', name: 'Ege Sepeti', desc: 'Ege üreticilerinin ürünlerini satan küçük bir online market (hafta sonu projesi).' },
  // sıradan görünen ama güçlü: eski usul ama her şeyi doğru çalışan bir hırdavatçı sitesi
  ferhat: { link: 'gulerhirdavat.com', site: 'ferhat', name: 'Güler Hırdavat', desc: 'Mahalle hırdavatçısı için stoklu ürün listesi ve WhatsApp siparişi.' },
  // güzel ama payı belirsiz: altında bir ajansın ve 6 kişilik ekibin adı yazan restoran sitesi
  volkan: { link: 'narlokanta.com', site: 'volkan', name: 'Nar Lokanta', desc: 'Restoran sitesi ve online rezervasyon sistemi.' },
};

/** Adayın CV'deki sitesi; yoksa undefined. */
export const portfolioOf = (id: string): Portfolio | undefined => PORTFOLIOS[id];

/** Sitesi olan adaylar. */
export const hasSite = (id: string) => id in PORTFOLIOS;

/** Sitesi olmayan projeler: iyi bir aday her işini bir siteye koymaz, zayıf biri de koyabilir. */
const PROJECTS: Record<string, Project[]> = {
  irem: [{ name: 'Depo talep tahmini', desc: 'Veriyol\'da stok fazlasını azaltan tahmin modeli; ilk çeyrekte depo maliyeti %12 düştü.' }],
  kaan: [{ name: 'Gece raporlama', desc: 'Finans raporlarının üretimini 6 saatten 40 dakikaya indiren yeniden yazım.' }],
  murat: [{ name: 'ERP maliyet modülü', desc: 'Tekstil üretiminde parti başına maliyet hesabı; 12 yıl denetimden bulgusuz geçti.' }],
  onur: [{ name: 'Durak yoğunluğu (bitirme projesi)', desc: 'Belediye otobüs verisiyle durak yoğunluğu tahmini; ders projesi.' }],
  okan: [{ name: 'Kulüp tanıtım sunumu', desc: 'Girişimcilik kulübünün sponsorluk sunumu ve etkinlik planı.' }],
  melis: [{ name: 'Satış paneli', desc: 'Yarı zamanlı çalıştığı firmada haftalık satışları gösteren Power BI paneli.' }],
};

/** CV'deki Projeler bölümü: önce sitesi olan proje, sonra diğerleri. */
export function projectsOf(id: string): (Project & { link?: string; site?: SiteId })[] {
  const p = PORTFOLIOS[id];
  return [...(p ? [p] : []), ...(PROJECTS[id] ?? [])];
}
