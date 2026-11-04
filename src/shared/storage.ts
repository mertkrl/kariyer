/*
 * Tarayıcıda saklanan her şeyin tek kapısı. Anahtarlar sitenin önekiyle (`kariyerweb-`, privacy.ts)
 * başlar; "Verilerimi sil" hepsini bu önekle bulur. Depo kullanılamazsa (gizli pencere, engelli site
 * verisi, dolu kota) okuma boş döner, yazma sessizce atlanır: oyun kayıtsız oynanır, hata vermez.
 *
 * Kayıt biçimi değişince anahtarın sürümü artar (`…-v4`). Eski anahtar `legacy` ile verilirse ilk
 * okumada çevrilip yeni anahtara yazılır ve eskisi silinir; çevrilemiyorsa yalnızca silinir, depoda
 * sahipsiz kayıt kalmaz.
 */

function store(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Ham metin; yoksa ya da depo yoksa null. */
export function readText(key: string): string | null {
  try {
    return store()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeText(key: string, value: string) {
  try {
    store()?.setItem(key, value);
  } catch {
    // saklanamazsa yalnızca bu oturum geçerli
  }
}

export function removeKey(key: string) {
  try {
    store()?.removeItem(key);
  } catch {
    // yok sayılır
  }
}

/** JSON olarak okunan değer; yoksa, bozuksa ya da depo yoksa null. Doğrulama çağıranındır. */
export function readJson(key: string): unknown {
  const raw = readText(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown) {
  writeText(key, JSON.stringify(value));
}

/**
 * Deponun kendisiyle çalışan tek seferlik göçler için (anahtarları gezen eski taslak taşıyıcıları):
 * depo yoksa ya da göç hata verirse sessizce geçilir.
 */
export function migrateWith(run: (storage: Storage) => void) {
  const s = store();
  if (!s) return;
  try {
    run(s);
  } catch {
    // göç bir dahaki açılışta yine denenir
  }
}

/** Eski bir kayıt anahtarı ve (varsa) eski biçimi yenisine çeviren işlev. */
export interface Legacy<T> {
  key: string;
  convert?: (old: unknown) => T | null;
}

/**
 * `check`ten geçen kayıt ya da null. Yeni anahtarda kayıt yoksa `legacy` anahtarlarına sırayla
 * bakılır: çevrilen ilk kayıt yeni anahtara yazılır; eski anahtarların hepsi silinir.
 */
export function readChecked<T>(key: string, check: (v: unknown) => v is T, legacy: Legacy<T>[] = []): T | null {
  const v = readJson(key);
  if (v !== null && check(v)) return v;
  for (const old of legacy) {
    const raw = readJson(old.key);
    removeKey(old.key);
    const moved = raw !== null && old.convert ? old.convert(raw) : null;
    if (moved !== null && check(moved)) {
      writeJson(key, moved);
      legacy.forEach((l) => removeKey(l.key));
      return moved;
    }
  }
  return null;
}
