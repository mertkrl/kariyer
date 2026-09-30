import { useState } from 'react';
import { candidateOf } from '../../game/data/candidates';
import { addressOf, mailFor, TEMPLATES, type RejectTemplate } from '../../game/rejectionMails';
import { formatClock } from '../../game/time';
import { MAIL_SEND_AT } from '../../game/store';
import { audioEngine } from '../../audio/audioEngine';
import { PLAYER } from '../../game/player';
import styles from './RejectionMails.module.css';

/*
 * The last screen of the portal each day, laid out like a mail client's bulk reply: everyone you
 * rejected in a table (who, why the file was turned down, which template), and the selected
 * person's mail exactly as it will arrive.
 */

interface Props {
  ids: string[];
  /** Applications the system cut before any human saw them — already sent its auto-reply. */
  autoRejected: number;
  dayName: string;
  minutes: number;
  /** What's already in the outbox, if you are coming back to edit. */
  planned: Record<string, RejectTemplate>;
  onSend: (choices: Record<string, RejectTemplate>) => void;
  onBack: () => void;
}

function Initials({ name, color }: { name: string; color: string }) {
  const letters = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toLocaleUpperCase('tr') ?? '')
    .join('');
  return (
    <span className={styles.initials} style={{ background: color }} aria-hidden="true">
      {letters}
    </span>
  );
}

export function RejectionMails({ ids, autoRejected, dayName, minutes, planned, onSend, onBack }: Props) {
  const [choices, setChoices] = useState<Record<string, RejectTemplate>>(() => Object.fromEntries(ids.map((id) => [id, planned[id] ?? ('standard' as const)])));
  const [focus, setFocus] = useState(ids[0]);
  // "all" shows a template while every row agrees, and goes blank once they differ
  const shared = ids.every((id) => choices[id] === choices[ids[0]]) ? choices[ids[0]] : '';
  const late = minutes >= MAIL_SEND_AT;
  const mail = mailFor(focus, choices[focus]);
  const focused = candidateOf(focus);
  const toSend = ids.filter((id) => choices[id] !== 'none').length;

  function choose(id: string, t: RejectTemplate) {
    audioEngine.playUi('select', 1);
    setChoices((c) => ({ ...c, [id]: t }));
    setFocus(id);
  }

  function applyAll(t: RejectTemplate) {
    audioEngine.playUi('click');
    setChoices(Object.fromEntries(ids.map((id) => [id, t])));
  }

  return (
    <div className={styles.panel}>
      <header className={styles.head}>
        <div>
          <div className={styles.eyebrow}>Portal · Aday iletişimi · {dayName}</div>
          <h2>Ret bildirimleri</h2>
          <p>
            Bugün <b>{ids.length}</b> başvuruyu reddettin. Bildirimler {late ? 'hemen' : <>mesai bitiminde, <b>17:00</b>'de</>} gönderilir
            {late ? '.' : '; o saate kadar bir kararı geri alırsan o kişinin bildirimi giden kutusundan çıkar.'} Sistem, masana hiç gelmeyen <b>{autoRejected}</b> başvuruya
            otomatik bildirimi zaten gönderdi.
          </p>
        </div>
        <button className={styles.back} onClick={onBack}>
          ← Dosyalara dön
        </button>
      </header>

      <div className={styles.body}>
        <section className={styles.tablePane}>
          <div className={styles.toolbar}>
            <span>Tümüne uygula</span>
            <select value={shared} onChange={(e) => applyAll(e.target.value as RejectTemplate)} aria-label="Toplu şablon">
              {!shared && (
                <option value="" disabled>
                  Karışık
                </option>
              )}
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.tableHead}>
            <span>Aday</span>
            <span>Bildirim</span>
          </div>
          <ul className={styles.rows}>
            {ids.map((id) => {
              const c = candidateOf(id);
              return (
                <li key={id} className={`${styles.row} ${id === focus ? styles.rowOn : ''}`} onClick={() => setFocus(id)} onFocus={() => setFocus(id)}>
                  <span className={styles.who}>
                    <Initials name={c.name} color={c.color} />
                    <span>
                      <b>{c.name}</b>
                      <small>{c.role.replace(' adayı', '')}</small>
                    </span>
                  </span>
                  <select
                    className={`${styles.template} ${choices[id] === 'none' ? styles.templateSilent : choices[id] === 'personal' ? styles.templatePersonal : ''}`}
                    value={choices[id]}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => choose(id, e.target.value as RejectTemplate)}
                    aria-label={`${c.name} için bildirim`}
                  >
                    {TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
        </section>

        <section className={styles.preview} aria-label="Önizleme">
          {mail ? (
            <>
              <div className={styles.mailTop}>
                <div className={styles.subject}>{mail.subject}</div>
                <div className={styles.metaRow}>
                  <span className={styles.metaKey}>Kimden</span>
                  <span>İnsan Kaynakları &lt;ik@tavrinsalabs.test&gt;</span>
                  <span className={`${styles.date} mono`}>{late ? `${dayName} ${formatClock(minutes)}` : `Planlanan gönderim · ${dayName} 17:00`}</span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaKey}>Kime</span>
                  <span>
                    {focused.name} &lt;{addressOf(focus)}&gt;
                  </span>
                </div>
              </div>
              <div className={styles.mailBody}>
                <p className={styles.text}>{mail.body}</p>
                <div className={styles.signature}>
                  <span>
                    {PLAYER.name} · {PLAYER.title}
                  </span>
                  <span className={styles.logo}>TAVRINSA LABS</span>
                  <span>İnsan Kaynakları · Örnek Plaza Kat 12, Hayal Sokak No: 1, İstanbul</span>
                  <span>ik@tavrinsalabs.test · +90 212 123 45 67</span>
                </div>
                <p className={styles.disclaimer}>Bu e-posta ve ekleri yalnızca alıcısına yöneliktir.</p>
              </div>
            </>
          ) : (
            <div className={styles.silence}>
              <b>{focused.name} hiçbir bildirim almayacak.</b>
              <span>Portalda başvurusu "değerlendiriliyor" görünmeye devam edecek. Bir süre sonra bakmayı bırakır.</span>
            </div>
          )}
          <div className={styles.hint}>{TEMPLATES.find((t) => t.id === choices[focus])?.hint}</div>
        </section>
      </div>

      <footer className={styles.foot}>
        <span className={styles.summary}>
          {TEMPLATES.map((t) => ({ t, n: ids.filter((id) => choices[id] === t.id).length }))
            .filter((x) => x.n > 0)
            .map((x) => (
              <span key={x.t.id} className={x.t.id === 'none' ? styles.chipSilent : styles.chip}>
                {x.n} × {x.t.label}
              </span>
            ))}
        </span>
        <button className={styles.send} onClick={() => onSend(choices)}>
          {toSend === 0 ? 'Tamam' : `Gönder (${toSend})`}
        </button>
      </footer>
    </div>
  );
}
