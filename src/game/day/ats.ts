/*
 * Bir aday takip sisteminin gerçekte "okuduğu": bir ayrıştırma, ilana karşı anahtar kelime
 * eşleşmesi, unvan eşleşmesi ve bir sıra. İçinde kişiyle ilgili hiçbir şey yok; mesele de bu.
 */
import type { Candidate } from '../types';

/** İlandan alınan anahtar kelimeler; sistem birebir eşleşmeleri sayar, başka bir şeyi değil. */
export const AD_KEYWORDS = ['Java', 'Spring', 'SQL', 'REST', 'Mikroservis', 'Docker', 'CI/CD', 'Git', 'Agile'];
const TITLES = /yazılım|geliştirici|developer|engineer|mühendis/i;
const PARSE_FIELDS = 8;

const hash = (id: string) => [...id].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) % 100003, 7);

export interface AtsReport {
  parsed: number;
  parseNote: string;
  matched: string[];
  missing: string[];
  /** CV'deki son unvan ve ayrıştırıcının onu ilandaki rol olarak tanıyıp tanımadığı. */
  title: string;
  titleMatch: boolean;
  rank: number;
  of: number;
}

export function atsReport(c: Candidate, applications: number): AtsReport {
  const text = [c.skills, c.experience, c.previousCompany, c.certifications].join(' ').toLowerCase();
  // sistem notunun bulamadığını söylediği anahtar kelime, CV ne derse desin eksik kalır
  const notFound = /"([^"]+)" bulunamadı/.exec(c.systemLine)?.[1];
  const matched = AD_KEYWORDS.filter(
    (k) => k !== notFound && (text.includes(k.toLowerCase()) || (k === 'Mikroservis' && text.includes('microservice'))),
  );
  const unreadable = /ayrıştırılamadı/.test(c.systemLine);
  const title = (c.previousCompany.split('—')[1] ?? c.previousCompany).replace(/\(.*$/, '').split(',')[0].trim().replace(/\.$/, '');
  const h = hash(c.id);
  const flagged = c.verdict === 'out' || c.verdict === 'low';
  const of = Math.max(applications, 100);
  return {
    parsed: unreadable ? 3 : PARSE_FIELDS,
    parseNote: unreadable ? 'iki sütunlu şablon; tablo içeriği okunamadı' : 'standart metin katmanı',
    matched,
    missing: AD_KEYWORDS.filter((k) => !matched.includes(k)),
    title,
    titleMatch: TITLES.test(title),
    // işaretli dosyalar yığının dibine, kimsenin kaydırmadığı yere batar
    rank: flagged ? Math.round(of * 0.55) + (h % Math.round(of * 0.4)) : 4 + (h % 40),
    of,
  };
}

/** Eşleşme yüzdesi raporun gösterdiği aynı sayımdan alınan sistem satırı. */
export function systemLineWith(c: Candidate, report: AtsReport) {
  const pct = Math.round((report.matched.length / AD_KEYWORDS.length) * 100);
  return c.systemLine.replace(/ATS eşleşme %\d+/, `ATS eşleşme %${pct}`);
}

/**
 * Modelin 100 üzerinden "uyum puanı", portalın gösterdiği gibi. Sistemin kendi kararını izler
 * (işaretli bir dosya ne derse desin düşük puan alır); kişi başına sabit bir sapma vardır, böylece
 * aynı karardaki iki dosya aynı okunmaz. Sayı kesin görünür; aslında ondalıklı bir güvenle
 * söylenmiş karardır.
 */
const SCORE_BAND: Record<Candidate['verdict'], [number, number]> = {
  priority: [82, 96],
  review: [54, 72],
  low: [36, 52],
  out: [9, 31],
};

export function aiScore(c: Pick<Candidate, 'id' | 'verdict'>): number {
  const [lo, hi] = SCORE_BAND[c.verdict];
  return lo + (hash(c.id) % (hi - lo + 1));
}
