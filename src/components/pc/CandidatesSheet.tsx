import { lineupFor, useGameStore } from '../../game/store/store';
import { candidateOf } from '../../game/data/candidates';
import { COLLEAGUES } from '../../screens/final/interviewModel';
import styles from './CandidatesSheet.module.css';

/*
 * Ekibin ortak hesap tablosu: Cuma'ya mülakata çağrılan herkes, kimin çağırdığıyla. Ortak
 * sürücüdedir ve salt okunurdur; Defne, Ayşe, Emre ya da Hakan Bey birini çağırdıkça bir satır
 * eklenir. Oyuncu tabloyu yalnızca okur, değiştiremez.
 */

type Inviter = 'Defne' | 'Ayşe' | 'Emre' | 'Hakan Bey';

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

export function CandidatesSheet() {
  const finalists = useGameStore((s) => s.finalists);
  const decisions = useGameStore((s) => s.decisions);
  const lineups = useGameStore((s) => s.lineups);
  const dayIndex = useGameStore((s) => s.currentDayIndex);
  const minutes = useGameStore((s) => s.workdayMinutes);

  const rows: Row[] = [
    ...finalists.filter((f) => !f.by).map((f): Row => ({ id: f.id, by: f.byManager ? 'Hakan Bey' : 'Defne', day: Math.max(0, f.day - 1) })),
    // bugün çağırdıkların gün bitmeden tabloya düşer
    ...lineupFor({ currentDayIndex: dayIndex, lineups })
      .filter((id) => decisions[id] === 'approve' && !finalists.some((f) => f.id === id))
      .map((id): Row => ({ id, by: 'Defne', day: dayIndex })),
    ...COLLEAGUES.filter((c) => {
      const [d, at] = COLLEAGUE_INVITES[c.id] ?? [0, 0];
      return dayIndex > d || (dayIndex === d && minutes >= at);
    }).map((c): Row => ({ id: c.id, by: c.by === 'ayse' ? 'Ayşe' : 'Emre', day: COLLEAGUE_INVITES[c.id]?.[0] ?? 0 })),
  ].sort((a, b) => a.day - b.day);

  const counts = rows.reduce<Record<string, number>>((all, r) => ({ ...all, [r.by]: (all[r.by] ?? 0) + 1 }), {});

  return (
    <div className={styles.sheet}>
      <div className={styles.toolbar}>
        <span className={styles.readOnly}>🔒 Salt okunur · Ortak sürücü / İK / Cuma mülakatları</span>
        <span className={styles.counts}>
          {(['Defne', 'Ayşe', 'Emre', 'Hakan Bey'] as Inviter[]).map((who) => (
            <span key={who}>
              {who}: <b>{counts[who] ?? 0}</b>
            </span>
          ))}
        </span>
      </div>
      <div className={styles.gridWrap}>
        <table className={styles.grid}>
          <thead>
            <tr>
              <th className={styles.rowNo} />
              <th>A · Aday</th>
              <th>B · Pozisyon</th>
              <th>C · Maaş beklentisi</th>
              <th>D · Davet eden</th>
              <th>E · Eklendiği gün</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const c = candidateOf(r.id);
              return (
                <tr key={r.id}>
                  <td className={styles.rowNo}>{i + 1}</td>
                  <td>{c.name}</td>
                  <td>{c.role.replace(' adayı', '')}</td>
                  <td className="mono">{c.salary}</td>
                  <td>{r.by}</td>
                  <td>{DAY_NAMES[r.day]}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td className={styles.rowNo}>1</td>
                <td colSpan={5} className={styles.empty}>
                  Henüz mülakata çağrılan kimse yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
