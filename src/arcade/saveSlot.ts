import { readChecked, removeKey, writeJson, type Legacy } from '../shared/storage';

/*
 * Salon oyunlarının ortak kayıt yuvası: oyun kendi anahtarıyla (sitenin önekiyle başlar, böylece
 * "verilerimi sil" onu da temizler) küçük bir durum saklar. Depo erişimi src/shared/storage.ts'te:
 * depo kullanılamazsa okuma boş döner, yazma sessizce atlanır; oyun kayıtsız oynanır.
 * `check` kayıttan gelen veriyi doğrular: bozuk kayıt yok sayılır; eski sürüm anahtarı `legacy`
 * ile verilirse çevrilip taşınır.
 */

export function readSlot<T>(key: string, check: (v: unknown) => v is T, legacy: Legacy<T>[] = []): T | null {
  return readChecked(key, check, legacy);
}

export const writeSlot = (key: string, value: unknown) => writeJson(key, value);

export const clearSlot = (key: string) => removeKey(key);

/** Düz bir nesne mi (dizi ya da null değil). */
export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** 0 ile `max` (hariç) arasında bir tam sayı mı. */
export const isIndex = (v: unknown, max: number): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < max;
