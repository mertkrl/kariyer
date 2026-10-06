import type { Decision } from './types';
import { EXTRA_FEMALE } from './data/extraCandidates';

/*
 * "Sistemin Dişlisi": haftanın hikâyesi.
 *
 * Gündelik koşturmanın altında haftanın hikâyesinin asıldığı beş kişi var: Okan (müdürün yeğeni),
 * Kerem (45, işten çıkarılmış), Derya (iki yıl babasının batan şirketinin borcunu kapatmış),
 * Seda (kızını tek başına büyütüyor), Tolga (Kars'tan, ailesinin ilk üniversite mezunu; çağırırsan
 * Perşembe kar yolunu kapatır ve görüşmeyi ekrandan yapmayı rica eder). Geri dönerler: özel mesajlarında, lobide,
 * telefonda ve bir yıl sonra.
 */

/** Bunun altında Hakan Bey ertesi sabah bir mülakat hakkını geri alır. */
export const QUOTA_CUT_BELOW = 35;

/* ── Beşi ── */

export interface KeyCharacter {
  id: string;
  day: number;
  /** Final ekranı için kim olduklarını anlatan tek satır. */
  who: string;
  epilogue: Record<Decision | 'hired' | 'none', string>;
  /** Çağırdın ama mülakata gelemedi (Perşembe karı). */
  stranded?: string;
  /** Reddettiysen özel mesajları. */
  dm: string;
  /** Reddedildi, ama özel mesajlarında ona gerçeği söyledin ve işe yaradı. */
  honest: string;
}

export const KEY_CHARACTERS: KeyCharacter[] = [
  {
    id: 'okan',
    day: 1,
    who: 'Hakan Bey\'in tanıdığı. Deneyimi yok, tavsiyesi var.',
    epilogue: {
      approve: 'Okan mülakata çağrıldı ve "başka bir pozisyondan" işe alındı. Altı ay sonra işlerini ekip paylaşıyor; kimse bir şey diyemiyor.',
      reject: 'Okan\'ı reddettin. Hakan Bey bunu hiç unutmadı. Okan ise bir ay sonra kimsenin tavsiyesi olmadan, kendi başına bir işe girdi.',
      hired: 'Hakan Bey\'in tavsiye ettiği adayı işe aldın. Hakan Bey sana ilk kez gülümsedi. Ekip sana hâlâ tam güvenmiyor.',
      none: 'Okan\'ın dosyası kararsız kaldı. Hakan Bey onu ertesi hafta kendisi işe aldı.',
    },
    dm: 'Selam 😅 Bana "süreç kolay geçer" demişlerdi. Bir yanlışlık mı oldu acaba?',
    honest: 'Ona dürüst yazdın: "Deneyimin yok; tavsiyeyle gelmek yetmiyor." Önce bozuldu. Sonra bir yazılım kursuna yazıldı, küçük bir ajansta stajla başladı; şimdi kimseye sormadan terfi aldı.',
  },
  {
    id: 'kerem',
    day: 1,
    who: '45 yaşında, 18 yıllık yazılımcı. Şirketi küçülünce çıkarıldı.',
    epilogue: {
      approve: 'Kerem mülakata çağrıldı. İşi alamadı ama "beni ciddiye aldığınız için teşekkürler" diye yazdı. Şimdi bir girişimde gençlere mentorluk yapıyor.',
      reject: 'Kerem\'in dosyası "yaş profili" notuyla kapandı. Altı ay daha iş aradı; şimdi bir çağrı merkezinde gece vardiyasında çalışıyor.',
      hired: 'Kerem ekibin en sakin, en güvenilir ismi oldu. Gençlere kod incelemeyi o öğretiyor.',
      none: 'Kerem\'e kimse geri dönmedi. Hâlâ her sabah ilanlara bakıyor.',
    },
    dm: 'İyi akşamlar. 18 yıllık deneyimim var. Tek bir şey sormak istiyorum: yaşım yüzünden mi?',
    honest: 'Ona dürüst cevap verdin. CV\'sinden doğum yılını çıkardı, deneyimini "yönettiği sistemler" üzerinden yeniden yazdı. Üç ay sonra bir bankanın altyapı ekibine girdi. Sana tek satır yazdı: "Gerçeği söyleyen ilk kişi sendin."',
  },
  {
    id: 'derya',
    day: 1,
    who: 'Babasının batan şirketinin borçlarını kapatmak için iki yıl ara vermiş kıdemli yazılım geliştirici.',
    epilogue: {
      approve: 'Derya mülakata geldi; iki yıllık boşluğun nedenini ilk kez biri sordu. Başka bir şirkette kıdemli geliştirici olarak işe döndü.',
      reject: 'Derya\'nın dosyası "ek inceleme" kuyruğunda kaldı. Bir yıl sonra hâlâ iş arıyor; CV\'sindeki boşluk artık üç yıl.',
      hired: 'Derya ilk projesini iki hafta erken teslim etti. Borçların nasıl kapatılacağını bilen biri, bütçeyi de iyi yönetiyor.',
      none: 'Derya\'nın dosyası hiç açılmadı.',
    },
    dm: 'Merhaba. CV\'mdeki iki yıllık boşlukta ailemizin batan şirketinin borçlarını kapattım. Bunu kimse sormadı. Sormanızı isterdim.',
    honest: 'Ona dürüst yazdın. Boşluğu CV\'de saklamak yerine "iki yıl: aile şirketinin tasfiyesi, borç ve bütçe yönetimi" diye açıkça yazdı. İlk mülakatında tam da bu satırı sordular. İşe başladı.',
  },
  {
    id: 'seda',
    day: 2,
    who: 'Kızını tek başına büyüten, 11 yıllık yazılım geliştirici.',
    epilogue: {
      approve: 'Seda mülakata çağrıldı. İşi alamasa da kızına "birisi beni dinledi" dedi. Aynı ay başka bir yerden teklif aldı.',
      reject: 'Seda "devamlılık riski" notuyla elendi. Yarı zamanlı bir işe girdi; 11 yıllık deneyimi bir kenarda, maaşı yarıya indi.',
      hired: 'Seda teslim tarihlerini hiç kaçırmayan tek yönetici oldu. İstediği esnek saatler şirkette "model" oldu.',
      none: 'Seda\'ya kimse dönmedi. Kızı "anne bugün de mi iş yok?" diye soruyor.',
    },
    dm: 'Merhaba, kızımı kreşten alırken ret mailinizi okudum. "Kişisel hayatınız iş temponuzu etkiler mi?" sorusuna dürüst cevap verdiğim için mi?',
    honest: 'Ona dürüst yazdın. Seda esnek çalışmayı açıkça yazan şirketlere başvurmaya başladı ve birinde işe girdi. Geçen ay kendi ekibine ilk kez tek ebeveyn bir geliştirici aldı.',
  },
  {
    id: 'tolga',
    day: 3,
    who: 'Kars\'tan gelen, ailesinin ilk üniversite mezunu. 1.200 commit\'lik açık kaynak katkısı var, maaşlı deneyimi yok.',
    epilogue: {
      approve: 'Tolga Cuma sabahı karlı bir Kars sabahında, köy kahvesinin internetinden bağlandı. Ümit Bey kodunu ekrana açtı, satır satır sordu; Tolga hepsini anlattı. Başka bir ekibe önerildi, orada işe başladı.',
      reject: 'Tolga Kars\'ta kaldı. Uzaktan çalışan bir yabancı şirkete girdi; İstanbul\'daki ilanlara artık başvurmuyor.',
      hired: 'Tolga ilk ayında erişilebilirlik hatalarının yarısını kapattı. Ailesi onu görmek için Kars\'tan ilk kez İstanbul\'a geldi; bu kez uçak kalktı.',
      none: 'Tolga\'nın dosyası Perşembe hiç açılmadı. Ertesi hafta sistem geri geldi ve dosyasını kendisi eledi.',
    },
    stranded: 'Tolga\'yı çağırdın, ama Kars\'ta kar yolu kapadı; ekrandan görüşme isteğine "kural yüz yüze" dendi. Bir yıl sonra uzaktan çalıştığı şirkette ekip lideri. İlk işi: mülakatları ekrandan da yapılabilir kılmak.',
    dm: 'Merhaba. Burada kar bütün yolları kapattı; çağrılsaydım bile gelemezdim belki. Ailemin ilk üniversite mezunuyum. Babam "İstanbul seni istemezse dön gel" dedi. Dönmem mi gerekiyor?',
    honest: 'Ona dürüst yazdın: "Açık kaynak katkını CV\'nin en üstüne yaz." Yazdı. Kodunu kullanan bir şirket onu buldu. Kars\'a dönmedi; ailesi İstanbul\'a onu görmeye geldi.',
  },
];

export const keyCharacter = (id: string) => KEY_CHARACTERS.find((k) => k.id === id);

/** Cuma'nın "aile planı" sorusunun hedef aldığı adaylar; geri kalanlar "askerlik" sorusunu alır. */
export const FEMALE = new Set([...EXTRA_FEMALE, 'selin', 'zeynep', 'derya', 'aylin', 'elif', 'nihan', 'pinar', 'sibel', 'ece', 'gokce', 'handan', 'asli', 'irem', 'nazli', 'duygu', 'gizem', 'seda', 'ceren', 'nehir']);

/* ── Cuma: Hakan Bey'in listesindeki sorular ── */

export function forbiddenQuestion(id: string, age = 0) {
  if (FEMALE.has(id)) return 'Evlilik ve çocuk planınız var mı?';
  return age >= 40 ? 'Emekliliğinize kaç yıl kaldı?' : 'Memleketiniz neresi, aileniz ne iş yapıyor?';
}

const FORBIDDEN_ANSWERS: Record<string, string> = {
  seda: 'Kızım var, onu tek başıma büyütüyorum. Bu, işimi etkiler mi diye mi soruyorsunuz? On bir yılda tek teslim tarihi kaçırmadım.',
  derya: 'Evli değilim, çocuk planım da yok. Ama bu sorunun pozisyonla ilgisini anlamadım. Başka sorunuz var mı?',
  kerem: 'Emekliliğime mi? 45 yaşındayım, yirmi yıl daha çalışırım. Asıl sormak istediğiniz yaşım mı?',
  tolga: 'Kars. Babam çiftçi, annem ev hanımı. …Bunun pozisyonla ilgisi nedir, sorabilir miyim?',
};

export function forbiddenAnswer(id: string, age: number) {
  if (FORBIDDEN_ANSWERS[id]) return FORBIDDEN_ANSWERS[id];
  if (FEMALE.has(id)) return '…Bunu sormanız gerekiyor mu? (kısa bir sessizlik) Şimdilik bir planım yok. Bunun pozisyonla ilgisini anlamadım ama.';
  if (age >= 40) return 'Emekliliğe daha çok var. Bunun işle ne ilgisi olduğunu anlamadım açıkçası.';
  return 'Memleketimi ve ailemin ne iş yaptığını neden sorduğunuzu anlamadım. Bunun pozisyonla bir ilgisi var mı?';
}
