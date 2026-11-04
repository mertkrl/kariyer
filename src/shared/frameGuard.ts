/*
 * Çerçeve koruması (clickjacking). Sunucu başlığı `frame-ancestors 'none'` yalnızca başlık
 * gönderebilen yerlerde çalışır (public/_headers: Netlify, Cloudflare Pages); GitHub Pages başlık
 * göndermez, <meta> CSP de bu yönergeyi yok sayar. Bu yüzden sayfa kendisi bakar: başka bir sitenin
 * çerçevesindeyse oyunu hiç çizmez (main.tsx), yalnızca kendi adresinde açma bağlantısını gösterir.
 * Tıklanacak oyun yüzeyi olmadığı için üstüne görünmez düğme bindirmek bir işe yaramaz.
 *
 * İstisna: itch.io oyunu kendi sunucusundan (itch.zone, hwcdn.net) kendi sayfasının çerçevesinde
 * oynatır (scripts/package.mjs); yerel geliştirme ve önizleme araçları da localhost'tan çerçeveler.
 */

/** Oyunun çerçevede çalışmasına izin verilen kendi adresleri (alt alan adları dahil). */
export const EMBED_HOSTS = ['itch.zone', 'hwcdn.net', 'localhost', '127.0.0.1'];

const allowedHost = (hostname: string) => EMBED_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`));

/** Saf karar: çerçevede mi ve bu adreste çerçeveye izin var mı. */
export const strangerFrame = ({ framed, hostname }: { framed: boolean; hostname: string }) => framed && !allowedHost(hostname);

/** Tarayıcıda: sayfa başka bir sitenin çerçevesinde mi (başka kökenli üst pencereye erişim hata verir). */
export function isFramedByStranger(): boolean {
  let framed: boolean;
  try {
    framed = window.top !== window.self;
  } catch {
    framed = true;
  }
  return strangerFrame({ framed, hostname: window.location.hostname });
}
