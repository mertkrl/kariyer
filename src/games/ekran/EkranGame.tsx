import { useEffect, useState } from 'react';
import { ClockOut } from '../../arcade/ClockOut';
import { StudioMark } from '../../arcade/Studio';
import { audioEngine } from '../../audio/audioEngine';
import { Editor } from './Editor';
import { Home, Monitor, Pick } from './Lobby';
import { loadProgress, TASKS, type Task } from './spec';
import { HardPick } from './Dossier';
import { currentDesign, draftKey, sanitize, type Design, type PresetId } from './model';
import { Screen } from './Screen';
import { decodeDesign, sharedCodeOf } from './share';
import { useClock } from './useClock';
import styles from './EkranGame.module.css';

/*
 * Ekran İhalesi: kamu kurumlarının yıllardır aynı duran ekranlarını yeniden tasarla. Önce mod
 * seçilir (Normal: serbest atölye; Zor: kurulun şartnameleri, yakında), sonra ekran. Adreste bir
 * paylaşım kodu varsa (`#/ekran?t=…`) oyun doğrudan o ekranı canlı gösterir.
 */

type Phase = { at: 'loading' } | { at: 'home' } | { at: 'pick' } | { at: 'hard' } | { at: 'edit'; design: Design; key: number; task?: Task } | { at: 'view'; design: Design } | { at: 'broken' };

function loadDraft(preset: PresetId, key = draftKey(preset)): Design {
  try {
    const raw = localStorage.getItem(key);
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

  // her adım sayfanın başından açılır
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [phase.at]);

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
  const edit = (design: Design, task?: Task) => setPhase({ at: 'edit', design, key: Date.now(), task });
  // zor modda her dosya kendi taslağıyla, ekranın bugünkü hâlinden başlar
  const openTask = (t: Task) => edit(loadDraft(t.preset, draftKey(t.id)), t);
  const nextTask = (t: Task) => {
    const list = TASKS.filter((x) => x.preset === t.preset);
    const next = list[list.indexOf(t) + 1];
    if (next) openTask(next);
    else setPhase({ at: 'hard' });
  };

  return (
    <div className={styles.app}>
      <header className={styles.top}>
        <ClockOut tone="dark" />
        <div className={styles.topRight}>
          {(phase.at === 'edit' || phase.at === 'pick' || phase.at === 'hard') && (
            <button type="button" className={styles.ghost} onClick={() => setPhase(phase.at === 'edit' ? (phase.task ? { at: 'hard' } : { at: 'pick' }) : { at: 'home' })}>
              ← {phase.at === 'edit' ? (phase.task ? 'Dosyalar' : 'Ekranlar') : 'Modlar'}
            </button>
          )}
        </div>
      </header>

      {phase.at === 'home' && <Home onNormal={() => setPhase({ at: 'pick' })} onHard={() => setPhase({ at: 'hard' })} />}
      {phase.at === 'hard' && <HardPick progress={loadProgress()} onPick={openTask} />}
      {phase.at === 'pick' && <Pick onPick={(id) => edit(loadDraft(id))} />}
      {phase.at === 'edit' && (
        <Editor
          key={phase.key}
          initial={phase.design}
          task={phase.task}
          storeKey={phase.task ? draftKey(phase.task.id) : undefined}
          onFiles={() => setPhase({ at: 'hard' })}
          onNext={phase.task ? () => nextTask(phase.task!) : undefined}
        />
      )}
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

      {phase.at === 'home' && <StudioMark minimal />}
    </div>
  );
}

function Viewer({ design, onEdit, onOwn }: { design: Design; onEdit: () => void; onOwn: () => void }) {
  const { seconds, now } = useClock(true);
  return (
    <main className={styles.viewer}>
      <div className={styles.monitorWrap}>
        <Monitor live label="Paylaşılan ekran">
          <Screen design={design} seconds={seconds} now={now} className={styles.screen} />
        </Monitor>
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
