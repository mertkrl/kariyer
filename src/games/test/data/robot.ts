/*
 * Robot doğrulaması: üst üste çok hızlı cevap veren adaya çıkan sahte "ben robot değilim" testi.
 * Önce bir onay kutusu, sonra kareli bir resim seçme görevi. Görevler doğru yapılabilir ama
 * cevap anahtarı yine kurum kültürüne göredir; ipucu metni bunu ele verir.
 */

export interface RobotTile {
  icon: string;
  /** Ekran okuyucu için ve karenin altındaki küçük yazı. */
  label: string;
  /** Bu kare seçilmeli mi. */
  pick: boolean;
}

export interface RobotChallenge {
  id: string;
  prompt: string;
  /** Görevin altındaki küçük not. */
  hint: string;
  tiles: RobotTile[];
  /** Doğru yapılınca platformun söylediği. */
  passLine: string;
}

export const ROBOT_CHALLENGES: RobotChallenge[] = [
  {
    id: 'overtime',
    prompt: 'Fazla mesai yapan çalışanların bulunduğu tüm kareleri seçin.',
    hint: 'Emin değilseniz hepsini seçmeniz önerilir.',
    passLine: 'Doğrulandı. Fazla mesaiyi tanıma beceriniz kayda geçti.',
    tiles: [
      { icon: '🌙💻', label: 'Gece bilgisayar başında', pick: true },
      { icon: '🏖️', label: 'Tatilde', pick: false },
      { icon: '🛏️📱', label: 'Yatakta e-posta', pick: true },
      { icon: '☕', label: 'Kahve molası', pick: false },
      { icon: '🕛🏢', label: 'Gece yarısı ofiste', pick: true },
      { icon: '🍽️', label: 'Öğle yemeği', pick: false },
      { icon: '🚗📞', label: 'Trafikte toplantı', pick: true },
      { icon: '👨‍👩‍👧', label: 'Ailesiyle', pick: false },
      { icon: '🏖️📧', label: 'Tatilde e-posta', pick: true },
    ],
  },
  {
    id: 'motivated',
    prompt: 'Motivasyonu yüksek çalışanların bulunduğu tüm kareleri seçin. Hiçbiri yoksa doğrudan "Doğrula"ya basın.',
    hint: "Kareler pazartesi sabahı 08:57'de çekilmiştir.",
    passLine: 'Doğrulandı. Gerçekçi bir bakış açınız var. Bu, kültür uyumu puanınıza yansıtılmayacaktır.',
    tiles: [
      { icon: '😐', label: 'Boş bakış', pick: false },
      { icon: '😴', label: 'Uykulu', pick: false },
      { icon: '🫠', label: 'Eriyor', pick: false },
      { icon: '😑', label: 'İfadesiz', pick: false },
      { icon: '🥲', label: 'Gülümsemeye çalışıyor', pick: false },
      { icon: '😶‍🌫️', label: 'Sisli', pick: false },
      { icon: '🙂', label: 'Kamerayı fark etti', pick: false },
      { icon: '😵‍💫', label: 'Dördüncü toplantıda', pick: false },
      { icon: '🧟', label: 'Pazartesi', pick: false },
    ],
  },
  {
    id: 'culture',
    prompt: 'Kurum kültürümüze uygun olan tüm kareleri seçin.',
    hint: 'İpucu: Ücret gerektiren her şey kültür dışıdır.',
    passLine: 'Doğrulandı. Kültürümüzü çabuk kavradınız. Bu biraz endişe verici.',
    tiles: [
      { icon: '🍕', label: 'Cuma pizzası', pick: true },
      { icon: '💰', label: 'Zam', pick: false },
      { icon: '🏓', label: 'Masa tenisi', pick: true },
      { icon: '🏝️', label: 'Yıllık izin', pick: false },
      { icon: '📸', label: 'Ekip fotoğrafı (gülümseme zorunlu)', pick: true },
      { icon: '🕔', label: "17:00'de çıkış", pick: false },
      { icon: '🎉', label: 'Zorunlu eğlence', pick: true },
      { icon: '📝', label: 'Fazla mesai ücreti', pick: false },
      { icon: '🫂', label: '"Biz bir aileyiz"', pick: true },
    ],
  },
  {
    id: 'meeting',
    prompt: 'E-posta ile halledilebilecek toplantıların bulunduğu tüm kareleri seçin.',
    hint: 'Takvim davetleri otomatik olarak "zorunlu" işaretlenmiştir.',
    passLine: 'Doğrulandı. Bu tespitleriniz toplantıda ele alınacaktır.',
    tiles: [
      { icon: '📅👋', label: 'Haftalık "hal hatır"', pick: true },
      { icon: '🔥🖥️', label: 'Sunucu çöktü', pick: false },
      { icon: '📊🔁', label: 'Raporu birlikte okuma', pick: true },
      { icon: '🤝', label: 'Yeni müşteri görüşmesi', pick: false },
      { icon: '🗓️🗓️', label: 'Toplantıyı planlama toplantısı', pick: true },
      { icon: '🧑‍⚕️', label: 'İş kazası değerlendirmesi', pick: false },
      { icon: '📢', label: '"Kısa bir duyuru" (55 dk)', pick: true },
      { icon: '🎯', label: 'Yıllık hedef görüşmesi', pick: false },
      { icon: '✅📋', label: 'Durum güncellemesi', pick: true },
    ],
  },
  {
    id: 'perks',
    prompt: 'Şirketimizin sunduğu yan hakların bulunduğu tüm kareleri seçin.',
    hint: 'Yan haklar maaşın yerine geçer, yanına değil.',
    passLine: 'Doğrulandı. Yan haklarımızı ezberlediniz; maaş beklentiniz buna göre güncellendi.',
    tiles: [
      { icon: '🍎', label: 'Meyve sepeti (salı)', pick: true },
      { icon: '🏥', label: 'Özel sağlık sigortası', pick: false },
      { icon: '🖼️', label: 'Motivasyon posteri', pick: true },
      { icon: '🍱', label: 'Yemek kartı', pick: false },
      { icon: '☕', label: 'Bedava çay (poşet)', pick: true },
      { icon: '🚌', label: 'Servis', pick: false },
      { icon: '🏆', label: 'Ayın çalışanı rozeti', pick: true },
      { icon: '💸', label: 'İkramiye', pick: false },
      { icon: '🎂', label: 'Ortak doğum günü pastası', pick: true },
    ],
  },
];

/**
 * Kareli seçim dışındaki doğrulamalar: yazı okuma, kaydırıcı ve tek seçim. Hepsi geçilebilir;
 * geçmenin yolu ipucundaki kurum diliyle konuşmaktır.
 */
export type RobotPuzzle =
  | { id: string; kind: 'text'; prompt: string; shown: string; accept: string[]; hint: string; passLine: string }
  | { id: string; kind: 'slider'; prompt: string; low: string; high: string; min: number; hint: string; passLine: string }
  | { id: string; kind: 'choice'; prompt: string; options: string[]; answer: number; hint: string; passLine: string };

export const ROBOT_PUZZLES: RobotPuzzle[] = [
  {
    id: 'flex',
    kind: 'text',
    prompt: 'Görseldeki ifadeyi kutuya yazın.',
    shown: 'esnek çalışma',
    accept: ['esnek çalışma', 'her zaman çalışma'],
    hint: 'Bu ifade sistemde "her zaman çalışma" olarak da kabul edilir.',
    passLine: 'Doğrulandı. Esnekliğiniz kayda geçti; artık her saatte ulaşılabilirsiniz.',
  },
  {
    id: 'volunteer',
    kind: 'text',
    prompt: 'Görseldeki ifadeyi kutuya yazın.',
    shown: 'gönüllü mesai',
    accept: ['gönüllü mesai', 'gonullu mesai'],
    hint: 'Büyük-küçük harf önemli değildir. Gönüllülük önemlidir.',
    passLine: 'Doğrulandı. Gönüllülüğünüz için teşekkür ederiz; cumartesi görüşmek üzere.',
  },
  {
    id: 'motivation',
    kind: 'slider',
    prompt: 'Kaydırıcıyı bu sabahki motivasyonunuza getirin.',
    low: 'Pazartesi',
    high: 'Tutku',
    min: 95,
    hint: 'Gerçek değer değil, beklenen değer istenmektedir.',
    passLine: 'Doğrulandı. Motivasyonunuz %100 olarak raporlandı. Gerçek değer arşivlendi.',
  },
  {
    id: 'human',
    kind: 'choice',
    prompt: 'Aşağıdaki cevaplardan hangisini bir insan yazmıştır?',
    options: ['Mesaim 18:00’de bitiyor.', 'Yarın izinliyim.', 'Tabii, hafta sonu bakarım 🙂', 'Bu iş tanımımda yok.'],
    answer: 2,
    hint: 'İpucu: robotlar sınır koyar.',
    passLine: 'Doğrulandı. Sınır tanımamanız insan olduğunuzu kanıtladı.',
  },
  {
    id: 'raise',
    kind: 'choice',
    prompt: 'Robot olmadığınızı kanıtlamak için zam talebinizi seçin.',
    options: ['%50', '%20', 'Enflasyon kadar', 'Şimdilik bir şey istemem'],
    answer: 3,
    hint: 'Algoritmalar her zaman bir rakam söyler.',
    passLine: 'Doğrulandı. Talepsizliğiniz son derece insani.',
  },
];

const norm = (s: string) => s.trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ');

/** Kareli olmayan doğrulamada verilen cevap geçer mi. */
export function puzzleSolved(p: RobotPuzzle, value: string | number | null): boolean {
  if (value === null) return false;
  if (p.kind === 'text') return p.accept.some((a) => norm(a) === norm(String(value)));
  if (p.kind === 'slider') return Number(value) >= p.min;
  return value === p.answer;
}

/** Bu süreden kısa sürede verilen cevap "hızlı" sayılır (ms). */
export const FAST_MS = 2500;
/** Üst üste bu kadar hızlı cevap robot testini açar. */
export const FAST_STREAK = 3;
/** Bir testte en fazla kaç kez çıkar. */
export const MAX_ROBOT_CHECKS = 2;

/** Seçim doğru mu: seçilmesi gereken her kare seçilmiş, başkası seçilmemiş. */
export function robotPassed(c: RobotChallenge, picked: ReadonlySet<number>): boolean {
  return c.tiles.every((t, i) => t.pick === picked.has(i));
}

/** Yanlış seçimde platformun söylediği; deneme sayısına göre değişir. */
export const ROBOT_FAIL_LINES = [
  'Yanlış. Robotlar da tam olarak böyle seçerdi.',
  'Yine olmadı. İnsan olduğunuzdan biz de emin değiliz artık.',
  'Son bir deneme. Lütfen daha insanca seçin.',
  'Hâlâ olmadı. Yine de devam edebilirsiniz; bu durum dosyanıza "şüpheli insan" olarak işlendi.',
];
