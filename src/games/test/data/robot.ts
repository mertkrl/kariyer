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
];

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
