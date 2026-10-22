import { sanitize, type Design } from './model';

/*
 * Paylaşım, sunucusuz: tasarım JSON'a çevrilir, tarayıcının kendi sıkıştırmasıyla küçültülür ve
 * adresin `#/ekran?t=` kısmına base64url olarak yazılır. Bağlantıyı açan herkes aynı ekranı görür;
 * hiçbir şey bir yere gönderilmez. Gelen metin her zaman `sanitize`'dan geçer.
 */

const PARAM = 't';
const MAX_ENCODED = 60_000;

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function encodeDesign(d: Design): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(d));
  return toBase64Url(await pipe(json, new CompressionStream('deflate-raw')));
}

/** Bozuk, fazla büyük ya da tasarım olmayan her girdi için null. */
export async function decodeDesign(s: string): Promise<Design | null> {
  if (!s || s.length > MAX_ENCODED || !/^[A-Za-z0-9_-]+$/.test(s)) return null;
  try {
    const bytes = await pipe(fromBase64Url(s), new DecompressionStream('deflate-raw'));
    if (bytes.length > MAX_ENCODED * 8) return null;
    return sanitize(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}

/** `#/ekran?t=…` içindeki paylaşım kodu; yoksa null. */
export function sharedCodeOf(hash: string): string | null {
  const query = hash.split('?')[1];
  return query ? new URLSearchParams(query).get(PARAM) : null;
}

export async function shareUrl(d: Design): Promise<string> {
  const { origin, pathname, search } = window.location;
  return `${origin}${pathname}${search}#/ekran?${PARAM}=${await encodeDesign(d)}`;
}
