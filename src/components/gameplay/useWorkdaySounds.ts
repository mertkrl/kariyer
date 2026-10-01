import { useEffect, useRef } from 'react';
import { audioEngine } from '../../audio/audioEngine';
import type { GameState } from '../../game/store';

interface Workday {
  onBreak: boolean;
  meetingActive: boolean;
  paused: boolean;
  currentDayIndex: number;
  workdayMinutes: number;
  ringing: GameState['desk']['ringing'];
}

/** What the workday sounds like: the office, the lunch bell, the ringing landline, the music. */
export function useWorkdaySounds({ onBreak, meetingActive, paused, currentDayIndex, workdayMinutes, ringing }: Workday) {
  // Open-plan office sound bed while working (the cafeteria has its own ambience). During
  // Wednesday's video call you're in your headphones: no office, no rain on the window.
  const office = useRef<ReturnType<typeof audioEngine.startOfficeAmbience> | null>(null);
  useEffect(() => {
    if (onBreak || meetingActive) return;
    office.current = audioEngine.startOfficeAmbience(currentDayIndex === 2);
    return () => {
      office.current?.stop();
      office.current = null;
    };
  }, [onBreak, currentDayIndex, meetingActive]);
  useEffect(() => {
    office.current?.setUrgency(workdayMinutes >= 480 ? 1 : 0);
  }, [workdayMinutes]);

  // Lunch bell rings the moment the clock hits 12:00.
  const wasOnBreak = useRef(onBreak);
  useEffect(() => {
    if (onBreak && !wasOnBreak.current) audioEngine.playLunchBell();
    wasOnBreak.current = onBreak;
  }, [onBreak]);

  // The landline keeps ringing until you pick it up or it gives up.
  useEffect(() => {
    if (!ringing || paused || onBreak) return;
    audioEngine.playDeskRing();
    const id = window.setInterval(() => audioEngine.playDeskRing(), 2600);
    return () => window.clearInterval(id);
  }, [ringing, paused, onBreak]);

  useEffect(() => {
    audioEngine.setMusicMood(paused ? 'paused' : onBreak ? 'break' : 'work');
  }, [paused, onBreak]);
}
