import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../shared/styles/fonts.css';
import '../shared/styles/global.css';
import { GAMES } from '../arcade/games';
import { GameOg, SiteOg } from './OgCard';

// `?g=<oyun>` o oyunun görseli; yoksa sitenin genel görseli
const g = new URLSearchParams(window.location.search).get('g');
const game = GAMES.find((x) => x.route === g);

createRoot(document.getElementById('root')!).render(<StrictMode>{game ? <GameOg game={game} /> : <SiteOg />}</StrictMode>);
