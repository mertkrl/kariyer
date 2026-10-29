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

// Beşiktaş Çarşı: kartallı meydanın arkasındaki dar cepheler; balıkçılar, çay ocakları, tantuni
// ve dört katlı eski apartmanlar. Sıra ve biçimler temsilîdir.
const BESIKTAS_BUILDINGS: BuildingShape[] = [
  { id: 'b1', name: 'Köşedeki eski kâgir', x: 0, w: 190, floors: 3, floorH: 52, groundH: 90, cols: 3, balcony: false, roof: 'kornis', facade: 'tas' },
  { id: 'b2', name: 'Cumbalı dar apartman', x: 190, w: 130, floors: 4, floorH: 46, groundH: 90, cols: 2, balcony: false, roof: 'kirma', facade: 'cumba' },
  { id: 'b3', name: 'Balkonlu apartman', x: 320, w: 180, floors: 5, floorH: 46, groundH: 90, cols: 3, balcony: true, roof: 'duz', facade: 'apartman', penthouse: true },
  { id: 'b4', name: 'Tuğla iş hanı', x: 500, w: 160, floors: 4, floorH: 50, groundH: 90, cols: 3, balcony: false, roof: 'kornis', facade: 'tugla' },
  { id: 'b5', name: 'Pasaj girişi', x: 660, w: 150, floors: 3, floorH: 48, groundH: 90, cols: 3, balcony: true, roof: 'duz', facade: 'apartman' },
  { id: 'b6', name: 'Kiremit çatılı ev', x: 810, w: 140, floors: 2, floorH: 52, groundH: 90, cols: 2, balcony: false, roof: 'kirma', facade: 'tas' },
  { id: 'b7', name: 'Balıkçı dükkânları', x: 950, w: 250, floors: 0, floorH: 48, groundH: 90, cols: 1, balcony: false, roof: 'sundurma', facade: 'apartman' },
];

const BESIKTAS: Design = {
  v: 1,
  place: 'besiktas',
  paints: [
    paint('b1', '#e6dccb', '#c9bba3', '#4c4036'),
    paint('b2', '#c9a27c', '#f0e8da', '#5a4636'),
    paint('b3', '#d4d0c4', '#8b9298', '#3c454c'),
    paint('b4', '#9c5a41', '#d8cdb8', '#3a2a20'),
    paint('b5', '#bfc7c1', '#6c7a74', '#33403b'),
    paint('b6', '#e9d9b8', '#f4eee2', '#6b5a4a'),
    paint('b7', '#1f4f6e', '#2a6386', '#2c3a44'),
  ],
  items: [
    item('k1', 'pano', 8, 466, 174, 32, '#0b3d91', '#ffffff', 'ÇARŞI ÇAY OCAĞI'),
    item('k2', 'afis', 30, 360, 130, 60, '#000000', '#ffffff', 'ŞAMPİYON!'),
    item('k3', 'klima', 140, 300, 48, 34, '#e9e8e2', '#8a8a84'),
    item('k4', 'pano', 194, 468, 122, 30, '#d71920', '#ffffff', 'TANTUNİ'),
    item('k5', 'bayrak', 300, 320, 26, 100, '#111111', '#ffffff', 'BAR'),
    item('k6', 'folyo', 200, 506, 100, 36, '#ffee00', '#111111', 'KAHVALTI'),
    item('k7', 'pano', 324, 466, 172, 32, '#141414', '#e8c35a', 'MEYHANE 1923'),
    item('k8', 'afis', 344, 300, 134, 54, '#ff2d55', '#ffffff', 'CANLI MÜZİK'),
    item('k9', 'klima', 440, 380, 48, 34, '#e9e8e2', '#8a8a84'),
    item('k10', 'anten', 360, 150, 36, 40, '#e3e3de', '#6d6d68'),
    item('k11', 'kablo', 280, 260, 260, 28, '#1e1e1e', '#1e1e1e'),
    item('k12', 'pano', 504, 466, 152, 32, '#ffffff', '#d0021b', 'ECZANE'),
    item('k13', 'folyo', 516, 330, 130, 40, '#00a2e8', '#ffffff', 'KPSS KURSU'),
    item('k14', 'kutu', 620, 400, 36, 40, '#d0021b', '#ffffff', 'E'),
    item('k15', 'pano', 664, 466, 142, 32, '#5a2d82', '#ffd200', 'PASAJ'),
    item('k16', 'afis', 676, 340, 118, 56, '#ffd200', '#111111', 'KİRALIK OFİS'),
    item('k17', 'klima', 760, 300, 48, 34, '#e9e8e2', '#8a8a84'),
    item('k18', 'pano', 814, 466, 132, 30, '#f26b1d', '#ffffff', 'KOKOREÇ'),
    item('k19', 'tente', 818, 500, 124, 26, '#c8102e', '#ffffff'),
    item('k20', 'pano', 956, 452, 150, 30, '#ffffff', '#0b3d91', 'BALIKÇI SABRİ'),
    item('k21', 'afis', 1110, 446, 84, 46, '#ffdf00', '#111111', 'TAZE!'),
    item('k22', 'folyo', 970, 506, 120, 32, '#111111', '#ffdf00', 'MİDYE DOLMA'),
    item('k23', 'kutu', 1146, 504, 46, 38, '#c8102e', '#ffffff', 'ATM'),
    item('k24', 'klima', 1080, 410, 48, 34, '#e9e8e2', '#8a8a84'),
  ],
};

// Eminönü: Yeni Cami'ye bakan sıra; hanlar, kuruyemişçiler, tuhafiyeciler ve vapur iskelesine
// inen kalabalık. Sıra ve biçimler temsilîdir.
const EMINONU_BUILDINGS: BuildingShape[] = [
  { id: 'b1', name: 'Taş han', x: 0, w: 220, floors: 4, floorH: 54, groundH: 92, cols: 4, balcony: false, roof: 'kornis', facade: 'tas' },
  { id: 'b2', name: 'Tuğla depo', x: 220, w: 160, floors: 3, floorH: 52, groundH: 92, cols: 3, balcony: false, roof: 'kornis', facade: 'tugla' },
  { id: 'b3', name: 'Dar cumbalı bina', x: 380, w: 120, floors: 4, floorH: 46, groundH: 92, cols: 2, balcony: false, roof: 'kirma', facade: 'cumba' },
  { id: 'b4', name: 'Altmışların iş merkezi', x: 500, w: 200, floors: 5, floorH: 44, groundH: 92, cols: 4, balcony: false, roof: 'duz', facade: 'apartman' },
  { id: 'b5', name: 'Kemerli eski han', x: 700, w: 190, floors: 3, floorH: 56, groundH: 92, cols: 3, balcony: false, roof: 'kornis', facade: 'tas' },
  { id: 'b6', name: 'Cam cepheli mağaza', x: 890, w: 150, floors: 2, floorH: 56, groundH: 92, cols: 3, balcony: false, roof: 'duz', facade: 'cam' },
  { id: 'b7', name: 'İskele büfeleri', x: 1040, w: 160, floors: 0, floorH: 48, groundH: 92, cols: 1, balcony: false, roof: 'sundurma', facade: 'apartman' },
];

const EMINONU: Design = {
  v: 1,
  place: 'eminonu',
  paints: [
    paint('b1', '#d8cbb2', '#bfb095', '#4a3e30'),
    paint('b2', '#a5603f', '#d6c6a8', '#3a2a20'),
    paint('b3', '#cf9f7c', '#f0e6d6', '#5b4838'),
    paint('b4', '#c7c9c3', '#7e868b', '#3a4248'),
    paint('b5', '#e2d6bd', '#c4b597', '#4d4032'),
    paint('b6', '#9fb3c2', '#5f6b73', '#2f3b45'),
    paint('b7', '#8a2c2c', '#a83a3a', '#3a2a2a'),
  ],
  items: [
    item('k1', 'pano', 8, 468, 204, 32, '#3e2a16', '#f0c75e', 'KURUYEMİŞ & BAHARAT'),
    item('k2', 'afis', 30, 330, 160, 70, '#d71920', '#ffffff', 'TOPTAN FİYATINA'),
    item('k3', 'folyo', 20, 506, 90, 40, '#ffdf00', '#111111', '%50'),
    item('k4', 'klima', 170, 290, 48, 34, '#e9e8e2', '#8a8a84'),
    item('k5', 'pano', 224, 468, 152, 32, '#0b3d91', '#ffffff', 'TUHAFİYE'),
    item('k6', 'bayrak', 352, 330, 26, 110, '#c8102e', '#ffffff', 'NAKIŞ'),
    item('k7', 'afis', 236, 360, 120, 54, '#ffffff', '#c8102e', 'DÜĞÜN SETİ'),
    item('k8', 'kablo', 150, 270, 280, 30, '#1e1e1e', '#1e1e1e'),
    item('k9', 'pano', 384, 468, 112, 30, '#f26b1d', '#ffffff', 'BALIK EKMEK'),
    item('k10', 'tente', 388, 502, 108, 26, '#2e7d32', '#ffffff'),
    item('k11', 'klima', 440, 330, 48, 34, '#e9e8e2', '#8a8a84'),
    item('k12', 'pano', 504, 466, 192, 32, '#1d2a44', '#ffffff', 'ELEKTRONİK ÇARŞISI'),
    item('k13', 'folyo', 520, 300, 160, 40, '#00a2e8', '#ffffff', 'TELEFON TAMİR'),
    item('k14', 'afis', 540, 360, 120, 56, '#ffd200', '#111111', 'KAPANIYORUZ'),
    item('k15', 'klima', 640, 250, 48, 34, '#e9e8e2', '#8a8a84'),
    item('k16', 'anten', 560, 120, 36, 40, '#e3e3de', '#6d6d68'),
    item('k17', 'pano', 706, 466, 178, 32, '#141414', '#e8c35a', 'LOKUM • ŞEKER'),
    item('k18', 'afis', 720, 330, 150, 60, '#e0457b', '#ffffff', 'HEDİYELİK'),
    item('k19', 'klima', 840, 400, 48, 34, '#e9e8e2', '#8a8a84'),
    item('k20', 'pano', 894, 466, 142, 32, '#ffffff', '#111111', 'BÜYÜK İNDİRİM'),
    item('k21', 'folyo', 904, 380, 124, 40, '#ff2d55', '#ffffff', 'SON GÜN'),
    item('k22', 'pano', 1046, 452, 148, 30, '#ffdf00', '#c8102e', 'İSKELE BÜFE'),
    item('k23', 'kutu', 1150, 504, 44, 38, '#1a237e', '#ffeb3b', 'LOTO'),
    item('k24', 'folyo', 1050, 506, 90, 32, '#111111', '#ffffff', 'SİMİT'),
  ],
};

// Mecidiyeköy: Büyükdere Caddesi'ne bakan sıra; cam kuleler, eski apartmanlar ve köprü altındaki
// dükkânlar. Sıra ve biçimler temsilîdir.
const MECIDIYEKOY_BUILDINGS: BuildingShape[] = [
  { id: 'b1', name: 'Cam ofis kulesi', x: 0, w: 200, floors: 7, floorH: 44, groundH: 92, cols: 4, balcony: false, roof: 'duz', facade: 'cam' },
  { id: 'b2', name: 'Yetmişlerin apartmanı', x: 200, w: 160, floors: 5, floorH: 46, groundH: 90, cols: 3, balcony: true, roof: 'duz', facade: 'apartman' },
  { id: 'b3', name: 'Gri iş hanı', x: 360, w: 180, floors: 6, floorH: 44, groundH: 90, cols: 4, balcony: false, roof: 'duz', facade: 'apartman', penthouse: true },
  { id: 'b4', name: 'Tuğla köşe apartmanı', x: 540, w: 150, floors: 4, floorH: 48, groundH: 90, cols: 3, balcony: true, roof: 'kornis', facade: 'tugla' },
  { id: 'b5', name: 'Cumbalı apartman', x: 690, w: 140, floors: 5, floorH: 46, groundH: 90, cols: 3, balcony: false, roof: 'kirma', facade: 'cumba' },
  { id: 'b6', name: 'AVM girişi', x: 830, w: 210, floors: 3, floorH: 56, groundH: 96, cols: 4, balcony: false, roof: 'duz', facade: 'cam' },
  { id: 'b7', name: 'Köprü altı dükkânlar', x: 1040, w: 160, floors: 0, floorH: 48, groundH: 90, cols: 1, balcony: false, roof: 'sundurma', facade: 'apartman' },
];

const MECIDIYEKOY: Design = {
  v: 1,
  place: 'mecidiyekoy',
  paints: [
    paint('b1', '#9fb3c2', '#5f6b73', '#2f3b45'),
    paint('b2', '#d9cdb3', '#8e959c', '#3f4a52'),
    paint('b3', '#b8b8b2', '#7a8086', '#343b40'),
    paint('b4', '#a5603f', '#d6c6a8', '#3a2a20'),
    paint('b5', '#e1b7a0', '#f3ece2', '#6e5e55'),
    paint('b6', '#a9c3d6', '#6d808e', '#2a353d'),
    paint('b7', '#5f6b73', '#3f4a52', '#2a2f33'),
  ],
  items: [
    item('k1', 'afis', 20, 180, 160, 120, '#d71920', '#ffffff', 'OFİS KATI KİRALIK'),
    item('k2', 'pano', 8, 468, 186, 32, '#1d2a44', '#ffffff', 'PLAZA GİRİŞİ'),
    item('k3', 'pano', 204, 468, 152, 30, '#f26b1d', '#ffffff', 'DÖNER 7/24'),
    item('k4', 'folyo', 214, 330, 130, 40, '#ffee00', '#0a0a0a', 'YDS KURSU'),
    item('k5', 'klima', 300, 400, 48, 34, '#e9e8e2', '#8a8a84'),
    item('k6', 'klima', 220, 260, 48, 34, '#e9e8e2', '#8a8a84'),
    item('k7', 'anten', 240, 200, 36, 40, '#e3e3de', '#6d6d68'),
    item('k8', 'pano', 364, 468, 172, 32, '#5a2d82', '#ffd200', 'DÖVİZ • ALTIN'),
    item('k9', 'afis', 380, 250, 140, 90, '#ffffff', '#0b3d91', 'DİŞ KLİNİĞİ'),
    item('k10', 'bayrak', 512, 340, 26, 110, '#0b3d91', '#ffffff', 'HOSTEL'),
    item('k11', 'klima', 460, 360, 48, 34, '#e9e8e2', '#8a8a84'),
    item('k12', 'kablo', 330, 300, 260, 30, '#1e1e1e', '#1e1e1e'),
    item('k13', 'pano', 544, 468, 142, 30, '#ffffff', '#d0021b', 'ECZANE'),
    item('k14', 'folyo', 556, 330, 120, 40, '#00a2e8', '#ffffff', 'PSİKOLOG'),
    item('k15', 'pano', 694, 468, 132, 30, '#141414', '#e8c35a', 'BÖREKÇİ'),
    item('k16', 'afis', 704, 300, 112, 56, '#ffd200', '#111111', 'SATILIK DAİRE'),
    item('k17', 'klima', 770, 380, 48, 34, '#e9e8e2', '#8a8a84'),
    item('k18', 'afis', 850, 330, 170, 80, '#e0457b', '#ffffff', 'BÜYÜK SEZON SONU'),
    item('k19', 'pano', 836, 466, 198, 34, '#111111', '#ffffff', 'ALIŞVERİŞ MERKEZİ'),
    item('k20', 'kutu', 846, 506, 46, 38, '#c8102e', '#ffffff', 'ATM'),
    item('k21', 'pano', 1046, 452, 148, 30, '#ff7a00', '#ffffff', 'TELEFONCU'),
    item('k22', 'folyo', 1056, 506, 120, 32, '#111111', '#ffdf00', 'KILIF 50 ₺'),
    item('k23', 'klima', 1120, 410, 48, 34, '#e9e8e2', '#8a8a84'),
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
  {
    id: 'besiktas',
    title: 'Çarşı',
    district: 'Beşiktaş',
    blurb: 'Kartalın arkasında meyhaneler, tantuni, balıkçılar ve pasaj: dar cephelerde yirmi dört tabela, afiş ve klima.',
    buildings: BESIKTAS_BUILDINGS,
    original: BESIKTAS,
  },
  {
    id: 'eminonu',
    title: 'Eminönü',
    district: 'Fatih',
    blurb: 'Taş hanlar, kuruyemişçiler ve iskele büfeleri: tarihi cepheler "toptan fiyatına" afişlerin altında.',
    buildings: EMINONU_BUILDINGS,
    original: EMINONU,
  },
  {
    id: 'mecidiyekoy',
    title: 'Mecidiyeköy',
    district: 'Şişli',
    blurb: 'Cam kuleler, yetmişlerin apartmanları ve AVM girişi: plaza afişleri, klinikler ve köprü altı dükkânlar.',
    buildings: MECIDIYEKOY_BUILDINGS,
    original: MECIDIYEKOY,
  },
];

export const placeOf = (id: PlaceId): Place => PLACES.find((p) => p.id === id) ?? PLACES[0];
