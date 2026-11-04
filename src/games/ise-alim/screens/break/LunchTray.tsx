import type { LunchMenu } from '../../game/data/lunchMenus';
import { FoodPile } from './FoodPile';
import { COMPARTMENTS, DISH_BITES, type DishKey } from './lunch';
import { Hit, Steam } from './SceneBits';
import type { Lunch } from './useLunch';
import styles from './BreakRoom.module.css';

interface Props {
  id: (name: string) => string;
  menu: LunchMenu;
  dayIndex: number;
  lunch: Lunch;
  bumped: string | null;
}

/** Ekmek, limon, çorba, çatal bıçak, tabldot tepsisi ve ayran: yenebilecek her şey. */
export function LunchTray({ id, menu, dayIndex, lunch, bumped }: Props) {
  const { bread, eatBread, squeezeLemon, lemonPhase, lemonSqueezed, sipSoup, soup, soupRatio, soupColors, juiceActive, eatDish, dishes, drinkAyran, ayran, ayranRatio } = lunch;
  return (
    <>
      {/* Ekmek dilimleri */}
      {bread.map((b, i) => {
        const [x, y, r] = i === 0 ? [72, 582, -12] : [128, 612, 8];
        return (
          <Hit key={i} label="Ekmek dilimi" onActivate={() => eatBread(i)} bumped={bumped === `bread${i}`}>
            <g transform={`translate(${x} ${y}) rotate(${r}) scale(1 0.62)`}>
              {b > 0 ? (
                <g clipPath={`url(#${id(`bread${i}`)})`}>
                  <path
                    d="M-34,34 L-36,-8 C-44,-40 -12,-48 0,-38 C12,-48 44,-40 36,-8 L34,34 Z"
                    fill="#c4843f"
                    stroke="#a86a2c"
                  />
                  <path
                    d="M-27,28 L-29,-8 C-35,-32 -10,-38 0,-30 C10,-38 35,-32 29,-8 L27,28 Z"
                    fill="#f2deb0"
                  />
                  {[
                    [-12, -10],
                    [8, 4],
                    [-4, 16],
                    [14, -16],
                  ].map(([cx, cy]) => (
                    <ellipse key={`${cx}${cy}`} cx={cx} cy={cy} rx="2.5" ry="1.8" fill="#dcc592" />
                  ))}
                </g>
              ) : (
                <g fill="#c4843f" opacity="0.6">
                  <circle cx="-6" cy="4" r="2" />
                  <circle cx="8" cy="-2" r="1.5" />
                  <circle cx="2" cy="12" r="1.6" />
                </g>
              )}
            </g>
          </Hit>
        );
      })}

      {/* Küçük bir tabakta limon */}
      <ellipse cx="96" cy="480" rx="34" ry="9" fill="#f4f1ea" stroke="#d8d2c2" />
      <Hit label="Limon — çorbaya sık" onActivate={squeezeLemon}>
        <g className={`${styles.lemonMover} ${lemonPhase !== 'plate' ? styles.lemonLifted : ''}`}>
          <g transform="translate(96 474)">
            <g className={lemonPhase === 'squeeze' ? styles.lemonSqueezing : undefined}>
              {lemonSqueezed ? (
                <path d="M-14 4 Q0 -4 14 4 Q0 8 -14 4 Z" fill="#e9cf4d" stroke="#c7ac2d" />
              ) : (
                <>
                  <path d="M-18 4 Q0 -18 18 4 Z" fill="#f0d54c" stroke="#c7ac2d" />
                  <path d="M-13 3 Q0 -11 13 3 Z" fill="#fbeaa0" />
                  <path d="M0 3 L0 -8 M0 3 L-8 -3 M0 3 L8 -3" stroke="#e8cf6a" strokeWidth="1" />
                </>
              )}
            </g>
          </g>
        </g>
      </Hit>

      {/* Çorba kâsesi */}
      <Hit label={menu.soup.name} onActivate={sipSoup} bumped={bumped === 'soup'}>
        <g transform="translate(220 512)">
          <ellipse cx="0" cy="0" rx="42" ry="7" fill="#e4dfd2" />
          <path d="M-70,-62 C-68,-20 -40,-4 -30,0 L30,0 C40,-4 68,-20 70,-62 Z" fill={`url(#${id('porcelain')})`} stroke="#cfc8b8" />
          <path d="M-66,-44 C-60,-36 60,-36 66,-44" stroke="#3e6a9a" strokeWidth="3" fill="none" />
          <path d="M-62,-36 C-56,-29 56,-29 62,-36" stroke="#3e6a9a" strokeWidth="1" fill="none" />
          <ellipse cx="0" cy="-62" rx="70" ry="16" fill="#f7f5ef" stroke="#cfc8b8" />
          <ellipse cx="0" cy="-61" rx="62" ry="12.5" fill="#ddd7c8" />
          {soup > 0 && (
            <g
              className={styles.level}
              style={{ transform: `translateY(${(1 - soupRatio) * 7}px) scale(${0.72 + 0.28 * soupRatio})` }}
            >
              <ellipse cx="0" cy="-61" rx="60" ry="11.5" fill={soupColors.surface} />
              <ellipse cx="-14" cy="-64" rx="22" ry="3.5" fill="#ffffff" opacity="0.18" />
              {[
                [-30, -60],
                [12, -58],
                [30, -63],
                [-8, -65],
                [22, -56],
              ].map(([cx, cy]) => (
                <circle key={`${cx}${cy}`} cx={cx} cy={cy} r="2" fill={soupColors.speck} opacity="0.8" />
              ))}
              {lemonSqueezed && (
                <ellipse cx="-2" cy="-61" rx="24" ry="5" fill="#f3dc5a" className={styles.juiceSheen} />
              )}
              {juiceActive &&
                [0, 0.35, 0.7].map((delay) => (
                  <ellipse
                    key={delay}
                    cx="-2"
                    cy="-61"
                    rx="16"
                    ry="3.6"
                    fill="none"
                    stroke="#f7e27a"
                    strokeWidth="1.6"
                    className={styles.juiceRipple}
                    style={{ animationDelay: `${delay}s` }}
                  />
                ))}
            </g>
          )}
          {/* Kenara dayanmış çorba kaşığı */}
          <path d="M38,-66 L96,-104" stroke="#aab1b6" strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="30" cy="-62" rx="11" ry="5" fill="#c5cbcf" transform="rotate(-30 30 -62)" />
        </g>
      </Hit>
      {soup > 0 && <Steam x={206} y={444} scale={1.1} />}
      {lemonPhase === 'squeeze' && (
        <g pointerEvents="none">
          {[216, 221, 218, 223, 215, 220].map((x, i) => (
            <g key={i} transform={`translate(${x} 414)`}>
              <path
                d="M0,-4 C2,-1 3,1.5 0,3.5 C-3,1.5 -2,-1 0,-4 Z"
                fill="#f3dc5a"
                stroke="#d9b92c"
                strokeWidth="0.6"
                className={styles.juiceDrop}
                style={{ animationDelay: `${i * 0.14}s` }}
              />
            </g>
          ))}
        </g>
      )}

      {/* Çatal ve bıçaklı peçete */}
      <g transform="translate(328 556) scale(1 0.6)">
        <rect x="-22" y="-110" width="44" height="220" rx="3" fill="#fbfaf5" stroke="#e1dccd" />
        <line x1="0" y1="-110" x2="0" y2="110" stroke="#e8e3d5" />
        <g transform="translate(-8 0)">
          <rect x="-2.5" y="-20" width="5" height="100" rx="2.5" fill="#aab1b6" />
          <path d="M-7 -20 V-70 M-2.5 -20 V-70 M2.5 -20 V-70 M7 -20 V-70" stroke="#aab1b6" strokeWidth="2.4" />
          <path d="M-8 -20 Q0 -8 8 -20" fill="#aab1b6" />
        </g>
        <g transform="translate(9 0)">
          <rect x="-2.5" y="-10" width="5" height="90" rx="2.5" fill="#9aa2a8" />
          <path d="M-4 -10 V-80 Q4 -76 4 -10 Z" fill="#c5cbcf" />
        </g>
      </g>

      {/* ── Tabldot tepsisi ── */}
      <g transform="translate(600 548) scale(0.9 0.56)">
        <rect x="-268" y="-178" width="536" height="356" rx="30" fill="#8d949a" />
        <rect x="-264" y="-174" width="528" height="344" rx="28" fill={`url(#${id('steel')})`} />
        <rect x="-252" y="-162" width="504" height="324" rx="22" fill="none" stroke="#f4f6f7" strokeOpacity="0.7" strokeWidth="2" />
      </g>
      {(Object.keys(COMPARTMENTS) as DishKey[]).map((key, i) => {
        const c = COMPARTMENTS[key];
        return (
          <Hit key={key} label={menu[key].name} onActivate={() => eatDish(key)} bumped={bumped === key}>
            <g transform="translate(600 548) scale(0.9 0.56)">
              <rect x={c.x} y={c.y} width={c.w} height={c.h} rx="20" fill={`url(#${id('comp')})`} stroke="#8a9096" strokeWidth="2" />
              <rect x={c.x + 4} y={c.y + c.h - 14} width={c.w - 8} height="8" rx="4" fill="#ffffff" opacity="0.25" />
              <FoodPile
                kind={menu[key].kind}
                x={c.x}
                y={c.y}
                w={c.w}
                h={c.h}
                ratio={dishes[key] / DISH_BITES[key]}
                seed={(dayIndex + 1) * 97 + i * 13}
              />
            </g>
          </Hit>
        );
      })}

      {/* Ayran bardağı */}
      <Hit label="Ayran" onActivate={drinkAyran} bumped={bumped === 'ayran'}>
        <g transform="translate(878 504)">
          <path d="M-26,-78 L-20,0 L20,0 L26,-78 Z" fill="#fbfbf8" stroke="#d6d9dc" />
          <path d="M-24.5,-58 L-22.5,-30 L22.5,-30 L24.5,-58 Z" fill="#2f6aa6" />
          <text x="0" y="-39" textAnchor="middle" className={styles.ayranLabel}>
            AYRAN
          </text>
          <path d="M-21.5,-18 L-21,-10 L21,-10 L21.5,-18 Z" fill="#2f6aa6" opacity="0.35" />
          <ellipse cx="0" cy="-78" rx="26" ry="6" fill="#e8ecef" stroke="#d6d9dc" />
          {ayran.open ? (
            ayran.level > 0 && (
              <g className={styles.level} style={{ transform: `translateY(${(1 - ayranRatio) * 4}px) scale(${0.78 + 0.22 * ayranRatio})` }}>
                <ellipse cx="0" cy="-77" rx="23" ry="4.8" fill="#fdfdf9" />
                <circle cx="-8" cy="-77" r="1.4" fill="#ecece4" />
                <circle cx="6" cy="-76" r="1.8" fill="#ecece4" />
              </g>
            )
          ) : (
            <g>
              <ellipse cx="0" cy="-79" rx="27" ry="6.5" fill="#d9e3ee" stroke="#9fb3c8" />
              <ellipse cx="0" cy="-79" rx="16" ry="3.6" fill="#2f6aa6" opacity="0.8" />
              <path d="M24,-81 L36,-86 L38,-80 L26,-77 Z" fill="#d9e3ee" stroke="#9fb3c8" />
            </g>
          )}
        </g>
      </Hit>
    </>
  );
}
