import { LEGACY_PREFIXES } from '../../game/lib/privacy';
import { draftKey, type PlaceId } from './model';

/** Önekten önceki taslak anahtarı: `meydan:taslak:v3:<yer>`. */
const OLD_V3 = `${LEGACY_PREFIXES[0]}v3:`;

/*
 * Meydan taslakları bir zamanlar sitenin öneki olmadan saklanıyordu, "Verilerimi sil" onları
 * görmüyordu. Açılışta bu sürümün taslakları yeni anahtara taşınır (yenisi varsa dokunulmaz),
 * eski anahtarların hepsi silinir: artık oyunda olmayan bir yerin ya da daha eski çizimin taslağı da.
 */
export function adoptOldDrafts(storage: Storage, places: readonly PlaceId[]) {
  const old = Array.from({ length: storage.length }, (_, i) => storage.key(i) ?? '').filter((k) => k.startsWith(LEGACY_PREFIXES[0]));
  for (const key of old) {
    const place = key.slice(OLD_V3.length) as PlaceId;
    const draft = storage.getItem(key);
    if (key.startsWith(OLD_V3) && places.includes(place) && draft !== null && storage.getItem(draftKey(place)) === null) storage.setItem(draftKey(place), draft);
    storage.removeItem(key);
  }
}
