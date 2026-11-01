/*
 * Kavşak Amiri'nin biçimleri ve ayarları. Harita metre cinsindendir; kavşağın ortası (0, 0), kuzey
 * yukarı (y eksi). Kollar N, E, S, W; her kolun gelen şeritleri ortadan kaldırıma doğru sıralanır
 * ve her şerit hangi yöne gidebileceğini taşır (Sol, Düz, Sağ). Bir hareket "kol + yön"dür
 * (kuzeyden sola: N.L); yaya geçidi de bir harekettir (N.P: kuzey koldaki geçit). Evre, aynı anda
 * yeşil yanan hareketlerin kümesidir. Davranış sim.ts'te, geometri junction.ts'te.
 */

export type Dir = 'N' | 'E' | 'S' | 'W';
export type Turn = 'L' | 'T' | 'R';
export type MoveId = `${Dir}.${Turn}` | `${Dir}.P`;

export const DIRS: Dir[] = ['N', 'E', 'S', 'W'];
export const DIR_NAME: Record<Dir, string> = { N: 'Kuzey', E: 'Doğu', S: 'Güney', W: 'Batı' };
export const TURN_NAME: Record<Turn | 'P', string> = { L: 'sola', T: 'düz', R: 'sağa', P: 'yaya' };

export interface LegSpec {
  /** Kolun ucundaki yer: "Zincirlikuyu'dan". */
  name: string;
  /** Gelen şeritler, ortadan kaldırıma: her biri izin verilen yönler ("L", "LT", "TR", "LTR"…). */
  lanes: string[];
  /** Giden şerit sayısı. */
  out: number;
  /** Refüj genişliği (m); 0 ise ortada yalnızca çift çizgi. */
  median?: number;
  /** Bu kolda yaya geçidi var mı (varsayılan var). */
  crosswalk?: boolean;
  /** Hız sınırı (m/sn). */
  v?: number;
}

export interface Demand {
  /** Hareket. */
  mv: `${Dir}.${Turn}`;
  /** Dakikada araç; [saniye, değer] çiftleriyle zamanla değişebilir. */
  rate: number | [number, number][];
}

export interface PedDemand {
  leg: Dir;
  /** Dakikada yaya (iki uçtan toplam). */
  rate: number | [number, number][];
}

export type Event =
  | { at: number; kind: 'ambulance'; mv: `${Dir}.${Turn}`; text: string }
  | { at: number; kind: 'bus'; mv: `${Dir}.${Turn}` }
  | { at: number; kind: 'note'; text: string }
  /** Kaos: düğün konvoyu, aynı hareketten art arda `n` araç; korna eşliğinde. */
  | { at: number; kind: 'convoy'; mv: `${Dir}.${Turn}`; n: number; text: string }
  /** Kaos: motokurye; sarının sonunu da kırmızıyı da kollayan bir araç. */
  | { at: number; kind: 'courier'; mv: `${Dir}.${Turn}`; text: string }
  /** Kaos: çift sıra park eden araç; kol `sec` saniye boyunca yavaş akar. */
  | { at: number; kind: 'parked'; leg: Dir; sec: number; text: string }
  /** Olay: koldaki bir araç arızalanıp şeridinde kalır; ekip gelene ya da `sec` dolana kadar. */
  | { at: number; kind: 'breakdown'; mv: `${Dir}.${Turn}`; sec?: number; text: string }
  /** Olay: düğün konvoyu kolda durup halay çeker; kol iki yönde de kapanır. */
  | { at: number; kind: 'wedding'; leg: Dir; sec: number; text: string }
  /** Makam konvoyu: önde polis, ardında `n` siyah araç; ışığa bakmaz, yol önceden boşaltılmalı. */
  | { at: number; kind: 'motorcade'; mv: `${Dir}.${Turn}`; n: number; text: string };

/** Kolun yol düzeni: çift yön; tek yön kavşağa doğru (giriş) ya da kavşaktan dışarı (çıkış); kapalı. */
export type LegMode = 'iki' | 'giris' | 'cikis' | 'kapali';
export const LEG_MODE_NAME: Record<LegMode, string> = { iki: 'Çift yön', giris: 'Tek yön · giriş', cikis: 'Tek yön · çıkış', kapali: 'Kapalı' };

export type IncidentKind = 'crash' | 'breakdown' | 'parked' | 'wedding';

/** Yoldaki bir olay: kendiliğinden geç çözülür, trafik ekibi gelirse çabuk. */
export interface Incident {
  id: number;
  kind: IncidentKind;
  at: number;
  x: number;
  y: number;
  leg?: Dir;
  text: string;
  cars: number[];
  /** Ekip çağrılmazsa kendiliğinden kalkacağı an. */
  until: number;
  team?: { sent: number; arrive: number; fix: number; from: [number, number] };
  cleared?: number;
}

export interface Phase {
  moves: MoveId[];
  /** Yeşil süresi (sn). */
  green: number;
}

export interface Plan {
  phases: Phase[];
  /** Tüm kırmızı (sn): sarıdan sonra herkes kırmızıda bekler, kavşak boşalır. */
  allRed: number;
  /** Sensörlü: beklemeyen evre atlanır, araç kalmayınca yeşil erken biter. */
  sensor?: boolean;
}

export interface LevelSpec {
  id: string;
  seed: number;
  legs: Partial<Record<Dir, LegSpec>>;
  demand: Demand[];
  peds: PedDemand[];
  events: Event[];
  /** Bölümün açılışında kontrolörde yüklü plan: çoğu zaman kötü. */
  plan: Plan;
  duration: number;
  /** Akşam karanlığı 0–1. */
  dusk?: number;
  /** Yağmur: frenler uzar, sürücüler daha geniş aralık bırakır. */
  rain?: boolean;
  /** Sarının sonunu kollayan sürücülerin oranını katlar (dolmuş durağı, taksi piyasası). */
  bold?: number;
  /** Plan elle değiştirilebilir mi (ilk bölümde yalnızca süreler). */
  lockMoves?: boolean;
  /** Rehberli bölüm: süre, rehber bitmeden dolmaz. */
  guided?: boolean;
  /** Köşelerdeki simge yapılar: cami, düğün salonu, köşk, plaza. */
  landmarks?: { kind: Landmark; corner: 'NE' | 'NW' | 'SE' | 'SW' }[];
}

export type Landmark = 'cami' | 'dugun' | 'kosk' | 'plaza';

export type Kind = 'car' | 'taxi' | 'dolmus' | 'bus' | 'truck' | 'ambulance' | 'vip' | 'police';

export interface Path {
  pts: [number, number][];
  cum: number[];
  len: number;
  /** Duruş çizgisinin yol üstündeki uzaklığı. */
  stop: number;
  /** Kavşak kutusundan çıkış uzaklığı. */
  boxOut: number;
  /** Sola dönenin kutunun içinde bekleyeceği nokta. */
  wait: number;
  /** Geçtiği yaya geçitleri: kol, yol üstünde başlangıç-bitiş, geçit üstündeki konum (0–1). */
  cross: { leg: Dir; s0: number; s1: number; at: number }[];
  /** Kutudaki parçanın örnekleri (çarpışma denetimi için). */
  box: [number, number][];
}

export interface Car {
  id: number;
  kind: Kind;
  mv: `${Dir}.${Turn}`;
  lane: number;
  exitLane: number;
  path: Path;
  s: number;
  v: number;
  len: number;
  color: number;
  born: number;
  /** Serbest akışta harcayacağı süre: gecikme bundan hesaplanır. */
  free: number;
  waited: number;
  /** Sarıda karar: geçecek mi, duracak mı. */
  amber?: 'go' | 'stop';
  /** Kırmızıyı kollayan sürücü: sarının sonunu da geçer. */
  bold: boolean;
  braking: boolean;
  /** Duruş çizgisini geçtiği andaki ışık. */
  entry?: SignalState;
  crashed?: number;
  /** Arızalı: şeridinde durur, dörtlüleri yanar. */
  broken?: boolean;
}

export interface Ped {
  id: number;
  leg: Dir;
  /** +1: geçidin sol ucundan sağına (kol yönüne göre), −1 tersi. */
  dir: 1 | -1;
  /** Geçit üstünde 0–1; yürümeye başlamadan önce kaldırımda bekler. */
  t: number;
  walking: boolean;
  speed: number;
  side: number;
  since: number;
  /** Işığı beklemeyip geçen. */
  jay?: boolean;
  color: number;
  hit?: boolean;
}

export type SignalState = 'green' | 'amber' | 'red';

export interface Controller {
  phase: number;
  /** Evrenin içindeki saniye. */
  t: number;
  stage: 'green' | 'amber' | 'allred';
  /** Elle tutuluyor: yeşil biteni beklemez. */
  hold: boolean;
  /** Sıradaki evre elle seçildiyse. */
  next: number | null;
  /** Yeşil, en kısa süre dolar dolmaz bitecek. */
  cut: boolean;
}

export interface LogLine {
  t: number;
  text: string;
  tone: 'bad' | 'good' | 'info';
  /** Sürücü sesi: ekranda korna çalar. */
  horn?: boolean;
}

export interface Crash {
  at: number;
  x: number;
  y: number;
  cars: number[];
  ped?: boolean;
}

export const DT = 0.1;
export const LANE_W = 3.3;
export const SIDEWALK = 5;
export const CROSSWALK_W = 4;
/** Kolun boyu: araçlar buradan doğar, kuyruk buraya dayanırsa kavşak kilitlenir. */
export const LEG_LEN = 150;
export const AMBER = 3;
export const MIN_GREEN = 5;
/** Yayanın yürüme hızı (m/sn) ve yeşilin başında karşıya adım atmak için gereken süre. */
export const PED_V = 1.2;
export const PED_START = 5;
export const PED_PATIENCE = 75;
export const ACCEL = 2.2;
export const BRAKE = 3.2;
export const HARD_BRAKE = 6;
export const HEADWAY = 1.3;
export const GAP = 2;
export const TURN_V = 6.5;
/** Sola dönen, karşıdan gelene bu kadar saniyelik aralık bulunca döner. */
export const GAP_ACCEPT = 4.5;
/** Kazalı araçlar: ekip çağrılmazsa bu kadar saniye sonra çekilir. */
export const CRASH_CLEAR = 90;
/** Yol düzeni yüzünden ara sokaklara sapan aracın gecikmesi (sn). */
export const DETOUR = 40;
/** Trafik ekibinin hızı (m/sn) ve yola çıkış süresi. */
export const TEAM_V = 14;
export const TEAM_READY = 3;
export const CAR_COLORS = ['#ecebe6', '#b9bdc3', '#26282d', '#7d2620', '#36547a', '#59684a', '#cdb88c', '#6c7077', '#9d3a2a', '#dcd9cf', '#1f3a5c', '#eceae0'];
export const PED_COLORS = ['#c04a3a', '#2f5d8a', '#3f6b3a', '#d6a640', '#6b4a8a', '#2b2b2b', '#e3e0d6', '#a35a2a', '#4a7f8c'];

export const legOf = (m: MoveId) => m[0] as Dir;
export const turnOf = (m: MoveId) => m[2] as Turn | 'P';
export const moveName = (m: MoveId) => `${DIR_NAME[legOf(m)]} ${TURN_NAME[turnOf(m)]}`;
