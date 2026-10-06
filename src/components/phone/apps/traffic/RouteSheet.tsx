import { audioEngine } from '../../../../audio/audioEngine';
import { WORKDAY_END_MIN } from '../../../../game/time';
import { MODE_ICON, ROUTES, arrival, type Route } from './trafficModel';
import styles from '../TrafficApp.module.css';

interface RouteSheetProps {
  route: Route;
  best: Route;
  eta: (r: Route) => number;
  rush: number;
  minutes: number;
  ferryCancelled: boolean;
  onPick: (id: string) => void;
}

/** The bottom sheet under the map: travel modes, the chosen route's summary and arrival time. */
export function RouteSheet({ route, best, eta, rush, minutes, ferryCancelled, onPick }: RouteSheetProps) {
  const normal = Math.round(route.baseMinutes * 0.95);
  const delay = eta(route) - normal;
  return (
    <div className={styles.sheet}>
      <span className={styles.grabber} />
      <div className={styles.modes}>
        {ROUTES.map((r) => {
          const off = r.mode === 'ferry' && ferryCancelled;
          return (
            <button
              key={r.id}
              disabled={off}
              className={`${styles.mode} ${r.id === route.id ? styles.modeOn : ''}`}
              onClick={() => {
                onPick(r.id);
                audioEngine.playUi('select', 1);
              }}
            >
              <span>{MODE_ICON[r.mode]}</span>
              <strong className="mono">{off ? 'İptal' : `${eta(r)} dk`}</strong>
              <small>{r.id === 'carFsm' ? 'TEM' : r.label}</small>
            </button>
          );
        })}
      </div>
      <div className={styles.summary}>
        <div>
          <strong className={styles.bigEta} style={{ color: delay > 8 ? '#d93025' : delay > 3 ? '#e37400' : '#188038' }}>
            {eta(route)} dk
          </strong>
          <span className={styles.km}>({route.km})</span>
        </div>
        <span className={styles.via}>{route.via}</span>
        <span className={styles.note}>
          {route.id === best.id ? 'Mevcut trafik koşullarına göre en hızlı rota. ' : ''}
          {route.mode === 'car'
            ? delay > 3
              ? `Normalden ${delay} dk daha yavaş${rush > 0.5 ? ' · akşam trafiği zirvede' : ''}.`
              : 'Trafik normal seyrinde.'
            : route.mode === 'bus'
              ? 'Ayrı yolda ilerler, trafikten az etkilenir.'
              : 'Trafikten etkilenmez; hava koşullarına bağlı.'}
        </span>
      </div>
      <div className={styles.arrive}>
        <span>Mesai bitince çıkarsan tahmini varış</span>
        <strong className="mono">{arrival(Math.max(minutes, WORKDAY_END_MIN) + eta(route))}</strong>
      </div>
    </div>
  );
}
