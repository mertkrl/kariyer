import { GAMES } from './games';
import type { Progress } from './progress';
import type { GameRoute } from './slugs';

/*
 * Mahalle Postası: salonun haber satırı. Bitirilen her oyun mahallede bir iz bırakır (manşet);
 * bitirilmeyen durak bir "henüz" satırıyla çağırır. Yalnızca oyuncunun kendi defterinden
 * (progress.ts) okunur; seri, ceza ya da bildirim yok: geri gelmek için bir sebep, zorunluluk değil.
 */

/** Oyun bitince mahallede ne değişti: haber manşeti. */
export const HEADLINES: Record<GameRoute, string> = {
  iseAlim: "Plazadaki İK uzmanı haftayı bitirdi; Cuma akşamı telefonu kapalıydı.",
  test: 'UyumMetre sonuçları açıklandı; kimse şaşırmadı.',
  insaat: 'Şantiyede bina teslim edildi; komşular hâlâ toz şikâyetinde.',
  bakkal: 'Şükrü Amca memleketten döndü; dükkânın hesabını soruyor.',
  ekran: 'Hastanenin sıra ekranı yenilendi; sıra yine uzun ama okunuyor.',
  meydan: 'Meydandaki tabelalar hizaya girdi; kaçak kat konuşuluyor.',
  asfalt: 'Ara sokaktaki çukur kapandı; başkan kurdeleyi kesti.',
  trafik: "Kavşakta yeşil dalga kuruldu; korna sesi yarıya indi.",
  cuzdan: 'Döviz bürosunda eski fiyatlar konuşuluyor: simit 250 bindi.',
};

/** Henüz bitirilmeyen durağın çağrısı. */
export const PENDING: Record<GameRoute, string> = {
  iseAlim: 'Plazada yüzlerce CV sahibini bekliyor.',
  test: 'Plazanın sınav salonunda kalemler dağıtıldı.',
  insaat: 'Şantiyede temel kazılıyor; izleyen amcalar yerini aldı.',
  bakkal: 'Köy bakkalının kepengi kapalı; etiket yok, fiyatı soran çok.',
  ekran: 'Hastane koridorundaki ekran 2009\'dan beri aynı.',
  meydan: 'Meydanda klimalar cepheyi kaplamış, tabelalar birbirine girmiş.',
  asfalt: 'Ara sokaktaki çukur üç aydır orada.',
  trafik: 'Köşedeki kavşak yine kilit.',
  cuzdan: 'Döviz bürosunun önünde eski bir cüzdan bulundu.',
};

/** Her gün yenilenen içerik: aynı gün herkese aynı bölüm. */
export const DAILY: { route: GameRoute; label: string }[] = [
  { route: 'trafik', label: 'Günün kavşağı' },
  { route: 'cuzdan', label: 'Günün sepeti' },
];

export interface News {
  /** Kaç durakta mesai bitti, toplam kaç durak. */
  done: number;
  total: number;
  /** En son bitirilen oyunun manşeti ya da (hiç yoksa) bir durağın çağrısı. */
  line: string;
  /** Manşet hangi oyundan: o durağa götürür. */
  route: GameRoute;
}

/**
 * Salonun haber satırı. En son bitirilen oyunun manşeti; hiç oyun bitmemişse ya da hepsi bittiyse
 * sırası günden güne değişen bir durak. `day`: gün sayısı (aynı gün aynı satır).
 */
export function newsFor(progress: Progress, day: number): News {
  const routes = GAMES.map((g) => g.route);
  const played = routes.filter((r) => progress.played[r]).sort((a, b) => progress.played[b]!.at - progress.played[a]!.at);
  const waiting = routes.filter((r) => !progress.played[r]);
  const base = { done: played.length, total: routes.length };
  if (played.length && (waiting.length === 0 || day % 2 === 0)) return { ...base, line: HEADLINES[played[0]], route: played[0] };
  const pool = waiting.length ? waiting : routes;
  const route = pool[((day % pool.length) + pool.length) % pool.length];
  return { ...base, line: waiting.length ? PENDING[route] : HEADLINES[route], route };
}
