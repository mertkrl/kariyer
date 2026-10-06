import { audioEngine } from '../../../../audio/audioEngine';
import { WORKDAY_END_MIN } from '../../../../game/time';
import { MODE_ICON, ROUTES, arrival, trafficAt, type Route } from './trafficModel';
import styles from '../TrafficApp.module.css';

interface RouteSheetProps {
  route: Route;
  best: Route;
  eta: (r: Route) => number;
  rush: number;
  minutes: number;
  onPick: (id: string) => void;
}

/** Haritanın altındaki alt sayfa: ulaşım türleri, seçilen rotanın özeti ve varış saati. */
export function RouteSheet({ route, best, eta, rush, minutes, onPick }: RouteSheetProps) {
  // "normal": aynı rota, sabah saatinde ve açık havada
  const normal = trafficAt(0, 0).eta(route);
  const delay = eta(route) - normal;
  return (
    <div className={styles.sheet}>
      <span className={styles.grabber} />
      <div className={styles.modes}>
        {ROUTES.map((r) => {
          return (
            <button
              key={r.id}
              className={`${styles.mode} ${r.id === route.id ? styles.modeOn : ''}`}
              onClick={() => {
                onPick(r.id);
                audioEngine.playUi('select', 1);
              }}
            >
              <span>{MODE_ICON[r.mode]}</span>
              <strong className="mono">{`${eta(r)} dk`}</strong>
              <small>{r.label}</small>
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
              ? 'Metrobüs kendi yolunda gider; Cevizlibağ\'da tramvaya aktarma var.'
              : 'Trafikten ve havadan etkilenmez; Yenikapı aktarması dahil.'}
        </span>
      </div>
      <div className={styles.arrive}>
        <span>Mesai bitince çıkarsan tahmini varış</span>
        <strong className="mono">{arrival(Math.max(minutes, WORKDAY_END_MIN) + eta(route))}</strong>
      </div>
    </div>
  );
}
