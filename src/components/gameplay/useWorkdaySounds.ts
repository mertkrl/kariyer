import { useEffect, useRef } from 'react';
import { audioEngine } from '../../audio/audioEngine';
import { trackFor } from '../../audio/musicPlan';
import type { GameState } from '../../game/store/store';
import { RAINY_DAY } from '../../game/lib/weekdays';

interface Workday {
  onBreak: boolean;
  meetingActive: boolean;
  paused: boolean;
  currentDayIndex: number;
  workdayMinutes: number;
  ringing: GameState['desk']['ringing'];
}

/** Mesainin sesi: ofis, öğle zili, çalan sabit hat, müzik. */
export function useWorkdaySounds({ onBreak, meetingActive, paused, currentDayIndex, workdayMinutes, ringing }: Workday) {
  // Çalışırken açık ofis ses yatağı (yemekhanenin kendi ortam sesi var). Çarşamba'nın
  // görüntülü görüşmesinde kulaklıktasın: ofis yok, pencerede yağmur yok.
  const office = useRef<ReturnType<typeof audioEngine.startOfficeAmbience> | null>(null);
  useEffect(() => {
    if (onBreak || meetingActive) return;
    office.current = audioEngine.startOfficeAmbience(currentDayIndex === RAINY_DAY);
    return () => {
      office.current?.stop();
      office.current = null;
    };
  }, [onBreak, currentDayIndex, meetingActive]);
  useEffect(() => {
    office.current?.setUrgency(workdayMinutes >= 480 ? 1 : 0);
  }, [workdayMinutes]);

  // Saat 12:00'yi vurduğu anda öğle zili çalar.
  const wasOnBreak = useRef(onBreak);
  useEffect(() => {
    if (onBreak && !wasOnBreak.current) audioEngine.playLunchBell();
    wasOnBreak.current = onBreak;
  }, [onBreak]);

  // Sabit hat sen açana ya da kendisi vazgeçene kadar çalmaya devam eder.
  useEffect(() => {
    if (!ringing || paused || onBreak) return;
    audioEngine.playDeskRing();
    const id = window.setInterval(() => audioEngine.playDeskRing(), 2600);
    return () => window.clearInterval(id);
  }, [ringing, paused, onBreak]);

  useEffect(() => {
    audioEngine.setMusicMood(paused ? 'paused' : onBreak ? 'break' : 'work');
  }, [paused, onBreak]);

  // haftanın gerginliği: her günün kendi parçası (bkz. audio/musicPlan.ts)
  useEffect(() => {
    const track = trackFor('gameplay', currentDayIndex);
    if (track) audioEngine.setMusicTrack(track);
  }, [currentDayIndex]);
}
