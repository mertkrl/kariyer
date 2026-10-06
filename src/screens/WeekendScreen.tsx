import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../game/store';
import { NEIGHBOUR_ID, candidateOf } from '../game/data/candidates';
import { buildCall, type CallChoice, type CallLine } from '../game/weekend';
import { audioEngine } from '../audio/audioEngine';
import { Button } from '../components/ui/Button';
import { HomeScene } from './weekend/HomeScene';
import styles from './WeekendScreen.module.css';

/*
 * Cuma, 21:40, ev. Sıcak bir lamba, yan sehpada çay; pencereden karşı sokak ve kentsel dönüşüm
 * pankartı. Annen hafta sonu teyzende; arar, sen de ona haftayı anlatırsın.
 */

type Stage = 'ringing' | 'talking' | 'ended';

export function WeekendScreen() {
  const finishWeekend = useGameStore((st) => st.finishWeekend);
  const setWeekendChoice = useGameStore((st) => st.setWeekendChoice);
  // hafta bitti, sayıları artık değişmez; bu yüzden konuşma bir kez yazılır
  const [steps] = useState(() => {
    const s = useGameStore.getState();
    return buildCall({
      hiredName: s.hiredId ? candidateOf(s.hiredId).name.split(' ')[0] : null,
      recommendedName: s.recommendedId && s.recommendedId !== s.hiredId ? candidateOf(s.recommendedId).name.split(' ')[0] : null,
      hiredNeighbour: s.hiredId === NEIGHBOUR_ID,
      processed: s.totalStats.approved + s.totalStats.rejected,
      autoRejected: s.totalStats.autoRejected,
      refusals: s.managerStance.refusals - (s.difficulty === 'hard' ? 1 : 0),
      complies: s.managerStance.complies,
      vicdan: s.vicdan,
      performans: s.performans,
      momMessages: s.week.momMessages,
      momAnswered: s.week.momAnswered,
      aiUses: s.aiUses,
      events: s.week.events,
      dmHonest: Object.values(s.dmHandled).filter((k) => k === 'honest').length,
      dmIgnored: Object.values(s.dmHandled).filter((k) => k === 'ignore').length,
      offer: s.story.offer?.outcome ?? null,
    });
  });
  const [stage, setStage] = useState<Stage>('ringing');
  const [shown, setShown] = useState<CallLine[]>([]);
  const [cursor, setCursor] = useState(0);
  const [typing, setTyping] = useState(false);
  const [replying, setReplying] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);

  // açılana kadar zil sesi
  useEffect(() => {
    if (stage !== 'ringing') return;
    audioEngine.playPhoneBuzz();
    const id = window.setInterval(() => audioEngine.playPhoneBuzz(), 1700);
    return () => window.clearInterval(id);
  }, [stage]);

  // arama süresi
  useEffect(() => {
    if (stage !== 'talking') return;
    const id = window.setInterval(() => setSeconds((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, [stage]);

  // metni bir sonraki seçime kadar ilerlet
  const step = steps[cursor];
  useEffect(() => {
    if (stage !== 'talking') return;
    if (!step) {
      const id = window.setTimeout(() => setStage('ended'), 1400);
      return () => window.clearTimeout(id);
    }
    if (step.kind !== 'line') return;
    const delay = step.line.who === 'mom' ? 700 + Math.min(1600, step.line.text.length * 22) : 650;
    const typingOn = window.setTimeout(() => setTyping(step.line.who === 'mom'), 150);
    const id = window.setTimeout(() => {
      setTyping(false);
      setShown((l) => [...l, step.line]);
      setCursor((c) => c + 1);
      if (step.line.who === 'mom') audioEngine.playKeyTick();
    }, delay);
    return () => {
      window.clearTimeout(typingOn);
      window.clearTimeout(id);
    };
  }, [stage, step]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [shown, typing]);

  function pick(c: CallChoice) {
    audioEngine.playUi('select', 1);
    if (c.tag) setWeekendChoice(c.tag);
    setShown((l) => [...l, { who: 'me', text: c.label }]);
    setReplying(true);
    // Konuşma ilerlemeden önce annen, az önce söylediğine cevap verir.
    window.setTimeout(() => setTyping(true), 300);
    window.setTimeout(() => {
      setTyping(false);
      setShown((l) => [...l, { who: 'mom', text: c.reply }]);
      setReplying(false);
      setCursor((x) => x + 1);
      audioEngine.playKeyTick();
    }, 1000 + Math.min(1400, c.reply.length * 20));
  }

  const awaitingChoice = stage === 'talking' && step?.kind === 'choice' && !typing && !replying;
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div className={styles.screen}>
      <div className={styles.room}>
        <HomeScene />
        <div className={styles.timeTag}>Cuma · 21:40 · Evde · annen teyzende</div>
      </div>

      <div className={styles.phone}>
        {stage === 'ringing' && (
          <div className={styles.incoming}>
            <span className={styles.callerAvatar}>👩</span>
            <div className={styles.callerName}>Annem ❤️</div>
            <div className={styles.callerSub}>arıyor…</div>
            <div className={styles.callActions}>
              <button
                className={styles.accept}
                onClick={() => {
                  audioEngine.playUi('connect');
                  setStage('talking');
                }}
                aria-label="Aç"
              >
                📞
              </button>
            </div>
            <button className={styles.skip} onClick={finishWeekend}>
              Sonra ararım — haftanın sonucuna geç
            </button>
          </div>
        )}
        {stage !== 'ringing' && (
          <>
            <div className={styles.callHead}>
              <span className={styles.callAvatarSmall}>👩</span>
              <div>
                <strong>Annem ❤️</strong>
                <span className="mono">{stage === 'ended' ? 'Arama bitti' : clock}</span>
              </div>
            </div>
            <div className={styles.log} ref={logRef}>
              {shown.map((l, i) => (
                <div key={i} className={`${styles.bubble} ${l.who === 'me' ? styles.mine : styles.theirs}`}>
                  {l.text}
                </div>
              ))}
              {typing && (
                <div className={`${styles.bubble} ${styles.theirs} ${styles.typing}`}>
                  <i />
                  <i />
                  <i />
                </div>
              )}
            </div>
            {awaitingChoice && step?.kind === 'choice' && (
              <div className={styles.choices}>
                {step.choices.map((c) => (
                  <button key={c.label} className={styles.choice} onClick={() => pick(c)}>
                    {c.label}
                  </button>
                ))}
              </div>
            )}
            {stage === 'ended' && (
              <div className={styles.outro}>
                <p>Telefonu kapattın. Pazartesi yine başlıyor… Ama önce haftanın bilançosu.</p>
                <Button variant="gold" sound="confirm" onClick={finishWeekend}>
                  HAFTANIN SONUCUNU GÖR →
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
