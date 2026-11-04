/*
 * Ağdan gelen tek seferlik işler için yeniden deneme: mobil veride bir kopukluk bir sesi ya da
 * dosyayı bütün oturum boyunca yok etmesin. Bekleme her denemede katlanır (1,5 s, 3 s…).
 */
export async function retrying<T>(run: () => Promise<T>, { tries = 2, delayMs = 1500, wait = (ms: number) => new Promise<void>((ok) => setTimeout(ok, ms)) } = {}): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await run();
    } catch (e) {
      lastError = e;
      if (i + 1 < tries) await wait(delayMs * 2 ** i);
    }
  }
  throw lastError;
}

/** Oyunun kendi dosyasının baytları; 2xx dışı yanıt hata sayılır (ör. 404 sayfası ses diye çözülmesin). */
export async function fetchBytes(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.arrayBuffer();
}
