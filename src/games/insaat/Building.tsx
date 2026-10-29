import { FLOOR_SECONDS, FLOORS, PROJECT, STAGES, doneOf } from './data';
import { clamp, COLS, DX, DY, FLOOR_H, GROUND, LEFT, mix, PIT, WIDTH, WINDOWS } from './geo';
import s from './Scene.module.css';

/*
 * Apartmanın kendisi, iş saatine (`w`) göre. Gerçek sıra izlenir: çukur, demir hasır ve radye
 * temel; her katta kolon demiri, kalıp ve dikmeler, beton döküm, priz bekleme, kalıp sökümü;
 * sonra duvar, çatı makası ve kiremit, mantolama ve boya, doğrama ve balkonlar, teslim süsleri.
 * Ön cephenin yanında koyu bir yan cephe derinlik verir.
 */

/** Kaba inşaatın başladığı an: şantiyeye göre değişmez ama takvimle birlikte okunur. */
const karkasAt = () => STAGES.find((st) => st.id === 'karkas')!.at;
/** Radye temelin kalınlığı (çukurun dibinde). */
const RAFT = 22;

const PALETTE = {
  concrete: '#b3b0a8',
  wet: '#6f6d68',
  concreteSide: '#8f8c84',
  form: '#b8874f',
  formDark: '#8a6236',
  rebar: '#6b4a36',
  brick: '#b5654a',
  brickSide: '#8d4a35',
  insulation: '#ece9df',
  frame: '#f6f2e8',
  glass: '#a9cde0',
};

/** Bir katın kaba inşaattaki ilerlemesi (0–1). */
const floorOf = (w: number, k: number) => clamp((w - karkasAt()) / FLOOR_SECONDS - k);

/**
 * `sun`: güneşin yatay yönü (-1 solda, 1 sağda) ve gölgenin koyuluğu (0 gece, 1 öğle).
 * Gölge güneşin tersine düşer; sabah ve akşam uzar.
 */
export function Building({ w, sun }: { w: number; sun: { dir: number; strength: number } }) {
  const dig = doneOf(w, 'hafriyat');
  const found = doneOf(w, 'temel');
  const walls = doneOf(w, 'duvar') * FLOORS;
  const roof = doneOf(w, 'cati');
  const paint = doneOf(w, 'siva');
  const windows = doneOf(w, 'pencere') * FLOORS;
  const done = doneOf(w, 'teslim');
  const built = Array.from({ length: FLOORS }, (_, k) => floorOf(w, k));
  const height = built.filter((f) => f > 0).length;
  const top = GROUND - FLOOR_H * height;
  const right = LEFT + WIDTH;
  // ilk kat yükselirken çukurun çevresi doldurulur
  const backfill = clamp((built[0] - 0.2) * 3);

  return (
    <g>
      {/* hafriyat: kenarları şevli çukur. Temel sırası: grobeton, su yalıtımı, radye donatısı, radye
          betonu. Kaba inşaat başlayınca çukurun çevresi geri doldurulur, zemin yeniden düzleşir. */}
      {dig > 0 && backfill < 1 && (
        <g>
          <path d={`M ${LEFT - 44} ${GROUND} L ${right + 44} ${GROUND} L ${right + 20} ${GROUND + PIT * dig} L ${LEFT - 20} ${GROUND + PIT * dig} Z`} fill="#6e5236" />
          <path d={`M ${LEFT - 44} ${GROUND} L ${LEFT - 20} ${GROUND + PIT * dig} L ${LEFT - 14} ${GROUND + PIT * dig} L ${LEFT - 36} ${GROUND} Z`} fill="#5a4330" />
          {found > 0 && <rect x={LEFT - 20} y={GROUND + PIT - 6} width={WIDTH + 40} height="6" fill="#9c9a94" />}
          {found > 0.15 && <rect x={LEFT - 20} y={GROUND + PIT - 8} width={(WIDTH + 40) * clamp((found - 0.15) / 0.15)} height="2" fill="#1f1d1b" />}
          {found > 0.3 && found < 0.62 && (
            <g stroke={PALETTE.rebar} strokeWidth="1.5">
              {Array.from({ length: 18 }, (_, i) => (
                <line key={`v${i}`} x1={LEFT - 14 + i * 19} y1={GROUND + PIT - 26} x2={LEFT - 14 + i * 19} y2={GROUND + PIT - 9} />
              ))}
              <line x1={LEFT - 16} y1={GROUND + PIT - 22} x2={right + 16} y2={GROUND + PIT - 22} />
              <line x1={LEFT - 16} y1={GROUND + PIT - 12} x2={right + 16} y2={GROUND + PIT - 12} />
            </g>
          )}
          {found > 0.45 && (
            <rect x={LEFT - 20} y={GROUND + PIT - 8 - RAFT * clamp((found - 0.45) / 0.55)} width={WIDTH + 40} height={RAFT * clamp((found - 0.45) / 0.55)} fill={mix(PALETTE.wet, PALETTE.concrete, clamp((found - 0.8) / 0.2))} />
          )}
        </g>
      )}
      {/* geri dolgu: çukurun üstü toprakla kapanır */}
      {backfill > 0 && <path d={`M ${LEFT - 44} ${GROUND} L ${right + 44} ${GROUND} L ${right + 20} ${GROUND + PIT} L ${LEFT - 20} ${GROUND + PIT} Z`} fill="url(#ins-ground)" opacity={backfill} />}

      {/* gölge: binanın sağına düşer */}
      {height > 0 && sun.strength > 0.02 && (
        <path
          d={`M ${LEFT} ${GROUND} L ${right + DX} ${GROUND + DY} L ${right + DX - sun.dir * height * 34} ${GROUND + 10} L ${LEFT - sun.dir * height * 34} ${GROUND + 26} Z`}
          fill="#1e140a"
          opacity={0.32 * sun.strength}
          filter="url(#ins-soft)"
        />
      )}

      {built.map((ff, k) => {
        if (ff <= 0) return null;
        const y0 = GROUND - FLOOR_H * k;
        const y1 = y0 - FLOOR_H;
        const formed = ff >= 0.18 && ff < 0.86;
        // döşeme dikmeleri, üstteki iki kat dökülüp priz alana dek yerinde kalır
        const above = k + 2 < FLOORS ? floorOf(w, k + 2) >= 0.62 : doneOf(w, 'duvar') > 0;
        const props = ff >= 0.18 && !above;
        const pour = clamp((ff - 0.46) / 0.16);
        const mesh = ff >= 0.34 && pour < 1;
        // taze beton koyu ve ıslak; priz boyunca kuruyup açılır
        const cure = clamp((ff - 0.62) / 0.24);
        const slab = mix(PALETTE.wet, PALETTE.concrete, cure);
        const slabTop = mix('#8f8d87', '#c7c4bc', cure);
        const wall = clamp(walls - k);
        // mantolama ve boya yukarıdan aşağı iner (iskele tepeden başlar)
        const j = FLOORS - 1 - k;
        const insul = clamp(paint * 2 * FLOORS - j);
        const painted = clamp((paint - 0.5) * 2 * FLOORS - j);
        const win = clamp(windows - k);
        const face = painted > 0.99 ? PROJECT.paint : insul > 0.99 ? PALETTE.insulation : wall > 0.99 ? PALETTE.brick : null;
        const side = painted > 0.99 ? PROJECT.paintSide : insul > 0.99 ? '#cfcbc0' : wall > 0.99 ? PALETTE.brickSide : null;
        return (
          <g key={k}>
            {/* yan cephe */}
            {side && (
              <g>
                <path d={`M ${right} ${y0} L ${right + DX} ${y0 + DY} L ${right + DX} ${y1 + DY} L ${right} ${y1} Z`} fill={side} />
                <path d={`M ${right} ${y0} L ${right + DX} ${y0 + DY} L ${right + DX} ${y1 + DY} L ${right} ${y1} Z`} fill="url(#ins-side-shade)" />
              </g>
            )}

            {/* dikmeler: döşeme kalıbını taşır */}
            {props && (
              <g stroke={PALETTE.formDark} strokeWidth="1.5">
                {Array.from({ length: 9 }, (_, i) => (
                  <line key={i} x1={LEFT + 20 + i * 33} y1={y0} x2={LEFT + 20 + i * 33} y2={y1 + 8} />
                ))}
              </g>
            )}

            {/* kolonlar: önce demir, kalıpta kahverengi, sökünce beton */}
            {COLS.map((c) => {
              const x = LEFT + c * (WIDTH - 12);
              if (ff < 0.18) {
                const h = FLOOR_H * clamp(ff / 0.14);
                return (
                  <g key={c} stroke={PALETTE.rebar} strokeWidth="1.5">
                    <line x1={x + 3} y1={y0} x2={x + 3} y2={y0 - h - 8} />
                    <line x1={x + 9} y1={y0} x2={x + 9} y2={y0 - h - 8} />
                    {Array.from({ length: Math.floor(h / 8) }, (_, i) => (
                      <line key={i} x1={x + 2} y1={y0 - 4 - i * 8} x2={x + 10} y2={y0 - 4 - i * 8} />
                    ))}
                  </g>
                );
              }
              return formed ? (
                <rect key={c} x={x - 2} y={y1 + 8} width="16" height={FLOOR_H - 8} fill={PALETTE.form} stroke={PALETTE.formDark} />
              ) : (
                <g key={c}>
                  <rect x={x} y={y1 + 8} width="12" height={FLOOR_H - 8} fill={PALETTE.concrete} stroke="#85827a" />
                  {/* kalıp tahtasının bıraktığı iz */}
                  {[0.3, 0.55, 0.8].map((f) => (
                    <line key={f} x1={x + 1} y1={y1 + 8 + (FLOOR_H - 8) * f} x2={x + 11} y2={y1 + 8 + (FLOOR_H - 8) * f} stroke="rgba(0,0,0,.12)" />
                  ))}
                </g>
              );
            })}

            {/* duvar: soldan sağa örülür */}
            {wall > 0 && !face && <rect x={LEFT + 6} y={y1 + 8} width={(WIDTH - 12) * wall} height={FLOOR_H - 8} fill="url(#ins-brick)" />}
            {face && <rect x={LEFT} y={y1 + 8} width={WIDTH} height={FLOOR_H - 8} fill={face === PALETTE.brick ? 'url(#ins-brick)' : face} />}
            {/* mantolama ve boya ilerlerken: kısmi şerit */}
            {insul > 0 && insul < 1 && <rect x={LEFT} y={y1 + 8} width={WIDTH} height={(FLOOR_H - 8) * insul} fill={PALETTE.insulation} />}
            {painted > 0 && painted < 1 && <rect x={LEFT} y={y1 + 8} width={WIDTH} height={(FLOOR_H - 8) * painted} fill={PROJECT.paint} />}

            {/* pencere boşlukları, sonra doğrama */}
            {WINDOWS.map((dx, i) =>
              win * 4 > i ? (
                <g key={i}>
                  {/* lento, pencere, denizlik */}
                  <rect x={LEFT + dx - 3} y={y1 + 12} width="46" height="3" fill="rgba(0,0,0,.12)" />
                  {/* pencere boşluğunun derinliği: üst ve sol iç yüzde gölge */}
                  <rect x={LEFT + dx - 2} y={y1 + 14} width="44" height="30" fill="rgba(30,20,10,.35)" />
                  <rect x={LEFT + dx} y={y1 + 16} width="40" height="26" fill="url(#ins-glass-sky)" stroke={PALETTE.frame} strokeWidth="3" />
                  {done > 0 && (k + i) % 3 === 1 && (
                    <g opacity="0.92">
                      <path d={`M ${LEFT + dx + 2} ${y1 + 18} h 9 q -2 10 1 22 h -10 Z`} fill="#efe3cf" />
                      <path d={`M ${LEFT + dx + 38} ${y1 + 18} h -9 q 2 10 -1 22 h 10 Z`} fill="#efe3cf" />
                    </g>
                  )}
                  {done > 0 && (k + i) % 4 === 2 && <rect x={LEFT + dx + 2} y={y1 + 18} width="36" height="9" fill="#d9cfbf" opacity="0.9" />}
                  <rect x={LEFT + dx} y={y1 + 16} width="40" height="4" fill="rgba(0,0,0,.18)" />
                  <rect x={LEFT + dx - 4} y={y1 + 42} width="48" height="4" fill="#e8e2d2" />
                  <rect x={LEFT + dx - 4} y={y1 + 46} width="48" height="1.5" fill="rgba(0,0,0,.18)" />
                  <line x1={LEFT + dx + 20} y1={y1 + 16} x2={LEFT + dx + 20} y2={y1 + 42} stroke={PALETTE.frame} strokeWidth="2" />
                  <path d={`M ${LEFT + dx + 4} ${y1 + 38} L ${LEFT + dx + 14} ${y1 + 20}`} stroke="rgba(255,255,255,.55)" strokeWidth="2" />
                </g>
              ) : wall > (i + 1) / 4 ? (
                <rect key={i} x={LEFT + dx} y={y1 + 16} width="40" height="26" fill="#3b3631" />
              ) : null,
            )}

            {/* balkon korkuluğu: doğramayla takılır (döşemesi kat betonuyla dökülmüştür) */}
            {k > 0 && win > 0.5 && (
              <g>
                <rect x={LEFT + 88} y={y0 - 22} width="126" height="3" fill="#5d5650" />
                {Array.from({ length: 16 }, (_, i) => (
                  <line key={i} x1={LEFT + 92 + i * 8} y1={y0 - 20} x2={LEFT + 92 + i * 8} y2={y0 - 4} stroke="#5d5650" strokeWidth="1.2" />
                ))}
              </g>
            )}

            {/* döşeme: kalıp tahtası, üstüne soldan sağa dökülen beton */}
            {formed && <rect x={LEFT - 8} y={y1 + 4} width={WIDTH + 16} height="6" fill={PALETTE.form} stroke={PALETTE.formDark} />}
            {/* döşeme donatısı: kalıbın üstünde iki yönlü hasır */}
            {mesh && (
              <g stroke={PALETTE.rebar} strokeWidth="1.2">
                <line x1={LEFT - 4} y1={y1 + 2} x2={right + 4} y2={y1 + 2} />
                <line x1={LEFT - 4} y1={y1 + 0.5} x2={right + 4} y2={y1 + 0.5} />
                {Array.from({ length: 31 }, (_, i) => (
                  <line key={i} x1={LEFT - 2 + i * 10} y1={y1 - 1} x2={LEFT - 2 + i * 10} y2={y1 + 4} />
                ))}
              </g>
            )}
            {pour > 0 && <rect x={LEFT - 6} y={y1} width={(WIDTH + 12) * pour} height="8" fill={slab} stroke="#85827a" />}
            {/* döküm cephesi: vibratörün çıkardığı küçük dalgalar */}
            {pour > 0 && pour < 1 && (
              <g className={s.ripple}>
                <ellipse cx={LEFT - 6 + (WIDTH + 12) * pour} cy={y1 + 1} rx="10" ry="2.5" fill="none" stroke="rgba(255,255,255,.5)" />
                <ellipse cx={LEFT - 14 + (WIDTH + 12) * pour} cy={y1 + 1} rx="5" ry="1.5" fill="none" stroke="rgba(255,255,255,.4)" />
              </g>
            )}
            {pour >= 1 && <path d={`M ${right + 6} ${y1} L ${right + 6 + DX} ${y1 + DY} L ${right + 6 + DX} ${y1 + DY + 8} L ${right + 6} ${y1 + 8} Z`} fill={PALETTE.concreteSide} />}
            {pour >= 1 && <path d={`M ${LEFT - 6} ${y1} L ${LEFT - 6 + DX} ${y1 + DY} L ${right + 6 + DX} ${y1 + DY} L ${right + 6} ${y1} Z`} fill={slabTop} />}
            {/* konsol balkon döşemesi: kat betonuyla birlikte dökülür, üst katın önüne çıkar */}
            {pour >= 1 && k < FLOORS - 1 && (
              <g>
                <rect x={LEFT + 88} y={y1 - 4} width="126" height="6" fill={slab} />
                <path d={`M ${LEFT + 214} ${y1 - 4} l ${DX * 0.5} ${DY * 0.5} v 6 l ${-DX * 0.5} ${-DY * 0.5} Z`} fill={PALETTE.concreteSide} />
              </g>
            )}
            {/* geçici kenar korkuluğu: çalışılan en üst döşemede, iş güvenliği */}
            {k === height - 1 && ff >= 0.18 && ff < 1 && (
              <g>
                {Array.from({ length: 8 }, (_, i) => (
                  <rect key={i} x={LEFT - 8 + i * 45} y={y1 - 18} width="2.5" height="18" fill="#5d5650" />
                ))}
                <line x1={LEFT - 8} y1={y1 - 16} x2={right + 8} y2={y1 - 16} stroke="#c43c2c" strokeWidth="2.5" />
                <line x1={LEFT - 8} y1={y1 - 16} x2={right + 8} y2={y1 - 16} stroke="#fbf8f0" strokeWidth="2.5" strokeDasharray="8 8" />
                <line x1={LEFT - 8} y1={y1 - 8} x2={right + 8} y2={y1 - 8} stroke="#c43c2c" strokeWidth="1.5" />
              </g>
            )}
          </g>
        );
      })}

      {/* ışık: sol üstten gelir, cephe sağa ve aşağı doğru hafifçe koyulaşır; döşeme altlarında ince gölge */}
      {height > 0 && walls > 0 && <rect x={LEFT} y={top} width={WIDTH} height={GROUND - top} fill="url(#ins-shade)" pointerEvents="none" />}
      {/* yüzey dokusu: sıva gözenekleri; duvarlar bitince cephenin üstünde ince bir katman */}
      {walls >= FLOORS && <rect x={LEFT} y={top} width={WIDTH + DX} height={GROUND - top} filter="url(#ins-fine)" opacity="0.55" pointerEvents="none" />}
      {/* kat bantları ve subasman: boya bitince */}
      {paint >= 1 &&
        Array.from({ length: FLOORS - 1 }, (_, k) => (
          <g key={k}>
            <rect x={LEFT - 4} y={GROUND - FLOOR_H * (k + 1) + 1} width={WIDTH + 8} height="5" fill="#f1e9da" />
            <rect x={LEFT - 4} y={GROUND - FLOOR_H * (k + 1) + 6} width={WIDTH + 8} height="1.5" fill="rgba(0,0,0,.2)" />
          </g>
        ))}
      {paint >= 1 && (
        <g>
          <rect x={LEFT - 2} y={GROUND - 12} width={WIDTH + 4} height="12" fill="#8f8a80" />
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} x1={LEFT + i * 25} y1={GROUND - 12} x2={LEFT + i * 25} y2={GROUND} stroke="rgba(0,0,0,.18)" />
          ))}
          <line x1={LEFT - 2} y1={GROUND - 6} x2={right + 2} y2={GROUND - 6} stroke="rgba(0,0,0,.15)" />
        </g>
      )}
      {built.map((ff, k) =>
        ff >= 0.86 ? <rect key={k} x={LEFT} y={GROUND - FLOOR_H * (k + 1) + 8} width={WIDTH} height="4" fill="rgba(0,0,0,.14)" /> : null,
      )}

      {/* en üst katta filizlenen filiz demirleri */}
      {height > 0 && roof === 0 && built[height - 1] >= 0.86 && height < FLOORS && (
        <g stroke={PALETTE.rebar} strokeWidth="2">
          {COLS.map((c) => (
            <line key={c} x1={LEFT + 6 + c * (WIDTH - 12)} y1={top} x2={LEFT + 6 + c * (WIDTH - 12)} y2={top - 14} />
          ))}
        </g>
      )}

      {/* giriş: zemin katta kapı, saçak, basamak; köşede yağmur borusu */}
      {windows > 0.2 && (
        <g>
          <rect x={LEFT + 118} y={GROUND - 4} width="64" height="4" fill="#cfcbc0" />
          <rect x={LEFT + 124} y={GROUND - 8} width="52" height="4" fill="#dedad0" />
          <rect x={right - 8} y={top + 4} width="4" height={GROUND - top - 4} fill="#8f8c84" />
          <rect x={right - 11} y={GROUND - 6} width="10" height="4" fill="#8f8c84" />
          <rect x={LEFT + 130} y={GROUND - 42} width="40" height="42" fill="#6e4a2e" stroke={PALETTE.frame} strokeWidth="2" />
          <rect x={LEFT + 136} y={GROUND - 36} width="28" height="16" fill={PALETTE.glass} />
          <rect x={LEFT + 120} y={GROUND - 48} width="60" height="6" fill="#5d5650" />
          <text x={LEFT + 150} y={GROUND - 52} textAnchor="middle" fontSize="7" fontWeight="700" fill="#3a362f" fontFamily="monospace">
            No: 7
          </text>
        </g>
      )}

      {/* çatı: önce ahşap makas, sonra aşağıdan yukarı kiremit */}
      {roof > 0 && (
        <g>
          {roof < 0.5 ? (
            <g stroke={PALETTE.formDark} strokeWidth="2" fill="none">
              <path d={`M ${LEFT - 14} ${top} L ${LEFT + WIDTH / 2} ${top - 70 * clamp(roof * 2)} L ${right + 14} ${top}`} />
              {[0.25, 0.5, 0.75].map((f) => (
                <line key={f} x1={LEFT - 14 + (WIDTH + 28) * f} y1={top} x2={LEFT + WIDTH / 2} y2={top - 70 * clamp(roof * 2)} />
              ))}
            </g>
          ) : (
            <g>
              <path d={`M ${right + 14} ${top} L ${right + 14 + DX} ${top + DY} L ${LEFT + WIDTH / 2 + DX} ${top - 70 + DY} L ${LEFT + WIDTH / 2} ${top - 70} Z`} fill="#8d3a24" />
              {/* baca: çatının sağ yarısında, kiremidin arkasında */}
              <rect x={LEFT + 214} y={top - 62} width="16" height="40" fill="#9a6b55" />
              <rect x={LEFT + 211} y={top - 66} width="22" height="5" fill="#7d5644" />
              <path d={`M ${LEFT - 14} ${top} L ${LEFT + WIDTH / 2} ${top - 70} L ${right + 14} ${top} Z`} fill="url(#ins-tile)" stroke="#7d2f1d" strokeWidth="2" />
              <path d={`M ${LEFT - 14} ${top} L ${LEFT + WIDTH / 2} ${top - 70} L ${right + 14} ${top} Z`} fill="url(#ins-roof-shade)" />
              <path d={`M ${LEFT + WIDTH / 2 - 3} ${top - 70} L ${LEFT + WIDTH / 2 + DX} ${top - 70 + DY}`} stroke="#6b2716" strokeWidth="4" />
              {/* saçak ve yağmur oluğu */}
              <rect x={LEFT - 18} y={top - 2} width={WIDTH + 36} height="5" fill="#f1e9da" />
              <rect x={LEFT - 18} y={top + 3} width={WIDTH + 36} height="3" fill="#8f8c84" />
            </g>
          )}
        </g>
      )}

      {/* teslim süsleri: çatıda güneş enerjisi ve çanak anten, cephede klimalar, balkonda çamaşır */}
      {done > 0 && (
        <g>
          <g transform={`translate(${LEFT + 210} ${top - 46})`}>
            <rect x="0" y="0" width="34" height="14" fill="#2c3e5c" stroke="#9aa" transform="skewX(-20)" />
            <rect x="8" y="-10" width="28" height="10" rx="4" fill="#d9d9d9" />
          </g>
          <g transform={`translate(${LEFT + 70} ${top - 34})`}>
            <ellipse cx="0" cy="0" rx="9" ry="12" fill="#e9e9e9" stroke="#999" />
            <line x1="0" y1="0" x2="10" y2="-4" stroke="#999" />
          </g>
          {[1, 3, 4].map((k) => (
            <g key={k}>
              <rect x={right - 30} y={GROUND - FLOOR_H * k - 20} width="22" height="14" fill="#f1f1f1" stroke="#bbb" />
              <circle cx={right - 19} cy={GROUND - FLOOR_H * k - 13} r="4" fill="none" stroke="#bbb" />
            </g>
          ))}
          <path d={`M ${LEFT + 94} ${GROUND - FLOOR_H * 2 - 20} q 30 8 60 0`} stroke="#777" fill="none" />
          {['#c43c2c', '#3b6894', '#f2c230', '#fbf8f0'].map((c, i) => (
            <rect key={c} x={LEFT + 100 + i * 13} y={GROUND - FLOOR_H * 2 - 18 + (i % 2)} width="9" height="11" fill={c} className={s.laundry} />
          ))}
        </g>
      )}
    </g>
  );
}
