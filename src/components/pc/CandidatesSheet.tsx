import { useState } from 'react';
import { lineupFor, useGameStore } from '../../game/store/store';
import { candidateOf } from '../../game/data/candidates';
import { formatClock } from '../../game/lib/time';
import { COLLEAGUES } from '../../screens/final/interviewModel';
import styles from './CandidatesSheet.module.css';

/*
 * Ekibin ortak hesap tablosu: Cuma'ya mülakata çağrılan herkes, kimin çağırdığıyla. Ortak
 * sürücüdedir ve salt okunurdur; Defne, Ayşe, Emre ya da Hakan Bey birini çağırdıkça bir satır
 * eklenir. Bir ofis tablosu gibi davranır: hücre seçilir, formül çubuğunda okunur, alttaki
 * sekmeden özete geçilir; ama hiçbir şey değiştirilemez.
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

const DAY_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'];
const COLUMNS = ['Aday', 'Pozisyon', 'Kıdem', 'Deneyim', 'Maaş beklentisi (₺)', 'Davet eden', 'Eklendi', 'Mülakat'] as const;
const LETTERS = 'ABCDEFGHI';

interface Row {
  id: string;
  by: Inviter;
  day: number;
}

/** "50.000 TL (bütçeye göre esnek)" → 50000 ve hücre notu. */
function salaryCell(text: string): { amount: number | null; note: string | null } {
  const m = /(\d{1,3}(?:\.\d{3})+|\d{4,})\s*TL/.exec(text);
  const note = /\(([^)]+)\)/.exec(text)?.[1] ?? null;
  return { amount: m ? Number(m[1].replace(/\./g, '')) : null, note };
}

const money = (n: number) => n.toLocaleString('tr-TR');

export function CandidatesSheet() {
  const finalists = useGameStore((s) => s.finalists);
  const decisions = useGameStore((s) => s.decisions);
  const lineups = useGameStore((s) => s.lineups);
  const dayIndex = useGameStore((s) => s.currentDayIndex);
  const minutes = useGameStore((s) => s.workdayMinutes);
  const [tab, setTab] = useState<'list' | 'summary'>('list');
  const [cell, setCell] = useState<{ r: number; c: number }>({ r: 0, c: 0 });

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

  const table = rows.map((r) => {
    const c = candidateOf(r.id);
    const [title, level = ''] = c.role.replace(' adayı', '').split(' · ');
    const pay = salaryCell(c.salary);
    return { ...r, name: c.name, title, level, experience: c.experience, pay };
  });
  const display = (row: (typeof table)[number], col: number): string =>
    [row.name, row.title, row.level, row.experience, row.pay.amount === null ? '' : money(row.pay.amount), row.by, DAY_SHORT[row.day], 'Cuma'][col];

  const amounts = table.map((t) => t.pay.amount).filter((n): n is number => n !== null);
  const avg = amounts.length ? Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length) : 0;
  const selected = table[cell.r];
  const ref = tab === 'list' ? `${LETTERS[cell.c]}${cell.r + 2}` : 'A1';
  const formula = tab === 'list' ? (selected ? (cell.c === 4 ? selected.pay.amount?.toString() ?? '' : display(selected, cell.c)) : '') : 'Özet';

  return (
    <div className={styles.app}>
      <div className={styles.ribbon} aria-hidden="true">
        {['Dosya', 'Giriş', 'Ekle', 'Formüller', 'Veri', 'Gözden Geçir', 'Görünüm'].map((t, i) => (
          <span key={t} className={i === 1 ? styles.ribbonOn : undefined}>
            {t}
          </span>
        ))}
      </div>
      <div className={styles.notice} role="status">
        <span className={styles.noticeIcon}>i</span>
        <span>
          <b>SALT OKUNUR</b> · Bu dosya <i>İK Ortak / Cuma Mülakatları</i> klasöründe paylaşıldı. Davetler portaldan eklenir; tabloda düzenleme yapılamaz.
        </span>
      </div>
      <div className={styles.formulaBar}>
        <span className={styles.nameBox}>{ref}</span>
        <span className={styles.fx}>fx</span>
        <span className={styles.formula}>{formula}</span>
      </div>

      <div className={styles.gridWrap}>
        {tab === 'list' ? (
          <table className={styles.grid} aria-label="Cuma mülakat listesi" aria-readonly="true">
            <thead>
              <tr className={styles.letters} aria-hidden="true">
                <th className={styles.corner} />
                {COLUMNS.map((_, i) => (
                  <th key={i} className={i === cell.c ? styles.letterOn : undefined}>
                    {LETTERS[i]}
                  </th>
                ))}
              </tr>
              <tr className={styles.header}>
                <th className={styles.rowNo}>1</th>
                {COLUMNS.map((col, i) => (
                  <th key={col} className={i === 4 ? styles.num : undefined} scope="col">
                    {col}
                    <span className={styles.filter} aria-hidden="true">
                      ▾
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.map((t, r) => (
                <tr key={t.id}>
                  <th scope="row" className={`${styles.rowNo} ${r === cell.r ? styles.rowNoOn : ''}`}>
                    {r + 2}
                  </th>
                  {COLUMNS.map((_, c) => (
                    <td
                      key={c}
                      className={`${c === 4 ? styles.num : ''} ${r === cell.r && c === cell.c ? styles.cellOn : ''}`}
                      onClick={() => setCell({ r, c })}
                      title={c === 4 && t.pay.note ? `Not: ${t.pay.note}` : undefined}
                    >
                      {c === 5 ? <span className={`${styles.chip} ${INVITER_CLASS[t.by]}`}>{t.by}</span> : c === 7 ? <span className={styles.status}>Planlandı</span> : display(t, c)}
                      {c === 4 && t.pay.note && <span className={styles.noteMark} aria-label={`Not: ${t.pay.note}`} />}
                    </td>
                  ))}
                </tr>
              ))}
              {table.length === 0 && (
                <tr>
                  <th scope="row" className={styles.rowNo}>
                    2
                  </th>
                  <td colSpan={COLUMNS.length} className={styles.empty}>
                    Henüz mülakata çağrılan kimse yok.
                  </td>
                </tr>
              )}
              {table.length > 0 && (
                <tr className={styles.total}>
                  <th scope="row" className={styles.rowNo}>
                    {table.length + 2}
                  </th>
                  <td>Toplam: {table.length} aday</td>
                  <td colSpan={3} />
                  <td className={styles.num}>Ort. {money(avg)}</td>
                  <td colSpan={3} />
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className={`${styles.grid} ${styles.summary}`} aria-label="Davet eden kişiye göre özet">
            <thead>
              <tr className={styles.header}>
                <th scope="col">Davet eden</th>
                <th scope="col" className={styles.num}>Aday</th>
                <th scope="col" className={styles.num}>Ort. maaş beklentisi (₺)</th>
                <th scope="col">Pay</th>
              </tr>
            </thead>
            <tbody>
              {INVITERS.map((who) => {
                const mine = table.filter((t) => t.by === who);
                const pays = mine.map((t) => t.pay.amount).filter((n): n is number => n !== null);
                const share = table.length ? mine.length / table.length : 0;
                return (
                  <tr key={who}>
                    <td>
                      <span className={`${styles.chip} ${INVITER_CLASS[who]}`}>{who}</span>
                    </td>
                    <td className={styles.num}>{mine.length}</td>
                    <td className={styles.num}>{pays.length ? money(Math.round(pays.reduce((a, b) => a + b, 0) / pays.length)) : '—'}</td>
                    <td>
                      <span className={styles.bar}>
                        <i style={{ width: `${Math.round(share * 100)}%` }} />
                      </span>
                      <span className={styles.pct}>%{Math.round(share * 100)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.tabs} role="tablist" aria-label="Sayfalar">
          <button role="tab" aria-selected={tab === 'list'} className={tab === 'list' ? styles.tabOn : styles.tab} onClick={() => setTab('list')}>
            Mülakat Listesi
          </button>
          <button role="tab" aria-selected={tab === 'summary'} className={tab === 'summary' ? styles.tabOn : styles.tab} onClick={() => setTab('summary')}>
            Özet
          </button>
        </div>
        <div className={styles.statusBar}>
          <span>Salt okunur</span>
          <span>Sayım: {table.length}</span>
          {amounts.length > 0 && <span>Ortalama: {money(avg)} ₺</span>}
          <span>Son güncelleme: {DAY_SHORT[dayIndex] ?? ''} {formatClock(minutes)}</span>
        </div>
      </div>
    </div>
  );
}
