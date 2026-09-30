/*
 * What an applicant tracking system actually "reads": a parse, a keyword match against the ad,
 * a title match and a rank. Nothing in it is about the person; that is the point.
 */
import type { Candidate } from './types';

/** Keywords lifted from the job ad; the system counts literal matches, nothing else. */
export const AD_KEYWORDS = ['Java', 'Spring', 'SQL', 'REST', 'Mikroservis', 'Docker', 'CI/CD', 'Git', 'Agile'];
const TITLES = /yazılım|geliştirici|developer|engineer|mühendis/i;
const PARSE_FIELDS = 8;

const hash = (id: string) => [...id].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) % 100003, 7);

export interface AtsReport {
  parsed: number;
  parseNote: string;
  matched: string[];
  missing: string[];
  /** The last title on the CV, and whether the parser recognised it as the advertised role. */
  title: string;
  titleMatch: boolean;
  rank: number;
  of: number;
}

export function atsReport(c: Candidate, applications: number): AtsReport {
  const text = [c.skills, c.experience, c.previousCompany, c.certifications].join(' ').toLowerCase();
  // a keyword the system note says it couldn't find stays missing, whatever the CV says
  const notFound = /"([^"]+)" bulunamadı/.exec(c.systemLine)?.[1];
  const matched = AD_KEYWORDS.filter(
    (k) => k !== notFound && (text.includes(k.toLowerCase()) || (k === 'Mikroservis' && text.includes('microservice'))),
  );
  const unreadable = /ayrıştırılamadı/.test(c.systemLine);
  const title = (c.previousCompany.split('—')[1] ?? c.previousCompany).replace(/\(.*$/, '').split(',')[0].trim().replace(/\.$/, '');
  const h = hash(c.id);
  const flagged = /Değerlendirme dışı|Düşük öncelik/.test(c.systemLine);
  const of = Math.max(applications, 100);
  return {
    parsed: unreadable ? 3 : PARSE_FIELDS,
    parseNote: unreadable ? 'iki sütunlu şablon; tablo içeriği okunamadı' : 'standart metin katmanı',
    matched,
    missing: AD_KEYWORDS.filter((k) => !matched.includes(k)),
    title,
    titleMatch: TITLES.test(title),
    // flagged files sink to the bottom of the pile, where no one scrolls
    rank: flagged ? Math.round(of * 0.55) + (h % Math.round(of * 0.4)) : 4 + (h % 40),
    of,
  };
}

/** The system line with its match percentage taken from the same count the report shows. */
export function systemLineWith(c: Candidate, report: AtsReport) {
  const pct = Math.round((report.matched.length / AD_KEYWORDS.length) * 100);
  return c.systemLine.replace(/ATS eşleşme %\d+/, `ATS eşleşme %${pct}`);
}
