import { loadProgress, type Progress } from '../../arcade/progress';
import type { GameRoute } from '../../arcade/slugs';
import { hash01 } from '../../shared/random';

/*
 * Köylülerin şehirden duydukları: mahallenin öteki oyunlarına seyrek göndermeler. Köy İstanbul'dan
 * uzak; haberi şehirdeki oğuldan, kasabaya giden yoldan duyarlar. Oyuncu o oyunu bitirdiyse cümle
 * değişir ("çukuru kapatmışlar"), bitirmediyse dert sürer. Yalnızca oyuncunun kendi defterinden.
 */

const TALK: { route: GameRoute; done: string; waiting: string }[] = [
  { route: 'asfalt', done: "Oğlum İstanbul'dan aradı: sokaklarındaki o çukuru sonunda kapatmışlar.", waiting: "Oğlum İstanbul'dan aradı, sokaklarındaki çukur hâlâ duruyormuş; arabayı içine sokmuş." },
  { route: 'trafik', done: 'Kasabaya inerken kavşakta hiç beklemedim; ışıkları biri adam etmiş.', waiting: 'Kasabanın kavşağında yarım saat bekledim, ışıklar yine şaşkın.' },
  { route: 'iseAlim', done: "Torunum İstanbul'da işe girdi; İK'daki kız CV'sini okumuş, sağ olsun.", waiting: "Torunum İstanbul'da iş arıyor; kırk yere CV atmış, okuyan yok." },
  { route: 'cuzdan', done: 'Dün akşam eski fiyatları konuştuk; simit 250 bindi, hatırladın mı?', waiting: 'Eskiden bu parayla bir haftalık alışveriş yapardık, şimdi bak.' },
];

let cached: Progress | null = null;
const progress = () => (cached ??= loadProgress());

/** Bu köylü bu gün şehirden bir şey anlatır mı; anlatırsa ne. İlk gün (tanıtım) ve çoğu ziyaret sessiz. */
export function cityTalk(day: number, villagerId: string, played: Progress = progress()): string | null {
  if (day < 2) return null;
  const seed = day * 131 + [...villagerId].reduce((s, c) => s + c.charCodeAt(0), 0);
  // ziyaretlerin ~%3'ü: 30 günlük bir oyunda ~9 kez, her cümle bir iki kez (tekrara düşmesin)
  if (hash01(seed) > 0.03) return null;
  const t = TALK[Math.floor(hash01(seed + 7) * TALK.length)];
  return played.played[t.route] ? t.done : t.waiting;
}
