import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/fonts.css'
import './styles/global.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { applyTextScale, loadTextScale } from './game/lib/textScale'
import { audioEngine } from './audio/audioEngine'
import { connectSound } from './game/lib/sound'
import { registerServiceWorker } from './swUpdate'
import { initialMusicVolume, initialSfxVolume, readStoredMuted } from './game/lib/prefs'

applyTextScale(loadTextScale(), false)

// Ses motoru, ilk tık sesinden önce kayıtlı sessiz modunu ve ses seviyelerini bilmeli.
audioEngine.setMuted(readStoredMuted())
audioEngine.setMusicVolume(initialMusicVolume)
audioEngine.setSfxVolume(initialSfxVolume)
connectSound(audioEngine)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

registerServiceWorker()

// ses sahneleri ilk ekran için gerekmez: ekran çizildikten sonra indirilir
const idle = window.requestIdleCallback ?? ((run: () => void) => setTimeout(run, 1500))
idle(() => void audioEngine.loadScenes())
