/*
 * Çarşamba, 11:00, çevrimiçi: haftalık İK toplantısı görüntülü görüşme olarak. Bütün kadronun
 * tek ekranda olduğu tek an. Hakan Bey kamerasını kapalı tutar; önemli olan söylenenler.
 * Ümit kimsenin sormadığı soruyu sorar, Emre ve Ayşe onu kendi hayatlarından cevaplar ve
 * Hakan Bey sana döner.
 */
import type { MeetingChoice } from './echoes';
import { PLAYER } from './player';
import { WEDNESDAY } from './weekdays';

export const MEETING_DAY = WEDNESDAY;
/** 11:00 */
export const MEETING_AT = 180;
/** Günden ne kadar götürdüğü. */
export const MEETING_MINUTES = 35;

export { PLAYER };

export type Speaker = 'hakan' | 'selin' | 'ayse' | 'emre' | 'levent' | 'you' | 'room';

export const SPEAKERS: Record<Exclude<Speaker, 'room'>, { name: string; role: string; color: string }> = {
  hakan: { name: 'Hakan Kaya', role: 'İK Müdürü', color: '#e0b04a' },
  selin: { name: 'Selin Aksoy', role: 'İK', color: '#d9a0c8' },
  ayse: { name: 'Ayşe Demir', role: 'İK uzmanı', color: '#8fcfa0' },
  emre: { name: 'Emre Yıldız', role: 'İK uzmanı', color: '#8fb8e8' },
  levent: { name: 'Ümit Arslan', role: 'Yazılım Ekip Lideri', color: '#c8c2b4' },
  you: { name: PLAYER.name, role: 'Sen', color: '#f4efe4' },
};

export interface Line {
  who: Speaker;
  text: string;
  /** Bu satır söylenirken Selin'in paylaşılan panoya koyduğu (bir sonraki değişikliğe kadar kalır). */
  board?: Board;
  /** Bu satır söylenirken görüşmenin sohbetine düşen. */
  chat?: ChatMessage[];
  /** Biri bu satırda sohbete yazmaya başlar (ve hiç göndermeyebilir). */
  typing?: Speaker;
}

/** Görüşmenin yan sohbetinde bir satır: birinden ya da bir sistem bildirimi; `private` yalnızca senin gördüğün anlamına gelir. */
export interface ChatMessage {
  who: Exclude<Speaker, 'room'> | 'system';
  text: string;
  private?: boolean;
}

/** Paylaşılan panonun sayfaları. */
export type BoardPage = 'overview' | 'people' | 'shortlist' | 'funnel' | 'off';
export type BoardMetric = 'files' | 'avg' | 'ai' | 'invites';
export interface Board {
  page: BoardPage;
  /** Neyin süzüldüğü / işaret edildiği: bir ekip arkadaşı, bir aday ya da huninin bir aşaması. */
  focus?: string[];
  metric?: BoardMetric;
  /** Huni, rastgele elle kontrolü bir öneri olarak gösterir (sen önerdikten sonra). */
  proposal?: boolean;
}

/** Pazartesi'den Çarşamba sabahına günlük başvurular (toplam 1.840). */
export const DAILY_APPLICATIONS: [string, number][] = [
  ['Pzt', 684],
  ['Sal', 719],
  ['Çar', 437],
];
export const TOTAL_APPLICATIONS = 1840;
/** ATS eşiğini (%60) geçip bir insanın kuyruğuna ulaşanlar. */
export const ATS_PASSED = 212;

/** Panonun gösterdiği hâliyle Cuma'nın kısa listesi: tartışmanın konusu olan rakamlar. */
export const SHORTLIST: { id: string; name: string; by: 'ayse' | 'emre'; ats: number; commits: number; gap: number }[] = [
  { id: 'nehir', name: 'Nehir Koç', by: 'ayse', ats: 61, commits: 412, gap: 2 },
  { id: 'berk', name: 'Berk Aydın', by: 'ayse', ats: 74, commits: 96, gap: 0 },
  { id: 'cagan', name: 'Çağan Erdem', by: 'emre', ats: 88, commits: 138, gap: 0 },
  { id: 'sarp', name: 'Sarp Yılmazer', by: 'emre', ats: 97, commits: 0, gap: 0 },
];

/** Ekibin Pazartesi'den Çarşamba sabahına yaptıkları; ekranda gösterilir ve tartışılır. */
export interface TeamStats {
  files: number;
  /** Dosya başına ortalama saniye. */
  avg: number;
  invites: number;
  /** Yapay zekâdan geçirilen dosyaların payı, 0–1. */
  ai: number;
  /** Oyuncunun şimdiye kadarki davetleri, kısa listenin gösterdiği gibi. */
  picks?: { id: string; name: string; ats: number }[];
}

export const COLLEAGUE_STATS: Record<'ayse' | 'emre', TeamStats> = {
  ayse: { files: 26, avg: 71, invites: 5, ai: 0.15 },
  emre: { files: 41, avg: 8, invites: 4, ai: 1 },
};

const pct = (x: number) => `%${Math.round(x * 100)}`;

/**
 * Toplantı rakamları izler: Hakan Bey senin temponu Emre'ninkiyle ve Ayşe'ninkiyle, Ümit bir CV'yi
 * okumanın gerektirdiği süreyle karşılaştırır ve Cuma'ya gelen iki kısa liste çatışır.
 */
export function buildOpening(you: TeamStats): Line[] {
  const { ayse, emre } = COLLEAGUE_STATS;
  const total = you.files + ayse.files + emre.files;
  const fast = you.files > 0 && you.avg < 20;
  // dosya başına birkaç saniye hiç okumak değildir: kimse bunu övmez
  const skimming = you.files > 0 && you.avg < 10;
  const slow = you.avg >= 45;
  const lines: Line[] = [
    { who: 'room', text: 'Görüntülü toplantı. Selin ekranını paylaşıyor: ekibin haftalık panosu açık. Hakan Bey\'in kamerası kapalı.', board: { page: 'overview' }, chat: [{ who: 'selin', text: 'Ekranım görünüyor mu?' }, { who: 'emre', text: 'Görünüyor 👍' }] },
    { who: 'hakan', text: `Başlayalım. Bu hafta 1.840 başvuru geldi; ekip olarak ${total} dosyaya baktık. Gerisini sistem eledi. Verimlilik bu.`, board: { page: 'overview', focus: ['human'] } },
    {
      who: 'selin',
      text: `Kişi bazında ekranda: Emre ${emre.files} dosya, dosya başına ${emre.avg} saniye. Ayşe ${ayse.files} dosya, ${ayse.avg} saniye. Defne ${you.files} dosya, ${you.avg} saniye.`,
      board: { page: 'people', metric: 'avg' },
      chat: [{ who: 'emre', text: '8 saniye 💪' }],
    },
    you.files === 0
      ? { who: 'hakan', text: 'Defne\'nin satırı boş: bu hafta tek dosya kapatmamış. Cumaya kadar bunu değiştirmeni bekliyorum.', board: { page: 'people', metric: 'files', focus: ['you'] } }
      : skimming
      ? { who: 'hakan', text: `Dosya başına ${you.avg} saniye mi? Bu kadar da olmaz. Sistem başvuruların çoğunu zaten eliyor; önüne düşen az sayıdaki CV'ye daha fazla vakit ayır.`, board: { page: 'people', metric: 'avg', focus: ['you'] } }
      : fast
      ? { who: 'hakan', text: `Dosya başına ${you.avg} saniye. Emre'yle birlikte ekibin en hızlısı sensin. Böyle devam.`, board: { page: 'people', metric: 'avg', focus: ['you'] } }
      : slow
        ? { who: 'hakan', text: `Dosya başına ${you.avg} saniye. Ayşe'yle aynı tempodasın. İkinizden de hız bekliyorum; bu hızla hedefler tutmaz.`, board: { page: 'people', metric: 'avg', focus: ['you'] } }
        : { who: 'hakan', text: `Dosya başına ${you.avg} saniye. İdare eder. Biraz daha hız bekliyorum.`, board: { page: 'people', metric: 'avg', focus: ['you'] } },
    { who: 'hakan', text: `Ayşe, sen ${ayse.avg} saniyedesin. Bu hafta en yavaş sensin.`, board: { page: 'people', metric: 'avg', focus: ['ayse'] }, chat: [{ who: 'ayse', text: 'Her hafta aynı tablo 🙄', private: true }] },
    { who: 'ayse', text: 'Bir dakikada bir insanın on yılını okuyorum Hakan Bey. Bu bile az.' },
  ];
  if (fast) lines.push({ who: 'levent', text: `${you.avg} saniyede bir CV okunmaz ki. Ben bir GitHub sayfasına bile daha uzun bakıyorum.`, board: { page: 'people', metric: 'avg', focus: ['you', 'emre'] } });
  else if (slow) lines.push({ who: 'levent', text: 'Açıkçası ben yavaş okuyanlardan yanayım. Cuma karşıma oturacak kişiyi siz seçiyorsunuz.' });
  if (you.ai >= 0.7) lines.push({ who: 'selin', text: `Defne'nin yapay zekâ analizi kullanımı ${pct(you.ai)}. Emre'yle aynı yöntem.`, board: { page: 'people', metric: 'ai', focus: ['you', 'emre'] } });
  else if (you.ai <= 0.2) lines.push({ who: 'emre', text: `Sen sistemi neredeyse hiç kullanmıyorsun (${pct(you.ai)}). O yazılım boşuna mı alındı?`, board: { page: 'people', metric: 'ai', focus: ['you'] } });
  lines.push(
    { who: 'selin', text: `Cuma herkesin kısa listesi mülakata giriyor: Ayşe'den Nehir ve Berk, Emre'den Çağan ve Sarp, Defne'nin ${you.invites} adayı.`, board: { page: 'shortlist' }, chat: [{ who: 'selin', text: 'Kısa liste panoda, üçüncü sekme.' }] },
    { who: 'levent', text: 'Sarp\'ın CV\'si kusursuz ama GitHub\'ı boş. Nehir\'in iki yıl arası var ama yazdığı kod ortada.', board: { page: 'shortlist', focus: ['sarp', 'nehir'] } },
    { who: 'emre', text: 'Sarp\'ın ATS skoru 97. Sistem bunu boşuna vermiyor. Nehir iki yıl çalışmamış.', board: { page: 'shortlist', focus: ['sarp'] }, chat: [{ who: 'emre', text: 'ATS 97 👀' }] },
    { who: 'ayse', text: 'Çocuğuna baktı Emre. Bunu CV\'sine dürüstçe yazdı diye mi eleyeceğiz?', board: { page: 'shortlist', focus: ['nehir'] }, chat: [{ who: 'levent', text: '+1 Ayşe' }] },
    { who: 'levent', text: 'Asıl sorum şu: elenen 1.800 kişinin içinde kaç iyi yazılımcı var, bilen var mı?', board: { page: 'funnel', focus: ['eliminated'] }, chat: [{ who: 'system', text: 'Ümit Arslan el kaldırdı ✋' }] },
    { who: 'hakan', text: 'Sistem eledi, Ümit. Sistemin işi bu.', board: { page: 'funnel', focus: ['threshold'] } },
    { who: 'room', text: 'Kısa bir sessizlik. Kimse mikrofonunu açmıyor.', chat: [{ who: 'system', text: 'Ümit Arslan elini indirdi' }] },
    { who: 'hakan', text: 'Defne, sen ne düşünüyorsun? Sistemle çalışmak nasıl gidiyor?', board: { page: 'people', metric: 'files', focus: ['you'] } },
  );
  return lines;
}

export interface MeetingOption {
  id: Exclude<MeetingChoice, null>;
  text: string;
  performans: number;
  vicdan: number;
  replies: Line[];
}

export const OPTIONS: MeetingOption[] = [
  {
    id: 'sample',
    text: 'Hızlı ama elediklerine hiç bakmıyoruz. Her gün elenenlerden birkaç dosyayı rastgele elle kontrol edebiliriz.',
    performans: -1,
    vicdan: 3,
    replies: [
      { who: 'levent', text: 'Buna katılıyorum. Ekip olarak destek veririz.', board: { page: 'funnel', focus: ['eliminated'], proposal: true }, chat: [{ who: 'ayse', text: 'İyi ki söyledin 🙏', private: true }] },
      { who: 'hakan', text: 'Zamanı olan yapsın. Hedefler değişmiyor.' },
      { who: 'emre', text: 'Kimin zamanı var ki…' },
    ],
  },
  {
    id: 'praise',
    text: 'İyi gidiyor. Rakamlar ortada.',
    performans: 2,
    vicdan: -2,
    replies: [
      { who: 'hakan', text: 'Güzel. Böyle devam.', board: { page: 'overview' } },
      { who: 'room', text: 'Ümit mikrofonunu kapatıyor. Sohbette kimse bir şey yazmıyor.', chat: [{ who: 'emre', text: '👏' }] },
    ],
  },
  {
    id: 'observe',
    text: 'Henüz yeniyim. Biraz daha gözlemlemek istiyorum.',
    performans: 0,
    vicdan: 0,
    replies: [
      { who: 'hakan', text: 'Gözlemle ama hedefleri de tut.' },
      { who: 'selin', text: 'Makul.' },
    ],
  },
];

export const CLOSING: Line[] = [
  { who: 'hakan', text: 'Toplantı bitti. Herkes işinin başına.', board: { page: 'off' } },
  { who: 'room', text: 'Hakan Bey görüşmeden ayrıldı.', chat: [{ who: 'system', text: 'Hakan Kaya görüşmeden ayrıldı' }] },
];
