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
export type BoardPage = 'summary' | 'overview' | 'people' | 'shortlist' | 'funnel' | 'off';
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

/** Holding'in bu çeyrek için koyduğu hedefler ve bu haftaki gerçekleşen (Yönetici Özeti sayfası). */
export const HOLDING_TARGETS: { id: string; label: string; target: number; actual: number; unit: string; better: 'lower' | 'higher' }[] = [
  { id: 'cost', label: 'İşe alım başına maliyet', target: 16000, actual: 18400, unit: ' TL', better: 'lower' },
  { id: 'time', label: 'İlan → teklif süresi', target: 14, actual: 19, unit: ' gün', better: 'lower' },
  { id: 'auto', label: 'Otomatik ön eleme oranı', target: 90, actual: 88, unit: '%', better: 'higher' },
  { id: 'headcount', label: 'Kadro küçülmesi (çeyrek)', target: 15, actual: 6, unit: '%', better: 'higher' },
];

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
    { who: 'room', text: 'Görüntülü toplantı. Selin ekranını paylaşıyor: Haftalık İşe Alım Performans Raporu. Hakan Bey\'in kamerası kapalı.', board: { page: 'summary' }, chat: [{ who: 'selin', text: 'Ekranım görünüyor mu?' }, { who: 'emre', text: 'Görünüyor 👍' }] },
    { who: 'hakan', text: 'Kısa keseceğim. Holding dün akşam rakamları istedi: bu çeyrek kadro yüzde on beş küçülüyor, işe alım başına maliyet yüzde yirmi düşecek. Bu toplantıda kimse bana "ama" demeyecek.', board: { page: 'summary', focus: ['cost', 'headcount'] } },
    { who: 'hakan', text: `Bu hafta 1.840 başvuru geldi; ekip olarak ${total} dosyaya baktık. Gerisini sistem eledi. Verimlilik bu, maliyet de bu.`, board: { page: 'overview', focus: ['human'] } },
    {
      who: 'selin',
      text: `Kişi bazında ekranda: Emre ${emre.files} dosya, dosya başına ${emre.avg} saniye. Ayşe ${ayse.files} dosya, ${ayse.avg} saniye. Defne ${you.files} dosya, ${you.avg} saniye.`,
      board: { page: 'people', metric: 'avg' },
      chat: [{ who: 'emre', text: '8 saniye 💪' }],
    },
    you.files === 0
      ? { who: 'hakan', text: 'Defne\'nin satırı boş. Üç gündür tek dosya kapatmamış. Deneme süresindeki biri için bu kabul edilemez; Cuma\'ya kadar bu satırı doldur.', board: { page: 'people', metric: 'files', focus: ['you'] } }
      : skimming
      ? { who: 'hakan', text: `Dosya başına ${you.avg} saniye mi? Bu okumak değil, tıklamak. Sistem zaten eliyor; önüne düşen az sayıdaki CV'yi de mi sisteme bırakacaksın?`, board: { page: 'people', metric: 'avg', focus: ['you'] } }
      : fast
      ? { who: 'hakan', text: `Dosya başına ${you.avg} saniye. Emre'yle birlikte ekibin en hızlısı sensin. Ekipten beklediğim tempo tam olarak bu.`, board: { page: 'people', metric: 'avg', focus: ['you'] } }
      : slow
        ? { who: 'hakan', text: `Dosya başına ${you.avg} saniye. Ayşe'yle aynı tempodasın. Söyleyeyim: bu hızla hedefler tutmaz, hedef tutmayınca da kadro tutmaz.`, board: { page: 'people', metric: 'avg', focus: ['you'] } }
        : { who: 'hakan', text: `Dosya başına ${you.avg} saniye. İdare eder. Ama "idare eder" bu çeyrekte yetmiyor.`, board: { page: 'people', metric: 'avg', focus: ['you'] } },
    { who: 'hakan', text: `Ayşe, ${ayse.avg} saniye. Bu tempoyla Cuma'ya kadar kendi masanı bile toparlayamazsın.`, board: { page: 'people', metric: 'avg', focus: ['ayse'] } },
    { who: 'ayse', text: 'Bir dakikada bir insanın on yılını okuyorum Hakan Bey. Daha hızlı okumamı istiyorsanız bunu yazılı verin.' },
    { who: 'hakan', text: 'Yazılı mı? Ayşe, deneme süresindesin. Bunu bu toplantıda bir kez söylüyorum.', chat: [{ who: 'ayse', text: 'Gördün mü? 🙃', private: true }] },
  ];
  if (fast) lines.push({ who: 'levent', text: `${you.avg} saniyede bir CV okunmaz. Ben bir GitHub sayfasına bile daha uzun bakıyorum. Cuma karşıma kimi oturtacaksınız?`, board: { page: 'people', metric: 'avg', focus: ['you', 'emre'] } });
  else if (slow) lines.push({ who: 'levent', text: 'Ben yavaş okuyanlardan yanayım. Cuma karşıma oturacak kişiyi siz seçiyorsunuz; acele eden değil, okuyan seçsin.' });
  if (you.ai >= 0.7) lines.push({ who: 'selin', text: `Defne'nin yapay zekâ analizi kullanımı ${pct(you.ai)}. Emre'yle aynı yöntem.`, board: { page: 'people', metric: 'ai', focus: ['you', 'emre'] } });
  else if (you.ai <= 0.2) lines.push({ who: 'emre', text: `Sen sistemi neredeyse hiç kullanmıyorsun (${pct(you.ai)}). Şirket o lisansa para ödüyor; boşuna mı alındı?`, board: { page: 'people', metric: 'ai', focus: ['you'] } });
  lines.push(
    { who: 'selin', text: `Cuma herkesin kısa listesi mülakata giriyor: Ayşe'den Nehir ve Berk, Emre'den Çağan ve Sarp, Defne'nin ${you.invites} adayı.`, board: { page: 'shortlist' }, chat: [{ who: 'selin', text: 'Kısa liste panoda, üçüncü sekme.' }] },
    { who: 'levent', text: 'Sarp\'ın CV\'si kusursuz ama GitHub\'ı boş. Nehir\'in iki yıl arası var ama yazdığı kod ortada.', board: { page: 'shortlist', focus: ['sarp', 'nehir'] } },
    { who: 'emre', text: 'Sarp\'ın ATS skoru 97. Sistem bunu boşuna vermiyor. Nehir iki yıl çalışmamış; ben sadece veriyi söylüyorum.', board: { page: 'shortlist', focus: ['sarp'] }, chat: [{ who: 'emre', text: 'ATS 97 👀' }] },
    { who: 'ayse', text: 'Hangi veri Emre? Çocuğuna baktığı iki yıl mı? Bunu CV\'sine dürüstçe yazdı diye mi eleyeceğiz?', board: { page: 'shortlist', focus: ['nehir'] }, chat: [{ who: 'levent', text: '+1 Ayşe' }] },
    { who: 'emre', text: 'Kişisel algılama Ayşe. Ben işimi yapıyorum; sen de kendi listeni savunuyorsun, o kadar.', typing: 'ayse' },
    { who: 'selin', text: 'Arkadaşlar, lütfen. Konuya dönelim.' },
    { who: 'levent', text: 'Konu tam olarak bu. Elenen 1.800 kişinin içinde kaç iyi yazılımcı var, bilen var mı? Ben söyleyeyim: geçen ay elediğimiz birini rakip firma aldı, şimdi bizim müşterimize kod yazıyor.', board: { page: 'funnel', focus: ['eliminated'] }, chat: [{ who: 'system', text: 'Ümit Arslan el kaldırdı ✋' }] },
    { who: 'hakan', text: 'Ümit, senin işin kod. İşe alım benim işim. Sistem eledi; sistemin işi bu.', board: { page: 'funnel', focus: ['threshold'] } },
    { who: 'levent', text: 'Sistem sizin imzanızla eliyor ama Hakan Bey. O ağırlık tablosunu kim onayladı, hepimiz biliyoruz.' },
    { who: 'hakan', text: 'Bu toplantıda bunu konuşmayacağız.', chat: [{ who: 'system', text: 'Toplantı sahibi Hakan Kaya, Ümit Arslan\'ın mikrofonunu kapattı' }] },
    { who: 'room', text: 'Kimse mikrofonunu açmıyor. Selin imleci ekranın köşesinde bekletiyor.' },
    { who: 'hakan', text: 'Defne. Yenisin, dışarıdan bakıyorsun. Söyle bakalım: sistemle çalışmak nasıl gidiyor?', board: { page: 'people', metric: 'files', focus: ['you'] } },
  );
  return lines;
}

export interface MeetingOption {
  id: Exclude<MeetingChoice, null>;
  text: string;
  performans: number;
  vicdan: number;
  /** Hakan Bey'le gizli ilişkiye etkisi. */
  rapport: number;
  replies: Line[];
}

export const OPTIONS: MeetingOption[] = [
  {
    id: 'sample',
    text: 'Hızlı ama elediklerimize hiç bakmıyoruz. Her gün elenenlerden birkaç dosyayı rastgele elle kontrol edebiliriz.',
    performans: -1,
    vicdan: 3,
    rapport: -6,
    replies: [
      { who: 'levent', text: 'Mikrofonum kapalı ama sohbetten yazıyorum: buna katılıyorum.', board: { page: 'funnel', focus: ['eliminated'], proposal: true }, chat: [{ who: 'levent', text: 'Ekip olarak destek veririz.' }, { who: 'ayse', text: 'İyi ki söyledin 🙏', private: true }] },
      { who: 'hakan', text: 'Zamanı olan yapsın. Hedefler değişmiyor. Ve Defne: bir dahaki sefere önerini önce bana getir, toplantıda değil.' },
      { who: 'emre', text: 'Kimin zamanı var ki…' },
    ],
  },
  {
    id: 'praise',
    text: 'İyi gidiyor. Rakamlar ortada.',
    performans: 2,
    vicdan: -2,
    rapport: 5,
    replies: [
      { who: 'hakan', text: 'İşte ekipten duymak istediğim cümle bu. Herkes not alsın.', board: { page: 'summary' } },
      { who: 'room', text: 'Ümit kamerasını kapatıyor.', chat: [{ who: 'system', text: 'Ümit Arslan görüşmeden ayrıldı' }, { who: 'emre', text: '👏' }] },
    ],
  },
  {
    id: 'observe',
    text: 'Henüz yeniyim. Biraz daha gözlemlemek istiyorum.',
    performans: 0,
    vicdan: 0,
    rapport: 0,
    replies: [
      { who: 'hakan', text: 'Gözlemle ama hedefleri de tut. Bu ekipte izleyici koltuğu yok.' },
      { who: 'selin', text: 'Makul. Bir sonraki sayfaya geçiyorum.' },
    ],
  },
];

export const CLOSING: Line[] = [
  { who: 'hakan', text: 'Toplantı bitti. Cuma\'ya kadar rakamları istiyorum. Herkes işinin başına.', board: { page: 'off' } },
  { who: 'room', text: 'Hakan Bey görüşmeden ayrıldı.', chat: [{ who: 'system', text: 'Hakan Kaya görüşmeden ayrıldı' }] },
];
