/*
 * Cuma kurulu. Herkes kendi adayının mülakatına girer: Defne kendi çağırdıklarıyla, Ayşe ve Emre
 * kendi kısa listeleriyle, Hakan Bey kendi önerdikleriyle görüşür. Ümit her mülakatta teknik
 * soruyu sorar, Hakan Bey her mülakatta "uyum" sorusunu. Gün sonunda kurulda her adayın üç puanı
 * yan yana durur: görüşmeyi yapanın puanı, Ümit'in teknik puanı, Hakan Bey'in uyum puanı.
 * Toplamı en yüksek ve bütçeye sığan aday işe alınır.
 *
 * Puanlar kimin nasıl baktığını taşır: Ayşe dürüst puanlar, Emre ATS skoruna bakar, Hakan Bey
 * kendi önerdiklerini sever ve "uzun vadeli uyum" diye kadınlara ve 40 yaş üstüne düşük verir.
 */
import type { Decision } from '../types';
import type { Finalist } from '../store/storeTypes';
import { NEPHEW_ID, candidateOf } from '../data/candidates';
import { candidateDetails } from '../data/candidateDetails';
import { hakanTarget } from '../data/interviewExtras';
import { SALARY_CAP, salaryOf } from '../day/managerCalls';

export type Interviewer = 'you' | 'ayse' | 'emre' | 'hakan';

export const INTERVIEWER: Record<Interviewer, { name: string; role: string }> = {
  you: { name: 'Sen', role: 'İşe Alım Uzmanı' },
  ayse: { name: 'Ayşe Demir', role: 'İK Uzmanı' },
  emre: { name: 'Emre Yıldız', role: 'İK Uzmanı' },
  hakan: { name: 'Hakan Kaya', role: 'İK Müdürü' },
};

const fitOf = (id: string) => candidateDetails[id]?.hireFit ?? 3;

/** Adayın mülakatına kim girer: kısa listesini yapan, Hakan Bey'in önerdikleri için o, gerisi sen. */
export function ownerOf(f: Finalist, pastRequests: { candidateId: string; want: Decision }[]): Interviewer {
  if (f.by) return f.by;
  if (f.byManager || f.id === NEPHEW_ID || pastRequests.some((r) => r.want === 'approve' && r.candidateId === f.id)) return 'hakan';
  return 'you';
}

/** Emre'nin baktığı tek şey: sistemin skoru. */
const EMRE_SCORE: Record<string, number> = { sarp: 5, cagan: 4 };

/** Görüşmeyi yapan meslektaşın verdiği puan (1–5). Senin puanın puan kartından gelir. */
export function colleagueScore(id: string, who: Exclude<Interviewer, 'you'>): number {
  if (who === 'hakan') return 5;
  if (who === 'emre') return EMRE_SCORE[id] ?? 3;
  return fitOf(id);
}

/** Ümit'in teknik sorudan (kod vakasından) verdiği puan. Ozan teknikte kusursuzdur; sorunu başka yerde. */
export function techScore(id: string): number {
  if (id === 'ozan') return 5;
  return fitOf(id);
}

/** Hakan Bey'in "uyum" puanı: kendi adamlarına tam, listesindeki soruların hedeflediklerine (kadınlar, 40 yaş üstü) düşük. */
export function hakanScore(id: string, owner: Interviewer): number {
  if (owner === 'hakan') return 5;
  return hakanTarget(id, candidateOf(id).age) ? 2 : 4;
}

export interface PanelRow {
  id: string;
  owner: Interviewer;
  /** Görüşmeyi yapanın puanı; sen puanlamadıysan null. */
  interviewer: number | null;
  tech: number;
  /** Hakan Bey'in uyum puanı; yapılandırılmış mülakatta (listesi masada değil) null. */
  hakan: number | null;
  total: number;
  /** Anlaşılan ya da beklenen aylık maaş; rakam yoksa null. */
  pay: number | null;
  affordable: boolean;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Kurul tablosu: her aday için üç puan, toplam ve bütçe. */
export function panelRows(
  finalists: Finalist[],
  pastRequests: { candidateId: string; want: Decision }[],
  myScores: Record<string, number | null>,
  agreed: Record<string, number | null>,
  structured = false,
): PanelRow[] {
  return finalists.map((f) => {
    const owner = ownerOf(f, pastRequests);
    const interviewer = owner === 'you' ? (myScores[f.id] ?? null) : colleagueScore(f.id, owner);
    const tech = techScore(f.id);
    const hakan = structured ? null : hakanScore(f.id, owner);
    const pay = f.id in agreed ? (agreed[f.id] ?? salaryOf(f.id)) : salaryOf(f.id);
    return {
      id: f.id,
      owner,
      interviewer,
      tech,
      hakan,
      // Hakan Bey kendi adayında hem görüşen hem uyum puanını verir: oyu bir kez sayılır
      total: mean([...(interviewer === null ? [] : [interviewer]), tech, ...(hakan === null || owner === 'hakan' ? [] : [hakan])]),
      pay,
      affordable: (pay ?? 0) <= SALARY_CAP,
    };
  });
}

/** Kurulun ortak kararı: bütçeye sığanlar arasında toplamı en yüksek olan; eşitlikte teknik puan. */
export function panelVerdict(rows: PanelRow[]): string {
  const pool = rows.some((r) => r.affordable) ? rows.filter((r) => r.affordable) : rows;
  return [...pool].sort((a, b) => b.total - a.total || b.tech - a.tech)[0].id;
}
