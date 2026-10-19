/*
 * Kayıt: her günün başında bir kontrol noktası, bu tarayıcının localStorage'ında tutulur. Hiçbir
 * şey cihazdan çıkmaz, sunucu yok. Gizli pencere ya da temizlenmiş site verisi yalnızca devam
 * edilecek bir şey olmadığı anlamına gelir.
 */
import type { GameState } from './storeTypes';

const SAVE_KEY = 'kariyerweb-save';
/** Kaydedilen biçim değişince artır; eski kayıtlar taşınabiliyorsa MIGRATIONS'a bir adım ekle. */
export const SAVE_VERSION = 5;
/** Tercihlerin kendi depoları var, kaydın parçası değiller. */
const NOT_SAVED = ['muted', 'musicVolume', 'sfxVolume'];

export interface SaveFile {
  version: number;
  savedAt: number;
  data: Partial<GameState>;
}

type SaveData = Record<string, unknown>;

/**
 * Bir kaydı n sürümünden n + 1'e nasıl taşıyacağın. Burada adımı olmayan bir sürüm taşınamaz;
 * kaydı yarım yüklenmek yerine yok sayılır.
 */
const MIGRATIONS: Record<number, (data: SaveData) => SaveData> = {
  // 2 → 3: para hikâyeden çıkarıldı (bakiye, faturalar, kira, akşam harcamaları) ve
  // Cuma'nın kira ekranı Hakan Bey'in teklifine dönüştü.
  2: (data) => {
    const story = isRecord(data.story) ? { ...data.story } : data.story;
    if (isRecord(story)) {
      for (const key of ['money', 'bills', 'wageToday', 'primToday', 'penaltyToday', 'bonusToday', 'spentToday', 'activities', 'rent', 'ledger']) delete story[key];
      story.offer ??= null;
    }
    return { ...data, story, phase: data.phase === 'reckoning' ? 'offer' : data.phase };
  },
  // 3 → 4: Ozan Tan'ın aday kimliği "emre"ydi (ofisteki Emre'yle karışıyordu); artık "ozan".
  // Kısa listedeki `by: 'emre'` ofisteki Emre'dir, ona dokunulmaz.
  3: (data) => renameOzan(data) as SaveData,
  // 4 → 5: üç adayın kimliği, ofisteki kişilerle karışan eski adlarından kendi adlarına geçti
  // (Ilgın "selin", Cihan "hakan", Batuhan "burak"). Kayıtta konuşmacı tutulmaz; her yerde değişir.
  // Ümit'in e-postaları da "levent-…" kimliklerinden "umit-…"ya geçti.
  4: (data) => renameIds(data, RENAMED_5) as SaveData,
};

const RENAMED_5: Record<string, string> = { selin: 'ilgin', hakan: 'cihan', burak: 'batuhan' };

function renameIds(value: unknown, map: Record<string, string>): unknown {
  if (typeof value === 'string') return map[value] ?? (value.startsWith('levent-') ? `umit-${value.slice(7)}` : value);
  if (Array.isArray(value)) return value.map((v) => renameIds(v, map));
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [map[k] ?? k, renameIds(v, map)]));
}

function renameOzan(value: unknown, key?: string): unknown {
  if (value === 'emre') return key === 'by' ? value : 'ozan';
  if (Array.isArray(value)) return value.map((v) => renameOzan(v));
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k === 'emre' ? 'ozan' : k, renameOzan(v, k)]));
}

export function writeSave(state: GameState) {
  const data = Object.fromEntries(Object.entries(state).filter(([key, value]) => typeof value !== 'function' && !NOT_SAVED.includes(key)));
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, savedAt: Date.now(), data } satisfies SaveFile));
  } catch {
    // storage unavailable or full — the game just won't be resumable
  }
}

const isRecord = (v: unknown): v is SaveData => typeof v === 'object' && v !== null && !Array.isArray(v);
const kind = (v: unknown) => (v === null || v === undefined ? 'empty' : Array.isArray(v) ? 'array' : typeof v);

/**
 * Kaydın oyunun şimdiki hâline uyan alanları. `fresh` yeni bir haftanın durumudur: oyunun artık
 * sahip olmadığı bir alan atılır, türü değişen bir alan (kayda dönüşmüş bir liste gibi) bütün
 * kaydı kullanılmaz kılar. Boş değerlere (null) her iki durumda da izin verilir.
 */
export function checkSave(data: unknown, fresh: object): Partial<GameState> | null {
  if (!isRecord(data)) return null;
  if (typeof data.phase !== 'string' || typeof data.currentDayIndex !== 'number') return null;
  const shape = fresh as SaveData;
  const kept: SaveData = {};
  for (const [key, value] of Object.entries(data)) {
    // yalnızca kendi alanlar: kayıttaki "__proto__" ya da "constructor" oyunun durumuna ulaşmamalı
    if (!Object.hasOwn(shape, key)) continue;
    const want = kind(shape[key]);
    const got = kind(value);
    if (want !== got && want !== 'empty' && got !== 'empty') return null;
    kept[key] = value;
  }
  return kept as Partial<GameState>;
}

/**
 * Bir kayıt vardı ama bu derleme onu sürdüremedi (eski bir sürüm, bozuk bir dosya, oyunun artık
 * sahip olmadığı bir gün ya da aday) ise ayarlanır; böylece oyuncu haftasının sessizce kaybolduğunu
 * fark etmek yerine bilgilendirilir.
 */
let lost = false;
export const saveWasLost = () => lost;

export function readSave(): SaveFile | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
    const save: unknown = JSON.parse(raw ?? 'null');
    if (save === null) return null;
    if (!isRecord(save) || typeof save.version !== 'number' || !isRecord(save.data)) return unusable();
    let { version, data } = save;
    while (version < SAVE_VERSION && MIGRATIONS[version]) data = MIGRATIONS[version++](data);
    if (version !== SAVE_VERSION) return unusable();
    return { version, savedAt: typeof save.savedAt === 'number' ? save.savedAt : 0, data: data as Partial<GameState> };
  } catch {
    return raw === null ? null : unusable();
  }
}

function unusable(): null {
  lost = true;
  return null;
}

/** Oyuna uymadığı anlaşılan bir kaydı siler (bkz. `saveWasLost`). */
export function discardSave(): null {
  clearSave();
  return unusable();
}

export function clearSave() {
  lost = false;
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // nothing to clear
  }
}
