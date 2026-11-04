import { FLOOR_STEP, FLOOR_SECONDS, doneOf, floorStepAt, karkasAt, stageAt, type Plan } from './data';
import { clamp, FLOOR_H, GROUND, LEFT, PIT, WIDTH } from './geo';
import { BrickTruck, DumpTruck, Excavator, LiftTruck, MixerTruck, PumpTruck } from './Machines';
import { INK } from './ink';
import s from './Scene.module.css';

/*
 * Şantiye: makineler, malzeme, çit ve tabela. İnsan çalışmaz, işi makineler yapar: kepçe ve
 * damperli kazar, pompa döker, vinç taşır, sepetli platform cepheyi gezer. Her şey iş saatine (`w`)
 * göre gelir gider; şantiye dururken (`working` false) makineler susar. Kıpırtılar CSS'tedir.
 * Vinç maketteki gibi kızıl kahve kafes; her şeyin çevresi mürekkeptir.
 */

/** Vincin kızıl kahve boyası (giriş ekranındaki maketin vinci). */
const CRANE = '#9b4a2c';

const PILE = 905;
/** Beton pompasının arka ucu (hazne) ve kolunun dibi: binanın sağında. */
const PUMP_X = 880;
const BOOM_BASE = PUMP_X - 60;
/** Sepetli platform aracının yeri: binanın sağında. */
const LIFT_X = 800;

/** Vincin taşıdığı yük: demir demeti, kalıp tahtası ya da tuğla paleti. */
export type CraneLoad = 'rebar' | 'form' | 'brick' | null;

/** Vinç yere göre yerleşimi: çizim aynalanır, direk binanın solunda durur. */
const CRANE_MIRROR = 1137;
const MAST_TOP = 118;
/** Kancanın yerden yük aldığı ve bıraktığı nokta (dünya x'i) ve yükün altı (bom kancası hizasında). */
const PICK_X = 345;
const DROP_X = 500;
const LOAD_BOTTOM = MAST_TOP + 110;

function Load({ kind }: { kind: Exclude<CraneLoad, null> }) {
  if (kind === 'rebar')
    return (
      <g stroke="#6b4a36" strokeWidth="2">
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1="-24" y1={MAST_TOP + 100 + i * 3} x2="24" y2={MAST_TOP + 99 + i * 3} />
        ))}
      </g>
    );
  if (kind === 'form')
    return (
      <g>
        {[0, 1, 2].map((i) => (
          <rect key={i} x="-26" y={MAST_TOP + 98 + i * 4} width="52" height="4" fill="#c9a35c" stroke={INK} strokeWidth="0.9" />
        ))}
      </g>
    );
  return (
    <g>
      <rect x="-20" y={MAST_TOP + 96} width="40" height="12" fill="url(#ins-brick)" stroke={INK} strokeWidth="1.2" />
      <rect x="-22" y={MAST_TOP + 108} width="44" height="3" fill="#a87a4a" stroke={INK} strokeWidth="0.9" />
    </g>
  );
}

/**
 * Kafes kule vinç: direk, bom, karşı ağırlık, kabin. Yük varsa döngü şöyledir: kanca yere iner,
 * yükü alır, kalkar; araba bom boyunca binaya gider; kanca çalışılan kata iner, yükü bırakır;
 * geri döner. `drop`: bırakma kotunun yükün asılı hâline göre aşağı mesafesi.
 */
function Crane({ load, drop }: { load: CraneLoad; drop: number }) {
  const mastTop = MAST_TOP;
  const vars = { '--pick': CRANE_MIRROR - PICK_X, '--put': CRANE_MIRROR - DROP_X, '--ground': GROUND - LOAD_BOTTOM, '--drop': drop } as Record<string, number>;
  return (
    <g style={vars}>
      {/* vinç temeli: ankraj bulonlu beton blok */}
      <rect x="806" y={GROUND - 10} width="62" height="14" fill="#b8b1a6" stroke={INK} strokeWidth="1.6" />
      <rect x="822" y={GROUND - 14} width="30" height="5" fill="#5d5650" stroke={INK} strokeWidth="1" />
      {[826, 846].map((x) => (
        <rect key={x} x={x} y={GROUND - 17} width="3" height="4" fill="#3a362f" />
      ))}
      <rect x="828" y={mastTop} width="18" height={GROUND - 12 - mastTop} fill={CRANE} opacity="0.18" />
      <g stroke={CRANE} strokeWidth="1.8" fill="none">
        <line x1="828" y1={mastTop} x2="828" y2={GROUND - 12} stroke={INK} strokeWidth="3.6" />
        <line x1="846" y1={mastTop} x2="846" y2={GROUND - 12} stroke={INK} strokeWidth="3.6" />
        <line x1="828" y1={mastTop} x2="828" y2={GROUND - 12} strokeWidth="2.2" />
        <line x1="846" y1={mastTop} x2="846" y2={GROUND - 12} strokeWidth="2.2" />
        {Array.from({ length: 24 }, (_, i) => (
          <path key={i} d={`M828 ${mastTop + i * 16.5} L846 ${mastTop + 8 + i * 16.5} L828 ${mastTop + 16.5 + i * 16.5}`} />
        ))}
      </g>
      <path d={`M837 ${mastTop - 40} L828 ${mastTop - 6} L846 ${mastTop - 6}Z`} fill="none" stroke={CRANE} strokeWidth="2.6" strokeLinejoin="round" />
      <line x1="837" y1={mastTop - 40} x2="600" y2={mastTop - 4} stroke={INK} strokeWidth="1" />
      <line x1="837" y1={mastTop - 40} x2="930" y2={mastTop - 4} stroke={INK} strokeWidth="1" />
      {/* bom ve karşı bom */}
      <rect x="600" y={mastTop - 8} width="330" height="10" fill="none" stroke={INK} strokeWidth="3.4" />
      <rect x="600" y={mastTop - 8} width="330" height="10" fill="none" stroke={CRANE} strokeWidth="2" />
      <path d={`M600 ${mastTop - 8} ${Array.from({ length: 22 }, (_, i) => `L${606 + i * 15} ${i % 2 ? mastTop - 8 : mastTop + 2}`).join(' ')}`} stroke={CRANE} strokeWidth="1.6" fill="none" strokeLinejoin="round" />
      <rect x="892" y={mastTop + 2} width="34" height="22" fill="#a9a196" stroke={INK} strokeWidth="1.6" />
      <path d={`M892 ${mastTop + 9}h34M892 ${mastTop + 16}h34`} stroke={INK} strokeWidth="0.9" />
      <rect x="846" y={mastTop - 2} width="20" height="20" fill="#e6dfcf" stroke={INK} strokeWidth="1.6" />
      <rect x="850" y={mastTop + 2} width="12" height="9" fill="#3a4650" stroke={INK} strokeWidth="0.8" />
      {/* araba, halat ve kanca */}
      <g className={load ? s.trolleyWork : s.trolley}>
        <rect x="-8" y={mastTop + 2} width="16" height="5" fill="#5d5853" stroke={INK} strokeWidth="1" />
        <line className={load ? s.ropeWork : s.rope} x1="0" y1={mastTop + 7} x2="0" y2={mastTop + 90} stroke="#3a362f" strokeWidth="1.2" />
        <g className={load ? s.hookWork : s.hook}>
          <path d={`M-4 ${mastTop + 88} h8 v3 l-4 6 l-4 -6 Z`} fill="#e0b12d" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
          {load && (
            <g className={s.loadWork}>
              <line x1="0" y1={mastTop + 96} x2="-18" y2={mastTop + 99} stroke="#3a362f" strokeWidth="0.8" />
              <line x1="0" y1={mastTop + 96} x2="18" y2={mastTop + 99} stroke="#3a362f" strokeWidth="0.8" />
              <Load kind={load} />
            </g>
          )}
        </g>
      </g>
    </g>
  );
}

export function Site({ plan, w, working, night }: { plan: Plan; w: number; working: boolean; night: boolean }) {
  const { floors } = plan;
  const stage = stageAt(plan, w);
  const dig = doneOf(plan, w, 'hafriyat');
  const found = doneOf(plan, w, 'temel');
  const karkas = doneOf(plan, w, 'karkas');
  const walls = doneOf(plan, w, 'duvar');
  const paint = doneOf(plan, w, 'siva');
  const windows = doneOf(plan, w, 'pencere');
  const done = doneOf(plan, w, 'teslim');
  const fs = floorStepAt(plan, w);
  const height = Math.min(floors, Math.ceil(clamp((w - karkasAt(plan)) / FLOOR_SECONDS / floors) * floors));
  const top = GROUND - FLOOR_H * Math.max(1, height);
  // döküm anları: temelin ikinci yarısı ve her katın döküm adımı
  const pouring = (found > 0.45 && found < 1) || fs?.step === FLOOR_STEP.pour;
  const pourY = fs ? GROUND - FLOOR_H * (fs.floor + 1) : GROUND + PIT - 30;
  const boom = `M ${BOOM_BASE} ${GROUND - 36} L ${BOOM_BASE - 30} ${pourY - 80} L ${LEFT + WIDTH - 40} ${pourY - 60} L ${LEFT + WIDTH - 80} ${pourY - 6}`;
  const crane = karkas > 0 && windows < 0.4;
  const scaffold = walls > 0 && paint < 1;
  const due = plan.project.due[Math.min(plan.project.due.length - 1, Math.max(0, stage - plan.stages.findIndex((st) => st.id === 'karkas')))];
  // vinç o adımda ne gerekiyorsa taşır: demir, kalıp (sökülünce bir üst kata), tuğla
  const wallFloor = Math.min(floors - 1, Math.floor(walls * floors));
  const craneLoad: CraneLoad = !working
    ? null
    : fs?.step === FLOOR_STEP.rebar || fs?.step === FLOOR_STEP.mesh
      ? 'rebar'
      : fs?.step === FLOOR_STEP.form || fs?.step === FLOOR_STEP.strip
        ? 'form'
        : walls > 0 && walls < 1
          ? 'brick'
          : null;
  // kalıp sökülünce tahtalar bir üst kata çıkar; döşeme demiri katın üstüne iner
  const craneTo = fs ? GROUND - FLOOR_H * (fs.step === FLOOR_STEP.strip || fs.step === FLOOR_STEP.mesh ? fs.floor + 1 : fs.floor) : GROUND - FLOOR_H * wallFloor;
  // sepetin yüksekliği: hangi iş sürüyorsa o işin ulaştığı kat (sürekli, zıplamadan)
  const reach = paint > 0 && paint < 1 ? floors * (1 - paint) : windows > 0 && windows < 1 ? floors * windows : walls > 0 && walls < 1 ? floors * walls : 0.4;
  const liftY = GROUND - FLOOR_H * Math.max(0.4, Math.min(floors - 0.4, reach)) - 6;
  const bricksLeft = walls > 0 ? Math.ceil((1 - walls) * 6) : karkas > 0.9 ? 6 : 0;

  return (
    <g>
      {/* hafriyat toprağı */}
      {dig > 0 && <path d={`M ${PILE} ${GROUND} q 50 ${-60 * dig * (1 - found * 0.8)} 100 0 Z`} fill="#8a6440" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />}

      {/* malzeme: demir demeti, kum, tuğla paletleri */}
      {found > 0 && karkas < 1 && (
        <g>
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={i} x1="300" y1={GROUND - 4 - i * 2} x2="380" y2={GROUND - 6 - i * 2} stroke="#6b4a36" strokeWidth="2" />
          ))}
        </g>
      )}
      {karkas > 0 && paint < 1 && <path d={`M 760 ${GROUND} q 25 -26 50 0Z`} fill="#d9c59a" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />}
      {Array.from({ length: bricksLeft }, (_, i) => (
        <g key={i} transform={`translate(${300 + (i % 3) * 30} ${GROUND - 16 - Math.floor(i / 3) * 16})`}>
          <rect width="26" height="14" fill="url(#ins-brick)" stroke={INK} strokeWidth="1.2" />
          <rect x="-1" y="14" width="28" height="2.5" fill="#a87a4a" stroke={INK} strokeWidth="0.8" />
        </g>
      ))}

      {/* iskele ve yeşil file */}
      {scaffold && (
        <g>
          <g stroke="#8b4f33" strokeWidth="2" strokeLinecap="round">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <line key={i} x1={LEFT - 18 + i * 56} y1={GROUND} x2={LEFT - 18 + i * 56} y2={top - 6} />
            ))}
            {Array.from({ length: height + 1 }, (_, i) => (
              <line key={i} x1={LEFT - 18} y1={GROUND - i * FLOOR_H} x2={LEFT + WIDTH + 18} y2={GROUND - i * FLOOR_H} />
            ))}
          </g>
          {Array.from({ length: height }, (_, i) => (
            <rect key={i} x={LEFT - 18} y={GROUND - (i + 1) * FLOOR_H - 3} width={WIDTH + 36} height="4" fill="#c9a35c" stroke={INK} strokeWidth="0.9" />
          ))}
          {paint > 0 && <rect x={LEFT - 20} y={top - 6} width={WIDTH + 40} height={GROUND - top + 6} fill="rgba(79,125,74,.34)" stroke={INK} strokeWidth="1" />}
        </g>
      )}

      {/* vinç binanın solunda: sağ taraf yorum paneline kalır (çizim aynalanır) */}
      {crane && (
        <g transform={`translate(${CRANE_MIRROR} 0) scale(-1 1)`}>
          <Crane load={craneLoad} drop={Math.max(0, craneTo - LOAD_BOTTOM)} />
        </g>
      )}

      {/* kepçe: hafriyat boyunca kazar, tozu kalkar */}
      {dig > 0 && found < 0.2 && (
        <g transform={`translate(${310 + dig * 70} ${GROUND})`}>
          <Excavator armClass={working ? s.arm : undefined} />
          {working && (
            <g className={s.dust}>
              <circle cx="130" cy="-6" r="14" />
              <circle cx="110" cy="-2" r="10" />
              <circle cx="150" cy="-4" r="9" />
            </g>
          )}
        </g>
      )}

      {/* damperli kamyon: hafriyat toprağını taşır, gidip gelir */}
      {dig > 0 && found < 0.2 && (
        <g className={working ? s.dumpTruck : undefined}>
          <g transform={`translate(160 ${GROUND})`}>
            <DumpTruck />
          </g>
        </g>
      )}

      {/* beton pompası ve mikser: döküm günleri */}
      {pouring && (
        <g>
          {/* pompa binanın sağında, önü binaya dönük; mikser arkasını pompanın haznesine dayar */}
          <g transform={`translate(${PUMP_X} ${GROUND}) scale(-1 1)`}>
            <PumpTruck />
          </g>
          {/* pompa kolu: döküm başlarken kamyonun üstünden açılır, binanın üstünden kata uzanır */}
          <g key={fs ? `kol-${fs.floor}` : 'kol-temel'} className={s.boomIn}>
            <path d={boom} fill="none" stroke={INK} strokeWidth="10" strokeLinejoin="round" strokeLinecap="round" />
            <path d={boom} fill="none" stroke="#e2a92a" strokeWidth="6.4" strokeLinejoin="round" strokeLinecap="round" />
            <path d={boom} fill="none" stroke="#3a362f" strokeWidth="1.5" strokeDasharray="4 8" />
          </g>
          {working && <circle className={s.drip} cx={LEFT + WIDTH - 80} cy={pourY - 4} r="4" fill="#9c9a94" />}
          <g key={fs ? `mikser-${fs.floor}` : 'mikser-temel'} className={s.driveInRight}>
            <g transform={`translate(${PUMP_X + 6} ${GROUND})`}>
              <MixerTruck drumClass={working ? s.drumSpin : undefined} />
            </g>
          </g>
        </g>
      )}

      {/* tuğla kamyonu: duvar başında gelir */}
      {walls > 0 && walls < 0.15 && (
        <g transform={`translate(150 ${GROUND})`}>
          <BrickTruck />
        </g>
      )}

      {/* sepetli platform: duvar örülürken ve doğrama takılırken aşağıdan yukarı, mantolama ve
          boyada yukarıdan aşağı; sepet hep çalışılan katın hizasında, cephenin sağ köşesinde */}
      {(walls > 0 || paint > 0 || windows > 0) && done < 0.3 && (
        <g transform={`translate(${LIFT_X} ${GROUND})`}>
          <LiftTruck tipX={LEFT + WIDTH + 34 - LIFT_X} tipY={liftY - GROUND} />
        </g>
      )}

      {/* şantiye şefliği konteyneri: arsanın solunda, teslime dek */}
      {stage > 0 && done < 0.3 && (
        <g transform={`translate(176 ${GROUND})`}>
          <ellipse cx="44" cy="1" rx="50" ry="4" fill="#2f2c4a" opacity="0.3" filter="url(#ins-soft)" />
          <rect x="0" y="-38" width="88" height="36" fill="#3b6894" stroke={INK} strokeWidth="1.8" />
          {Array.from({ length: 10 }, (_, i) => (
            <line key={i} x1={6 + i * 8.5} y1="-36" x2={6 + i * 8.5} y2="-4" stroke="rgba(0,0,0,.15)" />
          ))}
          <rect x="8" y="-30" width="26" height="14" fill="url(#ins-glass)" stroke={INK} strokeWidth="1.1" />
          <rect x="60" y="-30" width="16" height="28" fill="#2a4a6a" stroke={INK} strokeWidth="1.1" />
          <rect x="-2" y="-41" width="92" height="4" fill="#2a4a6a" stroke={INK} strokeWidth="1.2" />
          <rect x="0" y="-2" width="88" height="4" fill="#5d5650" stroke={INK} strokeWidth="1" />
          <text x="44" y="-6" textAnchor="middle" fontSize="5.5" fontWeight="800" fill="#fbf8f0" fontFamily="monospace">
            ŞANTİYE ŞEFLİĞİ
          </text>
        </g>
      )}

      {/* gece: projektör direği ve ışık konisi (ışığı Scene gece katmanının üstüne çizer) */}
      <g>
        <rect x="242" y={GROUND - 150} width="4" height="150" fill="#8d9094" stroke={INK} strokeWidth="1.2" />
        <rect x="234" y={GROUND - 156} width="20" height="10" fill="#3a3d41" stroke={INK} strokeWidth="1.2" />
        {night && done < 1 && <rect x="238" y={GROUND - 148} width="12" height="4" fill="#fff6c8" />}
      </g>

      {/* şantiye çiti ve tabela: teslimle sökülür. Binanın önü açık kalır: çit yalnız iki yanda,
          önde alçak bir uyarı şeridi; tabela binanın sağında, kendi ayaklarında */}
      {done < 0.3 && (
        <g>
          {[
            [300, 120],
            [770, 130],
          ].map(([x, w]) => (
            <g key={x}>
              <rect x={x} y={GROUND - 40} width={w} height="40" fill="#5e7f8f" opacity="0.5" stroke={INK} strokeWidth="1.2" />
              {Array.from({ length: Math.floor(w / 40) + 1 }, (_, i) => (
                <line key={i} x1={x + i * 40} y1={GROUND - 40} x2={x + i * 40} y2={GROUND} stroke={INK} strokeWidth="2.4" />
              ))}
            </g>
          ))}
          <line x1="420" y1={GROUND - 12} x2="770" y2={GROUND - 12} stroke="#c43c2c" strokeWidth="3" />
          <line x1="420" y1={GROUND - 12} x2="770" y2={GROUND - 12} stroke="#fbf8f0" strokeWidth="3" strokeDasharray="10 10" />
          {[420, 595, 770].map((x) => (
            <rect key={x} x={x - 1.5} y={GROUND - 18} width="3" height="18" fill="#5d5650" stroke={INK} strokeWidth="0.8" />
          ))}
          {/* tabela sol çitin üstünde: binanın önünü ve sağdaki makineleri kapatmaz */}
          <g transform={`translate(${LEFT - 146} ${GROUND - 96})`}>
            <rect x="8" y="52" width="3" height="44" fill="#5d5650" stroke={INK} strokeWidth="0.9" />
            <rect x="123" y="52" width="3" height="44" fill="#5d5650" stroke={INK} strokeWidth="0.9" />
            <rect x="2" y="56" width="134" height="2" fill="rgba(0,0,0,.25)" />
            <rect x="0" y="0" width="134" height="54" fill="#fbf6ea" />
            <rect x="0" y="0" width="134" height="10" fill="#3b6894" />
            <rect x="0" y="0" width="134" height="54" fill="none" stroke={INK} strokeWidth="1.8" />
            <text x="67" y="7.5" textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#fbf8f0" fontFamily="monospace">
              {stage > 0 ? 'İNŞAAT ALANI' : 'SATIŞLAR BAŞLADI'}
            </text>
            <text x="67" y="21" textAnchor="middle" fontSize="8" fontWeight="800" fill="#3a362f" fontFamily="monospace">
              {plan.project.sign}
            </text>
            <text x="67" y="34" textAnchor="middle" fontSize="6.5" fill="#3a362f" fontFamily="monospace">
              TESLİM:{' '}
              {plan.project.due.filter((y) => y < due).map((y) => (
                <tspan key={y} textDecoration="line-through" fill="#8d8a80">
                  {y}{' '}
                </tspan>
              ))}
              <tspan fontWeight="800" fill="#c43c2c">
                {due}
              </tspan>
            </text>
            <text x="67" y="44" textAnchor="middle" fontSize="5.4" fill="#4a453b" fontFamily="monospace">
              RUHSAT 2019/412 · DENETİM: GÜVEN LTD.
            </text>
            <text x="67" y="50.5" textAnchor="middle" fontSize="5.4" fill="#4a453b" fontFamily="monospace">
              ŞANTİYE ŞEFİ: İNŞ. MÜH. A. YILMAZ
            </text>
          </g>
          {/* baret uyarı levhası: sağ çitte */}
          <rect x="860" y={GROUND - 34} width="26" height="24" fill="#ecb83a" stroke={INK} strokeWidth="1.4" />
          <path d="M 865 0 a 8 8 0 0 1 16 0 h 2 v 2 h -20 v -2 Z" transform={`translate(0 ${GROUND - 18})`} fill="#3a362f" />
        </g>
      )}

    </g>
  );
}
