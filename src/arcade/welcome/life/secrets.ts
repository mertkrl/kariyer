/*
 * Mahallede saklı şeyler. Çoğu bir şeye dokununca bulunur (kedi, simitçi, çamaşır ipi, trafik
 * ışığına üç kez…), bazıları yalnızca gece (kara kedi, maç, plazada fazla mesai), bazıları ancak
 * yağmurda (şemsiye), bazıları sabırla ya da şansla (uzun bekleyiş, yeşilde korna, gece yarısı),
 * biri de klavyeyle. Bulunanlar tarayıcıda saklanır; ekranda adları yazmaz, yalnızca nazar
 * boncuğunun çevresindeki halka dolar.
 */

export const SECRETS = [
  'kedi',
  'guvercin',
  'simit',
  'kepce',
  'tabela',
  'vinc',
  'wifi',
  'dolmus',
  'anten',
  'bekle',
  'itiraf',
  'sepet',
  'top',
  'kopek',
  'isik',
  'cukur',
  'otobus',
  'camasir',
  'marti',
  'camci',
  'kaynak',
  'cayci',
  'duman',
  'gazete',
  'kurye',
  'doviz',
  'ekran',
  'mac',
  'kara-kedi',
  'yagmur',
  'semsiye',
  'balon',
  'korna',
  'klavye',
  'gece-yarisi',
  'plaza',
  'taksi',
] as const;

export type SecretId = (typeof SECRETS)[number];

const SET = new Set<string>(SECRETS);
export const isSecret = (id: string): id is SecretId => SET.has(id);

const STORE = 'kasm-mahalle-sirlari';

export function loadFound(): Set<SecretId> {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) ?? '[]');
    return new Set((Array.isArray(raw) ? raw : []).filter((id): id is SecretId => typeof id === 'string' && isSecret(id)));
  } catch {
    return new Set();
  }
}

export function saveFound(found: Set<SecretId>) {
  try {
    localStorage.setItem(STORE, JSON.stringify([...found]));
  } catch {
    // saklanamadıysa bu ziyaretlik kalır
  }
}
