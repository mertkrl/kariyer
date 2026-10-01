import type { LunchMenu } from '../../game/data/lunchMenus';
import { CityView } from './CityView';
import type { Weather } from './weather';
import styles from './BreakRoom.module.css';

interface Props {
  id: (name: string) => string;
  weather: Weather;
  menu: LunchMenu;
  dayNumber: number;
}

/** The canteen around the table: wall, window onto the city, notice, lamp, menu board, the table top. */
export function RoomBackdrop({ id, weather, menu, dayNumber }: Props) {
  return (
    <>
      {/* ── Wall ── */}
      <rect x="-4000" y="-4000" width="9200" height="4400" fill={`url(#${id('wall')})`} />
      <rect x="-4000" y="314" width="9200" height="80" fill={`url(#${id('tiles')})`} />
      <rect x="-4000" y="292" width="9200" height="22" fill={`url(#${id('iznik')})`} />
      <rect x="-4000" y="290" width="9200" height="3" fill="#b9a57e" />
      <rect x="-4000" y="313" width="9200" height="2" fill="#b9a57e" />

      {/* Window onto the business district across the road */}
      <g>
        <rect x="70" y="40" width="330" height="230" rx="4" fill="#f7f3ea" stroke="#c9bea3" strokeWidth="2" />
        <g clipPath={`url(#${id('windowClip')})`}>
          <CityView weather={weather} skyFill={`url(#${id('sky')})`} />
          {/* Blinds */}
          {Array.from({ length: 9 }).map((_, i) => (
            <rect key={i} x="82" y={52 + i * 7} width="306" height="6" fill="#efe8d8" stroke="#d6ccb4" strokeWidth="0.8" />
          ))}
          <rect x="82" y="115" width="306" height="4" fill="#d6ccb4" />
        </g>
        <rect x="232" y="52" width="6" height="206" fill="#f7f3ea" />
        <rect x="60" y="268" width="350" height="12" rx="2" fill="#efe9dc" stroke="#c9bea3" />
        <line x1="378" y1="56" x2="378" y2="150" stroke="#b4a988" strokeWidth="1.5" />
        <circle cx="378" cy="152" r="3" fill="#b4a988" />
        {/* Plant on the sill */}
        <g transform="translate(360 268)">
          <g className={styles.plantSway}>
            {[
              [-10, -52, -30],
              [8, -58, 25],
              [0, -66, 0],
              [-16, -44, -55],
              [16, -44, 55],
            ].map(([x, y, r], i) => (
              <ellipse key={i} cx={x} cy={y} rx="6" ry="18" fill={i % 2 ? '#5c8c46' : '#4a7a3a'} transform={`rotate(${r} ${x} ${y + 14})`} />
            ))}
          </g>
          <path d="M-15 -26 L-18 0 H18 L15 -26 Z" fill="#b8643e" />
          <rect x="-17" y="-30" width="34" height="6" rx="2" fill="#a2552f" />
        </g>
      </g>

      {/* Pinned notice */}
      <g transform="rotate(-2 560 130)">
        <rect x="478" y="66" width="164" height="124" fill="#fbf8f0" stroke="#e0d7c0" />
        <rect x="478" y="66" width="164" height="124" fill="none" stroke="#000" strokeOpacity="0.04" strokeWidth="6" />
        <circle cx="560" cy="76" r="5" fill="#b8402c" />
        <text x="560" y="104" textAnchor="middle" className={styles.noticeTitle}>
          YEMEKHANE
        </text>
        <text x="560" y="128" textAnchor="middle" className={styles.noticeTime}>
          12:00 – 13:00
        </text>
        <line x1="498" y1="140" x2="622" y2="140" stroke="#e0d7c0" />
        <text x="560" y="158" textAnchor="middle" className={styles.noticeText}>
          Tepsilerinizi lütfen
        </text>
        <text x="560" y="174" textAnchor="middle" className={styles.noticeText}>
          iade ediniz. — İdari İşler
        </text>
      </g>

      {/* Pendant lamp */}
      <g>
        <line x1="700" y1="0" x2="700" y2="54" stroke="#6b6455" strokeWidth="2" />
        <path d="M672 78 Q672 54 700 54 Q728 54 728 78 Z" fill="#3f6b63" />
        <ellipse cx="700" cy="80" rx="12" ry="4" fill="#fff4cf" />
        <ellipse cx="700" cy="120" rx="70" ry="38" fill="#fff4cf" opacity="0.12" />
      </g>

      {/* Menu board */}
      <g>
        <rect x="782" y="30" width="352" height="258" rx="6" fill="#7a5230" />
        <rect x="796" y="44" width="324" height="230" rx="3" fill={`url(#${id('board')})`} />
        <text x="958" y="80" textAnchor="middle" className={styles.boardTitle}>
          GÜNÜN MENÜSÜ
        </text>
        <text x="958" y="100" textAnchor="middle" className={styles.boardSub}>
          Tabldot · {dayNumber}. Gün
        </text>
        <line x1="830" y1="110" x2="1086" y2="110" stroke="#f2efe4" strokeOpacity="0.3" strokeDasharray="4 4" />
        {[menu.soup.name, menu.main.name, menu.side.name, `${menu.salad.name} · ${menu.meze.name}`, menu.dessert.name].map(
          (item, i) => (
            <text key={item} x="830" y={136 + i * 24} className={styles.boardItem}>
              <tspan className={styles.boardBullet}>◦ </tspan>
              {item}
            </text>
          ),
        )}
        <text x="958" y="262" textAnchor="middle" className={styles.boardFoot}>
          Ekmek · Ayran · Çay — Afiyet olsun!
        </text>
        <rect x="820" y="274" width="40" height="6" rx="2" fill="#f2efe4" opacity="0.85" />
      </g>

      {/* ── Table ── */}
      <rect x="-4000" y="386" width="9200" height="12" fill="#a88f66" />
      <rect x="-4000" y="396" width="9200" height="4000" fill={`url(#${id('table')})`} />
      {[430, 478, 540, 610].map((y, i) => (
        <path
          key={y}
          d={`M0 ${y} C300 ${y - 8 + i * 3} 700 ${y + 10} 1200 ${y - 4}`}
          stroke="#8a6d45"
          strokeOpacity="0.08"
          strokeWidth="2"
          fill="none"
        />
      ))}

      {/* Soft shadows */}
      <g fill="#3a2a14" opacity="0.18" filter={`url(#${id('soft')})`}>
        <ellipse cx="600" cy="560" rx="250" ry="100" />
        <ellipse cx="220" cy="516" rx="80" ry="14" />
        <ellipse cx="990" cy="596" rx="64" ry="14" />
        <ellipse cx="1102" cy="482" rx="60" ry="10" />
        <ellipse cx="878" cy="504" rx="30" ry="7" />
        <ellipse cx="1112" cy="606" rx="36" ry="8" />
      </g>
    </>
  );
}
