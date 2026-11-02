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
  /** Kolun boyu (m): komşu kavşağa bağlanan kolda iki kavşak arasındaki yolun yarısı. */
  len?: number;
  /** Komşu kavşaktan bu kola gelen araçların dönüş payları (yoksa düz ağırlıklı). */
  split?: Partial<Record<Turn, number>>;
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

/** Olayın geçtiği kavşak (`node`, ağdaki kavşağın kimliği; yoksa ilk kavşak). */
export type Event = (
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
  | { at: number; kind: 'motorcade'; mv: `${Dir}.${Turn}`; n: number; text: string }
  /**
   * Görev: yol çalışması. `at`ta ekip kolda çalışmaya başlar, `sec` saniye sürer; o sürede kol
   * kapalı olmalı (oyuncu Yollar panelinden kapatır, trafik öbür yollara çevrilir).
   */
  | { at: number; kind: 'roadwork'; leg: Dir; sec: number; text: string }
  /**
   * Olay: kontrolör arızası. Işıklar sarı flaşöre geçer, kavşak "dur, bak, geç" işler: her koldan
   * sırayla. Teknik ekip gelene ya da `sec` dolana kadar sürer.
   */
  | { at: number; kind: 'fault'; sec: number; text: string }
  /** Hava: yağmur başlar; frenler uzar, sürücüler yavaşlar, aralık açılır. */
  | { at: number; kind: 'rain'; text: string }
) & { node?: string };

/**
 * Zorluk (Kolay / Normal / Zor): rahatta trafik ve aceleci sürücü azdır, geçer not düşüktür; uzmanda tersi. Normal,
 * bölümlerin ayarlandığı hâldir.
 */
export type Difficulty = 'rahat' | 'normal' | 'uzman';
export const DIFFICULTY: Record<Difficulty, { name: string; note: string; demand: number; bold: number; pass: number }> = {
  rahat: { name: 'Kolay', note: 'Daha az araç, daha sakin sürücüler; geçer not 50.', demand: 0.78, bold: 0.5, pass: 50 },
  normal: { name: 'Normal', note: 'Kavşaklar tasarlandığı gibi; geçer not 60.', demand: 1, bold: 1, pass: 60 },
  uzman: { name: 'Zor', note: 'Daha yoğun trafik, daha aceleci sürücüler; geçer not 70.', demand: 1.1, bold: 1.4, pass: 70 },
};

export type IncidentKind = 'crash' | 'breakdown' | 'parked' | 'wedding' | 'roadwork' | 'fault';

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
  /**
   * Ekip: trafik polisi motosikletle şeritlerin arasından gelir (`moto` yolu). Kaza, arıza ve
   * parkta bir kolun giden şeridini kapatır; şerit boşalınca çekici o şeritten girer (`tow`
   * yolu), aracı yükleyip aynı yoldan çıkar. Düğünde polis yalnızca ikna eder.
   */
  team?: {
    sent: number;
    arrive: number;
    fix: number;
    leg: Dir;
    moto: [number, number][];
    tow?: { path: [number, number][]; start?: number; arrive?: number; leave?: number; done?: number; color?: number };
    /** Oyuncu çağırmadı, başka bir ihbarla geldi. */
    auto?: boolean;
  };
  cleared?: number;
}

export interface Phase {
  moves: MoveId[];
  /** Yeşil süresi (sn). */
  green: number;
  /** Kırmızıda tutuluyor: sırası gelince atlanır (oyuncu kırmızı lambaya bastı). */
  off?: boolean;
  /** Bu ışığın kendi sarısı ve ardından gelen "hepsi kırmızı" süresi (yoksa kavşağınki). */
  amber?: number;
  allRed?: number;
}

export interface Plan {
  phases: Phase[];
  /** Tüm kırmızı (sn): sarıdan sonra herkes kırmızıda bekler, kavşak boşalır. */
  allRed: number;
  /** Sarı süresi (sn); yoksa 3. */
  amber?: number;
  /**
   * Dedektörlü (trafik uyarmalı) çalışma: yoldaki algılayıcı araç görmezse yeşil erken biter,
   * kimsenin beklemediği evre atlanır. Evrenin yeşil süresi bu kipte en uzun yeşildir.
   */
  actuated?: boolean;
}

/** Kavşağın ışık ayarı sınırları: sarı 3–6, tüm kırmızı 0–5, yeşil 5–60 saniye. */
export const LIMITS = { green: [5, 60], amber: [3, 6], allRed: [0, 5] } as const;
export const amberOf = (p: Plan) => p.amber ?? AMBER_DEFAULT;
/** Bir ışığın sarısı ve söndükten sonraki "hepsi kırmızı" süresi: kendi ayarı, yoksa kavşağınki. */
export const amberAt = (p: Plan, i: number) => p.phases[i]?.amber ?? amberOf(p);
export const allRedAt = (p: Plan, i: number) => p.phases[i]?.allRed ?? p.allRed;

/** Ağdaki bir kavşak: kendi kolları, dış talebi, yayaları ve kontrolör planı. */
export interface NodeSpec {
  id: string;
  /** Panelde ve sekmede: "Barbaros". */
  name: string;
  /** Dünyadaki yeri (m); kavşaklar doğu-batı yönünde bir sıra boyunca dizilir. */
  x: number;
  legs: Partial<Record<Dir, LegSpec>>;
  /** Dış talep: yalnızca komşuya bağlanmayan kollardan. */
  demand: Demand[];
  peds: PedDemand[];
  plan: Plan;
  landmarks?: { kind: Landmark; corner: 'NE' | 'NW' | 'SE' | 'SW' }[];
}

/** Bölümde açık araçlar: sırayla açılır. */
export interface Tools {
  /** Yeşil, sarı ve tüm kırmızı süreleri ayarlanabilir. */
  timing?: boolean;
  /** Yollar paneli: kolu kapatıp trafiği çevirmek. */
  roads?: boolean;
  /** Dedektör anahtarı: kavşak sabit süre yerine yoldaki araca göre çalışır. */
  detect?: boolean;
  /** Yeşil dalga: caddedeki kavşakların döngüsü eşitlenir, ışıklar araç hızına göre kaydırılır. */
  wave?: boolean;
}

/** Semtin karakteri: kıyıdaysa deniz (kavşaktan kuzeye ya da güneye `at` metrede), iş merkeziyse plazalar. */
export interface City {
  sea?: { dir: 'N' | 'S'; at: number };
  towers?: boolean;
}

export interface NetSpec {
  id: string;
  city?: City;
  seed: number;
  nodes: NodeSpec[];
  events: Event[];
  duration: number;
  dusk?: number;
  rain?: boolean;
  bold?: number;
  tools: Tools;
}

/** Tek bir kavşağın simülasyonuna giden biçim: ağ her kavşak için bundan bir tane kurar. */
export interface LevelSpec {
  id: string;
  city?: City;
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
  /** Yeşil süreleri sabit mi (ilk bölümde oyuncu yalnızca evre kartlarına dokunur). */
  lockGreen?: boolean;
  /** Köşelerdeki simge yapılar: cami, düğün salonu, köşk, plaza. */
  landmarks?: { kind: Landmark; corner: 'NE' | 'NW' | 'SE' | 'SW' }[];
}

export type Landmark = 'cami' | 'dugun' | 'kosk' | 'plaza' | 'park';

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
  /** Konvoy aracı kavşağı geçti (sayıldı). */
  passed?: boolean;
  /** Ara sokağa sapacak: yolunun bu noktasında (m) haritadan çıkar. */
  out?: number;
  /** Ara sokaktan katıldı: çizimde ilk metrelerde sokaktaki duruşundan şeride döner. */
  enter?: { x: number; y: number; a: number; s: number };
}

/**
 * Işıksız ara sokak: kolun kavşaktan `at` metre ötesinde ana yola dik bağlanır. `side` +1 ise gelen
 * şeritlerin yanında (sokaktan çıkan sağa dönüp kavşağa doğru katılır, yol verir), −1 ise giden
 * şeritlerin yanında (kavşaktan çıkanlardan bazıları sağa sapıp sokağa girer).
 */
export interface SideStreet {
  leg: Dir;
  at: number;
  side: 1 | -1;
  name: string;
  /** Çıkmaz sokak: kısa, sonu kapalı (yalnızca görüntü). */
  short: boolean;
}

/** Ara sokakta ana yola çıkmayı bekleyen araç. */
export interface SideCar {
  mv: `${Dir}.${Turn}`;
  born: number;
  kind: Kind;
  color: number;
  id: number;
  /** Sokağın ağzına (yol ver çizgisine) geldiği an. */
  head?: number;
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
  /** Önü araçla kesilip kaç saniyedir durduğu: uzarsa aracın çevresinden dolaşır. */
  stuck?: number;
}

export type SignalState = 'green' | 'amber' | 'red';

export interface Controller {
  phase: number;
  /** Evrenin içindeki saniye. */
  t: number;
  stage: 'green' | 'amber' | 'allred';
  /** Tutuluyor: yeşil süresi dolsa da bitmez. */
  hold: boolean;
  /** Sıradaki evre elle seçildiyse. */
  next: number | null;
  /** Yeşil, en kısa süre dolar dolmaz bitecek. */
  cut: boolean;
  /** Bu evrenin yeşiline eklenen (eksi ise kısılan) saniye: yeşil dalgaya geçişte. */
  bonus?: number;
  /** Yeşil dalgaya oturmak için daha dağıtılacak saniye. */
  shift?: number;
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
export const LEG_LEN = 240;
/** Şehrin kavşaktan her yöne uzanışı (m): ana yollar, ara ve arka sokaklar buraya kadar çizilir. */
export const CITY = 1400;
/** Kolun gerisinde bu kadar araç birikince kavşak kilitlenir. */
export const JAM = 15;
/** Ara sokağın genişliği (iki şerit) ve kaldırımı (m). */
export const SIDE_W = 6.4;
export const SIDE_WALK = 2;
/** Ara sokaktan ana yola çıkan sürücünün aradığı boşluk (sn) ve çizgide bakınma süresi. */
export const SIDE_GAP = 2.4;
export const SIDE_LOOK = 1.2;
export const AMBER_DEFAULT = 3;
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
/** Trafik ekibinin hızı (m/sn) ve yola çıkış süresi. */
export const TEAM_V = 14;
/** Kapalı yol yüzünden ara sokaklara sapan aracın gecikmesi (sn). */
export const DETOUR = 40;
/** Çekicinin hızı (m/sn) ve aracı yükleme süresi. */
export const TOW_V = 10;
export const TOW_LOAD = 4;
export const TEAM_READY = 3;
export const CAR_COLORS = ['#ecebe6', '#b9bdc3', '#26282d', '#7d2620', '#36547a', '#59684a', '#cdb88c', '#6c7077', '#9d3a2a', '#dcd9cf', '#1f3a5c', '#eceae0'];
export const PED_COLORS = ['#c04a3a', '#2f5d8a', '#3f6b3a', '#d6a640', '#6b4a8a', '#2b2b2b', '#e3e0d6', '#a35a2a', '#4a7f8c'];

export const legOf = (m: MoveId) => m[0] as Dir;
/** Bekleyen aracın anahtarı: "N.T" ya da özel araçta "amb:N.T" (ambulans), "bus:", "vip:", "pol:". */
export const moveOfKey = (k: string) => k.replace(/^(amb|bus|vip|pol):/, '') as `${Dir}.${Turn}`;
export const turnOf = (m: MoveId) => m[2] as Turn | 'P';
export const moveName = (m: MoveId) => `${DIR_NAME[legOf(m)]} ${TURN_NAME[turnOf(m)]}`;
