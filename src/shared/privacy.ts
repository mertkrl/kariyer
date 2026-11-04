/*
 * Oyunun tuttuğu her şey bu tarayıcıda "kariyerweb-" ile başlayan anahtarlar altında durur: günün
 * kaydı, başarımlar, ses ve okuma boyutu ayarları. Hiçbir şey hiçbir yere gönderilmez. Bu,
 * cihazın oyunu unutmasını isteyen oyuncu için hepsini siler; çevrimdışı kopyayı da (service
 * worker ve önbelleğe aldığı dosyalar), böylece oyundan geriye hiçbir şey kalmaz.
 */
export const STORAGE_PREFIX = 'kariyerweb-';
/** Önek gelmeden önce yazılmış anahtarlar (Meydan Islahı'nın eski taslakları): yalnızca silinir, bir daha yazılmaz. */
export const LEGACY_PREFIXES = ['meydan:taslak:'];
/** Çevrimdışı kopyanın önbellekleri (adları vite.config.ts'de verilir). */
export const CACHE_PREFIX = 'mesai-disi-';
/** Marka adı değişmeden önceki (Sen İK'sin dönemi) önbellekler: yalnızca silinir. */
export const LEGACY_CACHE_PREFIXES = ['sen-iksin-'];

export async function clearAllGameData() {
  for (const pick of [() => localStorage, () => sessionStorage]) {
    try {
      const storage = pick();
      Array.from({ length: storage.length }, (_, i) => storage.key(i) ?? '')
        .filter((key) => key.startsWith(STORAGE_PREFIX) || LEGACY_PREFIXES.some((p) => key.startsWith(p)))
        .forEach((key) => storage.removeItem(key));
    } catch {
      // storage unavailable: there was nothing kept either
    }
  }
  try {
    if ('caches' in globalThis) {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => [CACHE_PREFIX, ...LEGACY_CACHE_PREFIXES].some((p) => n.startsWith(p))).map((n) => caches.delete(n)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    // no offline copy to remove (private window, file://)
  }
}
