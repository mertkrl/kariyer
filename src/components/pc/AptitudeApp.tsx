import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../game/store/store';
import { APTITUDE_MAIL_AT, APTITUDE_QUESTIONS, APTITUDE_SECONDS } from '../../game/data/aptitudeTest';
import type { AptitudeAnswer } from '../../game/events/aptitude';
import { audioEngine } from '../../audio/audioEngine';
import styles from './AptitudeApp.module.css';

/*
 * Değerlendirme: şirketin dışarıdan aldığı test platformu. Pazartesi açıktır, bir kez çözülür,
 * soru başına süre işler, geri dönüş yoktur. Bitince puan gösterilmez: "Sonuçlarınız iletilmiştir."
 * Puanın kendisi Perşembe adayların tablosunda belirir.
 */

export function AptitudeApp() {
  const dayIndex = useGameStore((s) => s.currentDayIndex);
  const done = useGameStore((s) => s.story.aptitude);
  const paused = useGameStore((s) => s.paused);
  const assigned = useGameStore((s) => s.shiftStarted && s.workdayMinutes >= APTITUDE_MAIL_AT);
  const finish = useGameStore((s) => s.finishAptitude);
  const [answers, setAnswers] = useState<AptitudeAnswer[] | null>(null);
  const [left, setLeft] = useState(APTITUDE_SECONDS);

  const index = answers?.length ?? 0;
  const running = answers !== null && index < APTITUDE_QUESTIONS.length;

  const answer = (a: AptitudeAnswer) => {
    if (!answers) return;
    const next = [...answers, a];
    setLeft(APTITUDE_SECONDS);
    if (next.length === APTITUDE_QUESTIONS.length) finish(next);
    setAnswers(next);
  };

  // pencereyi yarıda kapatmak testi bitirir: cevaplanmayanlar boş sayılır (gerçek platformlardaki gibi)
  const pending = useRef<AptitudeAnswer[] | null>(null);
  pending.current = running ? answers : null;
  useEffect(() => () => {
    if (pending.current) finish(pending.current);
  }, [finish]);

  useEffect(() => {
    if (!running || paused) return;
    const id = window.setInterval(() => setLeft((s) => s - 1), 1000);
    return () => window.clearInterval(id);
  }, [running, paused]);

  // süre doldu: cevap boş geçer, sıradaki soru gelir
  useEffect(() => {
    if (running && left <= 0) {
      audioEngine.playUi('click');
      answer(null);
    }
  });

  if (done || (answers && !running)) {
    return (
      <Shell>
        <div className={styles.center}>
          <div className={styles.check} aria-hidden="true">✓</div>
          <h2 className={styles.heading}>Değerlendirmeniz tamamlandı.</h2>
          <p className={styles.lead}>Sonuçlarınız İnsan Kaynakları birimine iletilmiştir. Puanlar Perşembe günü paylaşılacaktır.</p>
          <p className={styles.fine}>Katılımınız için teşekkür ederiz. Bu platform sonuç hakkında açıklama yapmaz.</p>
        </div>
      </Shell>
    );
  }

  if (dayIndex > 0) {
    return (
      <Shell>
        <div className={styles.center}>
          <h2 className={styles.heading}>Bağlantının süresi doldu.</h2>
          <p className={styles.lead}>Bu değerlendirme Pazartesi 17:00'ye kadar tamamlanmalıydı. Kaydınız "tamamlanmadı" olarak iletilmiştir.</p>
        </div>
      </Shell>
    );
  }

  if (!answers && !assigned) {
    return (
      <Shell>
        <div className={styles.center}>
          <h2 className={styles.heading}>Atanmış bir değerlendirmeniz bulunmuyor.</h2>
          <p className={styles.lead}>Değerlendirme bağlantınız İnsan Kaynakları tarafından e-postayla iletilir.</p>
        </div>
      </Shell>
    );
  }

  if (!answers) {
    return (
      <Shell>
        <div className={styles.intro}>
          <h2 className={styles.heading}>Genel Yetenek ve Uyum Değerlendirmesi</h2>
          <ul className={styles.rules}>
            <li>{APTITUDE_QUESTIONS.length} soru · her soru için {APTITUDE_SECONDS} saniye</li>
            <li>Önceki sorulara geri dönülemez. Süresi dolan soru boş sayılır.</li>
            <li>Hesap makinesi, kâğıt ve kalem kullanılamaz.</li>
            <li>Test başladıktan sonra durdurulamaz; pencereyi kapatmak testi bitirir.</li>
          </ul>
          <p className={styles.fine}>Bu değerlendirme deneyiminizi değil, potansiyelinizi ölçer.</p>
          <button
            className={styles.start}
            onClick={() => {
              audioEngine.playUi('click');
              setLeft(APTITUDE_SECONDS);
              setAnswers([]);
            }}
          >
            Teste başla
          </button>
        </div>
      </Shell>
    );
  }

  const q = APTITUDE_QUESTIONS[index];
  return (
    <Shell>
      <div className={styles.question}>
        <div className={styles.meta}>
          <span className="mono">
            Soru {index + 1} / {APTITUDE_QUESTIONS.length} · {q.kind}
          </span>
          <span className={`mono ${left <= 10 ? styles.hurry : ''}`} aria-live={left <= 10 ? 'polite' : 'off'}>
            00:{String(Math.max(0, left)).padStart(2, '0')}
          </span>
        </div>
        <div className={styles.timer} aria-hidden="true">
          <i style={{ width: `${(Math.max(0, left) / APTITUDE_SECONDS) * 100}%` }} className={left <= 10 ? styles.timerHurry : ''} />
        </div>
        <p className={styles.prompt}>{q.prompt}</p>
        {q.figure && <div className={styles.figure}>{q.figure}</div>}
        <div className={styles.options}>
          {q.options.map((o, i) => (
            <button
              key={i}
              className={styles.option}
              onClick={() => {
                audioEngine.playUi('click');
                answer(i);
              }}
            >
              <b>{'ABCD'[i]}</b> <span>{o}</span>
            </button>
          ))}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.app}>
      <header className={styles.brand}>
        <span className={styles.logo}>Assessa</span>
        <span className={styles.brandNote}>Yetenek Ölçüm Platformu · Tavrinsa Labs için</span>
      </header>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
