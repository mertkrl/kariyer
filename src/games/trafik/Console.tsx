import { useState, type CSSProperties, type ReactNode } from 'react';
import { allRedAt, amberAt, DIRS, legOf, LIMITS, turnOf, type Dir, type MoveId, type Plan } from './model';
import { queueOf, type SideRule, type Sim } from './sim';
import { lightName, untilGreen } from './engineer';
import ui from './Console.module.css';
import lt from './Lights.module.css';
import inst from './Instruments.module.css';

/*
 * Kontrol paneli: trafik kontrol merkezinin masası, küçük ve sade. Solda kalan süre, durdur ve
 * hız; ortada seçili kavşağın ışıkları, alanın tamamını kaplar. Her ışık kartı
 * kendi ayarlarını taşır: basılabilen ışık kafası (yeşil lamba yeşili o yollara getirir, sarı lamba
 * yanan yeşili bitirir, kırmızı lamba ışığı kırmızıda tutar) ve üç süresi: yeşil, sarı ve söndükten
 * sonra kavşağın boşalması için "hepsi kırmızı".
 */

/** Panelin bir bölümü: üstünde kazınmış gibi küçük başlık, köşelerde vida. */
export function Bay({ title, label, note, className, children, ...rest }: { title?: string; label?: string; note?: string; className?: string; children: ReactNode; 'data-hide'?: boolean; 'data-tour'?: string }) {
  return (
    <section className={`${ui.bay} ${className ?? ''}`} aria-label={title ?? label} {...rest}>
      {title && (
        <header className={ui.bayHead}>
          <b>{title}</b>
          {note && <small>{note}</small>}
        </header>
      )}
      {children}
    </section>
  );
}

const clampTo = (v: number, [a, b]: readonly [number, number]) => Math.max(a, Math.min(b, v));

/** Süre ayarı: üstte adı, altında − değer +. */
function Stepper({ label, value, range, onChange, tone, title }: { label: string; value: number; range: readonly [number, number]; onChange: (v: number) => void; tone: 'g' | 'a' | 'r'; title: string }) {
  const set = (v: number) => onChange(clampTo(v, range));
  return (
    <div className={`${lt.stepper} ${lt[`step_${tone}`]}`} title={title}>
      <span className={lt.stepName}>{label}</span>
      <span className={lt.stepBox}>
        <button type="button" onClick={() => set(value - 1)} disabled={value <= range[0]} aria-label={`${label}: bir saniye kısalt`}>
          −
        </button>
        <b key={value} className={lt.bump} aria-live="polite">
          {value}
          <small>sn</small>
        </b>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= range[1]} aria-label={`${label}: bir saniye uzat`}>
          +
        </button>
      </span>
    </div>
  );
}

/** Işığı bekleyen araçlar: en çok sekiz küçük araba, bekledikçe yeşilden kırmızıya döner. */
function Queue({ sim, moves }: { sim: Sim; moves: MoveId[] }) {
  const legs = DIRS.filter((d) => moves.some((m) => turnOf(m) !== 'P' && legOf(m) === d));
  const qs = legs.map((d) => queueOf(sim, d));
  const n = qs.reduce((m, q) => m + q.n, 0);
  const wait = Math.max(0, ...qs.map((q) => q.wait));
  const tone = wait > 40 ? lt.carBad : wait > 20 ? lt.carWarn : lt.carOk;
  return (
    <span className={lt.queue} title={`${n} araç bekliyor · en uzun ${Math.round(wait)} sn`} aria-label={`${n} araç bekliyor`}>
      {Array.from({ length: Math.min(8, n) }, (_, k) => (
        <i key={k} className={tone} />
      ))}
      {n > 8 && <small>+{n - 8}</small>}
      {n === 0 && <small className={lt.empty}>boş</small>}
    </span>
  );
}

/**
 * Işık kartları: her biri birlikte yeşil yanan yolların ışığı. Üstte basılabilen ışık kafası
 * (yeşil: yeşili buraya getir, sarı: yanan yeşili bitir, kırmızı: kırmızıda tut, sırası gelince
 * atla), yanında yolların adı ve ışığın hâli; altta yeşil süresi ve "Yeşil kalsın".
 */
export function LightCards({
  sim,
  onPlan,
  onGreen,
  onAmber,
  onRed,
  onHold,
  onPoint,
}: {
  sim: Sim;
  onPlan: (p: Plan) => void;
  onGreen: (i: number) => void;
  onAmber: (i: number) => void;
  onRed: (i: number) => void;
  onHold: (i: number) => void;
  /** Kartın üstüne gelinince (ya da odaklanınca) o ışığın yolları haritada parlasın. */
  onPoint?: (i: number | null) => void;
}) {
  const { ctl, plan } = sim;
  const fault = sim.fault > sim.t;
  const live = sim.t > 0 && !sim.done && !fault;
  const onCount = plan.phases.filter((p) => !p.off).length;
  // her ışığın kendi süreleri: yeşil, sarı ve söndükten sonra "hepsi kırmızı"
  const setPhase = (i: number, patch: Partial<Plan['phases'][number]>) => onPlan({ ...plan, phases: plan.phases.map((p, k) => (k === i ? { ...p, ...patch } : p)) });
  // basılan lambadan yayılan dalga: her basışta yeniden başlar
  const [press, setPress] = useState<{ key: string; n: number }>({ key: '', n: 0 });
  const tap = (key: string, f: () => void) => () => {
    setPress((x) => ({ key, n: x.n + 1 }));
    f();
  };
  const ripple = (key: string) => press.key === key && <span key={press.n} className={lt.ripple} aria-hidden="true" />;
  return (
    <div className={lt.cards} role="list" aria-label={`${sim.name}: ışıklar`}>
      {plan.phases.map((p, i) => {
        const active = ctl.phase === i && !fault;
        const light = fault ? 'amber' : active ? (ctl.stage === 'green' ? 'green' : ctl.stage === 'amber' ? 'amber' : 'red') : 'red';
        const green = active && ctl.stage === 'green';
        const chosen = ctl.next === i && !active;
        const name = lightName(sim, i);
        const left = Math.max(0, Math.ceil(p.green + (ctl.bonus ?? 0) - ctl.t));
        const wait = untilGreen(sim, i);
        const state = fault
          ? 'Arıza'
          : p.off && !active
            ? 'Tutuluyor'
            : green
              ? ctl.hold
                ? 'Yeşil · süresiz'
                : ctl.cut
                  ? 'Bitiyor'
                  : `Yeşil · ${left} sn`
              : active
                ? ctl.stage === 'amber'
                  ? 'Sarı'
                  : 'Hepsi kırmızı'
                : chosen
                  ? 'Sırada'
                  : wait === null
                    ? 'Kırmızı'
                    : `Yeşile ${Math.ceil(wait)} sn`;
        const lastOn = !p.off && onCount <= 1;
        // yanan yeşilin kalan payı: lambanın çevresindeki halka bununla kapanır
        const ring = green && !ctl.hold ? Math.max(0, Math.min(1, left / Math.max(1, p.green + (ctl.bonus ?? 0)))) : null;
        const passed = p.moves.reduce((m, mv) => m + (turnOf(mv) === 'P' ? 0 : (sim.byMove[mv]?.n ?? 0)), 0);
        // durum etiketinin rengi: ışığın şu anki rengi; sıradaki ve kırmızıda tutulan ayrı
        const tone = fault || light === 'amber' ? 'a' : p.off && !active ? 'off' : light === 'green' ? 'g' : chosen ? 'next' : 'r';
        return (
          <article
            key={i}
            role="listitem"
            className={`${lt.card} ${active ? lt[`card_${light}`] : ''} ${chosen ? lt.cardNext : ''} ${p.off ? lt.modOff : ''}`}
            onPointerEnter={() => onPoint?.(i)}
            onPointerLeave={() => onPoint?.(null)}
            onFocus={() => onPoint?.(i)}
            onBlur={() => onPoint?.(null)}
          >
            <div className={lt.modHead}>
              <b className={lt.modName} title={name}>
                {name}
              </b>
              <Queue sim={sim} moves={p.moves} />
              <span key={passed} className={lt.passed} title="Bu ışıktan geçen araç">
                ✓ {passed}
              </span>
            </div>
            <div className={lt.modTop}>
              <div className={lt.signal} role="group" aria-label={`${name}: ışık`}>
                <button type="button" className={`${lt.lamp} ${lt.lampR} ${light === 'red' ? lt.lampOn : ''} ${p.off ? lt.lampLock : ''}`} disabled={!live || lastOn} onClick={tap(`${i}r`, () => onRed(i))} title={p.off ? 'Yeniden sıraya al' : lastOn ? 'Bütün ışıklar kırmızıda tutulamaz' : 'Kırmızıda tut: sırası gelince atlanır'} aria-label={p.off ? 'Yeniden sıraya al' : 'Kırmızıda tut'}>
                  {ripple(`${i}r`)}
                </button>
                <button type="button" className={`${lt.lamp} ${lt.lampA} ${light === 'amber' ? lt.lampOn : ''}`} disabled={!live || !green || ctl.cut} onClick={tap(`${i}a`, () => onAmber(i))} title="Yeşili bitir: önce sarı, sonra kırmızı" aria-label="Yeşili bitir">
                  {ripple(`${i}a`)}
                </button>
                <button type="button" className={`${lt.lamp} ${lt.lampG} ${light === 'green' ? lt.lampOn : ''} ${ring !== null ? lt.ring : ''}`} style={ring !== null ? ({ '--p': ring } as CSSProperties) : undefined} disabled={!live || green || chosen} onClick={tap(`${i}g`, () => onGreen(i))} title="Yeşili hemen bu yollara getir" aria-label="Yeşil yak">
                  {ripple(`${i}g`)}
                </button>
              </div>
              <span className={`${lt.chip} ${lt[`chip_${tone}`]}`} title={p.off && !active ? 'Kırmızıda tutuluyor: sırası gelince atlanır' : undefined}>
                {state}
              </span>
              <button type="button" className={`${lt.holdKey} ${green && ctl.hold ? lt.holdOn : ''}`} disabled={!live || !green} onClick={() => onHold(i)} title={ctl.hold ? 'Işık kendi süresiyle çalışmaya dönsün' : 'Süre dolsa da yeşil yanmaya devam etsin'}>
                {green && ctl.hold ? 'Normale dön' : 'Yeşil kalsın'}
              </button>
            </div>
            <div className={lt.modFoot}>
              <Stepper label="Yeşil" tone="g" value={p.green} range={LIMITS.green} onChange={(v) => setPhase(i, { green: v })} title="Her turda kaç saniye yeşil yanacak" />
              <Stepper label="Sarı" tone="a" value={amberAt(plan, i)} range={LIMITS.amber} onChange={(v) => setPhase(i, { amber: v })} title="Yeşilden sonra kaç saniye sarı yanacak: sürücüye dur uyarısı" />
              <Stepper label="Hepsi kırmızı" tone="r" value={allRedAt(plan, i)} range={LIMITS.allRed} onChange={(v) => setPhase(i, { allRed: v })} title="Bu ışık söndükten sonra bütün yollar kaç saniye kırmızıda bekleyecek: kavşağın ortası boşalsın" />
            </div>
          </article>
        );
      })}
    </div>
  );
}

/** Akıllı mod: kavşak sabit süre yerine yoldaki araca bakarak çalışır (dedektör). */
export function SmartSwitch({ sim, onPlan }: { sim: Sim; onPlan: (p: Plan) => void }) {
  const on = !!sim.plan.actuated;
  return (
    <button type="button" role="switch" aria-checked={on} className={`${inst.mode} ${on ? inst.modeOn : ''}`} onClick={() => onPlan({ ...sim.plan, actuated: !on })} title="Akıllı mod: yoldaki araca bakar; boş yola yeşil yakmaz, araç gelmeyince yeşili erken bitirir.">
      <span className={!on ? inst.speedOn : undefined}>Sabit süre</span>
      <span className={on ? inst.speedOn : undefined}>Akıllı mod</span>
    </button>
  );
}

/** Yol anahtarları: her kol için korumalı açma/kapama anahtarı ve kırmızı lamba. */
export function RoadSwitches({ sim, onToggle }: { sim: Sim; onToggle: (d: Dir) => void }) {
  const legs = DIRS.filter((d) => sim.j.legs[d]);
  return (
    <Bay label="Yollar" className={inst.roads}>
      <ul className={ui.switches}>
        {legs.map((d) => {
          const closed = !!sim.closed[d];
          const link = sim.links[d];
          const q = queueOf(sim, d);
          return (
            <li key={d}>
              <button type="button" role="switch" aria-checked={closed} className={`${ui.toggle} ${closed ? ui.toggleOn : ''}`} onClick={() => onToggle(d)} aria-label={`${sim.spec.legs[d]!.name}: ${closed ? 'kapalı, aç' : 'açık, kapat'}`}>
                <i />
              </button>
              <span className={ui.swName}>
                {sim.spec.legs[d]!.name}
                <small>
                  {closed ? 'Kapalı' : 'Açık'} · {link ? `${link.sim.name} yönü` : `${q.n} araç bekliyor`}
                </small>
              </span>
              <i className={`${ui.swLamp} ${closed ? ui.swLampOn : ''}`} aria-hidden="true" />
            </li>
          );
        })}
      </ul>
    </Bay>
  );
}

const RULES: [SideRule, string, string][] = [
  ['yield', 'Yol ver', 'Boşluk kollayıp katılırlar; çok bekleyen araya dalabilir'],
  ['stop', 'Dur', 'Tam durup uzun bakarlar; araya dalan olmaz ama sokak yavaş boşalır'],
  ['closed', 'Kapalı', 'Ağız kapalı: buradan çıkacaklar başka sokaklardan dolaşır'],
];

/** Işıksız ara sokaklar: ağızdaki kural (yol ver, dur, kapalı) ve bekleyenler. */
export function SideSwitches({ sim, onRule }: { sim: Sim; onRule: (i: number, r: SideRule) => void }) {
  const list = sim.sides.map((x, i) => ({ x, i })).filter(({ x }) => x.side === 1);
  return (
    <Bay label="Sokaklar" className={inst.roads}>
      {!list.length && <p className={ui.swEmpty}>Bu kavşağa çıkan ara sokak yok.</p>}
      <ul className={ui.switches}>
        {list.map(({ x, i }) => {
          const wait = x.queue.length ? Math.round(sim.t - x.queue[0].born) : 0;
          return (
            <li key={i} className={ui.sideRow}>
              <span className={ui.swName}>
                {x.name}
                <small>
                  {sim.spec.legs[x.leg]!.name} yolu · {x.rule === 'closed' ? 'kapalı' : x.queue.length ? `${x.queue.length} araç · ${wait} sn` : 'bekleyen yok'}
                </small>
              </span>
              <span className={ui.rules} role="radiogroup" aria-label={`${x.name}: ağızdaki kural`}>
                {RULES.map(([r, name, title]) => (
                  <button key={r} type="button" role="radio" aria-checked={x.rule === r} className={x.rule === r ? ui.ruleOn : undefined} data-rule={r} title={title} onClick={() => onRule(i, r)}>
                    {name}
                  </button>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
    </Bay>
  );
}

/** Kavşak seçici: ışıklı tuşlar; tuşun LED'i o kavşaktaki en uzun bekleyişe göre yanar. */
export function NodeKeys({ sims, selected, onSelect }: { sims: Sim[]; selected: number; onSelect: (i: number) => void }) {
  return (
    <div className={ui.nodeKeys} role="tablist" aria-label="Kavşaklar">
      {sims.map((s, i) => {
        const wait = Math.max(0, ...DIRS.filter((d) => s.j.legs[d] && !s.links[d]).map((d) => queueOf(s, d).wait));
        const tone = wait > 60 ? ui.ledBad : wait > 30 ? ui.ledWarn : ui.ledOk;
        const live = s.incidents.some((x) => x.cleared === undefined) || s.cars.some((c) => c.kind === 'ambulance' || c.kind === 'police' || c.kind === 'vip');
        return (
          <button key={s.node} type="button" role="tab" aria-selected={i === selected} className={`${ui.nodeKey} ${i === selected ? ui.nodeKeyOn : ''}`} onClick={() => onSelect(i)}>
            <i className={`${ui.nodeLed} ${tone} ${live ? ui.nodeLedBlink : ''}`} aria-hidden="true" />
            <span>
              {i + 1} · {s.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
