import { useState } from 'react';
import { lineupFor, useGameStore } from '../../game/store/store';
import { candidateOf } from '../../game/data/candidates';
import { formatClock } from '../../game/lib/time';
import { COLLEAGUES } from '../../screens/final/interviewModel';
import { avatarStyle } from '../ui/avatarStyle';
import styles from './CandidatesSheet.module.css';

/*
 * Ekibin ortak listesi: Cuma'ya mülakata çağrılan herkes, kimin çağırdığıyla. Şirketin kendi iç
 * aracıdır (Tavrinsa "Ortak Liste"), ortak sürücüde durur ve salt okunurdur; Defne, Ayşe, Emre ya
 * da Hakan Bey birini çağırdıkça bir satır eklenir. Oyuncu listeyi yalnızca okur.
 */

type Inviter = 'Defne' | 'Ayşe' | 'Emre' | 'Hakan Bey';
const INVITERS: Inviter[] = ['Defne', 'Ayşe', 'Emre', 'Hakan Bey'];
const INVITER_CLASS: Record<Inviter, string> = { Defne: styles.byDefne, Ayşe: styles.byAyse, Emre: styles.byEmre, 'Hakan Bey': styles.byHakan };

/** Ayşe ve Emre'nin kısa listelerine ne zaman eklediği: [gün sırası, mesai dakikası]. */
const COLLEAGUE_INVITES: Record<string, [number, number]> = {
  nehir: [0, 300],
  cagan: [0, 420],
  berk: [1, 240],
  sarp: [2, 330],
};

const DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

interface Row {
  id: string;
  by: Inviter;
  day: number;
}

/** "50.000 TL (bütçeye göre esnek)" → 50000 ve yanındaki not. */
function salaryOf(text: string): { amount: number | null; note: string | null } {
  const m = /(\d{1,3}(?:\.\d{3})+|\d{4,})\s*TL/.exec(text);
  return { amount: m ? Number(m[1].replace(/\./g, '')) : null, note: /\(([^)]+)\)/.exec(text)?.[1] ?? null };
}

const money = (n: number) => `${n.toLocaleString('tr-TR')} ₺`;

export function CandidatesSheet() {
  const finalists = useGameStore((s) => s.finalists);
  const decisions = useGameStore((s) => s.decisions);
  const lineups = useGameStore((s) => s.lineups);
  const dayIndex = useGameStore((s) => s.currentDayIndex);
  const minutes = useGameStore((s) => s.workdayMinutes);
  const [view, setView] = useState<'list' | 'summary'>('list');

  const rows: Row[] = [
    ...finalists.filter((f) => !f.by).map((f): Row => ({ id: f.id, by: f.byManager ? 'Hakan Bey' : 'Defne', day: Math.max(0, f.day - 1) })),
    // bugün çağırdıkların gün bitmeden listeye düşer
    ...lineupFor({ currentDayIndex: dayIndex, lineups })
      .filter((id) => decisions[id] === 'approve' && !finalists.some((f) => f.id === id))
      .map((id): Row => ({ id, by: 'Defne', day: dayIndex })),
    ...COLLEAGUES.filter((c) => {
      const [d, at] = COLLEAGUE_INVITES[c.id] ?? [0, 0];
      return dayIndex > d || (dayIndex === d && minutes >= at);
    }).map((c): Row => ({ id: c.id, by: c.by === 'ayse' ? 'Ayşe' : 'Emre', day: COLLEAGUE_INVITES[c.id]?.[0] ?? 0 })),
  ].sort((a, b) => a.day - b.day);

  const people = rows.map((r) => {
    const c = candidateOf(r.id);
    const [title, level = ''] = c.role.replace(' adayı', '').split(' · ');
    return { ...r, c, title, level, pay: salaryOf(c.salary) };
  });
  const amounts = people.map((p) => p.pay.amount).filter((n): n is number => n !== null);
  const avg = amounts.length ? Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length) : 0;

  return (
    <div className={styles.app}>
      <header className={styles.head}>
        <div>
          <div className={styles.kicker}>Ortak Liste · İK / Cuma Mülakatları</div>
          <h2 className={styles.title}>Mülakat davetleri</h2>
        </div>
        <span className={styles.lock}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor" />
            <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          Salt okunur
        </span>
      </header>

      <div className={styles.bar}>
        <div className={styles.switch} role="tablist" aria-label="Görünüm">
          <button role="tab" aria-selected={view === 'list'} className={view === 'list' ? styles.on : undefined} onClick={() => setView('list')}>
            Liste
          </button>
          <button role="tab" aria-selected={view === 'summary'} className={view === 'summary' ? styles.on : undefined} onClick={() => setView('summary')}>
            Kim kaç kişi çağırdı
          </button>
        </div>
        <span className={styles.meta}>
          {people.length} aday{amounts.length > 0 && <> · ort. beklenti {money(avg)}</>}
        </span>
      </div>

      <div className={styles.body}>
        {view === 'list' ? (
          people.length === 0 ? (
            <p className={styles.empty}>Henüz kimse mülakata çağrılmadı. Biri davet edildiğinde burada görünecek.</p>
          ) : (
            <table className={styles.table} aria-label="Cuma mülakat listesi">
              <thead>
                <tr>
                  <th scope="col">Aday</th>
                  <th scope="col">Pozisyon</th>
                  <th scope="col">Deneyim</th>
                  <th scope="col" className={styles.num}>
                    Maaş beklentisi
                  </th>
                  <th scope="col">Davet eden</th>
                  <th scope="col">Eklendi</th>
                </tr>
              </thead>
              <tbody>
                {people.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className={styles.person}>
                        <span className={styles.avatar} style={avatarStyle(p.c.color)}>
                          {p.c.initials}
                        </span>
                        {p.c.name}
                      </span>
                    </td>
                    <td>
                      {p.title}
                      {p.level && <span className={styles.level}>{p.level}</span>}
                    </td>
                    <td>{p.c.experience}</td>
                    <td className={styles.num}>
                      {p.pay.amount === null ? '—' : money(p.pay.amount)}
                      {p.pay.note && <span className={styles.note}>{p.pay.note}</span>}
                    </td>
                    <td>
                      <span className={`${styles.tag} ${INVITER_CLASS[p.by]}`}>{p.by}</span>
                    </td>
                    <td className={styles.when}>{DAY_NAMES[p.day]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          <ul className={styles.summary}>
            {INVITERS.map((who) => {
              const mine = people.filter((p) => p.by === who);
              const share = people.length ? mine.length / people.length : 0;
              return (
                <li key={who}>
                  <span className={`${styles.tag} ${INVITER_CLASS[who]}`}>{who}</span>
                  <span className={styles.track}>
                    <i className={INVITER_CLASS[who]} style={{ width: `${Math.round(share * 100)}%` }} />
                  </span>
                  <b className="mono">{mine.length}</b>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer className={styles.foot}>
        Son güncelleme: {DAY_NAMES[dayIndex] ?? ''} {formatClock(minutes)} · Davetler İşe Alım Portalı'ndan eklenir
      </footer>
    </div>
  );
}
