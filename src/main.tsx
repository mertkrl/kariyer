import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/fonts.css'
import './styles/global.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { applyTextScale, loadTextScale } from './game/textScale'
import { audioEngine } from './audio/audioEngine'
import { connectSound } from './game/sound'
import { registerServiceWorker } from './swUpdate'
import { initialMusicVolume, initialSfxVolume, readStoredMuted } from './game/prefs'

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

registerServiceWorker()

// the sound scenes are not needed for the first screen: fetch them once it has drawn
const idle = window.requestIdleCallback ?? ((run: () => void) => setTimeout(run, 1500))
idle(() => void audioEngine.loadScenes())
