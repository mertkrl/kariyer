import { makeItem, type BuildingShape, type Design, type Item, type ItemKind, type Paint, type Place, type PlaceId } from './model';

/*
 * Meydanlar ve bugünkü hâlleri. Her binanın biçimi sabittir; tabelalar, afişler, klimalar ve
 * kablolar meydanın "kirli" hâlidir ve oyuncu bunları söküp yeniden düzenler. Dükkân adları
 * uydurmadır; gerçek bir işletmeye ya da markaya benzemesi amaçlanmamıştır.
 */

const item = (id: string, kind: ItemKind, x: number, y: number, w: number, h: number, fill: string, color: string, text = ''): Item => makeItem(kind, { id, x, y, w, h, fill, color, text });
const paint = (id: string, wall: string, trim: string, shop: string): Paint => ({ id, wall, trim, shop });

// Bakırköy Cumhuriyet (Özgürlük) Meydanı, bayrak direğinin arkasındaki sıra: soldan Marmaray
// istasyonu, beyaz kâgir bina, kiremit çatılı apartmanlar, tuğla han ve yeşil sundurmalı tek katlı
// dükkânlar. Wikimedia Commons'taki fotoğraflara bakılarak çizildi (Mereyü, 2021 ve Zach1055,
// 2026; ikisi de CC BY-SA 4.0).
const BAKIRKOY_BUILDINGS: BuildingShape[] = [
  { id: 'b1', name: 'İstasyon binası', x: 0, w: 170, floors: 1, floorH: 56, groundH: 90, cols: 4, balcony: false, roof: 'duz', facade: 'cam' },
  { id: 'b2', name: 'Beyaz kâgir bina', x: 170, w: 210, floors: 2, floorH: 60, groundH: 90, cols: 4, balcony: false, roof: 'kirma', facade: 'tas' },
  { id: 'b3', name: 'Kiremit çatılı apartman', x: 380, w: 150, floors: 4, floorH: 48, groundH: 90, cols: 3, balcony: true, roof: 'kirma', facade: 'apartman' },
  { id: 'b4', name: 'Somon cumbalı apartman', x: 530, w: 140, floors: 5, floorH: 46, groundH: 90, cols: 4, balcony: false, roof: 'kirma', facade: 'cumba' },
  { id: 'b5', name: 'Köşe apartmanı', x: 670, w: 170, floors: 5, floorH: 48, groundH: 90, cols: 3, balcony: true, roof: 'duz', facade: 'apartman', penthouse: true },
  { id: 'b6', name: 'Tuğla han', x: 840, w: 130, floors: 4, floorH: 50, groundH: 90, cols: 2, balcony: false, roof: 'kornis', facade: 'tugla' },
  { id: 'b7', name: 'Yeşil sundurmalı dükkânlar', x: 970, w: 230, floors: 0, floorH: 48, groundH: 90, cols: 1, balcony: false, roof: 'sundurma', facade: 'apartman' },
];

const BAKIRKOY: Design = {
  v: 1,
  place: 'bakirkoy',
  paints: [
    paint('b1', '#d9dcdf', '#7d868e', '#5b6670'),
    paint('b2', '#ece8df', '#d2cbbd', '#4a4a48'),
    paint('b3', '#e2cdb0', '#f1ebe0', '#6b5a4a'),
    paint('b4', '#dba48c', '#f3ece2', '#7d7570'),
    paint('b5', '#cfc6b5', '#8e959c', '#3f4a52'),
    paint('b6', '#93573f', '#d8cdb8', '#3a2a20'),
    paint('b7', '#2f5d46', '#2f6b4f', '#38423f'),
  ],
  items: [
    // istasyon: tabelanın yanında simitçi ve kiralık dükkân afişi
    item('k1', 'pano', 8, 440, 154, 24, '#f4f4f2', '#1d2a44', 'BAKIRKÖY İSTASYONU'),
    item('k2', 'kutu', 14, 478, 96, 28, '#c8102e', '#ffffff', 'SİMİT • POĞAÇA'),
    item('k3', 'folyo', 112, 504, 50, 40, '#ffdf00', '#111111', 'KİRALIK'),
    item('k4', 'klima', 120, 384, 48, 34, '#e9e8e2', '#8a8a84'),
    // beyaz kâgir bina: kemerli pencerelerin önünde dev açılış afişi, altta dönerci ve optik
    item('k5', 'pano', 176, 466, 198, 34, '#d71920', '#ffd200', 'LEZZET DÖNER'),
    item('k6', 'afis', 196, 372, 158, 70, '#c8102e', '#ffffff', 'BÜYÜK AÇILIŞ'),
    item('k7', 'bayrak', 360, 380, 28, 96, '#1d2a44', '#ffffff', 'OPTİK'),
    item('k8', 'klima', 186, 314, 48, 34, '#e9e8e2', '#8a8a84'),
    item('k9', 'kablo', 150, 330, 260, 30, '#1e1e1e', '#1e1e1e'),
    // kiremit çatılı apartman: eczane, dershane folyosu, turuncu tente
    item('k10', 'pano', 384, 468, 142, 30, '#ffffff', '#d0021b', 'ECZANE'),
    item('k11', 'kutu', 500, 404, 26, 36, '#d0021b', '#ffffff', 'E'),
    item('k12', 'folyo', 392, 324, 124, 40, '#ffee00', '#0a0a0a', 'KURS MERKEZİ'),
    item('k13', 'tente', 390, 500, 130, 26, '#ef7d00', '#ffffff'),
    // somon cumbalı apartman: köfteci, satılık afişi
    item('k14', 'pano', 534, 466, 132, 34, '#f26b1d', '#ffffff', 'TASTY KÖFTE'),
    item('k15', 'afis', 548, 300, 104, 54, '#ffd200', '#111111', 'SAHİBİNDEN SATILIK'),
    item('k16', 'klima', 612, 392, 48, 34, '#e9e8e2', '#8a8a84'),
    item('k17', 'anten', 560, 196, 36, 40, '#e3e3de', '#6d6d68'),
    // köşe apartmanı: tekel, döviz, diyetisyen
    item('k18', 'pano', 674, 466, 162, 32, '#5a2d82', '#ffd200', 'TEKEL • MARKET'),
    item('k19', 'bayrak', 826, 330, 28, 110, '#0b3d91', '#ffffff', 'DÖVİZ'),
    item('k20', 'folyo', 690, 380, 130, 34, '#ffffff', '#2e9d4f', 'DİYETİSYEN'),
    item('k21', 'kutu', 784, 506, 46, 36, '#1a237e', '#ffeb3b', 'LOTO'),
    item('k22', 'klima', 690, 290, 48, 34, '#e9e8e2', '#8a8a84'),
    item('k23', 'anten', 790, 150, 36, 40, '#e3e3de', '#6d6d68'),
    // tuğla han: kuyumcu, pembe takı afişi
    item('k24', 'pano', 844, 466, 122, 32, '#141414', '#e8c35a', 'KUYUMCU'),
    item('k25', 'afis', 856, 330, 100, 56, '#e0457b', '#ffffff', 'TAKI %40'),
    item('k26', 'kablo', 800, 300, 220, 26, '#1e1e1e', '#1e1e1e'),
    // yeşil sundurmalı dükkânlar: büfe, sarı siyah kampanya bezleri, ATM
    item('k27', 'pano', 976, 452, 140, 30, '#ff7a00', '#ffffff', 'ÇARŞI BÜFE'),
    item('k28', 'afis', 1120, 448, 76, 46, '#ffdf00', '#111111', 'KAMPANYA'),
    item('k29', 'folyo', 986, 506, 110, 32, '#111111', '#ffdf00', '3 AL 2 ÖDE'),
    item('k30', 'kutu', 1150, 504, 42, 38, '#c8102e', '#ffffff', 'ATM'),
    item('k31', 'klima', 1090, 412, 48, 34, '#e9e8e2', '#8a8a84'),
  ],
};

export const PLACES: Place[] = [
  {
    id: 'bakirkoy',
    title: 'Cumhuriyet Meydanı',
    district: 'Bakırköy',
    blurb: 'Dev bayrağın arkasında istasyon, kiremit çatılar ve yeşil sundurmalı dükkânlar: otuzu aşkın tabela, afiş ve klima.',
    buildings: BAKIRKOY_BUILDINGS,
    original: BAKIRKOY,
  },
];

/** Sırada bekleyen meydanlar: seçim ekranında kilitli görünür. */
export const COMING = [
  { district: 'Beşiktaş', title: 'Çarşı' },
  { district: 'Fatih', title: 'Eminönü' },
  { district: 'Şişli', title: 'Mecidiyeköy' },
];

export const placeOf = (id: PlaceId): Place => PLACES.find((p) => p.id === id) ?? PLACES[0];
