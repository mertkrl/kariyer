import { useEffect, useId } from 'react';
import { lunchMenus, type LunchMenu } from '../../game/data/lunchMenus';
import { audioEngine } from '../../audio/audioEngine';
import { Button } from '../../components/ui/Button';
import { weatherForDay } from './weather';
import { useReactions } from './useReactions';
import { useTea } from './useTea';
import { useLunch } from './useLunch';
import { RoomDefs } from './RoomDefs';
import { RoomBackdrop } from './RoomBackdrop';
import { LunchTray } from './LunchTray';
import { TeaSet } from './TeaSet';
import styles from './BreakRoom.module.css';

/*
 * Lunch in the canteen: a tabldot tray, soup with lemon, bread, ayran and a glass of tea, by a
 * window onto the city. The logic lives in useLunch / useTea, the drawing in the pieces below.
 */

interface BreakRoomProps {
  dayIndex: number;
  dayNumber: number;
  onFinish: () => void;
  /** Game minutes until 13:00 — lunch runs on the clock. */
  minutesLeft: number;
}

export function BreakRoom({ dayIndex, dayNumber, onFinish, minutesLeft }: BreakRoomProps) {
  const menu: LunchMenu = lunchMenus[dayIndex % lunchMenus.length];
  const weather = weatherForDay(dayIndex);

  // Weather you can hear through the window.
  useEffect(() => audioEngine.startWeatherAmbience(weather.kind), [weather.kind]);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (name: string) => `${name}-${uid}`;

  const reactions = useReactions();
  const { message, bumped } = reactions;
  const tea = useTea(reactions);
  const lunch = useLunch(menu, reactions);

  return (
    <div className={styles.room}>
      <svg
        className={styles.scene}
        viewBox="0 0 1200 740"
        /* Always show the whole scene; the wall and table are drawn far past the viewBox,
           so on any aspect ratio the spare space continues the room instead of letterboxing. */
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Yemekhane masası"
      >
        <RoomDefs id={id} weather={weather} teaTint={tea.teaTint} setStop={tea.setStop} bread={lunch.bread} />
        <RoomBackdrop id={id} weather={weather} menu={menu} dayNumber={dayNumber} />
        <LunchTray id={id} menu={menu} dayIndex={dayIndex} lunch={lunch} bumped={bumped} />
        <TeaSet id={id} tea={tea} bumped={bumped} />
        {/* Daylight from outside tints the whole room (dim and cool when it rains, crisp when it snows) */}
        {weather.roomTint && <rect x="-4000" y="-4000" width="9200" height="9000" fill={weather.roomTint} pointerEvents="none" />}
      </svg>

      {message && (
        <div className={styles.toast} key={message.key} role="status">
          {message.text}
        </div>
      )}
      <div className={styles.finishButton}>
        <span className={`${styles.breakTimer} ${minutesLeft <= 10 ? styles.breakTimerLow : ''}`}>
          ⏱ Molanın bitmesine <b className="mono">{Math.max(0, Math.ceil(minutesLeft))} dk</b>
        </span>
        <Button variant="danger" onClick={onFinish}>
          Masaya dön →
        </Button>
      </div>
    </div>
  );
}
