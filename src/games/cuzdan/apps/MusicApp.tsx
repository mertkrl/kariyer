import { TRACKS, TRACK_ORDER, type TrackId } from '../music';
import a from '../Music.module.css';

/*
 * Medya Çalar: Cüzdan TL'nin müzik çaları. Üç özgün parça (Mahalle Pop, Cam Salon, Düz Lo-fi);
 * "Yıla göre çal" açıkken saat hangi döneme alınırsa o dönemin parçası çalar. Ekolayzer çubukları
 * yalnızca süs: çalarken CSS ile oynar, hareket azaltılınca durur.
 */

export function MusicApp({ track, playing, auto, onPlay, onToggle, onAuto }: { track: TrackId; playing: boolean; auto: boolean; onPlay: (t: TrackId) => void; onToggle: () => void; onAuto: (v: boolean) => void }) {
  const t = TRACKS[track];
  const i = TRACK_ORDER.indexOf(track);
  return (
    <div className={a.player}>
      <div className={a.screenLcd}>
        <div className={a.between}>
          <span className={a.scroll}>
            {i + 1}. Cüzdan Orkestrası — {t.title} ({t.era})
          </span>
          <span>{t.bpm} BPM</span>
        </div>
        <div className={`${a.eq} ${playing ? a.eqOn : ''}`} aria-hidden="true">
          {Array.from({ length: 18 }, (_, k) => (
            <i key={k} style={{ animationDelay: `${-((k * 37) % 100) / 100}s`, animationDuration: `${0.5 + ((k * 13) % 7) / 10}s` }} />
          ))}
        </div>
      </div>
      <div className={a.transport}>
        <button type="button" onClick={() => onPlay(TRACK_ORDER[(i + 2) % 3])} aria-label="Önceki parça">
          ⏮
        </button>
        <button type="button" onClick={onToggle} aria-label={playing ? 'Duraklat' : 'Çal'} className={a.playBtn}>
          {playing ? '⏸' : '▶'}
        </button>
        <button type="button" onClick={() => onPlay(TRACK_ORDER[(i + 1) % 3])} aria-label="Sonraki parça">
          ⏭
        </button>
        <label className={a.autoBox}>
          <input type="checkbox" checked={auto} onChange={(e) => onAuto(e.target.checked)} /> Yıla göre çal
        </label>
      </div>
      <ol className={a.playlist}>
        {TRACK_ORDER.map((id) => (
          <li key={id}>
            <button type="button" className={id === track ? a.playingRow : ''} onClick={() => onPlay(id)} aria-current={id === track}>
              <span>{TRACKS[id].title}</span>
              <span>{TRACKS[id].era}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className={a.note}>
        Parçalar bu oyun için yazıldı, tarayıcıda çalınır.
      </p>
    </div>
  );
}
