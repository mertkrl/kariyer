import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react';
import { callFor, useGameStore, TEAM_LATE_DAY } from '../../game/store';
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
import { CakePlate, PizzaBox } from './DeskExtrasArt';
import { BIRTHDAY_PARTY, BIRTHDAY_YES } from '../../game/data/phoneScript';
import { OrchidArt } from './OrchidArt';
import { AirConArt, DeskLampArt, ExtinguisherArt, PlantArt, PrinterCabinetArt, WaterCoolerArt } from './DeskDecor';
import { DeskDefs, FoldersArt, KeyboardArt, LandlineArt, MobileArt, MonitorArt, MouseArt, MugArt, PedestalArt, PenCupArt, PosterArt, WallClockArt, WindowFrameArt } from './DeskObjects';
import styles from './Desk.module.css';
import { BIRTHDAY_DAY, MONDAY } from '../../game/weekdays';

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
  const activeEvent = useGameStore((s) => s.activeEvent);
  const story = useGameStore((s) => s.story);
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
  const unreadTotal = Object.values(unread).reduce((a, b) => a + b, 0);
  const unreadMail = inbox(dayIndex, minutes, extraMails).filter((m) => !mailRead.includes(m.id)).length;
  const powerOut = activeEvent?.kind === 'power';
  const flower = flowerState(dayIndex, desk.lastWatered);
  const orchidHere = desk.flower && dayIndex === MONDAY;
  // only the very first morning needs to be told where the day starts
  const firstClockIn = !shiftStarted && dayIndex === MONDAY;

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
  const [morningExtras] = useState(() => deskExtras({ dayIndex, story, cleared: desk.cleared }));
  // back from Emre's surprise in the kitchen, your empty plate came with you
  const backFromParty =
    dayIndex === BIRTHDAY_DAY &&
    minutes >= BIRTHDAY_PARTY.at + BIRTHDAY_PARTY.minutes &&
    phone.some((m) => m.thread === 'birthday' && m.from === 'me' && m.text === BIRTHDAY_YES);
  const extras: DeskExtra[] = backFromParty
    ? [
        ...morningExtras,
        {
          id: 'cake-today',
          box: [352, 500, 130, 70],
          label: 'Boş pasta tabağı',
          thought: 'Emre\'nin pastasından kalan boş tabak. Mutfağa götürüp bıraktın.',
          art: <CakePlate stale={false} />,
          clears: true,
        },
      ]
    : morningExtras;

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
    return (
      <button key={e.id} className={styles.obj} style={{ left: e.box[0], top: e.box[1], width: e.box[2], height: e.box[3] }} data-label={e.label} aria-label={e.label} onClick={onClick}>
        {e.art}
      </button>
    );
  };

  const rootRef = useRef<HTMLDivElement>(null);
  useDeskKeys(rootRef);

  return (
    <div ref={rootRef} className={styles.desk} onKeyDown={moveFocus}>
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
        <button className={`${styles.obj} ${styles.cooler}`} data-label={`Su sebili · yan hak${mins(2)}`} aria-label={`Su sebili · yan hak${mins(2)}`} onClick={() => think(visitCooler())}>
          <WaterCoolerArt />
        </button>

        {/* ── back of the desk ── */}
        <button className={`${styles.obj} ${styles.lamp}`} data-label={lampOn ? 'Lambayı kapat' : 'Lambayı aç'} aria-label={lampOn ? 'Lambayı kapat' : 'Lambayı aç'} onClick={() => {
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
        {extras.map(renderExtra)}

        {/* Thursday, the team stays late: Emre leaves a pizza box on every desk at 17:20 */}
        {dayIndex === TEAM_LATE_DAY && minutes >= PIZZA_AT && (
          <button
            className={styles.obj}
            style={{ left: 1040, top: 486, width: 190, height: 110 }}
            data-label={(desk.pizzaEaten ?? 0) < PIZZA_SLICES ? `Pizza · ${PIZZA_SLICES - (desk.pizzaEaten ?? 0)} dilim${mins(4)}` : 'Boş pizza kutusu'} aria-label={(desk.pizzaEaten ?? 0) < PIZZA_SLICES ? `Pizza · ${PIZZA_SLICES - (desk.pizzaEaten ?? 0)} dilim${mins(4)}` : 'Boş pizza kutusu'}
            onClick={() => think(eatPizza())}
          >
            <PizzaBox left={PIZZA_SLICES - (desk.pizzaEaten ?? 0)} />
          </button>
        )}

        {/* the welcome orchid is a first-morning thing: from Tuesday on someone has taken it away */}
        {orchidHere && (
          <button className={`${styles.obj} ${styles.orchid}`} data-label={flower === 'fresh' ? 'Hoş geldin orkidesi' : 'Orkide · su istiyor'} aria-label={flower === 'fresh' ? 'Hoş geldin orkidesi' : 'Orkide · su istiyor'} onClick={() => setFlowerOpen((v) => !v)}>
            <OrchidArt state={flower} />
          </button>
        )}

        <button
          className={`${styles.obj} ${styles.monitor} ${firstClockIn ? styles.beckon : ''}`}
          data-label={`${firstClockIn ? 'Güne başla · bilgisayara geç' : 'Bilgisayar'} · B`}
          aria-label={firstClockIn ? 'Güne başla: bilgisayara geç' : 'Bilgisayar'}
          data-key="b"
          aria-keyshortcuts="B"
          onClick={onOpenPc}
          disabled={powerOut}
        >
          <MonitorArt />
          <div className={`${styles.screen} ${powerOut ? styles.screenOff : ''}`}>
            {!powerOut && (
              // the computer's own desktop, as it looks from your chair
              <div className={styles.miniDesktop}>
                <div className={styles.miniWall}>
                  <b>
                    TAVRINSA<span>LABS</span>
                  </b>
                  <small>İnsan önce gelir.</small>
                </div>
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
                    <i className={styles.miniCal}>21</i>Takvim
                  </span>
                  <span>
                    <i className={styles.miniSheet}>X</i>Adaylar_FINAL_v7.xlsx
                  </span>
                  <span>
                    <i className={styles.miniBin}>🗑</i>Geri Dönüşüm
                  </span>
                </div>
                <div className={styles.miniTaskbar}>
                  <span className={styles.miniStart}>◆</span>
                  <span className={styles.miniTask}>İK</span>
                  <span className={styles.miniTask}>✉</span>
                  <span className={styles.miniTask}>21</span>
                  <span className={`${styles.miniTray} mono`}>
                    {formatClock(minutes)}
                    <small>{day.dayName}</small>
                  </span>
                </div>
              </div>
            )}
          </div>
        </button>

        {/* ── front of the desk ── */}
        <button
          className={`${styles.obj} ${styles.landline} ${ringingCaller ? styles.ringing : ''}`}
          data-label={`${ringingCaller ? `${ringingCaller} arıyor — aç` : 'Masa telefonu'} · H`} aria-label={ringingCaller ? `${ringingCaller} arıyor — aç` : 'Masa telefonu'}
          data-key="h"
          aria-keyshortcuts="H"
          onClick={() => {
            if (ringingCaller) {
              audioEngine.playHandset();
              pickUpCall();
            } else think('Çevir sesi. Kimi arayacaksın ki? Numaraların hepsi dahili.');
          }}
        >
          <LandlineArt ringing={!!ringingCaller} display={ringingCaller ?? formatClock(minutes)} />
        </button>
        <button className={`${styles.obj} ${styles.keyboard}`} data-label="Klavye" aria-label="Klavye" onClick={onOpenPc} disabled={powerOut}>
          <KeyboardArt />
        </button>
        <button className={`${styles.obj} ${styles.mouse}`} data-label="Fare" aria-label="Fare" onClick={onOpenPc} disabled={powerOut}>
          <MouseArt />
        </button>
        <button className={`${styles.obj} ${styles.mug}`} data-label={`${desk.coffee > 0 ? 'Kahve · bir yudum' : `Boş kupa · mutfakta doldur${mins(REFILL_MINUTES)}`} · K`} data-key="k" aria-keyshortcuts="K" aria-label={desk.coffee > 0 ? 'Kahve · bir yudum' : `Boş kupa · mutfakta doldur${mins(REFILL_MINUTES)}`} onClick={() => think(drinkCoffee())}>
          <MugArt sips={desk.coffee} max={COFFEE_SIPS} />
        </button>
        <button key={buzz?.id ?? 'phone'} className={`${styles.obj} ${styles.mobile} ${buzz ? styles.buzzing : ''}`} data-label="Cep telefonu · T" aria-label="Cep telefonu" data-key="t" aria-keyshortcuts="T" onClick={() => onOpenPhone(buzz?.thread ?? null)}>
          <MobileArt lit={!!buzz || unreadTotal > 0} unread={unreadTotal} />
        </button>

        {/* ── under the desk ── */}
        <button
          key={`drawer-${drawerShake}`}
          className={`${styles.obj} ${styles.pedestal} ${drawerShake ? styles.rattle : ''} ${drawer === 'unlocked' ? styles.pedestalNew : ''}`}
          data-label="Sol alt çekmece · Ç" aria-label="Sol alt çekmece"
          data-key="ç"
          aria-keyshortcuts="Ç"
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

      {flowerOpen && orchidHere && (
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

/** Something on top of the desk has the keyboard: a dialog, the computer, a text field. */
function deskBusy(root: HTMLElement, e: KeyboardEvent) {
  if (root.closest('[inert]')) return true;
  const t = e.target as HTMLElement | null;
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return true;
  // a dialog that is actually showing: not the rotate hint hidden on a wide screen, not the
  // computer's window left open behind the desk (its layer is inert while you're at the desk)
  return [...document.querySelectorAll('[role="dialog"]')].some((d) => d.getClientRects().length > 0 && !root.contains(d) && !d.closest('[inert]'));
}

/**
 * The desk's shortcuts: B the computer, T the mobile, H the landline, K the coffee, Ç the
 * drawer — each button names its key (data-key) and shows it in its label. Turkish keyboards
 * type ç; elsewhere C does the same.
 */
function useDeskKeys(rootRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const root = rootRef.current;
      if (!root || e.metaKey || e.ctrlKey || e.altKey || e.repeat || deskBusy(root, e)) return;
      const key = e.key.toLocaleLowerCase('tr') === 'c' ? 'ç' : e.key.toLocaleLowerCase('tr');
      const target = root.querySelector<HTMLButtonElement>(`button[data-key="${CSS.escape(key)}"]:not(:disabled)`);
      if (!target) return;
      e.preventDefault();
      target.focus({ preventScroll: true });
      target.click();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rootRef]);
}

const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

/** Arrow keys move between the things on the desk: to the nearest one in that direction. */
function moveFocus(e: ReactKeyboardEvent<HTMLDivElement>) {
  const dir = ARROWS[e.key];
  const from = e.target as HTMLElement;
  if (!dir || !(from instanceof HTMLButtonElement) || !from.classList.contains(styles.obj)) return;
  const centre = (el: Element) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };
  const a = centre(from);
  let best: HTMLButtonElement | null = null;
  let bestScore = Infinity;
  for (const el of e.currentTarget.querySelectorAll<HTMLButtonElement>(`button.${styles.obj}:not(:disabled)`)) {
    if (el === from) continue;
    const b = centre(el);
    const along = (b.x - a.x) * dir[0] + (b.y - a.y) * dir[1];
    if (along <= 1) continue;
    const across = Math.abs((b.x - a.x) * dir[1]) + Math.abs((b.y - a.y) * dir[0]);
    // straight ahead beats off to the side; outside the 45° cone only if nothing is inside it
    const score = along + across * 2 + (across > along ? 1e6 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  if (!best) return;
  e.preventDefault();
  best.focus({ preventScroll: true });
}
