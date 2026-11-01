import { useEffect, useState } from 'react';
import { ClockOut } from '../../arcade/ClockOut';
import { StudioMark } from '../../arcade/Studio';
import { audioEngine } from '../../audio/audioEngine';
import { Editor } from './Editor';
import { draftKey, sanitize, type Design, type Place } from './model';
import { PLACES } from './places';
import { Scene } from './Scene';
import styles from './MeydanGame.module.css';

/*
 * Meydan Islahı: İstanbul meydanlarının tabela, afiş ve klima yığını altında kalmış cephelerini
 * baştan düzenle. Önce meydan seçilir, sonra serbest modda istediğin gibi boyanır ve temizlenir.
 */

type Phase = { at: 'pick' } | { at: 'edit'; place: Place; design: Design; key: number };

function loadDraft(place: Place): Design {
  try {
    const raw = localStorage.getItem(draftKey(place.id));
    const d = raw ? sanitize(JSON.parse(raw), place) : null;
    if (d) return d;
  } catch {
    /* depolama yok ya da taslak bozuk */
  }
  return place.original;
}

export function MeydanGame() {
  const [phase, setPhase] = useState<Phase>({ at: 'pick' });

  useEffect(() => {
    audioEngine.setMusicMood('off');
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [phase.at]);

  return (
    <div className={styles.app}>
      <header className={styles.top}>
        <ClockOut />
        <div className={styles.topRight}>
          {phase.at === 'edit' && (
            <button type="button" className={styles.ghost} onClick={() => setPhase({ at: 'pick' })}>
              ← Meydanlar
            </button>
          )}
        </div>
      </header>

      {phase.at === 'pick' && (
        <main className={styles.center}>
          <h2>Hangi meydanı düzelteceksin?</h2>
          <p className={styles.lead}>Binaları boya, tabelaları sök ya da yeniden as, klimaları kaldır. Kural yok, karar senin.</p>
          <div className={styles.places}>
            {PLACES.map((p) => (
              <button key={p.id} type="button" className={styles.place} onClick={() => setPhase({ at: 'edit', place: p, design: loadDraft(p), key: Date.now() })}>
                <Scene place={p} design={loadDraft(p)} className={styles.thumb} />
                <b>
                  {p.district} · {p.title}
                </b>
                <span>{p.blurb}</span>
              </button>
            ))}
          </div>
        </main>
      )}
      {phase.at === 'edit' && <Editor key={phase.key} place={phase.place} initial={phase.design} />}

      {phase.at !== 'edit' && <StudioMark minimal />}
    </div>
  );
}
