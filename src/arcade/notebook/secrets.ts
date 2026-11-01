/*
 * Patron tablosunun gizli sırları: tabloyu kurcalayan oyuncu bulduklarını biriktirir. Bulunanlar
 * tarayıcıda saklanır; saklanamazsa yalnızca o oturumda sayılır. Durum çubuğundaki sayaç
 * "Sırlar 4/28" der, tıklayınca liste açılır (bulunmayanlar ??? görünür).
 */

export const SECRETS: { id: string; label: string }[] = [
  { id: 'zam', label: 'Zam istedin' },
  { id: 'istifa', label: 'İstifayı aklından geçirdin' },
  { id: 'izin', label: 'Tatil hayali' },
  { id: 'terfi', label: 'Terfi bekleyişi' },
  { id: 'toplanti', label: 'Toplantı sarmalı' },
  { id: 'kahve', label: 'Kahve makinesi yine bozuk' },
  { id: 'patron', label: '"Müsait misin?"' },
  { id: 'evden', label: 'Evden çalışma rüyası' },
  { id: 'mesai', label: 'Fazla mesai' },
  { id: 'prim', label: 'Prim havuzu' },
  { id: 'maas', label: 'Eriyen maaş' },
  { id: 'yorum', label: 'Kimin değiştirdiğini kimse bilmiyor' },
  { id: 'ozet', label: 'Yönetici özeti' },
  { id: 'ham', label: 'Şirket her şeyi takip ediyor' },
  { id: 'cv', label: 'Gizli CV' },
  { id: 'geri', label: 'Geri alınamayan kararlar' },
  { id: 'yinele', label: 'Hafta sonu yok' },
  { id: 'bicim', label: 'Biçimlendirme ustası' },
  { id: 'yazim', label: 'Kurumsal dil' },
  { id: 'grafik', label: 'Her grafik yükselir' },
  { id: 'kosullu', label: 'Riskleri yeşile boya' },
  { id: 'verimli', label: 'Fazla verimli göründün' },
  { id: 'eposta', label: 'Konu: (konu yok)' },
  { id: 'meslektas', label: 'Biri rakamı değiştirdi' },
  { id: 'ayrildi', label: 'Kadro değişikliği' },
  { id: 'uzun', label: 'Dosya adı çok uzun' },
  { id: 'oyna', label: 'Tablonun içinde oyun' },
  { id: 'mayin', label: 'Mayınları temizledin' },
  { id: 'paylas', label: 'Raporu paylaştın' },
];

const KEY = 'kariyerweb-patron-sirlar';

export function loadSecrets(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return new Set(Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

export function saveSecrets(found: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...found]));
  } catch {
    // saklanamazsa sırlar yalnızca bu oturumda sayılır
  }
}
