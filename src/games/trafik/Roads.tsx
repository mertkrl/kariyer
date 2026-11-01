import { clash } from './junction';
import { DIR_NAME, DIRS, LEG_MODE_NAME, type Dir, type LegMode, type MoveId } from './model';
import { dispatch, INCIDENT_NAME, setManual, setMode, toggleLeg, type Sim } from './sim';
import { LIGHT } from './sprites';
import base from './TrafikGame.module.css';
import styles from './Roads.module.css';

/*
 * Kavşağın elle yönetilen yanı: sağda "Yollar" paneli (her kolun yol düzeni ve elle kumandada
 * kolun ışığı), solda olay kartları ("Trafik ekiplerine bildir"). Panel her an açıktır; yaptığın
 * her şeyin bedeli simülasyonda: kapanan yöndeki sürücü ara sokağa sapar, çakışan iki yeşil
 * kutuda kaza çıkarır, çağrılmayan ekip yüzünden olay dakikalarca yolu tıkar.
 */

const MODES: LegMode[] = ['iki', 'giris', 'cikis', 'kapali'];
const MODE_ICON: Record<LegMode, string> = { iki: '⇅', giris: '↓', cikis: '↑', kapali: '⛔' };
const STATE_NAME = { green: 'yeşil', amber: 'sarı', red: 'kırmızı' } as const;

/** Elle kumandada aynı anda yeşil yanan, çakışan kollar. */
function rivalsGreen(sim: Sim) {
  const on = DIRS.filter((d) => sim.manual?.[d] && sim.manual[d]!.st !== 'red');
  for (const a of on) for (const b of on) if (a < b && ['L', 'T', 'R'].some((x) => ['L', 'T', 'R'].some((y) => clash(`${a}.${x}` as MoveId, `${b}.${y}` as MoveId) === 'hard'))) return true;
  return false;
}

export function RoadPanel({ sim, hint, onChange }: { sim: Sim; hint?: 'roads' | 'manual'; onChange: (what: 'mode' | 'manual' | 'toggle') => void }) {
  const legs = DIRS.filter((d) => sim.j.legs[d]);
  const clashing = rivalsGreen(sim);
  return (
    <section className={`${styles.roads} ${hint === 'roads' ? base.hint : ''}`} aria-label="Yollar ve elle kumanda">
      <header>
        <b>Yollar</b>
        <label className={`${base.toggle} ${hint === 'manual' ? base.hint : ''}`} title="Kontrolörü durdurur, her kolun ışığını sen çevirirsin">
          <input
            type="checkbox"
            checked={!!sim.manual}
            disabled={sim.t === 0}
            onChange={(e) => {
              setManual(sim, e.target.checked);
              onChange('manual');
            }}
          />
          <span>Elle kumanda</span>
        </label>
      </header>
      <ul>
        {legs.map((d: Dir) => {
          const mode = sim.mode[d] ?? 'iki';
          const m = sim.manual?.[d];
          return (
            <li key={d}>
              <span className={styles.roadName}>
                <small>{DIR_NAME[d]}</small>
                {sim.spec.legs[d]!.name}
              </span>
              <button
                type="button"
                className={mode === 'iki' ? undefined : styles.modeOn}
                onClick={() => {
                  setMode(sim, d, MODES[(MODES.indexOf(mode) + 1) % MODES.length]);
                  onChange('mode');
                }}
                title="Yol düzenini değiştir: çift yön, tek yön (giriş / çıkış), kapalı"
                aria-label={`${sim.spec.legs[d]!.name}: ${LEG_MODE_NAME[mode]}. Değiştir`}
              >
                <i aria-hidden="true">{MODE_ICON[mode]}</i> {LEG_MODE_NAME[mode]}
              </button>
              {m && (
                <button
                  type="button"
                  className={styles.lamp}
                  style={{ background: LIGHT[m.st] }}
                  disabled={m.st === 'amber'}
                  onClick={() => {
                    toggleLeg(sim, d);
                    onChange('toggle');
                  }}
                  aria-label={`${sim.spec.legs[d]!.name} ışığı ${STATE_NAME[m.st]}. Çevir`}
                  title={m.st === 'green' ? 'Kırmızıya çevir (önce sarı)' : m.st === 'red' ? 'Yeşil yak' : 'Sarı yanıyor'}
                />
              )}
            </li>
          );
        })}
      </ul>
      {sim.manual && <p className={clashing ? styles.warnLine : styles.noteLine}>{clashing ? 'Çakışan kollar birlikte yeşil: kutuda kaza çıkabilir!' : 'Kırmızıya çevrilen kol önce 3 sn sarı yanar. Bütün kollar kırmızıyken yayalar yürür.'}</p>}
    </section>
  );
}

export function IncidentCards({ sim, hint, onSend }: { sim: Sim; hint?: boolean; onSend: () => void }) {
  const live = sim.incidents.filter((i) => i.cleared === undefined || sim.t - i.cleared < 4);
  if (!live.length) return null;
  return (
    <ul className={`${styles.incidents} ${hint ? base.hint : ''}`} aria-label="Yoldaki olaylar">
      {live.map((i) => {
        const team = i.team;
        const status =
          i.cleared !== undefined ? 'Çözüldü' : !team ? `Kendiliğinden kalkması ~${Math.max(0, Math.round(i.until - sim.t))} sn` : sim.t < team.arrive ? `Ekip yolda · ${Math.max(0, Math.ceil(team.arrive - sim.t))} sn` : `Ekip çalışıyor · ${Math.max(0, Math.ceil(team.fix - sim.t))} sn`;
        return (
          <li key={i.id} className={i.cleared !== undefined ? styles.solved : undefined}>
            <b>
              <i aria-hidden="true">{i.kind === 'crash' ? '💥' : i.kind === 'wedding' ? '💃' : i.kind === 'parked' ? '🅿️' : '⚠️'}</i> {INCIDENT_NAME[i.kind]}
              {i.leg ? ` · ${sim.spec.legs[i.leg]!.name}` : ''}
            </b>
            <small>{status}</small>
            {!team && i.cleared === undefined && (
              <button
                type="button"
                
                onClick={() => {
                  dispatch(sim, i.id);
                  onSend();
                }}
              >
                🚓 Trafik ekiplerine bildir
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
