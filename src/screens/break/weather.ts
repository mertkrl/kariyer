export type WeatherKind = 'sunny' | 'windy' | 'rainy' | 'snowy';

export interface Weather {
  kind: WeatherKind;
  label: string;
  temperature: string;
  icon: string;
  sky: [string, string];
  sea: [string, string];
  /** Uzak (Anadolu) kıyısı, yakın kıyı + simge yapılar. */
  farShore: string;
  nearShore: string;
  landmarks: string;
  cloud: string;
  cloudCount: number;
  /** Bir bulutun pencereyi geçme süresi (saniye); düştükçe rüzgâr artar. */
  cloudSpeed: number;
  sun: boolean;
  /** Dalgacık hızı çarpanı; >1 daha dalgalı. */
  waveSpeed: number;
  whitecaps: boolean;
  gulls: boolean;
  ships: ('cargo' | 'ferry' | 'sail' | 'fishing')[];
  /** Bütün yemekhaneye düşen ışık (rgba); yağmurlu günler daha loş ve soğuk. */
  roomTint: string | null;
}

export const WEATHERS: Record<WeatherKind, Weather> = {
  sunny: {
    kind: 'sunny',
    label: 'Güneşli',
    temperature: '24°C',
    icon: '☀️',
    sky: ['#bcd8ea', '#eef3ef'],
    sea: ['#8fb3c8', '#6f98b1'],
    farShore: '#a9bfcc',
    nearShore: '#b4c7d2',
    landmarks: '#96abb9',
    cloud: '#ffffff',
    cloudCount: 3,
    cloudSpeed: 110,
    sun: true,
    waveSpeed: 1,
    whitecaps: false,
    gulls: true,
    ships: ['cargo', 'ferry', 'sail', 'fishing'],
    roomTint: null,
  },
  windy: {
    kind: 'windy',
    label: 'Parçalı bulutlu, rüzgârlı',
    temperature: '16°C',
    icon: '🌥️',
    sky: ['#aebfca', '#e3e8e6'],
    sea: ['#7f9dae', '#5d8199'],
    farShore: '#a3b4bf',
    nearShore: '#aabbc6',
    landmarks: '#8fa3b1',
    cloud: '#f2f4f5',
    cloudCount: 6,
    cloudSpeed: 42,
    sun: true,
    waveSpeed: 1.8,
    whitecaps: true,
    gulls: true,
    ships: ['cargo', 'ferry', 'fishing'],
    roomTint: 'rgba(90, 100, 110, 0.05)',
  },
  rainy: {
    kind: 'rainy',
    label: 'Yağmurlu',
    temperature: '11°C',
    icon: '🌧️',
    sky: ['#7f8d98', '#aab4ba'],
    sea: ['#667b89', '#4b6273'],
    farShore: '#8e9ca5',
    nearShore: '#8796a0',
    landmarks: '#76858f',
    cloud: '#9aa5ad',
    cloudCount: 7,
    cloudSpeed: 70,
    sun: false,
    waveSpeed: 1.4,
    whitecaps: false,
    gulls: false,
    ships: ['ferry', 'cargo'],
    roomTint: 'rgba(40, 55, 80, 0.1)',
  },
  snowy: {
    kind: 'snowy',
    label: 'Karlı',
    temperature: '−2°C',
    icon: '❄️',
    sky: ['#cdd5dc', '#eef1f3'],
    sea: ['#7d91a0', '#5f7688'],
    farShore: '#c4ced5',
    nearShore: '#b9c5ce',
    landmarks: '#9eaeba',
    cloud: '#e9edf0',
    cloudCount: 5,
    cloudSpeed: 140,
    sun: false,
    waveSpeed: 0.7,
    whitecaps: false,
    gulls: true,
    ships: ['ferry', 'sail'],
    roomTint: 'rgba(190, 210, 235, 0.08)',
  },
};

/** Her iş günü için bir hava (1–4. günlerde öğle arası var). */
const WEATHER_BY_DAY: WeatherKind[] = ['sunny', 'windy', 'rainy', 'snowy'];

export function weatherForDay(dayIndex: number): Weather {
  return WEATHERS[WEATHER_BY_DAY[dayIndex % WEATHER_BY_DAY.length]];
}
