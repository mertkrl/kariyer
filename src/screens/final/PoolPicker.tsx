import { useState } from 'react';
import type { Finalist } from '../../game/store/store';
import { candidateOf } from '../../game/data/candidates';
import { Button } from '../../components/ui/Button';
import { audioEngine } from '../../audio/audioEngine';
import { INTERVIEW_LIMIT } from './interviewModel';
import styles from '../FinalRoundScreen.module.css';
import own from './PoolPicker.module.css';
import { avatarStyle } from '../../components/ui/avatarStyle';

const sourceOf = (f: Finalist) => (f.by ? (f.by === 'ayse' ? 'Ayşe seçti' : 'Emre seçti') : f.byManager ? 'Hakan Bey ekletti' : f.day > 0 ? `Sen çağırdın · ${f.day}. gün` : 'Referans');

/**
 * Cuma sabahı, kısa liste bir günlük mülakattan uzunsa: gerçekte kimlerle oturacağın. Hakan
 * Bey'in kişileri listede zaten var ve çıkarılamaz.
 */
export function PoolPicker({ everyone, locked, onConfirm }: { everyone: Finalist[]; locked: Set<string>; onConfirm: (ids: string[]) => void }) {
  const [picked, setPicked] = useState<string[]>(() => everyone.filter((f) => locked.has(f.id)).map((f) => f.id));
  const full = picked.length >= INTERVIEW_LIMIT;
  const toggle = (id: string) => {
    if (locked.has(id)) return;
    audioEngine.playUi('click');
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < INTERVIEW_LIMIT ? [...p, id] : p));
  };
  return (
    <section className={own.picker} aria-labelledby="picker-title">
      <h2 id="picker-title" className={own.pickerTitle}>
        Bugün kimlerle görüşeceksin?
      </h2>
      <p className={own.pickerLead}>
        Kısa listede <b>{everyone.length}</b> kişi var. Kurul işi eşit bölüyor: sen <b>{INTERVIEW_LIMIT}</b> kişiyle
        görüşürsün, seçmediklerin Ayşe ve Emre'nin odalarına eşit dağılır.
      </p>
      <ul className={own.pickerList}>
        {everyone.map((f) => {
          const c = candidateOf(f.id);
          const on = picked.includes(f.id);
          const isLocked = locked.has(f.id);
          return (
            <li key={f.id}>
              <label className={`${own.pickerItem} ${on ? own.pickerOn : ''} ${isLocked ? own.pickerLocked : ''}`}>
                <input type="checkbox" checked={on} disabled={isLocked || (!on && full)} onChange={() => toggle(f.id)} />
                <span className={styles.avatar} style={avatarStyle(c.color)}>
                  {c.initials}
                </span>
                <span className={styles.listText}>
                  <span className={styles.listName}>{c.name}</span>
                  <span className={styles.listRole}>{c.role.replace(' adayı', '')}</span>
                </span>
                <span className={own.pickerSource}>{isLocked ? '🔒 ' : ''}{sourceOf(f)}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className={own.pickerFoot}>
        <span className="mono">
          {picked.length}/{INTERVIEW_LIMIT} seçildi
        </span>
        <Button variant="gold" disabled={picked.length === 0} onClick={() => onConfirm(everyone.filter((f) => picked.includes(f.id)).map((f) => f.id))}>
          Mülakatlara başla →
        </Button>
      </div>
    </section>
  );
}
