import type { Decision } from '../../game/types';
import { SALARY_CAP, type Finalist } from '../../game/store/store';
import { candidateOf } from '../../game/data/candidates';
import { INTERVIEWER, panelRows, panelVerdict } from '../../game/events/panel';
import { Button } from '../../components/ui/Button';
import { LEAD } from './interviewModel';
import styles from '../FinalRoundScreen.module.css';
import { avatarStyle } from '../../components/ui/avatarStyle';

/*
 * Gün sonu kurulu: Hakan Bey, Ümit ve sen. Her adayın üç puanı yan yana durur (görüşmeyi yapanın,
 * Ümit'in teknik puanı, Hakan Bey'in uyum puanı); toplamı en yüksek ve bütçeye sığan aday işe
 * alınır. Kimin nasıl puanladığı tabloda görünür: Hakan Bey'in sütunu da.
 */
export interface HireModalProps {
  pool: Finalist[];
  pastRequests: { candidateId: string; want: Decision }[];
  /** Senin görüştüğün adaylara puan kartından verdiğin ortalama. */
  myScores: Record<string, number | null>;
  /** Yapılandırılmış mülakat: Hakan Bey'in uyum sütunu yok. */
  structured: boolean;
  agreed: Record<string, number | null>;
  onClose: () => void;
  /** Kurulun kararını imzala: işe alınan ve senin en yüksek puan verdiğin aday. */
  onConfirm: (decided: string, recommended: string) => void;
}

const fmt = (n: number | null) => (n === null ? '—' : n.toLocaleString('tr-TR', { maximumFractionDigits: 1, minimumFractionDigits: 1 }));

export function HireModal({ pool, pastRequests, myScores, structured, agreed, onClose, onConfirm }: HireModalProps) {
  const rows = panelRows(pool, pastRequests, myScores, agreed, structured).sort((a, b) => b.total - a.total);
  const decided = panelVerdict(rows);
  const winner = candidateOf(decided);
  // senin önerin: kendi görüştüklerin arasında en yüksek puanı verdiğin (yoksa kurulun kararı)
  const mine = rows.filter((r) => r.owner === 'you' && r.interviewer !== null).sort((a, b) => (b.interviewer ?? 0) - (a.interviewer ?? 0));
  const recommended = mine[0]?.id ?? decided;
  const yourPickLost = mine.length > 0 && recommended !== decided;
  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="panel-title">
      <div className={`${styles.modal} ${styles.modalWide}`}>
        <h2 id="panel-title">Kurul · gün sonu değerlendirmesi</h2>
        <p className={styles.panelBudget}>
          Kurul: Hakan Kaya (İK Müdürü), {LEAD} (Yazılım Ekip Lideri), sen. Her aday üç puan alır; toplamı en yüksek ve bütçeye ({SALARY_CAP.toLocaleString('tr-TR')} TL/ay) sığan
          aday işe alınır.
        </p>
        <div className={styles.compare}>
          <table>
            <thead>
              <tr>
                <th>Aday</th>
                <th>Görüşen</th>
                <th>Görüşenin puanı</th>
                <th>Teknik ({LEAD.split(' ')[0]})</th>
                <th>Uyum (Hakan Bey)</th>
                <th>Toplam</th>
                <th>Maaş</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={r.id === decided ? styles.rowWinner : !r.affordable ? styles.rowOut : undefined}>
                  <td>
                    <span className={styles.avatar} style={avatarStyle(candidateOf(r.id).color)}>
                      {candidateOf(r.id).initials}
                    </span>{' '}
                    {candidateOf(r.id).name}
                  </td>
                  <td>{r.owner === 'you' ? 'Sen' : INTERVIEWER[r.owner].name.split(' ')[0]}</td>
                  <td className="mono">{fmt(r.interviewer)}</td>
                  <td className="mono">{fmt(r.tech)}</td>
                  <td className="mono">{r.owner === 'hakan' ? '(görüşen)' : fmt(r.hakan)}</td>
                  <td className="mono">
                    <b>{fmt(r.total)}</b>
                  </td>
                  <td className="mono">{r.pay === null ? '—' : `${r.pay.toLocaleString('tr-TR')}${r.affordable ? '' : ' · bütçe dışı'}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.some((r) => r.hakan === 2) && (
            <p className={styles.compareGap}>⚠ Hakan Bey kadın adaylara ve 40 yaş üstüne "uzun vadeli uyum" gerekçesiyle düşük puan verdi. Bu sütun toplamın üçte biri.</p>
          )}
        </div>
        <div className={styles.panelVotes}>
          <p className={styles.panelResult}>
            <span className={`${styles.avatar} ${styles.avatarLarge}`} style={avatarStyle(winner.color)}>
              {winner.initials}
            </span>{' '}
            Kurul kararı: <b>{winner.name}</b>
            {yourPickLost && ` · senin en yüksek puan verdiğin ${candidateOf(recommended).name.split(' ')[0]} toplamda geride kaldı.`}
          </p>
        </div>
        <p>Diğer adaylar için süreç burada biter. Bu karar geri alınamaz.</p>
        <div className={styles.modalActions}>
          <Button variant="ghost" onClick={onClose}>
            Görüşmelere dön
          </Button>
          <Button variant="gold" sound="none" onClick={() => onConfirm(decided, recommended)}>
            Kurul kararını imzala
          </Button>
        </div>
      </div>
    </div>
  );
}
