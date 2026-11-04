import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audioEngine } from '../../shared/audio/audioEngine';
import type { Level } from './levels';
import { DT, moveName, type Difficulty, type Dir, type MoveId, type Plan } from './model';
import { Bay, LightCards, NodeKeys, RoadSwitches, SideSwitches, SmartSwitch } from './Console';
import ui from './Console.module.css';
import inst from './Instruments.module.css';
import { applyPlan, say, setHold, setSideRule, skipTo, type Report, type Sim } from './sim';
import { setOff } from './controller';
import { createNet, netLog, netReport, nodeX, setClosed, stepNet, type Net } from './net';
import { Scene } from './Scene';
import { clampCam, ZOOM_MIN, type Camera } from './camera';
import { IncidentCards } from './Incidents';
import { greenWave, lightName } from './engineer';
import { Help } from './Help';
import { WaveBay } from './Wave';
import { Tour, type TourState } from './Tour';
import { Patience, type Sample } from './Hud';
import { queueOf } from './score';
import { citySound, type CitySound } from './citySound';
import { Tutanak } from './Tutanak';
import styles from './TrafikGame.module.css';

/*
 * Bir bölüm: cadde (bir ya da birkaç kavşak) ekranı kaplar, altta küçük kontrol paneli. Panel seçili
 * kavşağı yönetir: kavşak sekmeleri ve akıllı mod, ışık kartları (lambaya bas: yeşil yolları açar, sarı
 * yeşili bitirir, kırmızı ışığı kırmızıda tutar; her ışığın yeşili, sarısı ve hepsi kırmızısı kendi
 * kartında), açıldıysa sağda Yollar ve Yeşil dalga. "?" cep kartını açar. Vardiya emri kapanınca trafik
 * kendiliğinden akar; hız 1× ya da 2×. Süre bitince bütün ağın tutanağı gelir. Tanıtımda (`tour`) aynı
 * ekran olaysız ve süresiz açılır, üstünde adım adım tur yürür; tur bitince vardiya emri gelir.
 */

/** Kısa, iki tonlu bir araba kornası: sürücü söylendiğinde ya da konvoy geldiğinde. */
function honk() {
  if (audioEngine.isMuted()) return;
  try {
    const ctx = new AudioContext();
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
    g.connect(ctx.destination);
    for (const f of [392, 494]) {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = f;
      o.connect(g);
      o.start();
      o.stop(ctx.currentTime + 0.34);
    }
    window.setTimeout(() => void ctx.close(), 600);
  } catch {
    // ses yoksa sessiz geçer
  }
}

/**
 * Lambaya basınca kısa bir "tık": yeşil tiz, sarı orta, kırmızı pes. Ses kapalıysa çalmaz.
 */
function blip(freq: number) {
  if (audioEngine.isMuted()) return;
  try {
    const ctx = new AudioContext();
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
    g.connect(ctx.destination);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(freq * 1.25, ctx.currentTime + 0.08);
    o.connect(g);
    o.start();
    o.stop(ctx.currentTime + 0.16);
    window.setTimeout(() => void ctx.close(), 300);
  } catch {
    // ses yoksa sessiz geçer
  }
}

/** Kolun gecikmesinden kaç korna çalar: her 12 saniyede bir, en çok beş. */
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Bir hareketin yeşil yandığı ilk ışık: siren uyarısı oyuncuya hangi ışığa yeşil yakacağını söyler. */
const phaseOf = (sim: Sim, mv: MoveId) => sim.plan.phases.findIndex((p) => p.moves.includes(mv));


/** Ağda ambulans ya da konvoy: hangi kavşakta, hangi yönden. */
function special(net: Net, kinds: string[]) {
  for (const [i, s] of net.sims.entries()) {
    const c = s.cars.find((x) => kinds.includes(x.kind) && x.s < x.path.boxOut);
    if (c) return { i, s, mv: c.mv };
    const k = Object.entries(s.backlog).find(([key, l]) => l.length && kinds.some((x) => key.startsWith(x === 'ambulance' ? 'amb:' : x === 'police' ? 'pol:' : 'vip:')));
    if (k) return { i, s, mv: k[0].slice(4) as MoveId };
  }
  return null;
}
export function Play({
  level,
  diff = 'normal',
  briefing,
  last,
  onNext,
  onRetry,
  tour,
  onTourDone,
}: {
  level: Level;
  diff?: Difficulty;
  briefing: boolean;
  last: boolean;
  onNext: (score: number) => void;
  onRetry: () => void;
  tour?: boolean;
  onTourDone?: () => void;
}) {
  // tanıtımda olay yok, süre bitmez
  const [net] = useState<Net>(() => createNet(tour ? { ...level.spec, events: [], duration: 3600 } : level.spec, diff));
  const [learn, setLearn] = useState<TourState>({ zoomed: false, panned: false, whole: false, green: false, timed: false, paused: false });
  const learned = useCallback((k: keyof TourState) => setLearn((s) => (s[k] ? s : { ...s, [k]: true })), []);
  const [, setTick] = useState(0);
  // vardiya emri yoksa trafik hemen akar; varsa emir kapanınca (aşağıda)
  const [running, setRunning] = useState(!briefing);
  const [speed, setSpeed] = useState(1);
  const [selected, setSelected] = useState(0);
  // dar ekranda panelin tek bölümü görünür: kartlar, süreler ya da yollar
  const [pane, setPane] = useState<'cards' | 'roads' | 'wave' | 'streets'>('cards');
  // geniş ekranda ışıklar hep görünür; sağdaki sütun (açıldıysa) sekmeli: yollar ya da dalga
  const [sideTab, setSideTab] = useState<'roads' | 'wave' | 'streets'>(level.spec.tools.roads ? 'roads' : level.spec.tools.wave ? 'wave' : 'streets');
  // cep kartı açıkken oyun durur; kapanınca kaldığı yerden sürer
  const [help, setHelp] = useState(false);
  const wasRunning = useRef(false);
  // telefonda cadde ekrana sığınca araçlar seçilmez: ilk kavşağa yakın başlar
  const [camera, setCamera] = useState<Camera>(() => {
    const xs0 = level.spec.nodes.map((n) => n.x);
    const narrow = typeof window !== 'undefined' && window.innerWidth <= 760 && xs0.length > 1;
    return narrow ? clampCam({ zoom: 2.2, dx: Math.min(...xs0) - (Math.min(...xs0) + Math.max(...xs0)) / 2, dy: 0 }, xs0) : { zoom: 1, dx: 0, dy: 0 };
  });
  const [result, setResult] = useState<Report | null>(null);
  // üstüne gelinen ışık kartı: yolları haritada parlar
  const [point, setPoint] = useState<number | null>(null);
  const refresh = useCallback(() => setTick((f) => f + 1), []);
  const tools = level.spec.tools;
  const sim = net.sims[selected];
  const xs = useMemo(() => net.sims.map((s) => nodeX(net, s)), [net]);
  // en uzak yakınlık ekrana göre değişir: harita çizdikçe Scene bildirir, kamera yeni sınıra oturur
  const [floor, setFloor] = useState(ZOOM_MIN);
  const onFloor = useCallback(
    (f: number) => {
      setFloor(f);
      setCamera((c) => {
        const n = clampCam(c, xs, f);
        return n.zoom === c.zoom && n.dx === c.dx && n.dy === c.dy ? c : n;
      });
    },
    [xs],
  );
  // tanıtım: kamera hareketleri adımları tamamlar (öğrenilen bir daha unutulmaz, döngü kurmaz)
  if (tour) {
    if (camera.zoom > 1.25 && !learn.zoomed) learned('zoomed');
    if (Math.abs(camera.dx) + Math.abs(camera.dy) > 10 && !learn.panned) learned('panned');
    if (camera.zoom <= floor * 1.001 && floor < 0.99 && !learn.whole) learned('whole');
  }
  // vardiya emri kapanınca trafik kendiliğinden akar
  const [briefed, setBriefed] = useState(briefing);
  if (briefed !== briefing) {
    setBriefed(briefing);
    if (!briefing && net.t === 0) setRunning(true);
  }
  // kayda yeni bir sürücü sesi düştüyse korna çalar
  const heard = useRef('');
  const log = netLog(net);
  const top = log[0];
  useEffect(() => {
    if (!top?.horn) return;
    const id = `${top.at}-${top.t}-${top.text}`;
    if (heard.current === id) return;
    heard.current = id;
    honk();
  }, [top]);
  const lastUi = useRef(0);
  // kuyruk çizelgesi için her iki saniyede bir bütün kollardaki bekleyen
  const samples = useRef<Sample[]>([]);
  // arayüzün gördüğü: son ölçülen toplam kuyruk (şehrin uğultusu) ve bitince bütün çizelge
  const [lastQ, setLastQ] = useState(0);
  const [chart, setChart] = useState<Sample[]>([]);
  const speedRef = useRef(speed);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let prev = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      // sekme arkadayken biriken süreyi tek seferde koşturma
      acc += Math.min(0.25, (now - prev) / 1000) * speedRef.current;
      prev = now;
      while (acc >= DT && !net.done) {
        stepNet(net);
        acc -= DT;
        const last = samples.current[samples.current.length - 1];
        if (!last || net.t - last.t >= 2) {
          let q = 0;
          let leg = '';
          let legQ = -1;
          for (const s of net.sims)
            for (const d of Object.keys(s.j.legs) as Dir[]) {
              const n = queueOf(s, d).n;
              q += n;
              if (n > legQ) {
                legQ = n;
                leg = net.sims.length > 1 ? `${s.name} · ${s.spec.legs[d]!.name}` : s.spec.legs[d]!.name;
              }
            }
          samples.current.push({ t: net.t, q, leg, legQ });
        }
      }
      // arayüz saniyede birkaç kez yenilenir; harita kendi karesini çizer
      if (now - lastUi.current > 180 || net.done) {
        lastUi.current = now;
        setLastQ(samples.current[samples.current.length - 1]?.q ?? 0);
        refresh();
      }
      if (net.done) {
        setRunning(false);
        setChart(samples.current.slice());
        setResult(netReport(net));
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, net, refresh]);

  const openHelp = useCallback(() => {
    setRunning((r) => {
      wasRunning.current = r;
      return false;
    });
    setHelp(true);
  }, []);
  const closeHelp = () => {
    setHelp(false);
    if (wasRunning.current && !net.done) setRunning(true);
  };

  /** Kavşağı seçer; harita yakınsa kamera ona kayar. */
  const select = useCallback(
    (i: number) => {
      setSelected(i);
      setCamera((c) => (c.zoom > 1.05 ? clampCam({ ...c, dx: xs[i] - (xs[0] + xs[xs.length - 1]) / 2 }, xs, floor) : c));
    },
    [xs, floor],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (briefing || result || help || (e.target as HTMLElement).closest('input, textarea')) return;
      if (e.key === '?' || e.key === 'h') openHelp();
      if (e.code === 'Space') {
        e.preventDefault();
        setRunning((r) => {
          if (r) learned('paused');
          return !r && !net.done;
        });
      }
      const n = Number(e.key);
      if (n >= 1 && n <= net.sims.length) select(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [briefing, result, help, net, select, openHelp, learned]);

  const setPlan = (p: Plan) => {
    if (p.phases.some((ph, i) => ph.green !== sim.plan.phases[i]?.green)) learned('timed');
    applyPlan(sim, p);
    refresh();
  };
  // tek dokunuş: başka evreye geç; yanan yeşile dokununca tut, bir daha dokununca bırak
  // ışık kafasının lambaları: yeşil buraya gelsin, yanan yeşil bitsin, ışık kırmızıda kalsın
  const lamps = {
    green: (i: number) => {
      if (sim.plan.phases[i].off) setOff(sim, i, false);
      skipTo(sim, i);
      learned('green');
      blip(880);
      refresh();
    },
    amber: () => {
      skipTo(sim);
      blip(560);
      refresh();
    },
    red: (i: number) => {
      setOff(sim, i, !sim.plan.phases[i].off);
      blip(330);
      refresh();
    },
    hold: () => {
      setHold(sim, !sim.ctl.hold);
      blip(sim.ctl.hold ? 700 : 500);
      refresh();
    },
  };
  const toggle = (d: Dir) => {
    setClosed(sim, d, !sim.closed[d]);
    refresh();
  };
  const wave = () => {
    greenWave(net.sims, xs);
    say(net.sims[0], `Yeşil dalga kuruldu: ${net.sims.length} ışığın döngüsü eşitlendi, ışıklar birkaç turda kayacak.`, 'good');
    refresh();
  };
  const zoomBy = (f: number) => setCamera((c) => clampCam({ ...c, zoom: c.zoom * f }, xs, floor));
  // ⤢: kavşaklar görünümünden bütün haritaya (yolların tamamı ve mahalle), oradan yine kavşaklara
  const whole = camera.zoom <= floor * 1.001 && floor < 0.99;

  // canlı puan: tutanaktaki gecikme kalemi, oyun sürerken
  const live = result ? null : netReport(net);
  // şehrin uğultusu kuyrukla yükselir: son ölçülen toplam kuyruk, kol başına 8 araçta tavan
  const sound = useRef<CitySound | null>(null);
  useEffect(() => {
    sound.current = citySound();
    return () => sound.current?.stop();
  }, []);
  const legs = net.sims.reduce((m, s) => m + Object.keys(s.j.legs).length, 0);
  useEffect(() => {
    sound.current?.set(lastQ / (legs * 8), running && !help);
  }, [lastQ, legs, running, help]);
  const amb = special(net, ['ambulance']);
  const vip = special(net, ['police', 'vip']);
  const multi = net.sims.length > 1;
  const sides = [
    ...(tools.roads ? [['roads', 'Yollar']] : []),
    ...(tools.wave && multi ? [['wave', 'Dalga']] : []),
    ...(net.sims.some((s) => s.sides.some((x) => x.side === 1)) ? [['streets', 'Sokaklar']] : []),
  ] as ['roads' | 'wave' | 'streets', string][];
  // dar ekranda üstteki sekme, genişte sağ sütunun sekmesi seçer
  const shown = pane === 'cards' ? sideTab : pane;

  return (
    <main className={styles.play}>
      <Scene net={net} selected={selected} onSelect={select} camera={camera} onCamera={setCamera} onFloor={onFloor} highlight={point === null ? null : sim.plan.phases[point]?.moves ?? null} />

      {live && !briefing && <Patience r={live} where={live.worstAt && multi ? `${live.worstAt}’da ` : ''} />}

      <div className={styles.topRight}>
        <div className={styles.zoom} data-tour="zoom">
          <button type="button" onClick={() => zoomBy(1.4)} aria-label="Yakınlaştır">
            +
          </button>
          <button type="button" onClick={() => zoomBy(1 / 1.4)} aria-label="Uzaklaştır">
            −
          </button>
          <button
            type="button"
            onClick={() => setCamera({ zoom: whole ? 1 : floor, dx: 0, dy: 0 })}
            aria-label={whole ? 'Kavşaklara dön' : 'Bütün haritayı göster'}
            title={whole ? 'Kavşaklara dön' : 'Bütün harita'}
          >
            ⤢
          </button>
          <button type="button" data-tour="help" className={styles.helpKey} onClick={openHelp} disabled={briefing || !!result} aria-label="Cep kartı: panel ne diyor?" title="Panel ne diyor? (?)">
            ?
          </button>
        </div>
      </div>

      {vip && !amb && (
        <button type="button" className={styles.siren} role="status" onClick={() => select(vip.i)}>
          <i aria-hidden="true" />
          Konvoy {multi ? `${vip.s.name}’da` : 'yolda'} ({moveName(vip.mv)}), ışıkta durmaz: “{lightName(vip.s, phaseOf(vip.s, vip.mv))}” ışığında Yeşil yak, sonra Yeşil kalsın
        </button>
      )}

      {amb && (
        <button type="button" className={styles.siren} role="status" onClick={() => select(amb.i)}>
          <i aria-hidden="true" />
          Ambulans {multi ? `${amb.s.name}’da` : 'yolda'} ({moveName(amb.mv)}): “{lightName(amb.s, phaseOf(amb.s, amb.mv))}” ışığında Yeşil yak
        </button>
      )}

      <ol className={styles.log} aria-live="polite">
        {log.slice(0, 2).map((l) => (
          <li key={`${l.at}-${l.t}-${l.text}`} className={styles[l.tone]}>
            <time>{clock(l.t)}</time> {l.at && <b>{l.at}: </b>}
            {l.text}
          </li>
        ))}
        {!log.length && <li className={styles.info}>{level.tip}</li>}
      </ol>

      <IncidentCards sims={net.sims} onSend={refresh} onSelect={select} />

      <section className={styles.console} aria-label="Kontrol konsolu">
        <div className={ui.desk}>
          <Bay label="Durum" className={ui.cluster} data-tour="clock">
            <div className={inst.flight}>
              <p className={`${inst.clock} ${level.spec.duration - net.t < 15 && !net.done ? inst.hurry : ''}`} aria-label="Kalan süre">
                <b>{tour ? clock(net.t) : clock(Math.max(0, level.spec.duration - net.t))}</b>
                <small>{tour ? 'tanıtım' : 'kalan'}</small>
              </p>
              <div className={inst.flightRow}>
                <button type="button" className={`${inst.run} ${running ? '' : inst.paused}`} disabled={net.done || briefing} onClick={() => {
                    if (running) learned('paused');
                    setRunning(!running);
                  }}
                  aria-label={running ? 'Duraklat' : 'Sürdür'}
                >
                  {running ? '❚❚' : '▶'}
                </button>
                <button type="button" role="switch" aria-checked={speed === 2} className={`${inst.speed} ${speed === 2 ? inst.fast : ''}`} onClick={() => setSpeed(speed === 1 ? 2 : 1)} aria-label={`Hız ${speed}×, değiştir`}>
                  <span className={speed === 1 ? inst.speedOn : undefined}>1×</span>
                  <span className={speed === 2 ? inst.speedOn : undefined}>2×</span>
                </button>
              </div>
            </div>
          </Bay>

          {sides.length > 0 && (
            <div className={styles.panes} role="tablist" aria-label="Konsol">
              {([['cards', 'Işıklar'], ...sides] as ['cards' | 'roads' | 'wave' | 'streets', string][]).map(([k, name]) => (
                <button key={k} type="button" role="tab" aria-selected={pane === k} className={pane === k ? styles.paneOn : undefined} onClick={() => setPane(k)}>
                  {name}
                </button>
              ))}
            </div>
          )}

          <Bay label={multi ? `Işıklar · ${sim.name}` : 'Işıklar'} className={ui.center} data-hide={pane !== 'cards'} data-tour="cards">
            {(multi || tools.detect) && (
              <div className={ui.lightsBar}>
                {multi && <NodeKeys sims={net.sims} selected={selected} onSelect={select} />}
                {tools.detect && <SmartSwitch sim={sim} onPlan={setPlan} />}
              </div>
            )}
            <LightCards sim={sim} onPlan={setPlan} onGreen={lamps.green} onAmber={lamps.amber} onRed={lamps.red} onHold={lamps.hold} onPoint={setPoint} />
          </Bay>

          {sides.length > 0 && (
            <div className={styles.side} data-hide={pane === 'cards'}>
              {multi && pane !== 'cards' && <NodeKeys sims={net.sims} selected={selected} onSelect={select} />}
              {sides.length > 1 && (
                <div className={ui.sideTabs} role="tablist" aria-label="Panelin sağı">
                  {sides.map(([k, name]) => (
                    <button key={k} type="button" role="tab" aria-selected={shown === k} className={shown === k ? ui.sideTabOn : undefined} onClick={() => setSideTab(k)}>
                      {name}
                    </button>
                  ))}
                </div>
              )}
              {shown === 'roads' && <RoadSwitches sim={sim} onToggle={toggle} />}
              {shown === 'wave' && <WaveBay sims={net.sims} xs={xs} onWave={wave} />}
              {shown === 'streets' && (
                <SideSwitches
                  sim={sim}
                  onRule={(i, r) => {
                    setSideRule(sim, i, r);
                    blip(r === 'yield' ? 700 : 420);
                    refresh();
                  }}
                />
              )}
            </div>
          )}
        </div>
      </section>

      {!briefing && !running && !result && net.t > 0 && (
        <p className={styles.paused}>
          Durdu. Sürdürmek için <b>▶</b> ya da boşluk.
        </p>
      )}

      {help && <Help tools={tools} onClose={closeHelp} />}

      {tour && onTourDone && !help && <Tour state={learn} onDone={onTourDone} />}

      {result && <Tutanak level={level} result={result} diff={diff} last={last} onNext={onNext} onRetry={onRetry} samples={chart} />}
    </main>
  );
}
