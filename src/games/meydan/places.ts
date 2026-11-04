import { BLANK_SITE, BLANK_SPEC, GROUND, makeItem, topOf, type BuildingShape, type Design, type Item, type ItemKind, type Place, type PlaceId, type Spec } from './model';

/*
 * Meydanlar ve bugünkü hâlleri: dört bölgeden dört sokak. Her binanın biçimi ve kusurları sabittir;
 * tabelalar, afişler, klimalar, termosifonlar ve kablolar meydanın "kirli" hâlidir ve oyuncu
 * bunları söküp yeniden düzenler. Dükkân adları uydurmadır; gerçek bir işletmeye ya da markaya
 * benzemesi amaçlanmamıştır. Bina sıraları o bölgenin tipik sokaklarından derlenmiştir, birebir
 * bir sokağın kopyası değildir.
 */

const item = (id: string, kind: ItemKind, x: number, y: number, w: number, h: number, fill: string, color: string, text = ''): Item => makeItem(kind, { id, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), fill, color, text });
const spec = (id: string, wall: string, trim: string, shop: string): Spec => ({ id, wall, trim, shop, ...BLANK_SPEC });
const design = (place: PlaceId, specs: Spec[], items: Item[]): Design => ({ v: 2, place, specs, site: { ...BLANK_SITE }, items });

const KLIMA = ['#e9e8e2', '#8a8a84'] as const;
const ANTEN = ['#e3e3de', '#6d6d68'] as const;

/**
 * Binaya göre yerleştiren kısayollar: `n` zeminden sayılan kat (1 = birinci kat), `fx` binanın
 * genişliğinde soldan oran. Böylece tabelalar ve klimalar binanın biçimi değişse de yerinde kalır.
 */
function kit(buildings: BuildingShape[]) {
  let k = 0;
  const id = () => `k${++k}`;
  const B = (bid: string) => buildings.find((b) => b.id === bid)!;
  const shop = (b: BuildingShape) => GROUND - b.groundH;
  // bırakılmış kaçak katın üstü: antenler ve depolar oraya çıkar
  const roof = (b: BuildingShape) => topOf(b) - (b.defects?.illegal ? b.floorH : 0) - (b.roof === 'kirma' ? 30 : 0);
  return {
    pano: (bid: string, text: string, fill: string, color: string, fx = 0.03, fw = 0.94) => {
      const b = B(bid);
      return item(id(), 'pano', b.x + b.w * fx, shop(b) - 4, b.w * fw, 32, fill, color, text);
    },
    afis: (bid: string, n: number, text: string, fill: string, color: string, fx = 0.12, fw = 0.7, h = 56) => {
      const b = B(bid);
      return item(id(), 'afis', b.x + b.w * fx, shop(b) - n * b.floorH + 4, b.w * fw, h, fill, color, text);
    },
    folyo: (bid: string, text: string, fill: string, color: string, fx = 0.06, fw = 0.5, n = 0) => {
      const b = B(bid);
      return item(id(), 'folyo', b.x + b.w * fx, n ? shop(b) - n * b.floorH + b.floorH * 0.18 : shop(b) + 40, b.w * fw, n ? b.floorH * 0.5 : 32, fill, color, text);
    },
    kutu: (bid: string, text: string, fill: string, color: string, fx = 0.8, w = 44) => {
      const b = B(bid);
      return item(id(), 'kutu', b.x + b.w * fx, shop(b) + 36, w, 38, fill, color, text);
    },
    bayrak: (bid: string, n: number, text: string, fill: string, color: string, fx = 0.86) => {
      const b = B(bid);
      return item(id(), 'bayrak', b.x + b.w * fx, shop(b) - n * b.floorH, 28, 100, fill, color, text);
    },
    tente: (bid: string, fill: string, color: string, fx = 0.04, fw = 0.9) => {
      const b = B(bid);
      return item(id(), 'tente', b.x + b.w * fx, shop(b) + 30, b.w * fw, 26, fill, color);
    },
    klima: (bid: string, n: number, fx: number) => {
      const b = B(bid);
      return item(id(), 'klima', b.x + b.w * fx, shop(b) - (n - 1) * b.floorH - 38, 48, 34, ...KLIMA);
    },
    baca: (bid: string, n: number, fx: number) => {
      const b = B(bid);
      return item(id(), 'baca', b.x + b.w * fx, shop(b) - n * b.floorH - 18, 30, 60, '#5b5b58', '#2a2a28');
    },
    anten: (bid: string, fx: number) => {
      const b = B(bid);
      return item(id(), 'anten', b.x + b.w * fx, roof(b) - 40, 36, 40, ...ANTEN);
    },
    gunes: (bid: string, fx: number) => {
      const b = B(bid);
      return item(id(), 'gunes', b.x + b.w * fx, roof(b) - 44, 70, 44, '#2c4a6e', '#e9e8e2');
    },
    depo: (bid: string, fx: number) => {
      const b = B(bid);
      return item(id(), 'depo', b.x + b.w * fx, roof(b) - 34, 40, 34, '#3d7cc9', '#2b5c99');
    },
    kablo: (x: number, y: number, w: number) => item(id(), 'kablo', x, y, w, 28, '#1e1e1e', '#1e1e1e'),
  };
}

/* ── Marmara: İstanbul, Bakırköy ── */

// Bakırköy Cumhuriyet (Özgürlük) Meydanı, bayrak direğinin arkasındaki sıra: soldan Marmaray
// istasyonu, beyaz kâgir bina, kiremit çatılı apartmanlar, tuğla han ve yeşil sundurmalı tek katlı
// dükkânlar. Wikimedia Commons'taki fotoğraflara bakılarak çizildi (Mereyü, 2021 ve Zach1055,
// 2026; ikisi de CC BY-SA 4.0). Kusurlar oyun için eklenmiştir.
const BAKIRKOY_BUILDINGS: BuildingShape[] = [
  { id: 'b1', name: 'İstasyon binası', x: 0, w: 170, floors: 1, floorH: 56, groundH: 90, cols: 4, balcony: false, roof: 'duz', facade: 'cam', year: 2013, risk: 0 },
  { id: 'b2', name: 'Beyaz kâgir bina', x: 170, w: 210, floors: 2, floorH: 60, groundH: 90, cols: 4, balcony: false, roof: 'kirma', facade: 'tas', year: 1928, risk: 1, defects: { cracked: true } },
  { id: 'b3', name: 'Kiremit çatılı apartman', x: 380, w: 150, floors: 4, floorH: 48, groundH: 90, cols: 3, balcony: true, roof: 'kirma', facade: 'apartman', year: 1968, risk: 1, defects: { enclosed: true } },
  { id: 'b4', name: 'Somon cumbalı apartman', x: 530, w: 140, floors: 5, floorH: 46, groundH: 90, cols: 4, balcony: false, roof: 'kirma', facade: 'cumba', year: 1956, risk: 1, defects: { bare: true } },
  { id: 'b5', name: 'Köşe apartmanı', x: 670, w: 170, floors: 5, floorH: 48, groundH: 90, cols: 3, balcony: true, roof: 'duz', facade: 'apartman', year: 1978, risk: 1, defects: { illegal: 'pvc' } },
  { id: 'b6', name: 'Tuğla han', x: 840, w: 130, floors: 4, floorH: 50, groundH: 90, cols: 2, balcony: false, roof: 'kornis', facade: 'tugla', year: 1924, risk: 1, defects: { patch: 'kompozit' } },
  { id: 'b7', name: 'Yeşil sundurmalı dükkânlar', x: 970, w: 230, floors: 0, floorH: 48, groundH: 90, cols: 1, balcony: false, roof: 'sundurma', facade: 'apartman', year: 1990, risk: 0 },
];

const BAKIRKOY = design(
  'bakirkoy',
  [
    spec('b1', '#d9dcdf', '#7d868e', '#5b6670'),
    spec('b2', '#ece8df', '#d2cbbd', '#4a4a48'),
    spec('b3', '#e2cdb0', '#f1ebe0', '#6b5a4a'),
    spec('b4', '#dba48c', '#f3ece2', '#7d7570'),
    spec('b5', '#cfc6b5', '#8e959c', '#3f4a52'),
    spec('b6', '#93573f', '#d8cdb8', '#3a2a20'),
    spec('b7', '#2f5d46', '#2f6b4f', '#38423f'),
  ],
  [
    // istasyon: tabelanın yanında simitçi ve kiralık dükkân afişi
    item('k1', 'pano', 8, 440, 154, 24, '#f4f4f2', '#1d2a44', 'BAKIRKÖY İSTASYONU'),
    item('k2', 'kutu', 14, 478, 96, 28, '#c8102e', '#ffffff', 'SİMİT • POĞAÇA'),
    item('k3', 'folyo', 112, 504, 50, 40, '#ffdf00', '#111111', 'KİRALIK'),
    item('k4', 'klima', 120, 384, 48, 34, ...KLIMA),
    // beyaz kâgir bina: kemerli pencerelerin önünde dev açılış afişi, altta dönerci ve optik
    item('k5', 'pano', 176, 466, 198, 34, '#d71920', '#ffd200', 'LEZZET DÖNER'),
    item('k6', 'afis', 196, 372, 158, 70, '#c8102e', '#ffffff', 'BÜYÜK AÇILIŞ'),
    item('k7', 'bayrak', 360, 380, 28, 96, '#1d2a44', '#ffffff', 'OPTİK'),
    item('k8', 'klima', 186, 314, 48, 34, ...KLIMA),
    item('k9', 'kablo', 150, 330, 260, 30, '#1e1e1e', '#1e1e1e'),
    // kiremit çatılı apartman: eczane, dershane folyosu, turuncu tente, çatıda su deposu
    item('k10', 'pano', 384, 468, 142, 30, '#ffffff', '#d0021b', 'ECZANE'),
    item('k11', 'kutu', 500, 404, 26, 36, '#d0021b', '#ffffff', 'E'),
    item('k12', 'folyo', 392, 324, 124, 40, '#ffee00', '#0a0a0a', 'KURS MERKEZİ'),
    item('k13', 'tente', 390, 500, 130, 26, '#ef7d00', '#ffffff'),
    item('k32', 'depo', 470, 214, 40, 34, '#3d7cc9', '#2b5c99'),
    // somon cumbalı apartman: köfteci, satılık afişi
    item('k14', 'pano', 534, 466, 132, 34, '#f26b1d', '#ffffff', 'TASTY KÖFTE'),
    item('k15', 'afis', 548, 300, 104, 54, '#ffd200', '#111111', 'SAHİBİNDEN SATILIK'),
    item('k16', 'klima', 612, 392, 48, 34, ...KLIMA),
    item('k17', 'anten', 560, 196, 36, 40, ...ANTEN),
    // köşe apartmanı: tekel, döviz, diyetisyen; kaçak katın üstünde anten
    item('k18', 'pano', 674, 466, 162, 32, '#5a2d82', '#ffd200', 'TEKEL • MARKET'),
    item('k19', 'bayrak', 826, 330, 28, 110, '#0b3d91', '#ffffff', 'DÖVİZ'),
    item('k20', 'folyo', 690, 380, 130, 34, '#ffffff', '#2e9d4f', 'DİYETİSYEN'),
    item('k21', 'kutu', 784, 506, 46, 36, '#1a237e', '#ffeb3b', 'LOTO'),
    item('k22', 'klima', 690, 290, 48, 34, ...KLIMA),
    item('k23', 'anten', 790, 142, 36, 40, ...ANTEN),
    // tuğla han: kuyumcu, pembe takı afişi
    item('k24', 'pano', 844, 466, 122, 32, '#141414', '#e8c35a', 'KUYUMCU'),
    item('k25', 'afis', 856, 330, 100, 56, '#e0457b', '#ffffff', 'TAKI %40'),
    item('k26', 'kablo', 800, 300, 220, 26, '#1e1e1e', '#1e1e1e'),
    // yeşil sundurmalı dükkânlar: büfe, sarı siyah kampanya bezleri, ATM
    item('k27', 'pano', 976, 452, 140, 30, '#ff7a00', '#ffffff', 'ÇARŞI BÜFE'),
    item('k28', 'afis', 1120, 448, 76, 46, '#ffdf00', '#111111', 'KAMPANYA'),
    item('k29', 'folyo', 986, 506, 110, 32, '#111111', '#ffdf00', '3 AL 2 ÖDE'),
    item('k30', 'kutu', 1150, 504, 42, 38, '#c8102e', '#ffffff', 'ATM'),
    item('k31', 'klima', 1090, 412, 48, 34, ...KLIMA),
  ],
);

/* ── Karadeniz: Rize ── */

// Rize merkezde sahile paralel bir cadde: dik yamaçlara sıkışmış yedi katlı bloklar, aralarında
// kalmış ahşap cumbalı ev ve taş konak, çatılarda sonradan çakılmış trapez sac katlar, yağmurdan
// kararmış sıva, pencerelerden çıkan soba boruları.
const RIZE_BUILDINGS: BuildingShape[] = [
  { id: 'b1', name: 'Çay ocaklı iş hanı', x: 0, w: 150, floors: 5, floorH: 44, groundH: 88, cols: 3, balcony: true, roof: 'duz', facade: 'apartman', year: 1979, risk: 2, defects: { illegal: 'sac', enclosed: true } },
  { id: 'b2', name: 'Yeşil cumbalı apartman', x: 150, w: 140, floors: 6, floorH: 44, groundH: 88, cols: 4, balcony: false, roof: 'kirma', facade: 'cumba', year: 1986, risk: 1, defects: { bare: true } },
  { id: 'b3', name: 'Eski taş konak', x: 290, w: 170, floors: 2, floorH: 56, groundH: 88, cols: 3, balcony: false, roof: 'kirma', facade: 'tas', year: 1908, risk: 1, defects: { cracked: true, patch: 'seramik' } },
  { id: 'b4', name: 'Yedi katlı blok', x: 460, w: 190, floors: 7, floorH: 44, groundH: 88, cols: 4, balcony: true, roof: 'duz', facade: 'apartman', year: 1994, risk: 1, defects: { illegal: 'briket', enclosed: true, patch: 'kompozit' } },
  { id: 'b5', name: 'Belediye pasajı', x: 650, w: 180, floors: 4, floorH: 46, groundH: 88, cols: 4, balcony: false, roof: 'duz', facade: 'apartman', year: 1988, risk: 2, defects: { leanTo: true } },
  { id: 'b6', name: 'Ahşap cumbalı ev', x: 830, w: 120, floors: 3, floorH: 46, groundH: 88, cols: 2, balcony: false, roof: 'kirma', facade: 'cumba', year: 1932, risk: 1, defects: { bare: true } },
  { id: 'b7', name: 'Pastaneli apartman', x: 950, w: 150, floors: 5, floorH: 44, groundH: 88, cols: 3, balcony: true, roof: 'duz', facade: 'apartman', year: 2001, risk: 0, defects: { illegal: 'pvc', patch: 'seramik' } },
  { id: 'b8', name: 'Balıkçı barakası', x: 1100, w: 100, floors: 0, floorH: 44, groundH: 88, cols: 1, balcony: false, roof: 'sundurma', facade: 'apartman', year: 1997, risk: 0 },
];

const r = kit(RIZE_BUILDINGS);
const RIZE = design(
  'rize',
  [
    spec('b1', '#c9c4b6', '#8e959c', '#3c454c'),
    spec('b2', '#9fbf9a', '#eef0e6', '#45524a'),
    spec('b3', '#d8cfbd', '#b8ad97', '#4c4036'),
    spec('b4', '#e6dcc4', '#8b9298', '#3a4248'),
    spec('b5', '#b7b8b0', '#6c7a74', '#33403b'),
    spec('b6', '#c98f6b', '#f0e6d6', '#5b4838'),
    spec('b7', '#f1d3c2', '#ffffff', '#6e5e55'),
    spec('b8', '#2a6386', '#1f4f6e', '#2c3a44'),
  ],
  [
    r.pano('b1', 'ÇAY OCAĞI', '#2e7d32', '#ffffff'),
    r.afis('b1', 3, 'SATILIK DAİRE', '#ffdf00', '#111111'),
    r.baca('b1', 2, 0.78),
    r.anten('b1', 0.2),
    r.pano('b2', 'MUHLAMA • KUYMAK', '#d71920', '#ffffff'),
    r.klima('b2', 3, 0.02),
    r.baca('b2', 4, 0.86),
    r.afis('b2', 5, 'KİRALIK', '#ffffff', '#d50000', 0.2, 0.6, 46),
    r.pano('b3', 'MOBİLYA DÜNYASI', '#0b3d91', '#ffffff'),
    r.afis('b3', 2, 'SEZON SONU %70', '#e0457b', '#ffffff', 0.1, 0.8, 60),
    r.klima('b3', 1, 0.82),
    r.pano('b4', 'ECZANE', '#ffffff', '#d0021b', 0.03, 0.5),
    r.pano('b4', 'TELEFONCU', '#ff7a00', '#ffffff', 0.53, 0.44),
    r.folyo('b4', 'YKS • LGS KURSU', '#ffee00', '#0a0a0a', 0.1, 0.8, 3),
    r.kutu('b4', 'E', '#d0021b', '#ffffff', 0.4, 30),
    r.klima('b4', 2, 0.02),
    r.klima('b4', 5, 0.74),
    r.anten('b4', 0.3),
    r.anten('b4', 0.62),
    r.depo('b4', 0.82),
    r.pano('b5', 'PASAJ • ÇARŞI', '#5a2d82', '#ffd200'),
    r.afis('b5', 2, 'OFİS KİRALIK', '#d71920', '#ffffff', 0.15, 0.7, 50),
    r.bayrak('b5', 3, 'DÖVİZ', '#0b3d91', '#ffffff', 0.86),
    r.klima('b5', 3, 0.08),
    r.pano('b6', 'HAMSİ & PİDE', '#f26b1d', '#ffffff'),
    r.tente('b6', '#c8102e', '#ffffff'),
    r.baca('b6', 2, 0.1),
    r.pano('b7', 'PASTANE', '#e0457b', '#ffffff'),
    r.folyo('b7', 'DÜĞÜN PASTASI', '#ffffff', '#e0457b', 0.08, 0.6),
    r.klima('b7', 4, 0.04),
    r.anten('b7', 0.5),
    r.pano('b8', 'BALIK', '#ffffff', '#0b3d91', 0.05, 0.9),
    r.folyo('b8', 'TAZE HAMSİ', '#111111', '#ffdf00', 0.08, 0.8),
    r.kablo(120, 300, 220),
    r.kablo(620, 340, 260),
    r.kablo(900, 380, 220),
  ],
);

/* ── Ege: İzmir, Kemeraltı ── */

// Konak'tan Kemeraltı'na giren bir cadde: Levanten taş evler, cumbalı Rum evleri ve aralarına
// yetmişlerde yapılmış altı katlı işhanları. Kumaşçıların tenteleri, termosifonlar, dev tabelalar.
const IZMIR_BUILDINGS: BuildingShape[] = [
  { id: 'b1', name: 'Levanten taş ev', x: 0, w: 180, floors: 2, floorH: 58, groundH: 92, cols: 3, balcony: false, roof: 'kirma', facade: 'tas', year: 1889, risk: 1, defects: { bare: true, cracked: true } },
  { id: 'b2', name: 'Cumbalı Rum evi', x: 180, w: 140, floors: 2, floorH: 56, groundH: 92, cols: 3, balcony: false, roof: 'kirma', facade: 'cumba', year: 1905, risk: 1, defects: { patch: 'seramik' } },
  { id: 'b3', name: 'Altı katlı işhanı', x: 320, w: 200, floors: 6, floorH: 44, groundH: 92, cols: 4, balcony: true, roof: 'duz', facade: 'apartman', year: 1972, risk: 2, defects: { enclosed: true, illegal: 'sac' } },
  { id: 'b4', name: 'Eski otel', x: 520, w: 170, floors: 3, floorH: 54, groundH: 92, cols: 3, balcony: false, roof: 'kornis', facade: 'tas', year: 1912, risk: 1, defects: { patch: 'kompozit' } },
  { id: 'b5', name: 'Köşe apartmanı', x: 690, w: 160, floors: 5, floorH: 46, groundH: 92, cols: 3, balcony: true, roof: 'duz', facade: 'apartman', year: 1981, risk: 1, defects: { leanTo: true } },
  { id: 'b6', name: 'Tuğla depo', x: 850, w: 150, floors: 2, floorH: 56, groundH: 92, cols: 2, balcony: false, roof: 'kornis', facade: 'tugla', year: 1921, risk: 1, defects: { bare: true } },
  { id: 'b7', name: 'Kumaşçılar sırası', x: 1000, w: 200, floors: 0, floorH: 46, groundH: 92, cols: 1, balcony: false, roof: 'sundurma', facade: 'apartman', year: 1975, risk: 0 },
];

const iz = kit(IZMIR_BUILDINGS);
const IZMIR = design(
  'izmir',
  [
    spec('b1', '#e6d6b8', '#cbb894', '#4a3e30'),
    spec('b2', '#e7b8a0', '#f4ede2', '#5b4838'),
    spec('b3', '#cfd0c8', '#7e868b', '#3a4248'),
    spec('b4', '#efe2c8', '#c4b597', '#4d4032'),
    spec('b5', '#d6c9a5', '#8e959c', '#3f4a52'),
    spec('b6', '#a5603f', '#d6c6a8', '#3a2a20'),
    spec('b7', '#c9a227', '#a8861e', '#3a3324'),
  ],
  [
    iz.pano('b1', 'BOYOZ • GEVREK', '#d71920', '#ffffff'),
    iz.afis('b1', 2, 'HER ŞEY 10 ₺', '#ffdf00', '#d50000', 0.1, 0.8, 62),
    iz.klima('b1', 1, 0.8),
    iz.tente('b1', '#2e7d32', '#ffffff'),
    iz.pano('b2', 'GELİNLİK', '#ffffff', '#c2185b'),
    iz.folyo('b2', 'NİŞAN SETİ', '#e0457b', '#ffffff', 0.08, 0.7),
    iz.klima('b2', 2, 0.04),
    iz.pano('b3', 'TOPTAN KUMAŞ', '#1d2a44', '#ffffff', 0.03, 0.6),
    iz.kutu('b3', 'DÖVİZ', '#5a2d82', '#ffd200', 0.68, 56),
    iz.afis('b3', 2, 'KAPANIŞ İNDİRİMİ', '#d71920', '#ffffff', 0.12, 0.76, 60),
    iz.folyo('b3', 'DİŞ KLİNİĞİ', '#ffffff', '#0b3d91', 0.1, 0.7, 5),
    iz.klima('b3', 3, 0.02),
    iz.klima('b3', 4, 0.76),
    iz.gunes('b3', 0.1),
    iz.gunes('b3', 0.55),
    iz.pano('b4', 'KUMRU EVİ', '#f26b1d', '#ffffff'),
    iz.afis('b4', 2, 'OTEL • PANSİYON', '#0b3d91', '#ffffff', 0.14, 0.7, 48),
    iz.bayrak('b4', 3, 'OTEL', '#c8102e', '#ffffff', 0.04),
    iz.klima('b4', 3, 0.8),
    iz.pano('b5', 'KUYUMCU', '#141414', '#e8c35a'),
    iz.folyo('b5', 'ALTIN ALINIR', '#ffdf00', '#111111', 0.1, 0.6),
    iz.klima('b5', 2, 0.04),
    iz.gunes('b5', 0.5),
    iz.depo('b5', 0.1),
    iz.pano('b6', 'TUHAFİYE', '#2e7d32', '#ffffff'),
    iz.afis('b6', 1, 'DEPO SATIŞI', '#ffffff', '#d50000', 0.16, 0.68, 50),
    iz.pano('b7', 'KEMERALTI KUMAŞ', '#ffffff', '#1d2a44', 0.03, 0.6),
    iz.tente('b7', '#1565c0', '#ffffff', 0.04, 0.9),
    iz.kutu('b7', 'ATM', '#c8102e', '#ffffff', 0.74, 44),
    iz.kablo(140, 330, 240),
    iz.kablo(480, 300, 260),
  ],
);

/* ── İç Anadolu: Ankara, Kızılay ── */

// Kızılay'da Sakarya Caddesi'ne açılan bir sıra: yetmişlerin sekiz katlı apartmanları, cam
// giydirme bir işhanı, eski banka binası ve pasaj; her katta başka bir kurs, klinik ve büro.
const ANKARA_BUILDINGS: BuildingShape[] = [
  { id: 'b1', name: 'Cam giydirme işhanı', x: 0, w: 190, floors: 8, floorH: 40, groundH: 92, cols: 4, balcony: false, roof: 'duz', facade: 'cam', year: 1998, risk: 0 },
  { id: 'b2', name: 'Yetmişlerin apartmanı', x: 190, w: 160, floors: 6, floorH: 44, groundH: 92, cols: 3, balcony: true, roof: 'duz', facade: 'apartman', year: 1971, risk: 2, defects: { enclosed: true, illegal: 'pvc' } },
  { id: 'b3', name: 'Kızılay pasajı', x: 350, w: 200, floors: 5, floorH: 46, groundH: 92, cols: 4, balcony: false, roof: 'duz', facade: 'apartman', year: 1966, risk: 2, defects: { patch: 'kompozit', cracked: true } },
  { id: 'b4', name: 'Tuğla köşe apartmanı', x: 550, w: 150, floors: 5, floorH: 46, groundH: 92, cols: 3, balcony: true, roof: 'kornis', facade: 'tugla', year: 1958, risk: 1, defects: { bare: true } },
  { id: 'b5', name: 'Dar apartman', x: 700, w: 130, floors: 7, floorH: 42, groundH: 92, cols: 2, balcony: true, roof: 'duz', facade: 'apartman', year: 1984, risk: 1, defects: { illegal: 'briket', enclosed: true } },
  { id: 'b6', name: 'Eski banka binası', x: 830, w: 200, floors: 4, floorH: 52, groundH: 92, cols: 4, balcony: false, roof: 'kornis', facade: 'tas', year: 1954, risk: 1, defects: { cracked: true, leanTo: true } },
  { id: 'b7', name: 'Büfeler', x: 1030, w: 170, floors: 0, floorH: 44, groundH: 92, cols: 1, balcony: false, roof: 'sundurma', facade: 'apartman', year: 1993, risk: 0 },
];

const an = kit(ANKARA_BUILDINGS);
const ANKARA = design(
  'ankara',
  [
    spec('b1', '#7d8f9c', '#4f5d68', '#2f3b45'),
    spec('b2', '#d9cdb3', '#8e959c', '#3f4a52'),
    spec('b3', '#b8b8b2', '#7a8086', '#343b40'),
    spec('b4', '#a5603f', '#d6c6a8', '#3a2a20'),
    spec('b5', '#e1c9a0', '#f3ece2', '#6e5e55'),
    spec('b6', '#ddd4c2', '#b9ae98', '#3a3530'),
    spec('b7', '#5f6b73', '#3f4a52', '#2a2f33'),
  ],
  [
    an.afis('b1', 6, 'OFİS KATI KİRALIK', '#d71920', '#ffffff', 0.08, 0.84, 100),
    an.pano('b1', 'İŞ MERKEZİ', '#1d2a44', '#ffffff'),
    an.folyo('b1', 'NOTER', '#ffffff', '#0b3d91', 0.1, 0.5, 2),
    an.pano('b2', 'DÖNER • İSKENDER', '#f26b1d', '#ffffff'),
    an.folyo('b2', 'KPSS • ALES', '#ffee00', '#0a0a0a', 0.1, 0.8, 2),
    an.folyo('b2', 'AVUKATLIK', '#ffffff', '#1d2a44', 0.1, 0.8, 4),
    an.klima('b2', 3, 0.02),
    an.klima('b2', 5, 0.72),
    an.anten('b2', 0.4),
    an.pano('b3', 'PASAJ', '#5a2d82', '#ffd200', 0.03, 0.4),
    an.pano('b3', 'KİTABEVİ', '#0b3d91', '#ffffff', 0.45, 0.52),
    an.afis('b3', 3, 'DİŞ KLİNİĞİ', '#ffffff', '#0b3d91', 0.1, 0.8, 70),
    an.bayrak('b3', 2, 'HOSTEL', '#111111', '#ffffff', 0.88),
    an.klima('b3', 2, 0.04),
    an.klima('b3', 5, 0.7),
    an.depo('b3', 0.2),
    an.anten('b3', 0.6),
    an.pano('b4', 'ECZANE', '#ffffff', '#d0021b'),
    an.folyo('b4', 'PSİKOLOG', '#00a2e8', '#ffffff', 0.1, 0.7, 3),
    an.kutu('b4', 'E', '#d0021b', '#ffffff', 0.76, 30),
    an.klima('b4', 4, 0.02),
    an.pano('b5', 'TELEFON', '#ff7a00', '#ffffff'),
    an.afis('b5', 4, 'SATILIK', '#ffdf00', '#111111', 0.1, 0.8, 46),
    an.klima('b5', 2, 0.6),
    an.anten('b5', 0.4),
    an.pano('b6', 'DÖVİZ • ALTIN', '#141414', '#e8c35a'),
    an.afis('b6', 2, 'BÜYÜK SEZON SONU', '#e0457b', '#ffffff', 0.1, 0.8, 70),
    an.klima('b6', 3, 0.84),
    an.pano('b7', 'BÜFE • TOST', '#ffdf00', '#c8102e', 0.03, 0.62),
    an.kutu('b7', 'LOTO', '#1a237e', '#ffeb3b', 0.7, 46),
    an.folyo('b7', 'AYRAN 20 ₺', '#111111', '#ffdf00', 0.06, 0.6),
    an.kablo(160, 280, 260),
    an.kablo(520, 260, 220),
    an.kablo(800, 330, 260),
  ],
);

export const PLACES: Place[] = [
  {
    id: 'bakirkoy',
    title: 'Cumhuriyet Meydanı',
    district: 'İstanbul · Bakırköy',
    region: 'Marmara',
    blurb: 'Dev bayrağın arkasında istasyon, kiremit çatılar ve yeşil sundurmalı dükkânlar: otuzu aşkın tabela, kaçak bir PVC kat, çatlamış kâgir bina.',
    backdrop: 'istanbul',
    landmark: 'bayrak',
    stone: '#d8cbb2',
    local: ['siva', 'tas', 'tugla', 'mantolama'],
    buildings: BAKIRKOY_BUILDINGS,
    original: BAKIRKOY,
  },
  {
    id: 'rize',
    title: 'Cumhuriyet Caddesi',
    district: 'Rize · Merkez',
    region: 'Karadeniz',
    blurb: 'Çay bahçeli yamaçların dibinde yedi katlı bloklar: çatılarda trapez sac katlar, pencerelerde soba boruları, yağmurdan kararmış briket.',
    backdrop: 'karadeniz',
    landmark: 'cay',
    stone: '#9a968c',
    local: ['ahsap', 'tas', 'siva', 'mantolama'],
    buildings: RIZE_BUILDINGS,
    original: RIZE,
  },
  {
    id: 'izmir',
    title: 'Kemeraltı Girişi',
    district: 'İzmir · Konak',
    region: 'Ege',
    blurb: 'Saat Kulesi\'nin arkasında Levanten taş evler ve cumbalı Rum evleri; aralarında yetmişlerin işhanları, termosifonlar ve kumaşçı tenteleri.',
    backdrop: 'ege',
    landmark: 'saat',
    stone: '#e2d3b4',
    local: ['siva', 'tas', 'ahsap'],
    buildings: IZMIR_BUILDINGS,
    original: IZMIR,
  },
  {
    id: 'ankara',
    title: 'Sakarya Caddesi',
    district: 'Ankara · Kızılay',
    region: 'İç Anadolu',
    blurb: 'Sekiz katlı apartmanlarda her pencerede başka bir kurs, klinik, büro: kompozit yamalar, kaçak katlar ve çatlamış bir pasaj.',
    backdrop: 'bozkir',
    landmark: 'metro',
    stone: '#cfc4ae',
    local: ['siva', 'tas', 'mantolama', 'tugla'],
    buildings: ANKARA_BUILDINGS,
    original: ANKARA,
  },
];

export const placeOf = (id: PlaceId): Place => PLACES.find((p) => p.id === id) ?? PLACES[0];
