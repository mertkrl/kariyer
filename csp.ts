/*
 * Sayfanın İçerik Güvenliği Politikası, tek bir yerde. vite.config.ts onu derlenmiş sayfaya bir
 * <meta> etiketi olarak yazar (böylece her sunucuda geçerli olur), public/_headers da sunucunun o
 * dosyayı okuduğu yerlerde onu başlık olarak gönderir; bir test ikisini aynı tutar. Oyunun kendi
 * dosyalarından başka hiçbir şeye izin vermez: başka sitelerin scriptleri yok, sayfadan çıkan istek
 * yok (oyunun sunucusu yok ve hiçbir şey göndermez) ve scripte dönüştürülen metin yok (Trusted Types).
 * Oyunun tarayıcıya verdiği tek script adresi, yani kendi service worker'ı, burada izin verilen tek
 * politikadan geçer; o da bu adresi kabul eder, başka hiçbir şeyi değil (swUpdate.ts).
 */
/** Sayfanın oluşturabileceği tek Trusted Types politikası. */
export const TT_POLICY = 'sen-iksin-sw';

export const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "require-trusted-types-for 'script'",
  `trusted-types ${TT_POLICY}`,
];

/** Çerçeveye almayı yalnızca bir başlık reddedebilir; <meta> politikası bu yönergeyi yok sayar. */
export const HEADER_ONLY_DIRECTIVES = ["frame-ancestors 'none'"];

export const CSP = CSP_DIRECTIVES.join('; ');
