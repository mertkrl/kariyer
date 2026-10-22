/*
 * Canlı önizlemenin akışı: hastane sırası saniyeye bağlı, saf bir fonksiyondur. Her CALL_SECONDS
 * saniyede bir sonraki hasta çağrılır; adlar sabit bir listeden, numaraya göre seçilir. Böylece
 * aynı saniye her yerde (editör, paylaşılan bağlantı, PNG) aynı ekranı verir.
 */

export const CALL_SECONDS = 10;
const FIRST_NO = 701;

// uydurma adlar: gerçek bir kişiye denk gelmesin diye yiyecek adı ve hastane işi soyadı
const FIRST = ['Pestil', 'Lokum', 'Fındık', 'Simit', 'Tarçın', 'Leblebi', 'Pekmez', 'Kaju', 'Poğaça', 'Helva', 'Turşu', 'Mantı', 'Börek', 'Ayran', 'Gofret', 'Kumpir'];
const LAST = ['Türkuyruk', 'Sırabekler', 'Randevusuz', 'Numaracı', 'Dosyasız', 'Kaşeoğlu', 'Raporlu', 'Koridorlu', 'Tahlilci', 'Reçetegil', 'Sevksiz', 'Bankocu', 'Fişçioğlu', 'Sedyeci', 'Muayeneci', 'Bekleyenoğlu'];

export interface Patient {
  no: number;
  name: string;
}

export interface QueueState {
  current: Patient;
  next: Patient[];
}

export function patientOf(no: number): Patient {
  const i = no - FIRST_NO;
  // iki listeyi farklı adımlarla dolaş: aynı ad-soyad çifti kısa sürede tekrar etmesin
  return { no, name: `${FIRST[(i * 5) % FIRST.length]} ${LAST[(i * 7) % LAST.length]}` };
}

export function queueAt(seconds: number, waiting = 6): QueueState {
  const no = FIRST_NO + Math.floor(Math.max(0, seconds) / CALL_SECONDS);
  return { current: patientOf(no), next: Array.from({ length: waiting }, (_, k) => patientOf(no + 1 + k)) };
}

/** "Pestil Türkuyruk" → "PES**** TÜR****" */
export function maskName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 3).toLocaleUpperCase('tr-TR')}****`)
    .join(' ');
}

export const nameFor = (p: Patient, mask: boolean) => (mask ? maskName(p.name) : p.name.toLocaleUpperCase('tr-TR'));

const pad = (n: number) => String(n).padStart(2, '0');
export const clockText = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const dateText = (d: Date) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;

/** Geçişli ekranda her çağrının ilk saniyeleri: tam ekran "sıradaki hasta" kartı. */
export function callOverlayAt(seconds: number): { shown: number; t: number; patient: Patient } | null {
  const t = Math.max(0, seconds) % CALL_SECONDS;
  if (t >= 3.6) return null;
  const shown = t < 0.5 ? t / 0.5 : t > 3.1 ? 1 - (t - 3.1) / 0.5 : 1;
  return { shown: shown * shown * (3 - 2 * shown), t, patient: queueAt(seconds).current };
}
