/*
 * Oturum raporu: bir oyuncunun haftasının nasıl göründüğü; sonrasında bir eğitmenin ya da bir
 * sınıfın konuşabilmesi için. Haftanın kendi kaydından cihazda kurulur ve hiçbir yere gönderilmez;
 * oyuncu onu yazdırır ya da kopyalar. Sorular bu oyuncunun gerçekte ne yaptığını izler; böylece
 * tartışma genel bir listeden değil kendi seçimlerinden başlar.
 */
import type { Decision, Difficulty } from '../types';
import type { WeekEntry } from '../day/echoes';
import { candidateOf, NEIGHBOUR_ID, NEPHEW_ID } from '../data/candidates';
import { candidateDetails } from '../data/candidateDetails';
import { isStrong, isWronglyFlagged, systemVerdict } from './scoring';
import { APTITUDE_CUTOFF, candidateAptitude } from '../events/aptitude';
import { scoreCalibration, scoreGap, type Scores } from '../events/interview';
import { hakanTarget } from '../data/interviewExtras';

export interface ReportInput {
  seed: number;
  difficulty: Difficulty;
  endingTitle: string;
  performans: number;
  vicdan: number;
  weekLog: WeekEntry[];
  finalists: { id: string }[];
  hiredId: string | null;
  referenceChecks: Record<string, unknown>;
  aiUses: number;
  complies: number;
  refusals: number;
  /** Testi kendin çözdüysen puanın. */
  selfScore?: number | null;
  /** Cuma mülakatlarında puan kartına verdiğin puanlar. */
  interviewScores?: Record<string, Scores>;
}

/** Mülakat puanların: Hakan Bey'in hedeflerine fark ve gerçekle ne kadar örtüştüğü. */
export interface ScoringSummary {
  /** Kadınlara ve 40 yaş üstüne diğerlerinden ne kadar düşük verdin; anlamlı değilse null. */
  gap: number | null;
  rated: number;
  hits: number;
  misses: { name: string; given: number; fit: number; over: boolean }[];
}

/** Testin haftası: kim teste girdi, kim eşikte takıldı, Perşembe kimi çağırdın. */
export interface TestSummary {
  tested: number;
  /** Teste geçen ve eşiğin altında kalan güçlü dosyalar (puanlarıyla). */
  strongBelow: { name: string; score: number; invited: boolean }[];
  /** Eşiğin üstünde kalan zayıf dosyalar. */
  weakAbove: { name: string; score: number; invited: boolean }[];
  selfScore: number | null;
}

export interface FileLine {
  name: string;
  decision: Decision;
  /** Karar vermeden önce okunan; hafta bu kayıttan önceyse null. */
  considered: boolean | null;
}

export interface SessionReport {
  seed: number;
  difficulty: Difficulty;
  endingTitle: string;
  performans: number;
  vicdan: number;
  decided: number;
  approved: number;
  rejected: number;
  /** Dosyayı okuduktan sonra verilen kararların payı (0–1); bilinmiyorsa null. */
  readShare: number | null;
  /** Sistemin bir vekil yüzünden aşağı ittiği güçlü insanlar: haftanın asıl sorusu. */
  flaggedStrong: FileLine[];
  /** Sistemin öne koyduğu ve mülakata çağrılan zayıf dosyalar. */
  priorityWeakApproved: string[];
  references: number;
  aiUses: number;
  complies: number;
  refusals: number;
  hired: { name: string; fit: number } | null;
  nephewInterviewed: boolean;
  neighbourInterviewed: boolean;
  test: TestSummary;
  scoring: ScoringSummary;
  questions: string[];
}

const DIFFICULTY_NAME: Record<Difficulty, string> = { relaxed: 'Rahat', normal: 'Normal', hard: 'Zor' };
const nameOf = (id: string) => candidateOf(id).name;

export function sessionReport(input: ReportInput): SessionReport {
  // CV kararları; Perşembe'nin kayıtları aynı insanlar için davettir, ayrıca sayılır
  const log = input.weekLog;
  const invited = new Set(input.weekLog.filter((e) => e.decision === 'approve').map((e) => e.id));
  const tested = [...new Set(log.filter((e) => e.decision === 'approve').map((e) => e.id))].map((id) => ({ id, score: candidateAptitude(id, input.seed).score }));
  const fitOf = (id: string) => candidateDetails[id]?.hireFit ?? 3;
  const known = log.filter((e) => e.considered !== undefined);
  const flaggedStrong = log
    .filter((e) => isWronglyFlagged(e.id) && isStrong(e.id))
    .map((e) => ({ name: nameOf(e.id), decision: e.decision, considered: e.considered ?? null }));
  const priorityWeakApproved = log
    .filter((e) => e.decision === 'approve' && systemVerdict(candidateOf(e.id)) === 'priority' && (candidateDetails[e.id]?.hireFit ?? 3) <= 2)
    .map((e) => nameOf(e.id));
  const interviewed = new Set(input.finalists.map((f) => f.id));
  const report: SessionReport = {
    seed: input.seed,
    difficulty: input.difficulty,
    endingTitle: input.endingTitle,
    performans: input.performans,
    vicdan: input.vicdan,
    decided: log.length,
    approved: log.filter((e) => e.decision === 'approve').length,
    rejected: log.filter((e) => e.decision === 'reject').length,
    readShare: known.length ? known.filter((e) => e.considered).length / known.length : null,
    flaggedStrong,
    priorityWeakApproved,
    references: Object.keys(input.referenceChecks).length,
    aiUses: input.aiUses,
    complies: input.complies,
    refusals: input.refusals,
    hired: input.hiredId ? { name: nameOf(input.hiredId), fit: candidateDetails[input.hiredId]?.hireFit ?? 3 } : null,
    nephewInterviewed: interviewed.has(NEPHEW_ID),
    neighbourInterviewed: interviewed.has(NEIGHBOUR_ID),
    test: {
      tested: tested.length,
      strongBelow: tested.filter((t) => isStrong(t.id) && t.score < APTITUDE_CUTOFF).map((t) => ({ name: nameOf(t.id), score: t.score, invited: invited.has(t.id) })),
      weakAbove: tested.filter((t) => fitOf(t.id) <= 2 && t.score >= APTITUDE_CUTOFF).map((t) => ({ name: nameOf(t.id), score: t.score, invited: invited.has(t.id) })),
      selfScore: input.selfScore ?? null,
    },
    scoring: scoringOf(input.interviewScores ?? {}),
    questions: [],
  };
  report.questions = questionsFor(report);
  return report;
}

function scoringOf(scores: Record<string, Scores>): ScoringSummary {
  const cal = scoreCalibration(scores, (id) => candidateDetails[id]?.hireFit ?? 3);
  return {
    gap: scoreGap(scores, (id) => hakanTarget(id, candidateOf(id).age)),
    rated: cal.rated,
    hits: cal.hits,
    misses: cal.misses.map((m) => ({ name: nameOf(m.id), given: m.given, fit: m.fit, over: m.over })),
  };
}

/** Tartışma soruları, önce bu oyuncunun kendi seçimleriyle ilgili olanlar. */
function questionsFor(r: SessionReport): string[] {
  const q: string[] = [];
  const unreadRejected = r.flaggedStrong.filter((f) => f.decision === 'reject' && f.considered === false);
  if (unreadRejected.length) {
    q.push(
      `${unreadRejected.map((f) => f.name).join(', ')} güçlü adaylardı; sistem onları gerçek bir eksik yüzünden değil, dolaylı bir ölçüt yüzünden aşağı itti ve sen dosyalarını okumadan eledin. O an seni okumadan karar vermeye ne itti?`,
    );
  }
  const passedOver = r.flaggedStrong.filter((f) => f.decision === 'approve');
  if (passedOver.length) {
    q.push(`${passedOver.map((f) => f.name).join(', ')} için sistemin işaretine rağmen mülakata çağırma kararı verdin. Bunu gerçek bir işyerinde yöneticine nasıl gerekçelendirirdin?`);
  }
  if (r.priorityWeakApproved.length) {
    q.push(`Sistem ${r.priorityWeakApproved.join(', ')} için "öncelikli" dedi ve sen mülakata çağırdın. Bir aracın yüksek puanı ne zaman güven verir, ne zaman sorgulanmalı?`);
  }
  if (r.complies > 0) {
    q.push(`Müdürün ${r.complies} ricasına uydun. Hangisi sana zor geldi? "Herkese aynı ölçüt" ilkesi bir rica karşısında nasıl korunur?`);
  } else if (r.refusals > 0) {
    q.push(`Müdürün ricalarını geri çevirdin. Bunun sana gerçek hayatta bir bedeli olur muydu? O bedeli kim ödemeli?`);
  }
  const left = r.test.strongBelow.filter((t) => !t.invited);
  if (left.length) {
    q.push(`${left.map((t) => `${t.name} (${t.score})`).join(', ')} güçlü dosyalardı ama test eşiğinin altında kaldı ve mülakata çağrılmadı. Testin ölçtüğü şey ile işin istediği şey arasındaki fark neydi?`);
  }
  if (r.test.weakAbove.some((t) => t.invited)) {
    q.push(`${r.test.weakAbove.filter((t) => t.invited).map((t) => t.name).join(', ')} testte yüksek aldı ve mülakata çağrıldı; dosyası zayıftı. Yüksek bir puan ne zaman bir yetkinliği, ne zaman sınava alışkınlığı gösterir?`);
  }
  if (r.test.selfScore !== null) {
    q.push(
      r.test.selfScore < APTITUDE_CUTOFF
        ? `Testi kendin çözdün ve ${r.test.selfScore} aldın; bu kurala göre sen de mülakata çağrılmazdın. Kurumunda bu testten geçemeyecek kaç iyi çalışan var?`
        : `Testi kendin çözdün ve ${r.test.selfScore} aldın. Bunun için bildiğin bir şeyi mi, beklenen cevabı mı işaretledin?`,
    );
  }
  if (r.scoring.gap !== null) {
    q.push(`Mülakat puan kartında kadınlara ve 40 yaş üstü adaylara diğerlerinden ortalama ${r.scoring.gap.toLocaleString('tr-TR')} puan düşük verdin. Hakan Bey'in "uzun vadeli uyum" sorularından ne kadarı senin puanlarına sızdı?`);
  }
  const over = r.scoring.misses.filter((m) => m.over);
  const under = r.scoring.misses.filter((m) => !m.over);
  if (over.length || under.length) {
    q.push(
      [
        over.length ? `${over.map((m) => m.name).join(', ')} için puanın gerçekte çıktıklarından yüksekti` : '',
        under.length ? `${under.map((m) => m.name).join(', ')} için düşüktü` : '',
      ]
        .filter(Boolean)
        .join('; ') + '. Mülakatta seni yanıltan neydi: anlatımı mı, özgüveni mi, dosyası mı?',
    );
  }
  if (r.nephewInterviewed) q.push('Müdürün yeğeni mülakat listesine girdi. Tavsiye ile torpil arasındaki çizgi nerede?');
  if (r.neighbourInterviewed) q.push('Kendi tanıdığın da listeye girdi. Kendi önyargını fark etmek, başkasınınkini fark etmekten neden daha zor?');
  if (r.readShare !== null && r.readShare < 0.5) {
    q.push(`Kararlarının yalnızca %${Math.round(r.readShare * 100)}'ini dosyayı okuyarak verdin. Zaman baskısı ile adil karar arasındaki gerilimi kurumunuzda nasıl yönetiyorsunuz?`);
  }
  if (r.aiUses >= 5) q.push(`Yapay zekâ önerisine ${r.aiUses} kez başvurdun. Bir aracın önerisini kullanmak ile kararı ona bırakmak arasındaki fark ne?`);
  // her grubun başlayabileceği sorular
  q.push(
    'Performans puanın şirketin seni nasıl gördüğünü, Vicdan puanın nasıl karar verdiğini ölçtü. Kendi işinde bu ikisi hangi durumlarda ayrışıyor?',
    'Sistemin "Değerlendirme dışı" dediği hangi gerekçeler, gerçekte bir grubu (yaş, cinsiyet, kariyer arası, mezuniyet yeri) dolaylı olarak dışarıda bırakıyor?',
    'Hiç geri dönüş alamayan yüzlerce başvuru sahibi için bu haftadan sonra kurumunda neyi değiştirirdin?',
  );
  return q;
}

const pct = (n: number | null) => (n === null ? '—' : `%${Math.round(n * 100)}`);
const fileLine = (f: FileLine) => `${f.name}: ${f.decision === 'approve' ? 'mülakata çağrıldı' : 'reddedildi'}${f.considered === null ? '' : f.considered ? ' (okunarak)' : ' (okunmadan)'}`;

/** Düz metin olarak rapor: bir ders sayfasına, bir e-postaya ya da paylaşılan bir belgeye yapıştırmak için. */
export function reportText(r: SessionReport): string {
  return [
    "Sen İK'sin — oturum raporu",
    `Oyun kodu #${r.seed} · zorluk: ${DIFFICULTY_NAME[r.difficulty]}`,
    `Son: ${r.endingTitle} · Performans ${r.performans} · Vicdan ${r.vicdan}`,
    '',
    `Kararlar: ${r.decided} dosya · ${r.approved} mülakata çağrıldı · ${r.rejected} ret · okuyarak verilen: ${pct(r.readShare)}`,
    `Referans araması: ${r.references} · yapay zekâ önerisi: ${r.aiUses} · müdürün ricası: ${r.complies} uyuldu, ${r.refusals} geri çevrildi`,
    r.hired ? `İşe alınan: ${r.hired.name} (uygunluk ${r.hired.fit}/5)` : 'İşe alım yapılmadı',
    '',
    `Test: ${r.test.tested} kişi teste geçti${r.test.selfScore === null ? '' : ` · senin puanın ${r.test.selfScore}`}`,
    ...r.test.strongBelow.map((t) => `- ${t.name}: güçlü dosya, test ${t.score}${t.invited ? ' · yine de çağrıldı' : ' · çağrılmadı'}`),
    ...r.test.weakAbove.map((t) => `- ${t.name}: zayıf dosya, test ${t.score}${t.invited ? ' · çağrıldı' : ''}`),
    '',
    r.scoring.rated ? `Mülakat puanların: ${r.scoring.rated} adaydan ${r.scoring.hits} tanesinde gerçekle örtüştü${r.scoring.gap === null ? '' : ` · kadınlara ve 40 yaş üstüne ${r.scoring.gap.toLocaleString('tr-TR')} puan düşük`}` : 'Mülakat puan kartı doldurulmadı',
    ...r.scoring.misses.map((m) => `- ${m.name}: sen ${m.given.toLocaleString('tr-TR')} verdin, gerçekte ${m.fit}/5 çıktı`),
    '',
    'Sistemin haksız yere aşağı ittiği güçlü adaylar:',
    ...(r.flaggedStrong.length ? r.flaggedStrong.map((f) => `- ${fileLine(f)}`) : ['- (bu hafta önüne gelmedi)']),
    '',
    'Tartışma soruları:',
    ...r.questions.map((q, i) => `${i + 1}. ${q}`),
  ].join('\n');
}
