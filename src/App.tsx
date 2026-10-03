import { lazy, Suspense, useEffect } from 'react';
import { usePhase } from './game/storeLoader';
import { audioEngine } from './audio/audioEngine';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { UpdateNotice } from './components/ui/UpdateNotice';
import { RotateHint } from './components/ui/RotateHint';

// Only the welcome screen ships in the first bundle; every other screen is its own chunk.
const SCREENS = {
  JobSelectScreen: () => import('./screens/JobSelectScreen'),
  ApplicationFloodScreen: () => import('./screens/ApplicationFloodScreen'),
  DayBriefingScreen: () => import('./screens/DayBriefingScreen'),
  GameplayScreen: () => import('./screens/GameplayScreen'),
  DayEndScreen: () => import('./screens/DayEndScreen'),
  FinalRoundScreen: () => import('./screens/FinalRoundScreen'),
  FinalScreen: () => import('./screens/FinalScreen'),
  WeekendScreen: () => import('./screens/WeekendScreen'),
  ReckoningScreen: () => import('./screens/ReckoningScreen'),
};
const JobSelectScreen = lazy(() => SCREENS.JobSelectScreen().then((m) => ({ default: m.JobSelectScreen })));
const ApplicationFloodScreen = lazy(() => SCREENS.ApplicationFloodScreen().then((m) => ({ default: m.ApplicationFloodScreen })));
const DayBriefingScreen = lazy(() => SCREENS.DayBriefingScreen().then((m) => ({ default: m.DayBriefingScreen })));
const GameplayScreen = lazy(() => SCREENS.GameplayScreen().then((m) => ({ default: m.GameplayScreen })));
const DayEndScreen = lazy(() => SCREENS.DayEndScreen().then((m) => ({ default: m.DayEndScreen })));
const FinalRoundScreen = lazy(() => SCREENS.FinalRoundScreen().then((m) => ({ default: m.FinalRoundScreen })));
const FinalScreen = lazy(() => SCREENS.FinalScreen().then((m) => ({ default: m.FinalScreen })));
const WeekendScreen = lazy(() => SCREENS.WeekendScreen().then((m) => ({ default: m.WeekendScreen })));
const ReckoningScreen = lazy(() => SCREENS.ReckoningScreen().then((m) => ({ default: m.ReckoningScreen })));
// reads the game's mute setting, so it comes with the game rather than with the first screen
const SoundToggle = lazy(() => import('./components/ui/SoundToggle').then((m) => ({ default: m.SoundToggle })));

function App() {
  const phase = usePhase();

  // Music enters when the workday starts (GameplayScreen then drives work/break/paused).
  // Intro screens stay silent so the application-flood sound design reads clearly.
  useEffect(() => {
    if (phase === 'gameplay' || phase === 'finalRound') return;
    audioEngine.setMusicMood(phase === 'dayEnd' || phase === 'final' ? 'work' : phase === 'weekend' ? 'break' : 'off');
  }, [phase]);

  // Once the welcome screen is up, fetch the rest in the background so no phase change waits on the network.
  useEffect(() => {
    const id = window.setTimeout(() => Object.values(SCREENS).forEach((load) => void load()), 1500);
    return () => window.clearTimeout(id);
  }, []);

  function renderScreen() {
    switch (phase) {
      case 'welcome':
        return <WelcomeScreen />;
      case 'jobSelect':
        return <JobSelectScreen />;
      case 'applicationFlood':
        return <ApplicationFloodScreen />;
      case 'briefing':
        return <DayBriefingScreen />;
      case 'gameplay':
        return <GameplayScreen />;
      case 'finalRound':
        return <FinalRoundScreen />;
      case 'dayEnd':
        return <DayEndScreen />;
      case 'reckoning':
        return <ReckoningScreen />;
      case 'weekend':
        return <WeekendScreen />;
      case 'final':
        return <FinalScreen />;
      default:
        return null;
    }
  }

  return (
    <>
      <Suspense fallback={null}>
        {renderScreen()}
        {phase !== 'gameplay' && phase !== 'finalRound' && phase !== 'welcome' && phase !== 'weekend' && <SoundToggle />}
      </Suspense>
      {phase === 'welcome' && <UpdateNotice />}
      {(phase === 'gameplay' || phase === 'finalRound') && <RotateHint />}
    </>
  );
}

export default App;
