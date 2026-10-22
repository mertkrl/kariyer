import { useEffect, useState } from 'react';
import { ClockOut } from '../../arcade/ClockOut';
import { StudioMark } from '../../arcade/Studio';
import { audioEngine } from '../../audio/audioEngine';
import { Editor } from './Editor';
import { PRESETS, currentDesign, draftKey, sanitize, type Design, type PresetId } from './model';
import { Screen } from './Screen';
import { decodeDesign, sharedCodeOf } from './share';
import { useClock } from './useClock';
import styles from './EkranGame.module.css';

/*
 * Ekran İhalesi: kamu kurumlarının yıllardır aynı duran ekranlarını yeniden tasarla. Önce mod
 * seçilir (Normal: serbest atölye; Zor: kurulun şartnameleri, yakında), sonra ekran. Adreste bir
 * paylaşım kodu varsa (`#/ekran?t=…`) oyun doğrudan o ekranı canlı gösterir.
 */

type Phase = { at: 'loading' } | { at: 'home' } | { at: 'pick' } | { at: 'edit'; design: Design; key: number } | { at: 'view'; design: Design } | { at: 'broken' };

function loadDraft(preset: PresetId): Design {
  try {
    const raw = localStorage.getItem(draftKey(preset));
    const d = raw ? sanitize(JSON.parse(raw)) : null;
    if (d) return d;
  } catch {
    /* depolama yok ya da taslak bozuk */
  }
  return currentDesign(preset);
}

export function EkranGame() {
  const [phase, setPhase] = useState<Phase>(() => (sharedCodeOf(window.location.hash) ? { at: 'loading' } : { at: 'home' }));

  useEffect(() => {
    audioEngine.setMusicMood('off');
  }, []);

  // paylaşılan bağlantı: ilk açılışta ve adres değişince çözülür
  useEffect(() => {
    let alive = true;
    const read = () => {
      const code = sharedCodeOf(window.location.hash);
      if (!code) return;
      void decodeDesign(code).then((d) => alive && setPhase(d ? { at: 'view', design: d } : { at: 'broken' }));
    };
    read();
    window.addEventListener('hashchange', read);
    return () => {
      alive = false;
      window.removeEventListener('hashchange', read);
    };
  }, []);

  // paylaşılan ekrandan çıkınca kod adresten silinir; geri dönüldüğünde yeniden açılmasın
  const leaveShared = () => window.history.replaceState(null, '', '#/ekran');
  const edit = (design: Design) => setPhase({ at: 'edit', design, key: Date.now() });

  return (
    <div className={styles.app}>
      <header className={styles.top}>
        <ClockOut tone="dark" />
        <div className={styles.title}>
          <h1>Ekran İhalesi</h1>
          <p>{phase.at === 'edit' ? `Normal mod · ${PRESETS.find((p) => p.id === phase.design.preset)?.title}` : 'Kamu ekranları yenileme atölyesi'}</p>
        </div>
        <div className={styles.topRight}>
          {(phase.at === 'edit' || phase.at === 'pick') && (
            <button type="button" className={styles.ghost} onClick={() => setPhase(phase.at === 'edit' ? { at: 'pick' } : { at: 'home' })}>
              ← {phase.at === 'edit' ? 'Ekranlar' : 'Modlar'}
            </button>
          )}
        </div>
      </header>

      {phase.at === 'home' && <Home onNormal={() => setPhase({ at: 'pick' })} />}
      {phase.at === 'pick' && <Pick onPick={(id) => edit(loadDraft(id))} />}
      {phase.at === 'edit' && <Editor key={phase.key} initial={phase.design} />}
      {phase.at === 'view' && (
        <Viewer
          design={phase.design}
          onEdit={() => {
            leaveShared();
            edit(phase.design);
          }}
          onOwn={() => {
            leaveShared();
            setPhase({ at: 'home' });
          }}
        />
      )}
      {phase.at === 'broken' && (
        <main className={styles.center}>
          <h2>Bu ekran açılamadı</h2>
          <p>Bağlantı eksik kopyalanmış olabilir. Ekranlar sunucuda değil, bağlantının kendisinde durur.</p>
          <button
            type="button"
            className={styles.primary}
            onClick={() => {
              leaveShared();
              setPhase({ at: 'home' });
            }}
          >
            Kendi ekranını tasarla
          </button>
        </main>
      )}

      <StudioMark minimal />
    </div>
  );
}

function Home({ onNormal }: { onNormal: () => void }) {
  return (
    <main className={styles.center}>
      <p className={styles.lead}>Hastanede, metrobüste, otobüste, Marmaray'da… Yıllardır aynı duran ekranlar. Sıra sende.</p>
      <div className={styles.modes}>
        <button type="button" className={styles.mode} onClick={onNormal}>
          <span className={styles.badge}>Normal mod</span>
          <b>Serbest atölye</b>
          <span>Kural yok, kurul yok. Ekranı istediğin gibi baştan tasarla, canlı çalıştır, bağlantıyla paylaş.</span>
        </button>
        <div className={`${styles.mode} ${styles.locked}`} aria-disabled="true">
          <span className={styles.badge}>Zor mod</span>
          <b>İhale şartnamesi</b>
          <span>Müdürlüğün logosu büyük olacak, reklam alanı kalkmayacak, KVKK'ya uyulacak. Kurul değerlendirir, puan verir.</span>
          <em>Kurul toplanıyor · yakında</em>
        </div>
      </div>
    </main>
  );
}

function Pick({ onPick }: { onPick: (id: PresetId) => void }) {
  return (
    <main className={styles.center}>
      <h2>Hangi ekranı yenileyeceksin?</h2>
      <div className={styles.presets}>
        {PRESETS.map((p) =>
          p.ready ? (
            <button key={p.id} type="button" className={styles.preset} onClick={() => onPick(p.id)}>
              <b>{p.title}</b>
              <span>{p.place}</span>
            </button>
          ) : (
            <div key={p.id} className={`${styles.preset} ${styles.locked}`} aria-disabled="true">
              <b>{p.title}</b>
              <span>{p.place}</span>
              <em>Yakında</em>
            </div>
          ),
        )}
      </div>
    </main>
  );
}

function Viewer({ design, onEdit, onOwn }: { design: Design; onEdit: () => void; onOwn: () => void }) {
  const { seconds, now } = useClock(true);
  return (
    <main className={styles.viewer}>
      <div className={styles.monitor}>
        <Screen design={design} seconds={seconds} now={now} className={styles.screen} />
      </div>
      <p className={styles.lead}>Biri bu ekranı yeniden tasarladı. Sen olsan nasıl yapardın?</p>
      <div className={styles.row}>
        <button type="button" className={styles.primary} onClick={onEdit}>
          Bunu düzenle
        </button>
        <button type="button" className={styles.ghost} onClick={onOwn}>
          Kendi ekranını tasarla
        </button>
      </div>
    </main>
  );
}
