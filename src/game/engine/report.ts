/*
 * Oturum raporu: bir oyuncunun haftasının nasıl göründüğü; sonrasında bir eğitmenin ya da bir
 * sınıfın konuşabilmesi için. Haftanın kendi kaydından cihazda kurulur ve hiçbir yere gönderilmez;
 * oyuncu onu yazdırır ya da kopyalar. Sorular bu oyuncunun gerçekte ne yaptığını izler; böylece
 * tartışma genel bir listeden değil kendi seçimlerinden başlar.
 */
import type { Decision, Difficulty } from '../types';
import type { WeekEntry } from '../echoes';
import { candidateOf, NEIGHBOUR_ID, NEPHEW_ID } from '../data/candidates';
import { candidateDetails } from '../data/candidateDetails';
import { isStrong, isWronglyFlagged, systemVerdict } from './scoring';

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
  questions: string[];
}

const DIFFICULTY_NAME: Record<Difficulty, string> = { relaxed: 'Rahat', normal: 'Normal', hard: 'Zor' };
const nameOf = (id: string) => candidateOf(id).name;

export function sessionReport(input: ReportInput): SessionReport {
  const log = input.weekLog;
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
    questions: [],
  };
  report.questions = questionsFor(report);
  return report;
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
    q.push(`${passedOver.map((f) => f.name).join(', ')} için sistemin işaretine rağmen mülakat kararı verdin. Bunu gerçek bir işyerinde yöneticine nasıl gerekçelendirirdin?`);
  }
  if (r.priorityWeakApproved.length) {
    q.push(`Sistem ${r.priorityWeakApproved.join(', ')} için "öncelikli" dedi ve sen çağırdın. Bir aracın yüksek puanı ne zaman güven verir, ne zaman sorgulanmalı?`);
  }
  if (r.complies > 0) {
    q.push(`Müdürün ${r.complies} ricasına uydun. Hangisi sana zor geldi? "Herkese aynı ölçüt" ilkesi bir rica karşısında nasıl korunur?`);
  } else if (r.refusals > 0) {
    q.push(`Müdürün ricalarını geri çevirdin. Bunun sana gerçek hayatta bir bedeli olur muydu? O bedeli kim ödemeli?`);
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
    `Kararlar: ${r.decided} dosya · ${r.approved} mülakat · ${r.rejected} ret · okuyarak verilen: ${pct(r.readShare)}`,
    `Referans araması: ${r.references} · yapay zekâ önerisi: ${r.aiUses} · müdürün ricası: ${r.complies} uyuldu, ${r.refusals} geri çevrildi`,
    r.hired ? `İşe alınan: ${r.hired.name} (uygunluk ${r.hired.fit}/5)` : 'İşe alım yapılmadı',
    '',
    'Sistemin haksız yere aşağı ittiği güçlü adaylar:',
    ...(r.flaggedStrong.length ? r.flaggedStrong.map((f) => `- ${fileLine(f)}`) : ['- (bu hafta önüne gelmedi)']),
    '',
    'Tartışma soruları:',
    ...r.questions.map((q, i) => `${i + 1}. ${q}`),
  ].join('\n');
}
