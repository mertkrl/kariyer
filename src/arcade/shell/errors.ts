/*
 * Oyunların hata sınırının (GameBoundary.tsx) yardımcıları. Bir oyunun parçası (tembel yüklenen JS ya da CSS dosyası) inemediğinde tarayıcıların verdiği
 * hata metinleri. En sık sebebi yeni bir yayın: açık kalmış sekme, sunucudan kalkmış eski bir
 * parçayı ister. O zaman doğru söz "yeni sürüm geldi, yenile"dir, "oyun çöktü" değil.
 */
const CHUNK_PATTERNS = [
  /dynamically imported module/i, // Chrome, Edge: "Failed to fetch dynamically imported module"
  /error loading dynamically imported module/i, // Firefox
  /importing a module script failed/i, // Safari
  /unable to preload css/i, // Vite'ın CSS ön yükleyicisi
  /chunkloaderror|loading chunk \S+ failed/i,
];

/** Hata, bir oyun parçasının indirilememesinden mi geliyor. */
export function isChunkError(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return CHUNK_PATTERNS.some((p) => p.test(text));
}

/** Hatayı bildirmek için gereken her şey; kişisel bilgi yok. */
export function gameReport(title: string, error: Error, componentStack: string) {
  return [`${title} ${__APP_VERSION__} — hata raporu`, new Date().toISOString(), window.location.hash || '#/', navigator.userAgent, '', `${error.name}: ${error.message}`, error.stack ?? '', componentStack.trim()].join('\n');
}
