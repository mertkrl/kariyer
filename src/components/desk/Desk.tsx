import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react';
import { callFor, useGameStore, TEAM_LATE_DAY } from '../../game/store/store';
import { PIZZA_SLICES } from '../../game/slices/deskSlice';
import { days } from '../../game/data/days';
import { COFFEE_SIPS, DRAWER_THOUGHT, FLOWER_CARD, FLOWER_STATE_TEXT, REFILL_MINUTES, WATER_MINUTES, flowerState } from '../../game/day/desk';
import { inbox } from '../../game/day/mail';
import { formatClock } from '../../game/lib/time';
import { audioEngine } from '../../audio/audioEngine';
import type { ThreadId } from '../../game/day/manager';
import { DeskRoom, STAGE_H, STAGE_W } from './DeskRoom';
import { OfficeWindow, type WindowWeather } from './OfficeWindow';
import { COFFEE_RINGS, deskExtras, type DeskExtra } from './DeskExtras';
import { CakePlate, PizzaBox } from './DeskExtrasArt';
import { BIRTHDAY_PARTY, BIRTHDAY_YES } from '../../game/data/phoneScript';
import { OrchidArt } from './OrchidArt';
import { AirConArt, DeskLampArt, ExtinguisherArt, PlantArt, PrinterCabinetArt, WaterCoolerArt } from './DeskDecor';
import { DeskDefs, FoldersArt, KeyboardArt, LandlineArt, MobileArt, MonitorArt, MouseArt, MugArt, PedestalArt, PenCupArt, PosterArt, WallClockArt, WindowFrameArt } from './DeskObjects';
import styles from './Desk.module.css';
import { BIRTHDAY_DAY, MONDAY } from '../../game/lib/weekdays';

const WEATHER: WindowWeather[] = ['sunny', 'windy', 'rainy', 'snowy', 'cloudy'];

interface DeskProps {
  /** Sahneden ekrana ölçek (bütün masa her zaman sığar; oda geri kalanını doldurur). */
  scale: number;
  onOpenPc: () => void;
  /** Telefonu açar; bir bildirime dokunulduysa belirli bir sohbette. */
  onOpenPhone: (thread?: ThreadId | null) => void;
}

/** Sandalyenden görüldüğü hâliyle masan. Üstündeki her şey eline alabileceğin bir şey. */
/** Ekibin geç kaldığı Perşembe pizzanın masalara vardığı an (bkz. ofis sohbeti). */
const PIZZA_AT = 560;

export function Desk({ scale, onOpenPc, onOpenPhone }: DeskProps) {
  const dayIndex = useGameStore((s) => s.currentDayIndex);
  const minutes = useGameStore((s) => s.workdayMinutes);
  const desk = useGameStore((s) => s.desk);
  const phone = useGameStore((s) => s.phone);
  const unread = useGameStore((s) => s.phoneUnread);
  const activeEvent = useGameStore((s) => s.activeEvent);
  const mailRead = useGameStore((s) => s.mailRead);
  const extraMails = useGameStore((s) => s.extraMails);
  const ringingCaller = useGameStore((s) => (s.desk.ringing ? (callFor(s, s.desk.ringing)?.caller ?? null) : null));
  const pickUpCall = useGameStore((s) => s.pickUpCall);
  const drinkCoffee = useGameStore((s) => s.drinkCoffee);
  const waterFlower = useGameStore((s) => s.waterFlower);
  const visitCooler = useGameStore((s) => s.visitCooler);
  const clearDeskItem = useGameStore((s) => s.clearDeskItem);
  const eatPizza = useGameStore((s) => s.eatPizza);
  // mesaiye başlamadan hiçbir şey zaman almaz, bu yüzden hiçbir şey ne kadar sürdüğünü söylemez
  const shiftStarted = useGameStore((s) => s.shiftStarted);
  const mins = (n: number) => (shiftStarted ? ` (${n} dk)` : '');

  const day = days[dayIndex];
  const unreadTotal = Object.values(unread).reduce((a, b) => a + b, 0);
  const unreadMail = inbox(dayIndex, minutes, extraMails).filter((m) => !mailRead.includes(m.id)).length;
  const powerOut = activeEvent?.kind === 'power';
  const flower = flowerState(dayIndex, desk.lastWatered);
  const orchidHere = desk.flower && dayIndex === MONDAY;
  // günün nerede başladığının söylenmesi yalnızca ilk sabah gerekir
  const firstClockIn = !shiftStarted && dayIndex === MONDAY;

  const [thought, setThought] = useState<string | null>(null);
  const [flowerOpen, setFlowerOpen] = useState(false);
  const [drawerShake, setDrawerShake] = useState(0);
  // masa lambası hava kararınca kendiliğinden yanar; iki yöne de çevirebilirsin
  const [lampChoice, setLampChoice] = useState<boolean | null>(null);
  const lampOn = lampChoice ?? minutes >= 450;

  // yeni bir mesaj telefonu masada titretir (bildirimin kendisi başka yerde görünür)
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

  // oda saat beşe doğru kararır; içindeki ışık monitör ve lamba olur
  const dusk = Math.max(0, Math.min(1, (minutes - 420) / 120));
  const stageStyle = {
    width: STAGE_W,
    height: STAGE_H,
    transform: `translate(-50%, -50%) scale(${scale})`,
    '--dusk': dusk.toFixed(3),
  } as CSSProperties;

  // haftanın masada bıraktıkları (her sabah belirlenir, böylece bir not gün ortasında kaybolmaz)
  const [morningExtras] = useState(() => deskExtras({ dayIndex, cleared: desk.cleared }));
  // mutfaktaki Emre sürprizinden dönünce boş tabağın da seninle geldi
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

        {/* ── duvarda ── */}
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

        {/* ── masanın çevresindeki ofis, halının üstünde duran ── */}
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

        {/* ── masanın arkası ── */}
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

        {/* Perşembe ekip geç kalır: Emre 17:20'de her masaya bir pizza kutusu bırakır */}
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

        {/* hoş geldin orkidesi ilk sabaha ait: Salı'dan itibaren biri onu kaldırmış */}
        {orchidHere && (
          <button className={`${styles.obj} ${styles.orchid}`} data-label={flower === 'fresh' ? 'Hoş geldin orkidesi' : 'Orkide · su istiyor'} aria-label={flower === 'fresh' ? 'Hoş geldin orkidesi' : 'Orkide · su istiyor'} onClick={() => setFlowerOpen((v) => !v)}>
            <OrchidArt state={flower} />
          </button>
        )}

        <button
          className={`${styles.obj} ${styles.monitor} ${firstClockIn ? styles.beckon : ''}`}
          data-label={firstClockIn ? 'Güne başla · bilgisayara geç' : 'Bilgisayar'}
          aria-label={firstClockIn ? 'Güne başla: bilgisayara geç' : 'Bilgisayar'}
          data-key="b"
          aria-keyshortcuts="B"
          onClick={onOpenPc}
          disabled={powerOut}
        >
          <MonitorArt />
          <div className={`${styles.screen} ${powerOut ? styles.screenOff : ''}`}>
            {!powerOut && (
              // bilgisayarın kendi masaüstü, sandalyenden göründüğü gibi
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
                    <i className={styles.miniSheet}>≡</i>Adaylar_FINAL_v7
                  </span>
                  <span>
                    <i className={styles.miniTest}>✎</i>Değerlendirme
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

        {/* ── masanın önü ── */}
        <button
          className={`${styles.obj} ${styles.landline} ${ringingCaller ? styles.ringing : ''}`}
          data-label={ringingCaller ? `${ringingCaller} arıyor — aç` : 'Masa telefonu'} aria-label={ringingCaller ? `${ringingCaller} arıyor — aç` : 'Masa telefonu'}
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
        <button className={`${styles.obj} ${styles.mug}`} data-label={desk.coffee > 0 ? 'Kahve · bir yudum' : `Boş kupa · mutfakta doldur${mins(REFILL_MINUTES)}`} data-key="k" aria-keyshortcuts="K" aria-label={desk.coffee > 0 ? 'Kahve · bir yudum' : `Boş kupa · mutfakta doldur${mins(REFILL_MINUTES)}`} onClick={() => think(drinkCoffee())}>
          <MugArt sips={desk.coffee} max={COFFEE_SIPS} />
        </button>
        <button key={buzz?.id ?? 'phone'} className={`${styles.obj} ${styles.mobile} ${buzz ? styles.buzzing : ''}`} data-label="Cep telefonu" aria-label="Cep telefonu" data-key="t" aria-keyshortcuts="T" onClick={() => onOpenPhone(buzz?.thread ?? null)}>
          <MobileArt lit={!!buzz || unreadTotal > 0} unread={unreadTotal} />
        </button>

        {/* ── masanın altı ── */}
        <button
          key={`drawer-${drawerShake}`}
          className={`${styles.obj} ${styles.pedestal} ${drawerShake ? styles.rattle : ''}`}
          data-label="Sol alt çekmece" aria-label="Sol alt çekmece"
          data-key="ç"
          aria-keyshortcuts="Ç"
          onClick={() => {
            setDrawerShake((n) => n + 1);
            think(DRAWER_THOUGHT);
          }}
        >
          <PedestalArt />
        </button>

        {/* ışık: gün ışığı solar, monitör ve lamba devralır */}
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

/** Masanın üstündeki bir şey klavyeyi tutuyor: bir pencere, bilgisayar, bir metin alanı. */
function deskBusy(root: HTMLElement, e: KeyboardEvent) {
  if (root.closest('[inert]')) return true;
  const t = e.target as HTMLElement | null;
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return true;
  // gerçekten görünen bir pencere: geniş ekranda gizlenen döndürme ipucu değil,
  // masanın arkasında açık bırakılmış bilgisayar penceresi de değil (masadayken onun katmanı etkisiz)
  return [...document.querySelectorAll('[role="dialog"]')].some((d) => d.getClientRects().length > 0 && !root.contains(d) && !d.closest('[inert]'));
}

/**
 * Masanın kısayolları: B bilgisayar, T cep telefonu, H sabit hat, K kahve, Ç çekmece. Her düğme
 * tuşunu adlandırır (data-key); liste ayarlar panelinde. Türkçe klavyeler ç yazar; başka yerlerde
 * C aynı işi yapar.
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

/** Ok tuşları masadaki şeyler arasında gezer: o yöndeki en yakın şeye. */
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
    // tam karşıdaki yandakini yener; 45°'lik koninin dışındaki ancak içinde hiçbir şey yoksa
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
