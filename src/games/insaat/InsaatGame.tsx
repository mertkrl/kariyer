import { useEffect, useState } from 'react';
import { ClockOut } from '../../arcade/ClockOut';
import { markPlayed } from '../../arcade/progress';
import { ShareButton } from '../../arcade/ShareButton';
import { StudioMark } from '../../arcade/Studio';
import { audioEngine } from '../../audio/audioEngine';
import { DAYS_PER_SECOND, STAGES, TOTAL, floorStepAt, idleAt, stageAt, watchersAt, workAt } from './data';
import { Scene } from './Scene';
import styles from './InsaatGame.module.css';

/*
 * İnşaat İzleme: oyuncu hiçbir şey yapmaz, yalnızca izler. Sahne gerçek zamanlı ilerler; sekme
 * arka plandan dönünce kaçırılan süre atlanmaz (izlemeyen inşaatı kaçırmaz). Sonda teslim kartı ve "Baştan izle".
 */
/** Şantiye dururken üstte görünen not. */
const SPEEDS = [1, 2, 4, 8] as const;

const IDLE_TEXT = { night: '🌙 Gece · şantiye kapalı', rain: '🌧 Yağmur · beton dökülmüyor', snow: '❄ Kar · şantiye tatil' } as const;

export function InsaatGame() {
  const [t, setT] = useState(0);
  const [run, setRun] = useState(0);
  // izleme hızı: amcalar sabırlıdır ama izleyen her zaman değildir
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  useEffect(() => {
    audioEngine.setMusicMood('off');
  }, []);

  // saat bir animasyon değil, takvim: saniyede beş kez ilerler (sahnenin kıpırtısı CSS'tedir)
  useEffect(() => {
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      // arka plandan dönünce zaman sıçramasın: bir adımda en fazla yarım saniye ilerler
      const dt = Math.min(0.5, (now - last) / 1000) * speed;
      last = now;
      setT((x) => Math.min(TOTAL, x + dt));
    }, 200);
    return () => window.clearInterval(id);
  }, [run, speed]);

  const w = workAt(t);
  const stage = stageAt(w);
  const fs = floorStepAt(w);
  const idle = idleAt(t);
  const day = Math.floor(t * DAYS_PER_SECOND) + 1;
  const over = t >= TOTAL;
  // bina teslim edildi: salonun defterine tik
  useEffect(() => {
    if (!over) return;
    markPlayed('insaat', 'Örnek Vatandaş');
  }, [over]);
  const again = () => {
    setT(0);
    setRun((n) => n + 1);
  };

  return (
    <div className={styles.app}>
      <Scene t={t} />

      <header className={styles.top}>
        <ClockOut />
        <div className={styles.title}>
          <h1>İnşaat İzleme</h1>
          <p>Huzur Evleri · Ada 412, Parsel 7</p>
        </div>
        <div className={styles.stats}>
          <span>
            <small>Şantiye günü</small>
            <b className="mono">{day.toLocaleString('tr-TR')}</b>
          </span>
          <span>
            <small>İzleyen</small>
            <b className="mono">{watchersAt(t)} amca</b>
          </span>
        </div>
      </header>

      {/* izleme hızı: üst şeridin altında sağda */}
      <div className={styles.controls}>
          <span className={styles.speed} role="group" aria-label="İzleme hızı">
            <small>Hız</small>
            <span>
              {SPEEDS.map((x) => (
                <button key={x} type="button" aria-pressed={speed === x} onClick={() => setSpeed(x)}>
                  {x}×
                </button>
              ))}
            </span>
          </span>
      </div>

      {/* aşama şeridi: geçenler dolu, şimdiki vurgulu */}
      <ol className={styles.timeline} aria-label="İnşaat aşamaları">
        {STAGES.map((st, i) => (
          <li key={st.id} className={i < stage ? styles.past : i === stage ? styles.now : undefined} aria-current={i === stage ? 'step' : undefined}>
            <i aria-hidden="true" />
            <span>
              {st.title}
              {i === stage && fs && ` · ${fs.floor + 1}. kat · ${fs.title}`}
            </span>
          </li>
        ))}
      </ol>

      {idle && (
        <p className={styles.idle} role="status">
          {IDLE_TEXT[idle]}
        </p>
      )}

      <p className="sr-only" aria-live="polite">
        Aşama: {STAGES[stage].title}
      </p>

      {over && (
        <div className={styles.end} role="dialog" aria-labelledby="ins-end">
          <p className={styles.eyebrow}>Teslim tutanağı</p>
          <h2 id="ins-end">Bina teslim edildi.</h2>
          <p>
            İnşaat <b>{day.toLocaleString('tr-TR')} gün</b> sürdü. Teslim tarihi dört kez ertelendi; şantiye gece, yağmur ve kar yüzünden sık sık durdu. Siz de baştan sona izlediniz; hiçbir şeye karışmadınız. Örnek bir vatandaşsınız.
          </p>
          <p className={styles.muted}>Karşı parselde yeni inşaat başlıyormuş.</p>
          <div className={styles.actions}>
            <ShareButton
              className={styles.ghost}
              label="Tutanağı paylaş"
              make={() => ({
                route: 'insaat',
                kicker: 'Teslim tutanağı · Huzur Evleri',
                title: 'Örnek Vatandaş',
                note: 'Bir apartmanı temelden çatıya izledi. Hiçbir şeye karışmadı. Kolonun ince olduğunu yalnızca söyledi.',
                stats: [
                  { label: 'Şantiye günü', value: day.toLocaleString('tr-TR') },
                  { label: 'Ertelenme', value: '4' },
                  { label: 'İzleyen amca', value: String(watchersAt(t)) },
                ],
                question: 'Sen kaç gün dayanırsın?',
                text: `İnşaat İzleme: bir apartmanı ${day.toLocaleString('tr-TR')} gün boyunca ellerim arkamda izledim, hiçbir şeye karışmadım.`,
              })}
            />
            <button type="button" className={styles.primary} onClick={again}>
              Karşıdakini izle →
            </button>
          </div>
        </div>
      )}

      <StudioMark minimal />
    </div>
  );
}
