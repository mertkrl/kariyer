import { dispatch, INCIDENT_NAME, incidentStatus, type Sim } from './sim';
import styles from './Incidents.module.css';

/*
 * Olay kartları: arıza, kaza ya da yolu kapatan düğün çıkınca solda bir kart belirir. "Trafik
 * ekiplerine bildir" polisi (gerekirse çekiciyi) yola çıkarır; çağrılmayan ekip yüzünden olay
 * dakikalarca yolu tıkar.
 */

export function IncidentCards({ sims, onSend, onSelect }: { sims: Sim[]; onSend: () => void; onSelect: (i: number) => void }) {
  const multi = sims.length > 1;
  const live = sims.flatMap((sim, at) => sim.incidents.filter((i) => i.cleared === undefined || sim.t - i.cleared < 4).map((i) => ({ i, sim, at })));
  if (!live.length) return null;
  return (
    <ul className={styles.incidents} aria-label="Yoldaki olaylar">
      {live.map(({ i, sim, at }) => {
        const team = i.team;
        const status = incidentStatus(sim, i);
        const work = i.kind === 'roadwork';
        return (
          <li key={`${sim.node}-${i.id}`} className={i.cleared !== undefined ? styles.solved : undefined}>
            <b>
              <i aria-hidden="true">{i.kind === 'fault' ? '🚦' : i.kind === 'crash' ? '💥' : i.kind === 'wedding' ? '💃' : i.kind === 'parked' ? '🅿️' : work ? '🚧' : '⚠️'}</i> {INCIDENT_NAME[i.kind]}
              {multi ? ` · ${sim.name}` : ''}
              {i.leg ? ` · ${sim.spec.legs[i.leg]!.name}` : ''}
            </b>
            <small>{status}</small>
            {!team && !work && i.cleared === undefined && (
              <button
                type="button"
                onClick={() => {
                  dispatch(sim, i.id);
                  onSend();
                }}
              >
                {i.kind === 'fault' ? '⚡ Elektrik ekibini çağır' : '🚓 Trafik ekiplerine bildir'}
              </button>
            )}
            {work && i.cleared === undefined && multi && (
              <button type="button" className={styles.goto} onClick={() => onSelect(at)}>
                Kavşağa git
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
