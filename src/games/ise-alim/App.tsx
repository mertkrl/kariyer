import { lazy, Suspense, useEffect } from 'react';
import { usePhase } from './game/store/storeLoader';
import { audioEngine } from '../../shared/audio/audioEngine';
import { trackFor } from './audio/trackFor';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { UpdateNotice } from './components/ui/UpdateNotice';
import { MobileBlock } from './components/ui/MobileBlock';
import { useScreenFocus } from './components/ui/useScreenFocus';
import { useModalTrap } from './components/ui/useModalTrap';
import { ClockOut } from '../../arcade/ClockOut';
import { StudioMark } from '../../arcade/Studio';

// İlk pakete yalnızca karşılama ekranı girer; diğer her ekran kendi parçasıdır.
const SCREENS = {
  JobSelectScreen: () => import('./screens/JobSelectScreen'),
  ApplicationFloodScreen: () => import('./screens/ApplicationFloodScreen'),
  DayBriefingScreen: () => import('./screens/DayBriefingScreen'),
  GameplayScreen: () => import('./screens/GameplayScreen'),
  DayEndScreen: () => import('./screens/DayEndScreen'),
  FinalRoundScreen: () => import('./screens/FinalRoundScreen'),
  FinalScreen: () => import('./screens/FinalScreen'),
  WeekendScreen: () => import('./screens/WeekendScreen'),
  OfferScreen: () => import('./screens/OfferScreen'),
};
const JobSelectScreen = lazy(() => SCREENS.JobSelectScreen().then((m) => ({ default: m.JobSelectScreen })));
const ApplicationFloodScreen = lazy(() => SCREENS.ApplicationFloodScreen().then((m) => ({ default: m.ApplicationFloodScreen })));
const DayBriefingScreen = lazy(() => SCREENS.DayBriefingScreen().then((m) => ({ default: m.DayBriefingScreen })));
const GameplayScreen = lazy(() => SCREENS.GameplayScreen().then((m) => ({ default: m.GameplayScreen })));
const DayEndScreen = lazy(() => SCREENS.DayEndScreen().then((m) => ({ default: m.DayEndScreen })));
const FinalRoundScreen = lazy(() => SCREENS.FinalRoundScreen().then((m) => ({ default: m.FinalRoundScreen })));
const FinalScreen = lazy(() => SCREENS.FinalScreen().then((m) => ({ default: m.FinalScreen })));
const WeekendScreen = lazy(() => SCREENS.WeekendScreen().then((m) => ({ default: m.WeekendScreen })));
const OfferScreen = lazy(() => SCREENS.OfferScreen().then((m) => ({ default: m.OfferScreen })));
// oyunun ses kapatma ayarını okur; bu yüzden ilk ekranla değil oyunla birlikte gelir
const SoundToggle = lazy(() => import('./components/ui/SoundToggle').then((m) => ({ default: m.SoundToggle })));

function App() {
  const phase = usePhase();
  const { mainRef, announcement } = useScreenFocus(phase);
  useModalTrap();

  // Müzik mesai başlayınca girer (sonra iş/mola/duraklatma hâllerini GameplayScreen yönetir).
  // Giriş ekranları sessiz kalır; başvuru yağmurunun ses tasarımı net duyulsun diye.
  useEffect(() => {
    // mesainin parçası günün kendisine bağlı (useWorkdaySounds); geri kalan aşamalar burada
    const track = phase === 'gameplay' ? null : trackFor(phase, -1);
    if (track) audioEngine.setMusicTrack(track);
    if (phase === 'gameplay' || phase === 'finalRound') return;
    audioEngine.setMusicMood(phase === 'dayEnd' || phase === 'final' ? 'work' : phase === 'weekend' ? 'break' : 'off');
  }, [phase]);

  // Karşılama ekranı açılınca geri kalanı arka planda indir; hiçbir ekran geçişi ağı beklemesin.
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
      case 'offer':
        return <OfferScreen />;
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
      {/* bu bölge kutu oluşturmaz (display: contents), ekranların yerleşimi aynen kalır */}
      <main ref={mainRef} className="app-main">
        <Suspense fallback={null}>{renderScreen()}</Suspense>
      </main>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <Suspense fallback={null}>
        {phase !== 'gameplay' && phase !== 'finalRound' && phase !== 'welcome' && phase !== 'weekend' && <SoundToggle />}
      </Suspense>
      {phase === 'welcome' && <UpdateNotice />}
      {phase === 'welcome' && <ClockOut tone="dark" fixed />}
      {phase === 'welcome' && <StudioMark tone="dark" minimal />}
      {/* telefonda oyun başlamaz: açılış sayfası okunur ve durum altta baştan söylenir (İşe başla
          yerine), oyunun içi ekranı kaplar; ikisinde de salona dönüş ve bağlantıyı paylaşma var */}
      <MobileBlock inline={phase === 'welcome'} />
    </>
  );
}

/**
 * Sen İK'sin kendi hata sınırıyla: günün kaydını bilir, "Devam et" ile dönüşü anlatır. Bu sınır
 * İK'nın parçasında durur, salonun ilk paketine girmez (Root.tsx onu tembel yükler).
 */
function IseAlim() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

export default IseAlim;
