import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/fonts.css'
import './styles/global.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { applyTextScale, loadTextScale } from './game/textScale'
import { audioEngine } from './audio/audioEngine'
import { connectSound } from './game/sound'
import { initialMusicVolume, initialSfxVolume, readStoredMuted } from './game/storeDefaults'

applyTextScale(loadTextScale())

// The engine must know the saved mute state and volumes before the very first click sound.
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

// Offline play: the built game registers a service worker that keeps its files in the browser.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // no service worker (private window, file://): the game still runs, just not offline
    })
  })
}
