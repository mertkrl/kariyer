import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../game/store';
import { getEnding } from '../game/engine/ending';
import { KEY_CHARACTERS } from '../game/story';
import { ACHIEVEMENTS, loadUnlocked, unlockAchievements, type AchievementInput } from '../game/engine/achievements';
import { Button } from '../components/ui/Button';
import { GAME_NAME, shareCardImage } from '../game/engine/shareCard';
import { days } from '../game/data/days';
import { NEPHEW_ID, candidateOf, candidates } from '../game/data/candidates';
import { candidateDetails } from '../game/data/candidateDetails';
import { AD_EFFECT } from '../game/data/jobs';
import { sessionReport } from '../game/engine/report';
import { SessionReport } from './final/SessionReport';
import styles from './FinalScreen.module.css';
import { avatarStyle } from '../components/ui/avatarStyle';

/** One year later — how the hire actually turned out (hidden fit revealed by the interviews). */
const HIRE_VERDICT: Record<number, string> = {
  5: 'Bir yıl sonra: ekibin en güvenilir ismi oldu. Yönetim "bu kişiyi nasıl bulduk?" diye soruyor.',
  4: 'Bir yıl sonra: sağlam, istikrarlı ve ekibin sevdiği biri. İyi bir seçimdi.',
  3: 'Bir yıl sonra: işini yapıyor. Ne parlak, ne kötü.',
  2: 'Bir yıl sonra: ekip işini paylaşmak zorunda kalıyor. Mülakatta işaretler vardı.',
  1: 'Bir yıl sonra: deneme süresi uzatıldı, ekip yoruldu. Cevaplar aslında her şeyi söylüyordu.',
};

export function FinalScreen() {
  const performans = useGameStore((s) => s.performans);
  const vicdan = useGameStore((s) => s.vicdan);
  const totalStats = useGameStore((s) => s.totalStats);
  const restart = useGameStore((s) => s.restart);
  const startGame = useGameStore((s) => s.startGame);
  const seed = useGameStore((s) => s.seed);
  const hiredId = useGameStore((s) => s.hiredId);
  const hired = hiredId ? candidates[hiredId] : null;
  const fit = hiredId ? candidateDetails[hiredId]?.hireFit ?? 3 : 3;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const aiUses = useGameStore((s) => s.aiUses);
  const managerStance = useGameStore((s) => s.managerStance);
  const difficulty = useGameStore((s) => s.difficulty);
  const weekendChoice = useGameStore((s) => s.weekendChoice);
  const week = useGameStore((s) => s.week);
  const finalists = useGameStore((s) => s.finalists);
  const dmHandled = useGameStore((s) => s.dmHandled);
  const referenceChecks = useGameStore((s) => s.referenceChecks);
  const forbiddenAsked = useGameStore((s) => s.forbiddenAsked);
  const stance = useGameStore((s) => s.interviewStance);
  const meetingChoice = useGameStore((s) => s.meeting.choice);
  const rejections = useGameStore((s) => s.rejectionStats);
  const story = useGameStore((s) => s.story);
  const selectedJobId = useGameStore((s) => s.selectedJobId);
  // Hard mode starts the manager one refusal in; don't count that against you.
  const refusals = Math.max(0, managerStance.refusals - (difficulty === 'hard' ? 1 : 0));

  const ending = getEnding(performans, vicdan, {
    refusals,
    hireFit: fit,
    aiUses,
    weekendChoice,
    difficulty,
    hiredNephew: hiredId === NEPHEW_ID,
  });
  const input: AchievementInput = {
    performans,
    vicdan,
    aiUses,
    refusals,
    complies: managerStance.complies,
    undecided: totalStats.undecided,
    reviewed: week.reviewed,
    avgSeconds: week.reviewed ? week.reviewTicks / week.reviewed : 0,
    hireFit: hiredId ? fit : 0,
    momMessages: week.momMessages,
    momAnswered: week.momAnswered,
    difficulty,
    weekendChoice,
    finalists: finalists.length,
    events: week.events,
    dmHonest: Object.values(dmHandled).filter((k) => k === 'honest').length,
  };
  const earned = ACHIEVEMENTS.filter((a) => a.test(input)).map((a) => a.id);
  // Which of this week's achievements are brand new (read before we store them).
  const [fresh] = useState(() => {
    const before = loadUnlocked();
    return earned.filter((id) => !before.has(id));
  });
  const [collected, setCollected] = useState(() => loadUnlocked());
  const [reportOpen, setReportOpen] = useState(false);
  const weekLog = useGameStore((s) => s.weekLog);
  useEffect(() => {
    setCollected(unlockAchievements(input).all);
    // once per final screen
    // oxlint-disable-next-line react/exhaustive-deps
  }, []);
  const totalProcessed = totalStats.approved + totalStats.rejected;

  // the game's address without the seed: a shared card invites people to their own week
  const gameUrl = `${window.location.origin}${window.location.pathname}`;
  const canShareFiles = typeof navigator.canShare === 'function';

  /** On a phone: the system share sheet with the card attached. Elsewhere: download the card. */
  const handleShareCard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await shareCardImage(canvas, {
      endingTitle: ending.title,
      performans,
      vicdan,
      totalProcessed,
      autoRejected: totalStats.autoRejected,
      url: gameUrl.replace(/^https?:\/\//, '').replace(/\/$/, ''),
    });
    if (!blob) return;
    const file = new File([blob], 'sen-iksin-sonuc-karti.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: GAME_NAME, text: `"${ending.title}" — Performans ${performans} · Vicdan ${vicdan}. Sen olsan ne yapardın? ${gameUrl}` });
        return;
      } catch (e) {
        // the player closed the share sheet: nothing more to do
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = file.name;
    link.href = href;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
  };

  return (
    <div className={styles.screen}>
      <div className={styles.content}>
        <div className={styles.eyebrow}>Simülasyon Sona Erdi</div>
        <h1 className={styles.title}>"{ending.title}"</h1>

        {hired && (
          <div className={styles.hireCard}>
            <span className={styles.hireAvatar} style={{ background: hired.color }}>
              {hired.initials}
            </span>
            <div className={styles.hireText}>
              <div className={styles.hireLabel}>İşe aldığın kişi</div>
              <div className={styles.hireName}>
                {hired.name} <span>· {hired.role.replace(' adayı', '')}</span>
              </div>
              <div className={styles.hireOutcome}>{hired.outcomeNote.approve}</div>
              <div className={styles.hireVerdict}>{HIRE_VERDICT[fit]}</div>
            </div>
          </div>
        )}
        <p className={styles.body}>{ending.body}</p>

        <div className={styles.scoreRow}>
          <div className={styles.scoreBlock}>
            <div className={styles.scoreValue} style={{ color: '#4c7fb0' }}>
              {performans}
            </div>
            <div className={styles.scoreLabel}>Performans</div>
          </div>
          <div className={styles.scoreDivider} />
          <div className={styles.scoreBlock}>
            <div className={styles.scoreValue} style={{ color: '#3f6b63' }}>
              {vicdan}
            </div>
            <div className={styles.scoreLabel}>Vicdan</div>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{totalProcessed}</div>
            <div className={styles.statLabel}>Toplam CV işlendi</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue} style={{ color: '#a8402f' }}>
              {totalStats.autoRejected.toLocaleString('tr-TR')}
            </div>
            <div className={styles.statLabel}>Hiç açılmadan elendi</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{totalStats.rejected}</div>
            <div className={styles.statLabel}>Toplam red</div>
          </div>
        </div>

        <div className={styles.epilogue}>
          <div className={styles.achHead}>
            <span>Bir Yıl Sonra</span>
            <span className="mono">haftanın beş insanı</span>
          </div>
          {KEY_CHARACTERS.map((k) => {
            const c = candidateOf(k.id);
            const outcome = hiredId === k.id ? 'hired' : (story.keyDecisions[k.id] ?? 'none');
            // turned away, but told the truth: honest feedback is the thing that helps
            const helped = outcome === 'reject' && dmHandled[k.id] === 'honest';
            return (
              <div key={k.id} className={`${styles.epiRow} ${outcome === 'reject' ? styles.epiReject : outcome === 'hired' ? styles.epiHired : ''}`}>
                <span className={styles.epiAvatar} style={avatarStyle(c.color)}>
                  {c.initials}
                </span>
                <span className={styles.epiText}>
                  <b>
                    {c.name} <small>· {k.who}</small>
                  </b>
                  <span>{helped ? k.honest : k.epilogue[outcome]}</span>
                </span>
              </div>
            );
          })}
          {/* the other trial-period hire: the post had room for one of you */}
          <div className={styles.epiRow}>
            <span className={styles.epiAvatar} style={avatarStyle('#6f8fa3')}>
              A
            </span>
            <span className={styles.epiText}>
              <b>
                Ayşe <small>· Deneme süresindeki diğer İK uzmanı. Kadro bir kişilikti.</small>
              </b>
              <span>
                {ending.left
                  ? 'Kadro Ayşe\'ye verildi; senin masana geçti. Bir kez yazdı: "Senin masanda oturuyorum. Dosyaları okuyorum, söz."'
                  : 'Ayşe\'nin deneme süresi uzatılmadı. Başka bir şirkette İK uzmanı oldu. Geçen ay yazdı: "Burada da bir tablo var. Bu sefer ilk günden soruyorum."'}
              </span>
            </span>
          </div>
        </div>

        <div className={styles.achievements}>
          <div className={styles.achHead}>
            <span>Başarımlar</span>
            <span className="mono">
              bu hafta {earned.length} · toplam {collected.size}/{ACHIEVEMENTS.length}
            </span>
          </div>
          <div className={styles.achGrid}>
            {ACHIEVEMENTS.map((a) => {
              const now = earned.includes(a.id);
              const ever = collected.has(a.id);
              return (
                <div key={a.id} className={`${styles.ach} ${now ? styles.achNow : ever ? styles.achEver : styles.achLocked}`} title={a.desc}>
                  <span className={styles.achIcon}>{ever || now ? a.icon : '🔒'}</span>
                  <span className={styles.achText}>
                    <b>{a.title}</b>
                    <small>{a.desc}</small>
                  </span>
                  {fresh.includes(a.id) && <span className={styles.achNew}>YENİ</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.week}>
          <div className={styles.achHead}>
            <span>Senin haftan</span>
            <span className="mono">kararların, sayılarla</span>
          </div>
          <ul className={styles.weekList}>
            <li>
              Hakan Bey'in taleplerine <b>{managerStance.complies}</b> kez uydun, <b>{managerStance.refusals}</b> kez karşı çıktın.
            </li>
            <li>
              <b>{Object.keys(referenceChecks).length}</b> adayın referansını aradın — bir iddiayı doğrulamanın tek yolu buydu.
            </li>
            <li>
              Reddettiğin adaylardan <b>{Object.values(dmHandled).filter((k) => k === 'honest').length}</b> kişiye dürüst geri bildirim verdin.
            </li>
            <li>
              Mülakatta <b>{forbiddenAsked}</b> kez aile planı, memleket ya da emeklilik sordun.
            </li>
            {rejections.standard + rejections.personal + rejections.pool + rejections.none > 0 && (
              <li>
                Reddettiklerine <b>{rejections.personal}</b> kişisel geri bildirim, <b>{rejections.standard}</b> standart ret, <b>{rejections.pool}</b> "havuzda tutacağız" gönderdin;{' '}
                <b>{rejections.none}</b> kişi hiçbir şey almadı.
              </li>
            )}
            {meetingChoice && (
              <li>
                Çarşamba toplantısında Hakan Bey sistemi sorduğunda{' '}
                <b>{{ sample: 'elenenlerin elle kontrol edilmesini önerdin', praise: '"rakamlar ortada" dedin', observe: 'gözlemlemek istediğini söyledin' }[meetingChoice]}</b>.
              </li>
            )}
            {stance.protected + stance.silent > 0 && (
              <li>
                Hakan Bey kendi listesinden sorduğunda <b>{stance.protected}</b> kez araya girdin, <b>{stance.silent}</b> kez sustun.
              </li>
            )}
            {stance.honest + stance.polished > 0 && (
              <li>
                Adayların sorularına <b>{stance.honest}</b> kez olduğu gibi, <b>{stance.polished}</b> kez şirketi iyi gösteren bir cevap verdin.
              </li>
            )}
            {story.reform && (
              <li>
                Hakan Bey'e{' '}
                <b>{{ blind: 'kör CV', structured: 'yapılandırılmış mülakat', audit: 'sistem skorlarının denetlenmesini' }[story.reform.kind]}</b> önerdin;{' '}
                {story.reform.accepted
                  ? story.reform.kind === 'structured'
                    ? 'kabul etti ve Cuma her adaya aynı sorular soruldu.'
                    : 'kabul etti; bir sonraki ilanda isim, yaş ve fotoğraf gizlendi.'
                  : 'reddetti.'}
              </li>
            )}
            {selectedJobId && AD_EFFECT[selectedJobId] && <li>{AD_EFFECT[selectedJobId].note}</li>}
          </ul>
        </div>

        <div className={styles.realWorld}>
          <div className={styles.achHead}>
            <span>Gerçek hayatta</span>
            <span className="mono">genel bilgi · hukuki tavsiye değildir</span>
          </div>
          <div className={styles.realCols}>
            <div>
              <b>İşe alım yapıyorsan</b>
              <p>6701 sayılı TİHEK Kanunu; yaş, cinsiyet, medeni hal, sağlık durumu gibi nedenlerle işe alım sürecinde de ayrımcılığı yasaklar. "Kültür uyumu" ya da "devamlılık" gibi kriterler bu nedenlere dolaylı yoldan dayanıyorsa sorun ortadan kalkmaz.</p>
              <p>KVKK, aday verisinin amaçla bağlantılı, sınırlı ve ölçülü işlenmesini ister: sorulmayan bilgiyi sosyal medyadan toplamak ya da işle ilgisi olmayan soruları sormak bu ilkeyle çelişebilir.</p>
              <p>Otomatik skorlama kullanıyorsan, hangi özelliğin puanı nasıl etkilediğini bilmek ve son kararı bir insanın gerekçeli vermesi en temel güvencedir.</p>
            </div>
            <div>
              <b>İş arıyorsan</b>
              <p>ATS'ler için tek sütunlu, sade bir CV kullan; ilandaki anahtar kelimeleri kendi deneyiminle eşleştir.</p>
              <p>Kariyer boşluğunu saklama, adını koy: "aile işi", "eğitim", "kendi projem". Açık kaynak ve yarı zamanlı işler de deneyimdir; somut çıktılarıyla yaz.</p>
              <p>Ret aldığında kısa ve kibar bir geri bildirim iste; çoğu cevap vermez, ama cevap veren bir kişi bile yön değiştirir.</p>
              <p>Ayrımcılığa uğradığını düşünüyorsan TİHEK'e başvurabilir, ÇSGB'nin ALO 170 hattından bilgi alabilirsin.</p>
            </div>
          </div>
        </div>

        <div className={styles.realNote}>
          <div className={styles.realNoteLabel}>Gerçek Dünya</div>
          <div className={styles.realNoteText}>
            İşverenlere yapılan başvuruların büyük çoğunluğunda adaylar hiçbir zaman geri bildirim
            almıyor — bir CareerBuilder anketine göre başvuru yapanların %75'i işverenden hiç haber
            alamıyor. Sen az önce bunu {(totalProcessed + totalStats.autoRejected).toLocaleString('tr-TR')} kişiye yaşattın —
            sadece {days.length} günde.
          </div>
          <div className={styles.realNoteSource}>Kaynak: CareerBuilder anketi (3.900 katılımcı)</div>
        </div>

        <canvas ref={canvasRef} width={1080} height={1080} className={styles.hiddenCanvas} />

        <div className={styles.actions}>
          <Button variant="ghost" onClick={() => void handleShareCard()}>
            {canShareFiles ? 'SONUCU PAYLAŞ' : 'SONUÇ KARTINI İNDİR'}
          </Button>
          <Button variant="ghost" onClick={() => setReportOpen(true)} title="Eğitim ya da sınıf tartışması için: haftanın özeti ve sana özel sorular">
            OTURUM RAPORU
          </Button>
          <Button variant="gold" onClick={restart}>
            BAŞTAN OYNA
          </Button>
          <Button variant="ghost" onClick={() => startGame(seed)} title="Aynı adaylar, aynı aramalar, aynı hafta">
            AYNI HAFTAYI YENİDEN OYNA
          </Button>
        </div>
        {reportOpen && (
          <SessionReport
            onClose={() => setReportOpen(false)}
            report={sessionReport({
              seed,
              difficulty,
              endingTitle: ending.title,
              performans,
              vicdan,
              weekLog,
              finalists,
              hiredId,
              referenceChecks,
              aiUses,
              complies: managerStance.complies,
              refusals,
            })}
          />
        )}
        <p className={styles.replayNote}>Aynı adaylar, aynı aramalar. Bu kez başka kararlar verirsen hafta nasıl biter?</p>
      </div>
    </div>
  );
}
