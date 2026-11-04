import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './shared/styles/fonts.css'
import './shared/styles/global.css'
import { Root } from './Root'
import { GameBoundary } from './arcade/shell/GameBoundary'
import { SITE_NAME } from './arcade/games'
import { applyTextScale, loadTextScale } from './shared/textScale'
import { applyMotionReduced, loadMotionReduced } from './shared/motion'
import { loadAudio } from './shared/audio/lazy'
import { registerServiceWorker } from './shared/swUpdate'
import { isFramedByStranger } from './shared/frameGuard'

// başka bir sitenin çerçevesindeyse oyun hiç çizilmez (clickjacking; shared/frameGuard.ts)
const framed = isFramedByStranger()

applyTextScale(loadTextScale(), false)
applyMotionReduced(loadMotionReduced(), false)


const root = createRoot(document.getElementById('root')!)
if (framed) {
  // uyarı ekranı ilk pakete girmez: yalnızca çerçevede iner
  void import('./arcade/shell/FramedNotice').then(({ FramedNotice }) => root.render(<FramedNotice />))
} else {
  root.render(
    <StrictMode>
      {/* son çare: salonun kendisi çökerse; oyunların kendi sınırları Root.tsx'te */}
      <GameBoundary title={SITE_NAME} canLeave={false}>
        <Root />
      </GameBoundary>
    </StrictMode>,
  )
}

if (!framed) {
  registerServiceWorker()
  // ses motoru ve sahneleri ilk ekran için gerekmez: ekran çizildikten sonra iner. Motor kayıtlı
  // sessiz tercihini ve ses düzeylerini kendisi uygular (shared/audio/audioEngine.ts).
  const idle = window.requestIdleCallback ?? ((run: () => void) => setTimeout(run, 1500))
  idle(() => void loadAudio().then((e) => e.loadScenes()))
}
