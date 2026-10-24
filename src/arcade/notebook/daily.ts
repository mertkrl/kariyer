import { dayIndex } from './notebook';

/*
 * Günün notu: tarihe göre her gün başka bir el yazısı not; aynı gün hep aynısı. Salonun ilk
 * açılışında gerekmez, notla birlikte sonradan iner (DailyNote).
 */

const DAILY = [
  'Maaş yattı mı? Yatmadı.',
  'Bugün kimse bir şey beklemesin.',
  '“Kısa bir senkron” = 45 dk.',
  'Toplantı e-posta olabilirdi.',
  'Kahve 3, verim 0.',
  'Yarın izin iste. (İsteme.)',
  'Excel açık dursun, ne olur ne olmaz.',
  'Hedef revize edildi. Yine.',
  '“Biz bir aileyiz” → kaç?',
  'Bugünün sloganı: sinerji.',
  'Pazartesi sendromu: 4. gün.',
  'Mail “acil” ise acil değildir.',
  'Bildirimleri kapat. Hepsini.',
  'Öğle arası 1 saat. 15 dk değil.',
  'Ekran paylaşmadan önce sekmeleri kapat!',
  'Kimse okumuyor bu notu.',
  'Bugün de “müsait” görünme.',
  'Asansörde Genel Müdür varsa merdiven.',
  'Cuma 17:55 iş gelirse: Pazartesi.',
  'Şifre: Pazartesi1967 (şaka)',
  'Defteri kapatmadan önce bir oyun.',
];

export const dailyNote = (d: Date) => DAILY[dayIndex(d) % DAILY.length];
