import { useEffect, useState } from 'react';
import { ClockOut } from '../../arcade/ClockOut';
import { StudioMark } from '../../arcade/Studio';
import { audioEngine } from '../../shared/audio/audioEngine';
import { Editor } from './Editor';
import { draftKey, sanitize, type Design, type Place } from './model';
import { PLACES } from './places';
import { adoptOldDrafts } from './drafts';
import { Scene } from './Scene';
import styles from './MeydanGame.module.css';
import { migrateWith, readJson } from '../../shared/storage';

/*
 * Meydan Islahı: dört bölgeden dört sokağın tabela, klima, kaçak kat ve yama altında kalmış
 * cephelerini mimar ve mühendis gözüyle baştan düzenle. Önce meydan seçilir, sonra serbest modda
 * boyanır, kaplanır, güçlendirilir ve temizlenir.
 */

type Phase = { at: 'pick' } | { at: 'edit'; place: Place; design: Design; key: number };

function loadDraft(place: Place): Design {
  migrateWith((storage) => adoptOldDrafts(storage, PLACES.map((p) => p.id)));
  try {
    const raw = readJson(draftKey(place.id));
    const d = raw ? sanitize(raw, place) : null;
    if (d) return d;
  } catch {
    /* taslak bozuk */
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
      {/* ekran okuyucunun başlık listesinde oyunun adı (görsel başlık sahnenin içinde) */}
      <h1 className="sr-only">Meydan Islahı</h1>
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
          <p className={styles.lead}>Cepheyi kapla, doğramayı değiştir, kaçak katı yık, binayı güçlendir, tabelaları hizaya sok. Mimar da mühendis de sensin.</p>
          <div className={styles.places}>
            {PLACES.map((p) => (
              <button key={p.id} type="button" className={styles.place} onClick={() => setPhase({ at: 'edit', place: p, design: loadDraft(p), key: Date.now() })}>
                <Scene place={p} design={loadDraft(p)} className={styles.thumb} />
                <small className={styles.region}>{p.region}</small>
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
