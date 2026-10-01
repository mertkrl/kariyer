import { BREAD_BITES, GLASS_PATH } from './lunch';
import { WeatherDefs } from './CityView';
import type { teaColors } from './teaPour';
import type { Weather } from './weather';

interface Props {
  /** Makes an SVG id unique to this room (several can't share the page, but ids are global). */
  id: (name: string) => string;
  weather: Weather;
  teaTint: ReturnType<typeof teaColors>;
  /** Hands the tea gradient's stops to the pour animation. */
  setStop: (i: 0 | 1 | 2, node: SVGStopElement | null) => void;
  bread: number[];
}

/** Gradients, patterns and clip paths the room is painted with. */
export function RoomDefs({ id, weather, teaTint, setStop, bread }: Props) {
  return (
    <defs>
      <WeatherDefs />
      <linearGradient id="teaDepth" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.28" />
      </linearGradient>
      <linearGradient id={id('wall')} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="400">
        <stop offset="0" stopColor="#f1ebdd" />
        <stop offset="1" stopColor="#e4dac4" />
      </linearGradient>
      <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={weather.sky[0]} />
        <stop offset="1" stopColor={weather.sky[1]} />
      </linearGradient>
      <linearGradient id={id('sea')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={weather.sea[0]} />
        <stop offset="1" stopColor={weather.sea[1]} />
      </linearGradient>
      <linearGradient id={id('table')} gradientUnits="userSpaceOnUse" x1="0" y1="396" x2="0" y2="740">
        <stop offset="0" stopColor="#d8c6a0" />
        <stop offset="1" stopColor="#c6ae82" />
      </linearGradient>
      <linearGradient id={id('steel')} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#e3e7ea" />
        <stop offset="0.5" stopColor="#c3c9ce" />
        <stop offset="1" stopColor="#d9dde0" />
      </linearGradient>
      <linearGradient id={id('comp')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#a9b0b6" />
        <stop offset="1" stopColor="#cdd2d6" />
      </linearGradient>
      <linearGradient id={id('tea')} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={teaTint.edge} ref={(n) => setStop(0, n)} />
        <stop offset="0.45" stopColor={teaTint.mid} ref={(n) => setStop(1, n)} />
        <stop offset="1" stopColor={teaTint.edge} ref={(n) => setStop(2, n)} />
      </linearGradient>
      <linearGradient id={id('glass')} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
        <stop offset="0.3" stopColor="#ffffff" stopOpacity="0.1" />
        <stop offset="0.8" stopColor="#ffffff" stopOpacity="0.05" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0.45" />
      </linearGradient>
      <linearGradient id={id('board')} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#34413a" />
        <stop offset="1" stopColor="#26302b" />
      </linearGradient>
      <linearGradient id={id('porcelain')} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#e6e2d8" />
        <stop offset="0.35" stopColor="#ffffff" />
        <stop offset="1" stopColor="#dcd7cb" />
      </linearGradient>
      <linearGradient id={id('kettle')} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#9ba3a9" />
        <stop offset="0.3" stopColor="#eef1f3" />
        <stop offset="0.7" stopColor="#b9c0c5" />
        <stop offset="1" stopColor="#8d959b" />
      </linearGradient>
      <pattern id={id('tiles')} width="36" height="36" patternUnits="userSpaceOnUse">
        <rect width="36" height="36" fill="#e5dcc5" />
        <path d="M0 0H36V36" fill="none" stroke="#d2c6a8" strokeWidth="1.5" />
      </pattern>
      <pattern id={id('iznik')} width="28" height="22" patternUnits="userSpaceOnUse">
        <rect width="28" height="22" fill="#f4efe3" />
        <path d="M14 3 L22 11 L14 19 L6 11 Z" fill="#3e6a9a" />
        <circle cx="14" cy="11" r="3" fill="#f4efe3" />
        <circle cx="14" cy="11" r="1.4" fill="#b8402c" />
        <circle cx="0" cy="11" r="2" fill="#3f8a7a" />
        <circle cx="28" cy="11" r="2" fill="#3f8a7a" />
      </pattern>
      <clipPath id={id('glassClip')}>
        <path d={GLASS_PATH} />
      </clipPath>
      <clipPath id={id('windowClip')}>
        <rect x="82" y="52" width="306" height="206" />
      </clipPath>
      <filter id={id('soft')} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
      {bread.map((b, i) => (
        <clipPath key={i} id={id(`bread${i}`)}>
          <path
            d={`M-44,${-48 + (1 - b / BREAD_BITES) * 62} q11,12 22,0 q11,12 22,0 q11,12 22,0 q11,12 22,0 L44,44 L-44,44 Z`}
          />
        </clipPath>
      ))}
    </defs>
  );
}
