import { useEffect, useState, type CSSProperties } from 'react';
import { callFor, lineupFor, useGameStore, TEAM_LATE_DAY } from '../../game/store';
import { PIZZA_SLICES } from '../../game/slices/deskSlice';
import { days } from '../../game/data/days';
import { COFFEE_SIPS, DRAWER_LOCKED_THOUGHT, FLOWER_CARD, FLOWER_STATE_TEXT, REFILL_MINUTES, WATER_MINUTES, flowerState } from '../../game/desk';
import { inbox } from '../../game/mail';
import { formatClock } from '../../game/time';
import { audioEngine } from '../../audio/audioEngine';
import type { ThreadId } from '../../game/manager';
import { DeskRoom, STAGE_H, STAGE_W } from './DeskRoom';
import { OfficeWindow, type WindowWeather } from './OfficeWindow';
import { COFFEE_RINGS, deskExtras, type DeskExtra } from './DeskExtras';
import { PizzaBox } from './DeskExtrasArt';
import { OrchidArt } from './OrchidArt';
import { AirConArt, DeskLampArt, ExtinguisherArt, PlantArt, PrinterCabinetArt, WaterCoolerArt } from './DeskDecor';
import { DeskDefs, FoldersArt, KeyboardArt, LandlineArt, MobileArt, MonitorArt, MouseArt, MugArt, PedestalArt, PenCupArt, PosterArt, WallClockArt, WindowFrameArt } from './DeskObjects';
import styles from './Desk.module.css';

const WEATHER: WindowWeather[] = ['sunny', 'windy', 'rainy', 'snowy', 'cloudy'];

interface DeskProps {
  /** Stage → screen scale (the whole desk always fits; the room fills the rest). */
  scale: number;
  onOpenPc: () => void;
  /** Opens the phone — on a given chat when a notification was tapped. */
  onOpenPhone: (thread?: ThreadId | null) => void;
  onOpenDrawer: () => void;
}

/** Your desk, seen from your chair. Everything on it is something you can pick up. */
/** When the pizza reaches the desks on the team's late Thursday (see the office chat). */
const PIZZA_AT = 560;

export function Desk({ scale, onOpenPc, onOpenPhone, onOpenDrawer }: DeskProps) {
  const dayIndex = useGameStore((s) => s.currentDayIndex);
  const minutes = useGameStore((s) => s.workdayMinutes);
  const desk = useGameStore((s) => s.desk);
  const drawer = useGameStore((s) => s.story.drawer);
  const phone = useGameStore((s) => s.phone);
  const unread = useGameStore((s) => s.phoneUnread);
  const decisions = useGameStore((s) => s.decisions);
  const lineups = useGameStore((s) => s.lineups);
  const activeEvent = useGameStore((s) => s.activeEvent);
  const story = useGameStore((s) => s.story);
  const performans = useGameStore((s) => s.performans);
  const mailRead = useGameStore((s) => s.mailRead);
  const extraMails = useGameStore((s) => s.extraMails);
  const ringingCaller = useGameStore((s) => (s.desk.ringing ? (callFor(s, s.desk.ringing)?.caller ?? null) : null));
  const pickUpCall = useGameStore((s) => s.pickUpCall);
  const drinkCoffee = useGameStore((s) => s.drinkCoffee);
  const waterFlower = useGameStore((s) => s.waterFlower);
  const visitCooler = useGameStore((s) => s.visitCooler);
  const clearDeskItem = useGameStore((s) => s.clearDeskItem);
  const eatPizza = useGameStore((s) => s.eatPizza);
  // nothing costs time before you clock in, so nothing says how long it takes
  const shiftStarted = useGameStore((s) => s.shiftStarted);
  const mins = (n: number) => (shiftStarted ? ` (${n} dk)` : '');

  const day = days[dayIndex];
  const lineup = lineupFor({ currentDayIndex: dayIndex, lineups });
  const decided = lineup.filter((id) => decisions[id]).length;
  const unreadTotal = Object.values(unread).reduce((a, b) => a + b, 0);
  const unreadMail = inbox(dayIndex, minutes, extraMails).filter((m) => !mailRead.includes(m.id)).length;
  const powerOut = activeEvent?.kind === 'power';
  const flower = flowerState(dayIndex, desk.lastWatered);

  const [thought, setThought] = useState<string | null>(null);
  const [flowerOpen, setFlowerOpen] = useState(false);
  const [drawerShake, setDrawerShake] = useState(0);
  // the desk lamp comes on by itself when it gets dark; you can switch it either way
  const [lampChoice, setLampChoice] = useState<boolean | null>(null);
  const lampOn = lampChoice ?? minutes >= 450;

  // a new message makes the phone rattle on the desk (the notification itself shows elsewhere)
  const [buzz, setBuzz] = useState<{ id: number; thread: ThreadId } | null>(null);
  const [seen, setSeen] = useState(phone.length);
  if (phone.length !== seen) {
    setSeen(phone.length);
    const m = phone[phone.length - 1];
    if (phone.length > seen && m?.from === 'them') setBuzz({ id: m.id, thread: m.thread });
  }
  useEffect(() => {
    if (!buzz) return;
    const id = window.setTimeout(() => setBuzz(null), 4000);
    return () => window.clearTimeout(id);
  }, [buzz]);

  useEffect(() => {
    if (!thought) return;
    const id = window.setTimeout(() => setThought(null), 5600);
    return () => window.clearTimeout(id);
  }, [thought]);

  // the room darkens towards five o'clock; the monitor and the lamp become the light in it
  const dusk = Math.max(0, Math.min(1, (minutes - 420) / 120));
  const stageStyle = {
    width: STAGE_W,
    height: STAGE_H,
    transform: `translate(-50%, -50%) scale(${scale})`,
    '--dusk': dusk.toFixed(3),
  } as CSSProperties;

  // what the week has left on the desk (decided each morning, so a note doesn't vanish mid-day)
  const [extras] = useState(() => deskExtras({ dayIndex, story, performans, cleared: desk.cleared }));
  const onMonitor = (e: DeskExtra) => !!e.note;

  const think = (text: string) => {
    audioEngine.playUi('click');
    setThought(text);
  };
  const renderExtra = (e: DeskExtra) => {
    if (e.clears && desk.cleared.includes(e.id)) return null;
    const onClick = () => {
      think(e.thought);
      if (e.clears) clearDeskItem(e.id);
    };
    if (e.note)
      return (
        <button
          key={e.id}
          className={`${styles.note} ${styles.noteStuck}`}
          style={{ left: e.box[0], top: e.box[1], width: e.box[2], height: e.box[3], background: e.note.color, transform: `rotate(${e.note.rot}deg)` }}
          data-label={e.label}
          onClick={onClick}
        >
          {e.note.lines.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </button>
      );
    return (
      <button key={e.id} className={styles.obj} style={{ left: e.box[0], top: e.box[1], width: e.box[2], height: e.box[3] }} data-label={e.label} onClick={onClick}>
        {e.art}
      </button>
    );
  };

  return (
    <div className={styles.desk}>
      <DeskDefs />
      <div className={styles.stage} style={stageStyle}>
        <DeskRoom className={styles.room} scale={scale} />

        {/* ── on the wall ── */}
        <div className={styles.aircon}>
          <AirConArt />
          <div className={styles.airflow} />
        </div>
        <div className={styles.window}>
          <OfficeWindow className={styles.windowView} minutes={minutes} weather={WEATHER[dayIndex] ?? 'cloudy'} />
          <div className={styles.windowFrame}>
            <WindowFrameArt />
          </div>
        </div>
        <div className={styles.clock}>
          <WallClockArt minutes={minutes} />
        </div>
        <div className={styles.poster}>
          <PosterArt />
        </div>

        {/* ── the office around the desk, standing on the carpet ── */}
        <div className={styles.extinguisher}>
          <ExtinguisherArt />
        </div>
        <div className={styles.plant}>
          <PlantArt />
        </div>
        <div className={styles.printer}>
          <PrinterCabinetArt />
        </div>
        <button className={`${styles.obj} ${styles.cooler}`} data-label={`Su sebili · yan hak${mins(2)}`} onClick={() => think(visitCooler())}>
          <WaterCoolerArt />
        </button>

        {/* ── back of the desk ── */}
        <button className={`${styles.obj} ${styles.lamp}`} data-label={lampOn ? 'Lambayı kapat' : 'Lambayı aç'} onClick={() => {
          audioEngine.playUi('click');
          setLampChoice(!lampOn);
        }}>
          <DeskLampArt on={lampOn} />
        </button>
        <div className={styles.folders}>
          <FoldersArt count={2 + dayIndex} />
        </div>
        <div className={styles.penCup}>
          <PenCupArt />
        </div>
        {COFFEE_RINGS.slice(0, dayIndex).map(([x, y, rad]) => (
          <div key={`${x}-${y}`} className={styles.ring} style={{ left: x - rad, top: y - rad * 0.32, width: rad * 2, height: rad * 0.64 }} />
        ))}
        {extras.filter((e) => !onMonitor(e)).map(renderExtra)}

        {/* Thursday, the team stays late: Emre leaves a pizza box on every desk at 17:20 */}
        {dayIndex === TEAM_LATE_DAY && minutes >= PIZZA_AT && (
          <button
            className={styles.obj}
            style={{ left: 1040, top: 486, width: 190, height: 110 }}
            data-label={(desk.pizzaEaten ?? 0) < PIZZA_SLICES ? `Pizza · ${PIZZA_SLICES - (desk.pizzaEaten ?? 0)} dilim${mins(4)}` : 'Boş pizza kutusu'}
            onClick={() => think(eatPizza())}
          >
            <PizzaBox left={PIZZA_SLICES - (desk.pizzaEaten ?? 0)} />
          </button>
        )}

        {desk.flower && (
          <button className={`${styles.obj} ${styles.orchid}`} data-label={flower === 'fresh' ? 'Hoş geldin orkidesi' : 'Orkide · su istiyor'} onClick={() => setFlowerOpen((v) => !v)}>
            <OrchidArt state={flower} />
          </button>
        )}

        <button className={`${styles.obj} ${styles.monitor}`} data-label="Bilgisayar" onClick={onOpenPc} disabled={powerOut}>
          <MonitorArt />
          <div className={`${styles.screen} ${powerOut ? styles.screenOff : ''}`}>
            {!powerOut && (
              <div className={styles.miniDesktop}>
                <div className={styles.miniIcons}>
                  <span>
                    <i className={styles.miniPortal}>İK</i>İşe Alım Portalı
                  </span>
                  <span>
                    <i className={styles.miniMail}>
                      ✉{unreadMail > 0 && <b>{unreadMail}</b>}
                    </i>
                    E-posta
                  </span>
                  <span>
                    <i className={styles.miniSheet}>X</i>Adaylar.xlsx
                  </span>
                </div>
                <div className={styles.miniStatus}>
                  {day.dayName}
                  <br />
                  {lineup.length} başvuru · {decided} karar
                </div>
                <div className={styles.miniTaskbar}>
                  <span>◆</span>
                  <span className="mono">{formatClock(minutes)}</span>
                </div>
              </div>
            )}
          </div>
        </button>
        {extras.filter(onMonitor).map(renderExtra)}
        <button
          className={`${styles.note} ${styles.noteYellow} ${day.ruleText.length > 52 ? styles.noteDense : ''}`}
          data-label="Post-it"
          onClick={() => think(`İK Müdürü'nden not: "${day.ruleText}"`)}
        >
          <small>İK Müdürü</small>
          {day.ruleText}
        </button>

        {/* ── front of the desk ── */}
        <button
          className={`${styles.obj} ${styles.landline} ${ringingCaller ? styles.ringing : ''}`}
          data-label={ringingCaller ? `${ringingCaller} arıyor — aç` : 'Masa telefonu'}
          onClick={() => {
            if (ringingCaller) {
              audioEngine.playHandset();
              pickUpCall();
            } else think('Çevir sesi. Kimi arayacaksın ki? Numaraların hepsi dahili.');
          }}
        >
          <LandlineArt ringing={!!ringingCaller} display={ringingCaller ?? formatClock(minutes)} />
        </button>
        <button className={`${styles.obj} ${styles.keyboard}`} data-label="Klavye" onClick={onOpenPc} disabled={powerOut}>
          <KeyboardArt />
        </button>
        <button className={`${styles.obj} ${styles.mouse}`} data-label="Fare" onClick={onOpenPc} disabled={powerOut}>
          <MouseArt />
        </button>
        <button className={`${styles.obj} ${styles.mug}`} data-label={desk.coffee > 0 ? 'Kahve · bir yudum' : `Boş kupa · mutfakta doldur${mins(REFILL_MINUTES)}`} onClick={() => think(drinkCoffee())}>
          <MugArt sips={desk.coffee} max={COFFEE_SIPS} />
        </button>
        <button key={buzz?.id ?? 'phone'} className={`${styles.obj} ${styles.mobile} ${buzz ? styles.buzzing : ''}`} data-label="Cep telefonu" onClick={() => onOpenPhone(buzz?.thread ?? null)}>
          <MobileArt lit={!!buzz || unreadTotal > 0} unread={unreadTotal} />
        </button>

        {/* ── under the desk ── */}
        <button
          key={`drawer-${drawerShake}`}
          className={`${styles.obj} ${styles.pedestal} ${drawerShake ? styles.rattle : ''} ${drawer === 'unlocked' ? styles.pedestalNew : ''}`}
          data-label="Sol alt çekmece"
          onClick={() => {
            if (drawer === 'locked') {
              setDrawerShake((n) => n + 1);
              think(DRAWER_LOCKED_THOUGHT);
            } else onOpenDrawer();
          }}
        >
          <PedestalArt unlocked={drawer !== 'locked'} />
        </button>

        {/* light: daylight fading, the monitor and the lamp taking over */}
        <div className={styles.dusk} />
        <div className={`${styles.screenGlow} ${powerOut ? styles.screenGlowOff : ''}`} />
        <div className={`${styles.lampGlow} ${lampOn ? styles.lampGlowOn : ''}`} />
      </div>

      {flowerOpen && desk.flower && (
        <div className={styles.flowerCard} role="dialog" aria-label="Çiçek kartı">
          <p className={styles.flowerText}>{FLOWER_CARD}</p>
          <p className={styles.flowerState}>{FLOWER_STATE_TEXT[flower]}</p>
          <div className={styles.flowerActions}>
            {desk.lastWatered !== dayIndex && flower !== 'dead' && (
              <button
                onClick={() => {
                  waterFlower();
                  const pour = audioEngine.startPour('water');
                  let fill = 0;
                  const id = window.setInterval(() => {
                    fill += 0.08;
                    pour.setFill(fill);
                    if (fill >= 0.8) {
                      window.clearInterval(id);
                      pour.stop();
                    }
                  }, 90);
                  setFlowerOpen(false);
                  setThought('Sebilden bir bardak su getirip orkideye verdin. En azından burada bir şey yaşıyor.');
                }}
              >
                💧 Sebilden su getir{mins(WATER_MINUTES)}
              </button>
            )}
            <button onClick={() => setFlowerOpen(false)}>Kapat</button>
          </div>
        </div>
      )}
      {thought && <div className={styles.thought}>{thought}</div>}
    </div>
  );
}
