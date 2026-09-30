import { useMemo, useState } from 'react';
import { formatClock } from '../game/time';
import { lineupFor, useGameStore } from '../game/store';
import { days, FINALIST_LIMIT } from '../game/data/days';
import { candidates } from '../game/data/candidates';
import { Button } from '../components/ui/Button';
import { DayEndBackdrop } from '../components/dayend/DayEndBackdrop';
import { CountUp } from '../components/dayend/CountUp';
import { CHART } from '../components/dayend/chartColors';
import { EvidenceCard } from '../components/story/EvidenceCard';
import { CONSIDERED_SECONDS } from '../game/engine/scoring';
import styles from './DayEndScreen.module.css';

export function DayEndScreen() {
  const currentDayIndex = useGameStore((s) => s.currentDayIndex);
  const dayStats = useGameStore((s) => s.dayStats);
  const decisions = useGameStore((s) => s.decisions);
  const timeSpent = useGameStore((s) => s.timeSpent);
  const performans = useGameStore((s) => s.performans);
  const vicdan = useGameStore((s) => s.vicdan);
  const nextDay = useGameStore((s) => s.nextDay);
  const finalists = useGameStore((s) => s.finalists);
  const lineups = useGameStore((s) => s.lineups);
  const workdayMinutes = useGameStore((s) => s.workdayMinutes);
  const decisionLog = useGameStore((s) => s.decisionLog);
  const managerRequests = useGameStore((s) => s.managerRequests);
  const managerVerdict = useGameStore((s) => s.managerVerdict);
  const dayStart = useGameStore((s) => s.dayStart);
  const referenceChecks = useGameStore((s) => s.referenceChecks);
  const rejectionToday = useGameStore((s) => s.rejectionToday);
  const [watching, setWatching] = useState(false);
  const story = useGameStore((s) => s.story);
  // Thursday night: what you do with the photo can't wait for Friday
  const photoTonight = currentDayIndex === 3 && story.drawer === 'photographed';
  const photoOpen = photoTonight && story.evidence === null;

  const day = days[currentDayIndex];
  const lineup = lineupFor({ currentDayIndex, lineups });
  const processed = dayStats.approved + dayStats.rejected;

  // files you actually sat with — the same bar the scoring uses
  const readCount = useMemo(
    () => lineup.filter((id) => decisions[id] && ((timeSpent[id] ?? 0) >= CONSIDERED_SECONDS || referenceChecks[id])).length,
    [decisions, timeSpent, lineup, referenceChecks],
  );
  const skimmed = processed - readCount;
  const mailsSent = rejectionToday.personal + rejectionToday.standard + rejectionToday.pool;
  const applied = dayStats.autoRejected + lineup.length;
  const dPerf = performans - dayStart.performans;
  const dVic = vicdan - dayStart.vicdan;
  const headline =
    skimmed === 0 && processed > 0
      ? 'Masana gelen her dosyayı açıp okudun.'
      : readCount === 0
        ? 'Bugün dosyaların hiçbirinde durmadın.'
        : `${readCount} dosyada durdun, ${skimmed} dosyaya göz atıp geçtin.`;


  const leftAt = formatClock(workdayMinutes);

  return (
    <div className={styles.screen}>
      <DayEndBackdrop dayIndex={currentDayIndex} />
      <button className={styles.watch} onClick={() => setWatching((w) => !w)} aria-pressed={watching}>
        {watching ? '📋 Raporu göster' : '👁 Manzarayı izle'}
      </button>
      {watching && <button className={styles.watchScrim} onClick={() => setWatching(false)} aria-label="Raporu göster" />}
      <div className={`${styles.content} ${watching ? styles.contentHidden : ''}`} aria-hidden={watching}>
        <header className={styles.reportHead}>
          <div>
            <div className={styles.eyebrow}>
              Gün {day.day} tamamlandı · {day.dayName} · çıkış {leftAt}
              {story.overtimeToday && ' · fazla mesai'}
            </div>
            <h1 className={styles.title}>Günün Özeti</h1>
          </div>
        </header>

        <p className={styles.headline}>{headline}</p>

        {/* a 2×2 of equal cards: the numbers beside the names, you beside Hakan Bey */}
        <div className={styles.grid}>
          <section className={styles.card}>
            <div className={styles.panelHead}>Başvurudan mülakata</div>
            <div className={styles.funnelRows}>
              <div className={styles.funnelRow}>
                <span className={styles.funnelLabel}>Başvuru</span>
                <span className={styles.funnelBar} style={{ width: '100%' }} />
                <b className="mono">
                  <CountUp value={applied} duration={1400} />
                </b>
              </div>
              <div className={styles.funnelRow}>
                <span className={styles.funnelLabel}>Masana gelen</span>
                <span className={styles.funnelBar} style={{ width: `${Math.max(4, (lineup.length / Math.max(1, applied)) * 100)}%` }} />
                <b className="mono">{lineup.length}</b>
              </div>
              <div className={styles.funnelRow}>
                <span className={styles.funnelLabel}>Okuyarak karar</span>
                <span className={styles.funnelBar} style={{ width: `${Math.max(3, (readCount / Math.max(1, applied)) * 100)}%`, background: CHART.vicdan }} />
                <b className="mono">{readCount}</b>
              </div>
              <div className={styles.funnelRow}>
                <span className={styles.funnelLabel}>Mülakata çağrılan</span>
                <span className={styles.funnelBar} style={{ width: `${Math.max(2, (dayStats.approved / Math.max(1, applied)) * 100)}%`, background: CHART.interview }} />
                <b className="mono">{dayStats.approved}</b>
              </div>
            </div>
            <p className={styles.funnelNote}>
              <b style={{ color: CHART.reject }}>{dayStats.autoRejected}</b> başvuru sen görmeden sistem tarafından elendi. Onların dosyası hiç açılmadı.
            </p>
          </section>

          <section className={styles.card}>
            <div className={styles.panelHead}>
              Günün kararları <span className="mono">{dayStats.approved} mülakat · {dayStats.rejected} ret</span>
            </div>
            <ul className={`${styles.decisionList} ${lineup.length > 7 ? styles.decisionListTwo : ''}`}>
              {lineup.map((id) => {
                const c = candidates[id];
                const d = decisions[id];
                const at = decisionLog.find((e) => e.id === id)?.at;
                const req = managerRequests.find((r) => r.candidateId === id);
                return (
                  <li key={id} title={at !== undefined ? formatClock(at) : undefined}>
                    <span className={styles.dot} style={{ background: c.color }} />
                    <span className={styles.who}>
                      <b>{c.name}</b>
                      {req && <small className={d === req.want ? styles.reqKept : styles.reqBroken}>Hakan Bey'in talebi</small>}
                    </span>
                    <span className={`${styles.verdict} ${d === 'approve' ? styles.vApprove : d === 'reject' ? styles.vReject : styles.vAuto}`}>
                      {d === 'approve' ? 'Mülakat' : d === 'reject' ? 'Ret' : 'Otomatik ret'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className={styles.card}>
            <div className={styles.panelHead}>Sen</div>
            <div className={styles.deltas}>
              <div className={styles.delta}>
                <span>Performans</span>
                <b className="mono" style={{ color: CHART.performans }}>
                  {performans}
                  <small className={dPerf > 0 ? styles.up : dPerf < 0 ? styles.down : undefined}>{dPerf > 0 ? `▲${dPerf}` : dPerf < 0 ? `▼${-dPerf}` : '±0'}</small>
                </b>
              </div>
              <div className={styles.delta}>
                <span>Vicdan</span>
                <b className="mono" style={{ color: CHART.vicdan }}>
                  {vicdan}
                  <small className={dVic > 0 ? styles.up : dVic < 0 ? styles.down : undefined}>{dVic > 0 ? `▲${dVic}` : dVic < 0 ? `▼${-dVic}` : '±0'}</small>
                </b>
              </div>
              <div className={styles.delta}>
                <span>Kısa liste</span>
                <b className="mono">
                  {finalists.length}/{FINALIST_LIMIT}
                </b>
              </div>
            </div>
            <p className={styles.mailsLine}>
              {mailsSent === 0 && rejectionToday.none === 0
                ? 'Bugün kimseye ret e-postası gitmedi.'
                : [
                    rejectionToday.personal && `${rejectionToday.personal} kişisel geri bildirim`,
                    rejectionToday.standard && `${rejectionToday.standard} standart ret`,
                    rejectionToday.pool && `${rejectionToday.pool} "havuzda tutacağız"`,
                    rejectionToday.none && `${rejectionToday.none} kişiye hiçbir şey gitmedi`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
            </p>
            {dayStats.undecided > 0 && <p className={styles.undecidedNote}>⏱ {dayStats.undecided} dosya karar verilmeden kaldı ve otomatik reddedildi.</p>}
          </section>

          <section className={styles.card}>
            <div className={styles.panelHead}>Hakan Bey'in gözünden</div>
            {managerVerdict.length > 0 ? (
              <ul className={styles.verdictLines}>
                {managerVerdict.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            ) : (
              <p className={styles.quiet}>Hakan Bey bugün kararların hakkında bir şey söylemedi. Söylemediği de bir şeydir.</p>
            )}
            {days[currentDayIndex + 1]?.final && <div className={styles.finalistNote}>Yarın mülakat günü: {finalists.length} adaydan sadece 1 kişi işe alınacak.</div>}
          </section>
        </div>

        {photoTonight && (
          <div className={styles.photoTonight}>
            <div className={styles.eveningHead}>🌙 Gece 23:40 · Zehra "bu gece" demişti</div>
            <EvidenceCard />
          </div>
        )}

        <div className={styles.footer}>
          <Button variant="primary" sound="confirm" className={styles.cta} onClick={nextDay} disabled={photoOpen}>
            {photoOpen ? 'Önce fotoğrafa karar ver' : days[currentDayIndex + 1]?.final ? 'MÜLAKAT GÜNÜNE GEÇ →' : 'SONRAKİ GÜN →'}
          </Button>
        </div>
      </div>
    </div>
  );
}
