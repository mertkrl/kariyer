import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/fonts.css'
import './styles/global.css'
import { Root } from './Root'
import { GameBoundary } from './arcade/shell/GameBoundary'
import { SITE_NAME } from './arcade/games'
import { applyTextScale, loadTextScale } from './game/lib/textScale'
import { applyMotionReduced, loadMotionReduced } from './components/ui/motion'
import { audioEngine } from './audio/audioEngine'
import { connectSound } from './game/lib/sound'
import { registerServiceWorker } from './swUpdate'
import { initialMusicVolume, initialSfxVolume, readStoredMuted } from './game/lib/prefs'

applyTextScale(loadTextScale(), false)
applyMotionReduced(loadMotionReduced(), false)

// Ses motoru, ilk tık sesinden önce kayıtlı sessiz modunu ve ses seviyelerini bilmeli.
audioEngine.setMuted(readStoredMuted())
audioEngine.setMusicVolume(initialMusicVolume)
audioEngine.setSfxVolume(initialSfxVolume)
connectSound(audioEngine)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* son çare: salonun kendisi çökerse; oyunların kendi sınırları Root.tsx'te */}
    <GameBoundary title={SITE_NAME} canLeave={false}>
      <Root />
    </GameBoundary>
  </StrictMode>,
)

registerServiceWorker()

// ses sahneleri ilk ekran için gerekmez: ekran çizildikten sonra indirilir
const idle = window.requestIdleCallback ?? ((run: () => void) => setTimeout(run, 1500))
idle(() => void audioEngine.loadScenes())
