/*
 * Salon oyunlarının ortak kayıt yuvası: oyun kendi anahtarıyla (sitenin önekiyle başlar, böylece
 * "verilerimi sil" onu da temizler) küçük bir durum saklar. Depo kullanılamazsa (gizli pencere,
 * engelli site verisi) okuma boş döner, yazma sessizce atlanır; oyun kayıtsız oynanır.
 * `check` kayıttan gelen veriyi doğrular: bozuk ya da eski sürüm kayıt yok sayılır.
 */

export function readSlot<T>(key: string, check: (v: unknown) => v is T): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const v: unknown = JSON.parse(raw);
    return check(v) ? v : null;
  } catch {
    return null;
  }
}

export function writeSlot(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // kayıt tutulamazsa oyun yine oynanır
  }
}

export function clearSlot(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // yok sayılır
  }
}

/** Düz bir nesne mi (dizi ya da null değil). */
export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** 0 ile `max` (hariç) arasında bir tam sayı mı. */
export const isIndex = (v: unknown, max: number): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < max;
