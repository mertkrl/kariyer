import { useEffect, useMemo, useState } from 'react';
import { ClockOut } from '../../arcade/ClockOut';
import { markPlayed } from '../../arcade/progress';
import { Finale } from '../../arcade/Finale';
import { ShareButton } from '../../arcade/ShareButton';
import { audioEngine } from '../../audio/audioEngine';
import { clearSlot, isRecord, readSlot, writeSlot } from '../../arcade/saveSlot';
import { DAYS_PER_SECOND, PROJECTS, floorStepAt, idleAt, planFor, stageAt, watchersAt, workAt } from './data';
import { Logbook } from './Logbook';
import { Scene } from './Scene';
import { paintInsaatCard } from './shareCard';
import styles from './InsaatGame.module.css';

/*
 * İnşaat İzleme: oyuncu hiçbir şey yapmaz, yalnızca izler. Sahne gerçek zamanlı ilerler; sekme
 * arka plandan dönünce kaçırılan süre atlanmaz (izlemeyen inşaatı kaçırmaz). Sonda teslim kartı ve "Baştan izle".
 */
const SPEEDS = [1, 2, 4, 8] as const;

/** İzleme kaydı: hangi şantiye ve sahnenin kaçıncı saniyesi. Dönen izleyici kaldığı yerden izler. */
const SAVE_KEY = 'kariyerweb-insaat-v1';
interface Watch {
  project: string;
  t: number;
}
const isWatch = (v: unknown): v is Watch => isRecord(v) && typeof v.project === 'string' && PROJECTS.some((p) => p.id === v.project) && typeof v.t === 'number' && v.t >= 0;

const IDLE_TEXT = { night: '🌙 Gece · şantiye kapalı', rain: '🌧 Yağmur · beton dökülmüyor', snow: '❄ Kar · şantiye tatil' } as const;

export function InsaatGame() {
  // kayıt varsa o şantiye seçilir ve sahne kaldığı saniyeden açılır
  const [project, setProject] = useState(() => readSlot(SAVE_KEY, isWatch)?.project ?? PROJECTS[0].id);
  // seçili şantiyenin takvimi: şantiye değişince yeniden kurulur
  const plan = useMemo(() => planFor(project), [project]);
  const [t, setT] = useState(() => {
    const saved = readSlot(SAVE_KEY, isWatch);
    return saved ? Math.min(saved.t, planFor(saved.project).total) : 0;
  });
  const [run, setRun] = useState(0);
  // beş saniyede bir kayıt; bina teslim edilince kayıt silinir
  const beat = Math.floor(t / 5);
  useEffect(() => {
    if (t >= plan.total) clearSlot(SAVE_KEY);
    else if (t > 0) writeSlot(SAVE_KEY, { project, t });
    // yalnızca beş saniyelik adımlarda
    // oxlint-disable-next-line react/exhaustive-deps
  }, [beat, project]);
  // izleme hızı: amcalar sabırlıdır ama izleyen her zaman değildir
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  // izleyen istediği an durdurur; sahnenin kıpırtıları da donar
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    audioEngine.setMusicMood('off');
  }, []);

  // saat bir animasyon değil, takvim: saniyede beş kez ilerler (sahnenin kıpırtısı CSS'tedir)
  useEffect(() => {
    if (paused) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      // arka plandan dönünce zaman sıçramasın: bir adımda en fazla yarım saniye ilerler
      const dt = Math.min(0.5, (now - last) / 1000) * speed;
      last = now;
      setT((x) => Math.min(plan.total, x + dt));
    }, 200);
    return () => window.clearInterval(id);
  }, [run, speed, plan.total, paused]);

  const w = workAt(plan, t);
  const stage = stageAt(plan, w);
  const fs = floorStepAt(plan, w);
  const idle = idleAt(t);
  const day = Math.floor(t * DAYS_PER_SECOND) + 1;
  const over = t >= plan.total;
  // bina teslim edildi: salonun defterine tik
  useEffect(() => {
    if (!over) return;
    markPlayed('insaat', `Örnek Vatandaş · ${plan.project.name}`);
  }, [over, plan.project.name]);
  const again = () => {
    setPaused(false);
    setT(0);
    setRun((n) => n + 1);
  };
  /** Başka şantiyeye geçmek: takvim baştan kurulur. */
  const go = (id: string) => {
    setProject(id);
    clearSlot(SAVE_KEY);
    again();
  };
  const nextProject = PROJECTS[(PROJECTS.findIndex((p) => p.id === project) + 1) % PROJECTS.length];

  return (
    <div className={`${styles.app}${paused && !over ? ` ${styles.paused}` : ''}`}>
      <Scene t={t} plan={plan} />

      <header className={styles.top}>
        <ClockOut />
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
          <button type="button" className={styles.pause} aria-pressed={paused} onClick={() => setPaused((x) => !x)} disabled={over}>
            {paused ? (
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor" /></svg>
            ) : (
              <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="2.5" width="3" height="11" rx="0.8" fill="currentColor" /><rect x="9.5" y="2.5" width="3" height="11" rx="0.8" fill="currentColor" /></svg>
            )}
            {paused ? 'Devam' : 'Duraklat'}
          </button>
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
        {plan.stages.map((st, i) => (
          <li key={st.id} className={i < stage ? styles.past : i === stage ? styles.now : undefined} aria-current={i === stage ? 'step' : undefined}>
            <i aria-hidden="true" />
            <span>
              {st.title}
              {i === stage && fs && ` · ${fs.floor + 1}. kat · ${fs.title}`}
            </span>
          </li>
        ))}
      </ol>

      {!over && <Logbook schedule={plan} w={w} idle={idle} day={day} />}

      {paused && !over && (
        <p className={styles.idle} role="status">
          ⏸ Duraklatıldı · amcalar da bekliyor
        </p>
      )}
      {!paused && idle && (
        <p className={styles.idle} role="status">
          {IDLE_TEXT[idle]}
        </p>
      )}

      <p className="sr-only" aria-live="polite">
        Aşama: {plan.stages[stage].title}
      </p>

      {over && (
        <div className={styles.end} role="dialog" aria-labelledby="ins-end">
          <p className={styles.eyebrow}>Teslim tutanağı</p>
          <h2 id="ins-end">Bina teslim edildi.</h2>
          <p>
            İnşaat <b>{day.toLocaleString('tr-TR')} gün</b> sürdü, teslim tarihi dört kez ertelendi. Siz baştan sona izlediniz, hiçbir şeye karışmadınız. Örnek bir vatandaşsınız.
          </p>
          <Finale kind="news" kicker={`Mahalle Postası · ${new Date().getFullYear() + 10}`} title={plan.project.future.title}>
            <p>{plan.project.future.text}</p>
          </Finale>
          <p className={styles.muted}>Karşı parselde yeni inşaat başlıyormuş.</p>
          <div className={styles.actions}>
            <ShareButton
              className={styles.icon}
              ariaLabel="Tutanağı paylaş"
              label={<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="15" cy="4.5" r="2.3" /><circle cx="5" cy="10" r="2.3" /><circle cx="15" cy="15.5" r="2.3" /><path d="M7 8.9l6-3.3M7 11.1l6 3.3" fill="none" /></svg>}
              make={() => ({
                route: 'insaat',
                kicker: `Teslim tutanağı · ${plan.project.name}`,
                title: 'Örnek Vatandaş',
                note: plan.project.ending,
                stats: [
                  { label: 'Şantiye günü', value: day.toLocaleString('tr-TR') },
                  { label: 'Ertelenme', value: '4' },
                  { label: 'İzleyen amca', value: String(watchersAt(t)) },
                ],
                question: 'Sen kaç gün dayanırsın?',
                paint: paintInsaatCard({
                  name: plan.project.name,
                  sign: plan.project.sign,
                  parcel: plan.project.parcel,
                  floors: plan.floors,
                  paint: plan.project.paint,
                  due: plan.project.due,
                  days: day,
                  watchers: watchersAt(t),
                }),
                text: `İnşaat İzleme: ${plan.project.name} şantiyesini ${day.toLocaleString('tr-TR')} gün boyunca izledim; teslim tarihi dört kez ertelendi, ben bir kez bile karışmadım. On yıl sonra: “${plan.project.future.title}”. Sen kaç gün dayanırsın?`,
              })}
            />
            <button type="button" className={styles.icon} onClick={again} aria-label="Bu şantiyeyi tekrar izle" title="Bu şantiyeyi tekrar izle">
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 10a5.5 5.5 0 1 0 1.8-4.1" fill="none" /><path d="M4 3v4h4" fill="none" /></svg>
            </button>
            <button type="button" className={`${styles.icon} ${styles.iconPrimary}`} onClick={() => go(nextProject.id)} aria-label={`Sıradaki şantiye: ${nextProject.name}`} title={`Sıradaki şantiye: ${nextProject.name}`}>
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M10.5 5l5 5-5 5" /></svg>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
