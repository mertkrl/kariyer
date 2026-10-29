import { ClockOut } from '../../arcade/ClockOut';
import { tl } from './data';
import styles from './BakkalGame.module.css';

/** Üst çubuk: çıkış, oyunun adı, gün ve saat, hava, kasa, itibar ve ses düğmesi. */
export function TopBar({
  intro,
  risk,
  day,
  clock,
  weather,
  money,
  rep,
  muted,
  onMute,
}: {
  intro: boolean;
  risk?: string;
  day: number;
  clock: string;
  weather: string;
  money: number;
  rep: number;
  muted: boolean;
  onMute: () => void;
}) {
  return (
  <header className={styles.top}>
    <ClockOut risk={risk} />
    <div className={styles.title}>
      <h1>Köy Bakkalı</h1>
      <p>Yukarıkavaklı · Hacı Emmi'nin dükkânı</p>
    </div>
    <div className={styles.stats}>
      {!intro && (
        <>
          <span title="Gün ve saat">
            📅 {day}. gün · {clock}
          </span>
          <span title="Hava">{weather}</span>
          <span title="Kasadaki para" className={money < 0 ? styles.neg : ''}>
            💰 {tl(money)}
          </span>
          <span title="Köydeki itibar">
            ⭐ <meter min={0} max={100} low={35} high={70} optimum={100} value={rep} /> {rep}
          </span>
        </>
      )}
      <button className={`${styles.mute} ${muted ? styles.muted : ''}`} onClick={onMute} aria-label={muted ? 'Sesi aç' : 'Sesi kapat'} aria-pressed={!muted} title={muted ? 'Ses kapalı' : 'Ses açık'}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" className={styles.cone} />
          {muted ? (
            <path d="M15.5 9.5l5 5m0-5l-5 5" className={styles.cross} />
          ) : (
            <>
              <path d="M15 9.2a4 4 0 010 5.6" className={styles.wave} />
              <path d="M17.6 6.8a7.4 7.4 0 010 10.4" className={`${styles.wave} ${styles.wave2}`} />
            </>
          )}
        </svg>
        <span>{muted ? 'Sessiz' : 'Ses'}</span>
      </button>
    </div>
  </header>
  );
}
