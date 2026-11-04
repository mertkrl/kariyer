/*
 * Köy Bakkalı: oyuncu fiyatı kafasına göre söyler. Her ürünün gizli bir market fiyatı (M) ve
 * bakkalın toptancıdan aldığı maliyeti (K) vardır; her müşterinin de M'nin üstünde razı olduğu
 * gizli bir tavanı. Fiyatlar her gün biraz artar; her ürünün kendi zam hızı ve kendi zam
 * sıçramaları vardır (çaya ara ara büyük zam gelir, süt her gün azar azar pahalanır). M'ye kadar müşteri sevinerek alır, tavana kadar söylenerek alır, tavanı
 * aşınca pazarlık eder, ikinci kez aşınca gider. Oyuncu tepkilerden fiyatları bulur.
 *
 * Köyün kendisi de oyunda: müşteriler adı olan, geri gelen köylülerdir ve geçen seferi hatırlar;
 * bazen birkaç şey birden ister, bazen veresiye yazdırır. Her günün havası ve bir köy olayı vardır.
 * Tezgâhtaki kedi yalnızca uyur.
 * Bu dosya saf mantıktır: rastgelelik tohumlu, test edilebilir.
 */

import type { Account, Dilemma } from './week';
import type { ReturnAsk } from './returns';
import { characterOf } from './characters';
import { LOW_REP, isBasic, touristShare } from './catalog';

export interface Product {
  id: string;
  name: string;
  emoji: string;
  /** Gizli market fiyatı (TL). */
  market: number;
  /** Toptancı maliyeti (TL): bunun altı zarar. */
  cost: number;
  /** Günlük sessiz zam (0,01 = günde %1). */
  drift: number;
  /** Zam sıçraması: ilk gün `first`, sonra her `every` günde bir `step` kadar. */
  step?: number;
  every?: number;
  first?: number;
  /** Tost ve sandviçin içindekiler. */
  detail?: string;
}

export const PRODUCTS: Product[] = [
  { id: 'ekmek', name: 'Ekmek', emoji: '🍞', market: 20, cost: 14, drift: 0.004, step: 0.15, every: 12, first: 9 },
  { id: 'sut', name: 'Süt (1 lt)', emoji: '🥛', market: 55, cost: 40, drift: 0.012 },
  { id: 'yumurta', name: "Yumurta (10'lu)", emoji: '🥚', market: 120, cost: 88, drift: 0.006, step: 0.12, every: 7, first: 4 },
  { id: 'meyvesuyu', name: 'Meyve suyu (1 lt)', emoji: '🧃', market: 45, cost: 31, drift: 0.005, step: 0.08, every: 10, first: 6 },
  { id: 'cay', name: 'Çay (500 g)', emoji: '🍵', market: 260, cost: 195, drift: 0, step: 0.18, every: 8, first: 3 },
  { id: 'seker', name: 'Toz şeker (1 kg)', emoji: '🧊', market: 65, cost: 48, drift: 0.014 },
  { id: 'cikolata', name: 'Çikolata', emoji: '🍫', market: 45, cost: 30, drift: 0.008, step: 0.1, every: 9, first: 5 },
  { id: 'sabun', name: 'Sabun', emoji: '🧼', market: 45, cost: 31, drift: 0.003, step: 0.1, every: 15, first: 8 },
  { id: 'makarna', name: 'Makarna', emoji: '🍝', market: 32, cost: 22, drift: 0.007, step: 0.1, every: 11, first: 7 },
  { id: 'peynir', name: 'Beyaz peynir (500 g)', emoji: '🧀', market: 260, cost: 195, drift: 0.016, step: 0.1, every: 14, first: 10 },
  { id: 'un', name: 'Un (5 kg)', emoji: '🌾', market: 260, cost: 195, drift: 0.01, step: 0.1, every: 13, first: 6 },
  { id: 'pirinc', name: 'Pirinç (1 kg)', emoji: '🍚', market: 100, cost: 74, drift: 0.009 },
  { id: 'yag', name: 'Ayçiçek yağı (1 lt)', emoji: '🌻', market: 130, cost: 96, drift: 0.006, step: 0.15, every: 9, first: 5 },
  { id: 'salca', name: 'Salça (830 g)', emoji: '🥫', market: 135, cost: 100, drift: 0.008 },
  { id: 'biskuvi', name: 'Bisküvi', emoji: '🍪', market: 30, cost: 20, drift: 0.007, step: 0.1, every: 10, first: 4 },
  { id: 'deterjan', name: 'Bulaşık deterjanı', emoji: '🫧', market: 110, cost: 78, drift: 0.004, step: 0.12, every: 12, first: 9 },
  { id: 'yogurt', name: 'Yoğurt (1 kg)', emoji: '🥣', market: 120, cost: 89, drift: 0.013 },
  { id: 'gazoz', name: 'Gazoz', emoji: '🥤', market: 35, cost: 23, drift: 0.006, step: 0.1, every: 8, first: 7 },
  { id: 'tuz', name: 'Tuz (750 g)', emoji: '🧂', market: 25, cost: 16, drift: 0.003 },
  { id: 'kibrit', name: "Kibrit (10'lu)", emoji: '🔥', market: 25, cost: 16, drift: 0.003, step: 0.1, every: 14, first: 10 },
  { id: 'mercimek', name: 'Kırmızı mercimek (1 kg)', emoji: '🫘', market: 95, cost: 70, drift: 0.009 },
  { id: 'bulgur', name: 'Bulgur (1 kg)', emoji: '🍲', market: 65, cost: 48, drift: 0.008 },
  { id: 'zeytin', name: 'Siyah zeytin (1 kg)', emoji: '🫒', market: 340, cost: 255, drift: 0.01, step: 0.08, every: 11, first: 8 },
  { id: 'recel', name: 'Vişne reçeli', emoji: '🍓', market: 120, cost: 86, drift: 0.006 },
  { id: 'camasir', name: 'Çamaşır suyu', emoji: '🧪', market: 70, cost: 49, drift: 0.004 },
  { id: 'tuvalet', name: "Tuvalet kâğıdı (8'li)", emoji: '🧻', market: 190, cost: 138, drift: 0.005, step: 0.1, every: 12, first: 11 },
  { id: 'sampuan', name: 'Şampuan', emoji: '🧴', market: 170, cost: 120, drift: 0.005 },
  { id: 'pil', name: "Kalem pil (2'li)", emoji: '🔋', market: 90, cost: 62, drift: 0.004 },
  { id: 'kolonya', name: 'Limon kolonyası', emoji: '🍋', market: 140, cost: 98, drift: 0.004 },
  { id: 'maden', name: 'Maden suyu', emoji: '💧', market: 20, cost: 13, drift: 0.006 },
  { id: 'sucuk', name: 'Sucuk (250 g)', emoji: '🌭', market: 290, cost: 215, drift: 0.015, step: 0.1, every: 10, first: 6 },
  { id: 'tereyag', name: 'Tereyağı (250 g)', emoji: '🧈', market: 220, cost: 163, drift: 0.014 },
  { id: 'kasar', name: 'Kaşar peyniri (250 g)', emoji: '🟨', market: 210, cost: 156, drift: 0.014 },
  { id: 'bal', name: 'Çiçek balı (450 g)', emoji: '🍯', market: 400, cost: 300, drift: 0.008 },
  { id: 'helva', name: 'Tahin helvası', emoji: '🟫', market: 140, cost: 100, drift: 0.007 },
  { id: 'tahin', name: 'Tahin (300 g)', emoji: '🥜', market: 170, cost: 124, drift: 0.008 },
  { id: 'margarin', name: 'Margarin', emoji: '🟡', market: 70, cost: 50, drift: 0.007 },
  { id: 'nohut', name: 'Nohut (1 kg)', emoji: '🫛', market: 105, cost: 77, drift: 0.008 },
  { id: 'fasulye', name: 'Kuru fasulye (1 kg)', emoji: '⚪', market: 140, cost: 103, drift: 0.009 },
  { id: 'ton', name: "Ton balığı (3'lü)", emoji: '🐟', market: 250, cost: 185, drift: 0.006, step: 0.1, every: 12, first: 9 },
  { id: 'ketcap', name: 'Ketçap', emoji: '🍅', market: 85, cost: 60, drift: 0.005 },
  { id: 'mayonez', name: 'Mayonez', emoji: '🫙', market: 95, cost: 67, drift: 0.005 },
  { id: 'kahve', name: 'Türk kahvesi (100 g)', emoji: '☕', market: 140, cost: 102, drift: 0.009, step: 0.12, every: 9, first: 5 },
  { id: 'cips', name: 'Cips', emoji: '🥔', market: 55, cost: 37, drift: 0.007 },
  { id: 'kraker', name: 'Kraker', emoji: '🥨', market: 25, cost: 16, drift: 0.006 },
  { id: 'lokum', name: 'Lokum', emoji: '🟪', market: 110, cost: 77, drift: 0.005 },
  { id: 'ayran', name: 'Ayran', emoji: '🫗', market: 25, cost: 16, drift: 0.008 },
  { id: 'su', name: 'Su (1,5 lt)', emoji: '🚰', market: 15, cost: 9, drift: 0.004 },
  { id: 'dismacunu', name: 'Diş macunu', emoji: '🪥', market: 100, cost: 70, drift: 0.004 },
  { id: 'cakmak', name: 'Çakmak', emoji: '🪔', market: 25, cost: 16, drift: 0.003 },
  { id: 'ampul', name: 'Ampul', emoji: '💡', market: 70, cost: 48, drift: 0.003 },
  { id: 'irmik', name: 'İrmik (500 g)', emoji: '🌾', market: 45, cost: 32, drift: 0.008 },
  { id: 'zeytinyagi', name: 'Zeytinyağı (1 lt)', emoji: '🫒', market: 480, cost: 360, drift: 0.009, step: 0.1, every: 13, first: 8 },
  { id: 'sirke', name: 'Üzüm sirkesi (1 lt)', emoji: '🍇', market: 60, cost: 42, drift: 0.005 },
  { id: 'pulbiber', name: 'Pul biber (200 g)', emoji: '🌶️', market: 120, cost: 86, drift: 0.008 },
  { id: 'pekmez', name: 'Pekmez (800 g)', emoji: '🍯', market: 180, cost: 130, drift: 0.007 },
  { id: 'yumusatici', name: 'Yumuşatıcı (1,5 lt)', emoji: '🧺', market: 130, cost: 92, drift: 0.005 },
  { id: 'mendil', name: "Mendil (ıslak, 100'lü)", emoji: '🧻', market: 45, cost: 30, drift: 0.004 },
  { id: 'kola', name: 'Kola (1 lt)', emoji: '🥤', market: 55, cost: 37, drift: 0.007, step: 0.1, every: 11, first: 6 },
  { id: 'salam', name: 'Dana salam (200 g)', emoji: '🥓', market: 160, cost: 118, drift: 0.012 },
  { id: 'kasarli', name: 'Kaşarlı tost', emoji: '🥪', market: 120, cost: 75, drift: 0.01, detail: 'tost ekmeği, bol kaşar, tereyağı' },
  { id: 'sucuklu', name: 'Sucuklu tost', emoji: '🥪', market: 160, cost: 100, drift: 0.011, detail: 'tost ekmeği, kasap sucuğu, kaşar' },
  { id: 'karisik', name: 'Karışık tost', emoji: '🥪', market: 180, cost: 115, drift: 0.011, detail: 'sucuk, kaşar, domates, köy biberi' },
  { id: 'peynirli', name: 'Peynirli sandviç', emoji: '🥖', market: 120, cost: 75, drift: 0.01, detail: 'beyaz peynir, domates, salatalık, zeytin' },
  { id: 'salamli', name: 'Salamlı sandviç', emoji: '🥖', market: 140, cost: 88, drift: 0.01, detail: 'dana salam, kaşar, turşu' },
  { id: 'tonlu', name: 'Ton balıklı sandviç', emoji: '🥖', market: 170, cost: 108, drift: 0.01, detail: 'ton balığı, mısır, marul, limon' },
  { id: 'tavuklu', name: 'Tavuklu sandviç', emoji: '🥖', market: 180, cost: 115, drift: 0.011, detail: 'ızgara tavuk, yeşillik, mayonez' },
];

export { BASIC, CATEGORIES, DAILY, FRIDGE, LOW_REP, MADE, RACK, SANDWICH, TOURIST_REP, categoryOf, isBasic, touristShare } from './catalog';

export interface CustomerType {
  id: string;
  name: string;
  emoji: string;
  /** Sahnedeki gövde rengi. */
  color: string;
  /** Tavan = market × bu çarpan. */
  ceiling: number;
  /** Bu tip ucuz fiyata ne kadar sevinir (itibar etkisi çarpanı). */
  gossip: number;
  /** Bu tip hangi ürünleri ister (boşsa hepsi). */
  wants?: string[];
}

export const CUSTOMERS: CustomerType[] = [
  { id: 'teyze', name: 'Emekli teyze', emoji: '👵', color: '#8e6fa8', ceiling: 1.1, gossip: 2 },
  { id: 'muhtar', name: 'Muhtar', emoji: '👨🏻‍🦳', color: '#4f5d73', ceiling: 1.5, gossip: 1.5 },
  { id: 'ciftci', name: 'Çiftçi', emoji: '👨‍🌾', color: '#5f8a4c', ceiling: 1.25, gossip: 1 },
  { id: 'turist', name: 'Şehirli turist', emoji: '🧑‍💼', color: '#2f6fb5', ceiling: 1.6, gossip: 0.3, wants: ['su', 'maden', 'gazoz', 'kola', 'mendil', 'ayran', 'meyvesuyu', 'cips', 'kraker', 'cikolata', 'biskuvi', 'kasarli', 'sucuklu', 'karisik', 'peynirli', 'tonlu', 'tavuklu', 'ekmek', 'pil', 'kolonya'] },
  { id: 'cocuk', name: 'Çocuk', emoji: '🧒', color: '#e0703a', ceiling: 1.15, gossip: 1, wants: ['cikolata', 'meyvesuyu', 'ekmek', 'makarna', 'biskuvi', 'gazoz', 'kola', 'cips', 'kasarli', 'ayran'] },
  { id: 'genc', name: 'Genç', emoji: '🧑', color: '#3d7f8c', ceiling: 1.2, gossip: 0.8, wants: ['cikolata', 'meyvesuyu', 'makarna', 'ekmek', 'sut', 'sabun', 'biskuvi', 'gazoz', 'pirinc', 'pil', 'sampuan', 'maden', 'kola', 'cips', 'sucuklu', 'karisik', 'tonlu', 'tavuklu', 'su'] },
  { id: 'ogretmen', name: 'Öğretmen', emoji: '👩‍🏫', color: '#7a5c3e', ceiling: 1.3, gossip: 1.3 },
  { id: 'coban', name: 'Çoban', emoji: '🐑', color: '#6b5a3a', ceiling: 1.15, gossip: 0.6, wants: ['ekmek', 'peynir', 'cay', 'seker', 'makarna', 'un', 'yogurt', 'tuz', 'kibrit', 'bulgur', 'zeytin', 'sucuk', 'peynirli', 'ayran', 'cakmak'] },
  { id: 'gelin', name: 'Genç gelin', emoji: '👰', color: '#b0567a', ceiling: 1.2, gossip: 1.6 },
  { id: 'emekli', name: 'Emekli amca', emoji: '👴', color: '#6d6a5f', ceiling: 1.1, gossip: 1.8 },
];

export const typeOf = (id: string) => CUSTOMERS.find((c) => c.id === id)!;

/**
 * Köylünün görünüşü: giysi rengi ve tipinin varsayılanını değiştiren ayrıntılar. Aynı tipten iki
 * köylü sahnede birbirine benzemesin diye her birinin kendi başörtüsü, şapkası, bıyığı vardır.
 */
export interface Look {
  outfit: string;
  skin?: string;
  /** Saç rengi (başörtüsü ya da şapka yoksa görünür). */
  hair?: string;
  /** Başörtüsü rengi. */
  scarf?: string;
  hat?: 'kasket' | 'takke' | 'bere' | 'sapka' | 'kep';
  hatColor?: string;
  glasses?: boolean;
  sunglasses?: boolean;
  mustache?: string;
  beard?: string;
  /** Uzun saç ya da at kuyruğu. */
  long?: boolean;
}

/** Köyün tanıdık yüzleri: her biri bir müşteri tipindendir; borcunu ödeme olasılığı farklıdır. */
export interface Villager {
  id: string;
  name: string;
  type: string;
  /** Veresiye borcunu ertesi günlerde ödeme olasılığı (0: hiç veresiye istemez). */
  pays: number;
  look: Look;
  /** Köyün olağan sırasına girmez: yalnızca kendi günü gelir (hayırsever, zabıta). */
  guest?: boolean;
  /** Yoldan geçen yabancı: yalnızca dükkânın itibarı düşünce, köylünün yerine gelir. */
  passerby?: boolean;
}

export const VILLAGERS: Villager[] = [
  { id: 'ayse', name: 'Ayşe Teyze', type: 'teyze', pays: 0.95, look: { outfit: '#8e6fa8', scarf: '#c46b6b' } },
  { id: 'fatma', name: 'Fatma Teyze', type: 'teyze', pays: 0.75, look: { outfit: '#5a7a9a', scarf: '#e3d9c4', glasses: true } },
  { id: 'hatice', name: 'Hatice Nine', type: 'teyze', pays: 0.9, look: { outfit: '#4a4a52', scarf: '#f2efe6', glasses: true, skin: '#e2b896' } },
  { id: 'zehra', name: 'Zehra Teyze', type: 'teyze', pays: 0.65, look: { outfit: '#a0663e', scarf: '#6f9a4f' } },
  { id: 'emine', name: 'Emine Teyze', type: 'teyze', pays: 0.85, look: { outfit: '#3f6d6a', scarf: '#a77bc4' } },
  { id: 'nazmiye', name: 'Nazmiye Nine', type: 'teyze', pays: 0.8, look: { outfit: '#2f2f38', scarf: '#3b3b44', skin: '#dcb08e' } },
  { id: 'hasan', name: 'Muhtar Hasan', type: 'muhtar', pays: 0.9, look: { outfit: '#4f5d73', hair: '#d6d6d6', mustache: '#d6d6d6' } },
  { id: 'imam', name: 'Yusuf Amca', type: 'muhtar', pays: 0.95, look: { outfit: '#5c6a5a', hat: 'takke', hatColor: '#f4f1e8', beard: '#5a4a3a' } },
  { id: 'riza', name: 'Rıza Amca', type: 'ciftci', pays: 0.55, look: { outfit: '#5f8a4c', hat: 'kasket', hatColor: '#5a6650', mustache: '#3a2a1a' } },
  { id: 'mehmet', name: 'Mehmet Abi', type: 'ciftci', pays: 0.8, look: { outfit: '#2f6a8a', hat: 'kasket', hatColor: '#3c3c3c', mustache: '#2a1d14' } },
  { id: 'osman', name: 'Osman Emmi', type: 'ciftci', pays: 0.7, look: { outfit: '#7a6a4a', hat: 'kasket', hatColor: '#6a5a44', beard: '#bdb6a8' } },
  { id: 'ismail', name: 'İsmail Amca', type: 'ciftci', pays: 0.85, look: { outfit: '#8a4a3a', hair: '#9a948a', mustache: '#6a645a' } },
  { id: 'kadir', name: 'Traktörcü Kadir', type: 'ciftci', pays: 0.6, look: { outfit: '#c25b2a', hat: 'kep', hatColor: '#2e5d9a', beard: '#2a1d14' } },
  { id: 'ali', name: 'Küçük Ali', type: 'cocuk', pays: 0.5, look: { outfit: '#e0703a', hat: 'kep', hatColor: '#e0b13a', hair: '#2a1d14' } },
  { id: 'elif', name: 'Küçük Elif', type: 'cocuk', pays: 0.7, look: { outfit: '#d65a8a', hair: '#6a3a1a', long: true } },
  { id: 'emre', name: 'Küçük Emre', type: 'cocuk', pays: 0.6, look: { outfit: '#3a7ac0', hat: 'bere', hatColor: '#c0392b' } },
  { id: 'zeynep', name: 'Küçük Zeynep', type: 'cocuk', pays: 0.65, look: { outfit: '#f0b43a', hair: '#2a1d14', long: true, glasses: true } },
  { id: 'kerem', name: 'Üniversiteli Kerem', type: 'genc', pays: 0.45, look: { outfit: '#3d7f8c', hair: '#1d1612', glasses: true } },
  { id: 'busra', name: 'Büşra', type: 'genc', pays: 0.6, look: { outfit: '#9a5ab0', hair: '#4a2a14', long: true } },
  { id: 'murat', name: 'Motorcu Murat', type: 'genc', pays: 0.35, look: { outfit: '#2a2a2a', hat: 'bere', hatColor: '#4a4a4a', mustache: '#1d1612' } },
  { id: 'selma', name: 'Selma Öğretmen', type: 'ogretmen', pays: 0.95, look: { outfit: '#7a5c3e', hair: '#5a3a22', long: true, glasses: true } },
  { id: 'burak', name: 'Burak Öğretmen', type: 'ogretmen', pays: 0.9, look: { outfit: '#4a5a7a', hair: '#2a1d14', beard: '#2a1d14', glasses: true } },
  { id: 'veli', name: 'Çoban Veli', type: 'coban', pays: 0.6, look: { outfit: '#6b5a3a', hat: 'sapka', hatColor: '#4a3a24', beard: '#3a2a1a', skin: '#b98260' } },
  { id: 'durmus', name: 'Çoban Durmuş', type: 'coban', pays: 0.5, look: { outfit: '#55603f', hat: 'kasket', hatColor: '#2f2f2f', mustache: '#8a8478', skin: '#b98260' } },
  { id: 'sevgi', name: 'Gelin Sevgi', type: 'gelin', pays: 0.85, look: { outfit: '#b0567a', scarf: '#f0c24a' } },
  { id: 'merve', name: 'Gelin Merve', type: 'gelin', pays: 0.75, look: { outfit: '#4a8a6a', scarf: '#e8a4b8' } },
  { id: 'huseyin', name: 'Emekli Hüseyin', type: 'emekli', pays: 0.9, look: { outfit: '#6d6a5f', hair: '#e6e6e6', mustache: '#e6e6e6', glasses: true } },
  { id: 'cemal', name: 'Kahveci Cemal', type: 'emekli', pays: 0.7, look: { outfit: '#8a3a3a', hat: 'kasket', hatColor: '#5a5a5a', mustache: '#9a9a9a' } },
  { id: 'selin', name: 'Turist Selin', type: 'turist', pays: 0, look: { outfit: '#2f6fb5', hair: '#c9a04a', long: true, sunglasses: true } },
  { id: 'can', name: 'Turist Can', type: 'turist', pays: 0, look: { outfit: '#e0e0d8', hat: 'sapka', hatColor: '#d9c08a', sunglasses: true } },
  { id: 'turist', name: 'Şehirli turist', type: 'turist', pays: 0, look: { outfit: '#4a4a52', hair: '#2a1d14', glasses: true } },
  { id: 'jonas', name: 'Bisikletli Jonas', type: 'turist', pays: 0, look: { outfit: '#d9a72a', hair: '#e8d08a', beard: '#c9a04a', skin: '#f3d6c2' } },
  { id: 'sinan', name: 'Kamyoncu Sinan', type: 'turist', pays: 0, passerby: true, look: { outfit: '#4e6b8a', hat: 'kep', hatColor: '#c0392b', mustache: '#2a1d14' } },
  { id: 'ece', name: 'Gezgin Ece', type: 'turist', pays: 0, passerby: true, look: { outfit: '#6a9a4a', hair: '#7a4a24', long: true } },
  { id: 'anna', name: 'Hollandalı Anna', type: 'turist', pays: 0, passerby: true, look: { outfit: '#e67e22', hair: '#f0d890', long: true, skin: '#f6dccb' } },
  { id: 'tom', name: 'Motosikletli Tom', type: 'turist', pays: 0, passerby: true, look: { outfit: '#2a2a2a', hair: '#a0703a', beard: '#a0703a', sunglasses: true, skin: '#f3d6c2' } },
  { id: 'rustem', name: 'Gurbetçi Rüstem Bey', type: 'muhtar', pays: 0, guest: true, look: { outfit: '#2a3a5a', hair: '#bdbdbd', mustache: '#bdbdbd', glasses: true } },
  { id: 'zabita', name: 'Zabıta Necati', type: 'muhtar', pays: 0, guest: true, look: { outfit: '#2b3f66', hat: 'kep', hatColor: '#1d2b47', mustache: '#2a1d14' } },
  { id: 'vergi', name: 'Vergi Memuru Selim', type: 'muhtar', pays: 0, guest: true, look: { outfit: '#3a3a3a', hair: '#2a1d14', glasses: true } },
];

/** Köyün olağan müşterileri: misafirler (hayırsever, zabıta) sıraya girmez. */
export const REGULARS = VILLAGERS.filter((v) => !v.guest);

export { CHARACTERS, characterOf, complains, haggleOffer, type Character } from './characters';

/** Köylünün kendi kesesi: tipinin tavanı, huyuna göre biraz geniş ya da dar. */
export function customerOf(v: Villager): CustomerType {
  const c = typeOf(v.type);
  return { ...c, ceiling: Math.round((c.ceiling + characterOf(v.id).ceil) * 100) / 100 };
}

export const START_REPUTATION = 60;
/** Köy unutur: itibar her sabah başlangıç değerine doğru bu kadar döner. */
export const REP_DRIFT = 1;
export const forget = (rep: number) => rep + Math.sign(START_REPUTATION - rep) * Math.min(REP_DRIFT, Math.abs(START_REPUTATION - rep));
/** Dükkânın açık olduğu saatler: ilk müşteri açılışta, son müşteri kapanıştan önce gelir. */
export const OPEN_HOUR = 8;
export const CLOSE_HOUR = 19;

/** Tohumlu rastgele sayı (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** O güne kadar gelen zam sıçramalarının sayısı. */
const jumps = (p: Product, day: number) => (p.step && p.every && p.first && day >= p.first ? Math.floor((day - p.first) / p.every) + 1 : 0);

/** Ürünün ilk güne göre pahalanma çarpanı: günlük sessiz zam ve zam sıçramaları. */
export const factorOn = (p: Product, day: number) => (1 + p.drift) ** (Math.max(1, day) - 1) * (1 + (p.step ?? 0)) ** jumps(p, day);

/** Toptancının fiyatı listedekinden bu kadar yüksek: kâr payı dar (maliyet market fiyatının aşağı yukarı dörtte üçü). */
export const COST_UP = 1.07;
/** Toptan fiyatı köydeki fiyattan hızlı zamlanır: fiyatını güncellemeyenin payı her gün biraz erir. */
export const COST_DRIFT = 0.0025;

/** O günün market fiyatı ve maliyeti; maliyet market fiyatının altında kalır. */
export function priceOn(p: Product, day: number): { market: number; cost: number } {
  const f = factorOn(p, day);
  const market = Math.round(p.market * f);
  const squeeze = COST_UP * (1 + COST_DRIFT) ** (Math.max(1, day) - 1);
  return { market, cost: Math.min(market - 1, Math.round(p.cost * f * squeeze)) };
}

/** Bu gün zam sıçraması gelen ürünler (radyo bir gün önceden haber verir). */
export const hikesOn = (day: number) => PRODUCTS.filter((p) => jumps(p, day) > jumps(p, day - 1));

/**
 * Köyde "başka yerde yok" payı: temel gıda dışındaki mala köylü market fiyatının bu kadar
 * fazlasını olağan sayar (kasabaya inmeye değmez). Temel gıdada pay yoktur: köylü ekmeğin,
 * yağın fiyatını bilir. Kazanmanın yolu malı ayırmaktır: temel gıda adil, gerisi primli.
 */
export const CONVENIENCE = 0.25;

/** Köylünün o malda "olağan" saydığı fiyat: temel gıdada market fiyatı, gerisinde biraz fazlası. */
export const fairOn = (p: Product, day: number) => {
  const { market } = priceOn(p, day);
  return isBasic(p.id) ? market : Math.round(market * (1 + CONVENIENCE));
};

/** Sepetin toplam market fiyatı, maliyeti ve köylünün olağan saydığı tutar. */
export function basketOn(items: Product[], day: number) {
  return items.reduce(
    (s, p) => {
      const x = priceOn(p, day);
      return { market: s.market + x.market, cost: s.cost + x.cost, fair: s.fair + fairOn(p, day) };
    },
    { market: 0, cost: 0, fair: 0 },
  );
}

export const ceilingOf = (market: number, c: { ceiling: number }) => Math.round(market * c.ceiling);
/** Bu fiyatın üstü akıl almaz: müşteri pazarlığa girmeden gider. */
export const absurdOf = (ceiling: number) => Math.max(ceiling + 5, Math.round(ceiling * 1.5));

// --- hava ve köy olayları ---

export type Weather = 'sunny' | 'cloudy' | 'rain' | 'snow';

export const WEATHER: Record<Weather, { label: string; crowd: number }> = {
  sunny: { label: '☀️ Güneşli', crowd: 0 },
  cloudy: { label: '☁️ Bulutlu', crowd: 0 },
  rain: { label: '🌧 Yağmurlu', crowd: -2 },
  snow: { label: '❄️ Karlı', crowd: -3 },
};

/** Günün havası: ilk gün hep güneşli, sonra tohumdan. */
export function weatherOn(seed: number, day: number): Weather {
  if (day === 1) return 'sunny';
  const x = rng(seed * 7 + day * 13)();
  return x < 0.45 ? 'sunny' : x < 0.72 ? 'cloudy' : x < 0.93 ? 'rain' : 'snow';
}

export interface VillageEvent {
  title: string;
  text: string;
  /** Tavan çarpanına eklenir. */
  ceiling?: number;
  /** Günün müşteri sayısına eklenir. */
  crowd?: number;
  /** Bu ürünler o gün daha çok istenir. */
  favor?: string[];
}

/** İlk günün olayı: yeni bakkalın açılışı. */
export const OPENING: VillageEvent = { title: 'Kepenk açılışı', text: 'Şükrü Amca memlekete gitti, dükkân sana emanet. Köy yeni bakkalı merak ediyor.' };

/** Sonraki günlerin olayları tohumdan seçilir; sıradan gün daha sık çıkar. */
export const EVENT_POOL: VillageEvent[] = [
  { title: 'Sıradan bir gün', text: 'Köyde hayat akıp gidiyor.' },
  { title: 'Sıradan bir gün', text: 'Köyde hayat akıp gidiyor.' },
  { title: 'Düğün var!', text: 'Herkes şeker, çay ve meyve suyu peşinde; kese açık, pahalıya da alırlar.', ceiling: 0.15, favor: ['seker', 'cay', 'meyvesuyu', 'gazoz', 'yag'] },
  { title: 'Kasabada indirim', text: 'Zincir market kampanya yapıyor: kimse fazla para vermek istemiyor.', ceiling: -0.1 },
  { title: 'Pazar günü', text: 'Köy pazarı kuruldu, yollar kalabalık.', crowd: 2 },
  { title: 'Hasat zamanı', text: 'Tarladan para geldi, çiftçinin eli rahat.', ceiling: 0.05, crowd: 1, favor: ['ekmek', 'peynir', 'cay'] },
  { title: 'Okullar açıldı', text: 'Çocuklar beslenme peşinde.', crowd: 1, favor: ['cikolata', 'meyvesuyu', 'biskuvi'] },
  { title: 'Cenaze var', text: 'Köyde helva kavruluyor, çay demleniyor.', crowd: -1, favor: ['cay', 'seker', 'un', 'yag'] },
  { title: 'Bayram', text: 'Gurbetçiler köye döndü, kapı kapı bayram ziyareti: dükkân kalabalık, herkes çikolata, şeker peşinde.', ceiling: 0.05, crowd: 2, favor: ['cikolata', 'seker', 'biskuvi', 'kolonya'] },
  { title: 'Yayla göçü', text: 'Köyün yarısı yaylaya çıktı.', crowd: -2 },
];

export function eventOn(seed: number, day: number): VillageEvent {
  if (day <= 1) return OPENING;
  return EVENT_POOL[Math.floor(rng(seed * 53 + day * 7)() * EVENT_POOL.length)];
}

/**
 * İtibara, havaya ve olaya göre günün müşteri sayısı: 4 ile 18 arası. İyi itibar kalabalığı biraz
 * artırır ama tek başına kurtarmaz; kötü itibar ise hızla boşaltır: 30 itibarla 4, 45 ile 8,
 * 60 ile 12, 90 ile 15 müşteri gelir. Kasabaya zincir market açılınca
 * (RIVAL_DAY) her gün biri eksik gelir, seyyar satıcının geldiği gün iki kişi.
 */
export function customersFor(reputation: number, event?: VillageEvent, weather: Weather = 'sunny', day = 1, peddler = false): number {
  // itibar 55'in altına inince köylü hızla küser: kötü ad, iyi addan çok daha hızlı yayılır
  const shunned = reputation < SHUN_REP ? Math.round((SHUN_REP - reputation) / 3) : 0;
  const base = 7 + Math.round(reputation / 12) - shunned + WEATHER[weather].crowd + (event?.crowd ?? 0) - (day >= RIVAL_DAY ? 1 : 0) - (peddler ? 2 : 0);
  return Math.max(4, Math.min(18, base));
}

/** Bu itibarın altında köylü dükkândan hızla uzaklaşır. */
export const SHUN_REP = 60;

/** Kasabaya zincir market bu gün açılır: temel gıdada köylünün tavanı düşer, kalabalık azalır. */
export const RIVAL_DAY = 10;

/** Köye seyyar satıcı gelen günler: 4. günden sonra aşağı yukarı altı günde bir. */
export function peddlerOn(seed: number, day: number): boolean {
  return day >= 4 && rng(seed * 59 + day * 23 + 1)() < 0.17;
}

// --- müşteri hafızası ---

/** Köylünün dükkânla geçmişi: kaç kez geldi, ne kadar kazıklandı, kaç kez sevindi. */
export interface Memory {
  visits: number;
  grudge: number;
  happy: number;
  /** Veresiyesi yazılmadı: bu güne kadar dükkâna gelmez. */
  sulk?: number;
  /** Veresiye borcunu kaç kez zamanında ödedi: sadık müşteri, pazarlık etmez. */
  loyal?: number;
  /** Kahvede dükkânın pahalı olduğunu duydu. */
  heard?: boolean;
}

export type Memories = Record<string, Memory>;

const EMPTY: Memory = { visits: 0, grudge: 0, happy: 0 };

/** Hafızaya bir ziyaret işler: söylenmek ve gitmek kin, sevinmek sadakat bırakır ve bir kini sildirir. Turist unutur. */
// `mild`: market fiyatına yakın söylenme kin bırakmaz
export function remember(m: Memories, who: string, mood: Mood, mild = false): Memories {
  if (VILLAGERS.find((v) => v.id === who)?.type === 'turist') return m;
  const cur = m[who] ?? EMPTY;
  return {
    ...m,
    [who]: {
      visits: cur.visits + 1,
      grudge: Math.max(0, cur.grudge + (mood === 'leave' ? 2 : mood === 'grumble' && !mild ? 1 : mood === 'happy' ? -1 : 0)),
      happy: cur.happy + (mood === 'happy' ? 1 : 0),
    },
  };
}

/** Bu kadar kin biriktiren köylü kasabadaki markete gider; her gece biraz soğur ve döner. */
export const AWAY_GRUDGE = 4;

/** Sabah dükkânı küsüp kasabanın marketine gidenler (turistler hariç). */
export const awayOf = (m: Memories, day = 0): string[] => Object.entries(m).filter(([, v]) => v.grudge >= AWAY_GRUDGE || (v.sulk ?? 0) > day).map(([k]) => k);

/** Sadık müşteriler: veresiyesini ödemiş olanlar. */
export const loyalOf = (m: Memories): string[] => Object.entries(m).filter(([, v]) => (v.loyal ?? 0) > 0).map(([k]) => k);

/** Gece: markete giden köylünün kini biraz soğur. */
export function coolOff(m: Memories, away: readonly string[]): Memories {
  if (!away.length) return m;
  const out = { ...m };
  for (const who of away) if (out[who]) out[who] = { ...out[who], grudge: Math.max(0, out[who].grudge - 1) };
  return out;
}

/**
 * Müşterinin o günkü etkin tipi: köy olayı tavanı oynatır, kin tavanı düşürür, sadakat biraz
 * yükseltir. Tavan market fiyatının altına inmez.
 */
export function effectiveType(c: CustomerType, event?: VillageEvent, mem?: Memory): CustomerType {
  const m = mem ?? EMPTY;
  const ceiling = c.ceiling + (event?.ceiling ?? 0) - 0.05 * Math.min(m.grudge, 4) + 0.02 * Math.min(m.happy, 3) + 0.03 * Math.min(m.loyal ?? 0, 2);
  return { ...c, ceiling: Math.max(1.02, Math.round(ceiling * 100) / 100) };
}

/** İlk gelişte söylenen söz: tipine göre; olmayan tip köylünün genel selamını verir. */
const FIRST: Record<string, string> = {
  cocuk: 'Abi, annem gönderdi.',
  genc: 'Selam! Şükrü Amca memlekete mi gitti, doğru mu?',
  ogretmen: 'Günaydın, okula giderken uğradım.',
  coban: 'Sürüyü yamaçta bıraktım, çabuk olalım.',
  gelin: 'Kolay gelsin, kaynanam gönderdi.',
  emekli: 'Kahveden geliyorum, seni konuşuyorlar.',
};

/** Kapıdan girerken söylenen söz: geçen seferi hatırlar. Çocuk annesinin ağzından konuşur. */
export function greetingFor(v: Villager, mem?: Memory): string {
  if (v.type === 'turist') return characterOf(v.id).hello || 'Merhaba, buralı değilim de…';
  const kid = v.type === 'cocuk';
  const ch = characterOf(v.id);
  if (!mem || mem.visits === 0) return ch.hello || (FIRST[v.type] ?? 'Hayırlı işler, yeni bakkal sen misin?');
  if (mem.heard && mem.grudge >= 1 && mem.happy === 0) return kid ? 'Abi, annem "kahvede pahalı diyorlar, dikkat et" dedi.' : 'Kahvede duydum, buranın fiyatları fazlaymış. Bakalım…';
  if ((mem.loyal ?? 0) > 0) return kid ? 'Abi, annem selam söyledi, hep senden alacakmış!' : 'Hesabımızı kapattık, artık ben senin müşterinim.';
  if (mem.grudge >= 2) return kid ? 'Annem geçen sefer "çok pahalı almışsın" diye kızdı.' : 'Geçen sefer kazıkladın beni, bu sefer gözüm üstünde!';
  if (mem.grudge > mem.happy) return kid ? 'Yine ben geldim. Bu sefer ucuz olsun ama.' : 'Yine ben geldim. Bu sefer insaflı ol.';
  if (mem.happy > 0) return kid ? 'Abi, annem senin dükkânı sevdi!' : 'Senin fiyatların iyi, yine geldim!';
  return ch.habit || (kid ? 'Yine ben geldim abi.' : 'Ben yine geldim.');
}

// --- günün müşterileri ---

export interface Visit {
  villager: Villager;
  customer: CustomerType;
  /** İstenen ürünler: bir, iki ya da üç tane (eski hesap ve borç isteyen ziyarette boş). */
  items: Product[];
  /** Satış olursa veresiye yazdırmak ister mi. */
  credit: boolean;
  /** Alışveriş değil, Şükrü Amca'nın defterindeki eski hesabı görmeye geldi (week.ts). */
  account?: Account;
  /** Bu ziyarette bir ikilem çıkar (week.ts). */
  dilemma?: Dilemma;
  /** Hayırsever: defterdeki bütün veresiyeyi ödemeye geldi. */
  charity?: boolean;
  /** Zabıta: dün satılan bayat mal için ceza kesmeye geldi (kaç tane satıldı). */
  fine?: number;
  /** Aldığı malı geri getirdi (returns.ts). */
  returning?: ReturnAsk;
  /** Vergi memuru: Z raporlarıyla kasayı karşılaştırmaya geldi (pressure.ts). */
  audit?: boolean;
}

/**
 * Günün müşterileri: tohumdan; sayı itibara, havaya ve olaya göre. Her köylü günde en fazla bir
 * kez gelir: kim geleceği köy karıştırılarak seçilir, tanıdıklar başka günlerde yine uğrar.
 */
export function dayVisits(seed: number, day: number, reputation: number, weather: Weather = weatherOn(seed, day), away: readonly string[] = [], loyal: readonly string[] = []): Visit[] {
  const r = rng(seed * 31 + day);
  const event = eventOn(seed, day);
  const favor = event.favor;
  const village = [...REGULARS];
  for (let i = village.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [village[i], village[j]] = [village[j], village[i]];
  }
  // küsüp markete gidenler bugün gelmez; sıra yine aynı karışır, yalnızca onlar düşer
  const n = customersFor(reputation, event, weather, day, peddlerOn(seed, day));
  // borcunu ödeyip sadık müşteri olanlar her gün uğrar: sıranın başına geçer
  village.sort((a, b) => Number(loyal.includes(b.id)) - Number(loyal.includes(a.id)));
  const here = village.filter((v) => !away.includes(v.id));
  let today = here.filter((v) => !v.passerby).slice(0, n);
  // itibar düşükse köylü gelmez olur: gelenlerin bir kısmı yoldan geçen yabancıdır
  const share = touristShare(reputation);
  if (share > 0) {
    const strangers = here.filter((v) => v.type === 'turist');
    const k = Math.min(strangers.length, Math.round(n * share));
    today = [...strangers.slice(0, k), ...here.filter((v) => v.type !== 'turist').slice(0, n - k)];
    for (let i = today.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [today[i], today[j]] = [today[j], today[i]];
    }
  }
  // açılış günü herkes raftaki temel gıdayı ister; yalnızca bir kişi dükkânda olmayan bir şey sorar:
  // oyuncu özel malı Kemal'e söylemesi gerektiğini böyle öğrenir
  const curious = day === 1 ? Math.min(2, today.length - 1) : -1;
  return today
    .map((villager, i) => {
    const customer = customerOf(villager);
    const wanted = customer.wants ? PRODUCTS.filter((p) => customer.wants!.includes(p.id)) : PRODUCTS;
    if (i === curious) {
      const special = wanted.filter((p) => !isBasic(p.id));
      const p = special.length ? special[Math.floor(r() * special.length)] : PRODUCTS.find((x) => x.id === 'cikolata')!;
      return { villager, customer, items: [p], credit: false };
    }
    const base = day === 1 ? (wanted.some((p) => isBasic(p.id)) ? wanted.filter((p) => isBasic(p.id)) : PRODUCTS.filter((p) => isBasic(p.id))) : wanted;
    // temel gıda üç kat, ekmek altı kat daha sık istenir
    let pool = base.flatMap((p) => Array.from({ length: p.id === 'ekmek' ? 6 : isBasic(p.id) ? 3 : 1 }, () => p));
    // olay günü istenen ürünler havuza bir kez daha girer: daha sık çıkar
    if (favor && !customer.wants && day > 1) pool = [...pool, ...PRODUCTS.filter((p) => favor.includes(p.id))];
    const x = r();
    const count = customer.wants ? 1 : x < 0.6 ? 1 : x < 0.88 ? 2 : 3;
    const items: Product[] = [];
    while (items.length < count) {
      const p = pool[Math.floor(r() * pool.length)];
      if (!items.includes(p)) items.push(p);
    }
    const credit = villager.pays > 0 && r() < 0.22;
    return { villager, customer, items, credit };
  });
}

/** Müşterinin dükkâna girdiği saat (ondalık): açılıştan kapanışa eşit aralıkla. */
export function hourOf(idx: number, total: number): number {
  return OPEN_HOUR + ((CLOSE_HOUR - OPEN_HOUR) * idx) / Math.max(1, total);
}

export const clockText = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;

// --- tepki ---

export type Mood = 'happy' | 'grumble' | 'counter' | 'leave';

export interface Reaction {
  mood: Mood;
  /** Satıldıysa satış fiyatı. */
  sold?: number;
  /** Pazarlıkta müşterinin karşı teklifi. */
  offer?: number;
  /** İtibar değişimi. */
  rep: number;
  /** Market fiyatına yakın söylendi: itibar düşmez, kin kalmaz. */
  mild?: boolean;
}

/** Piyasanın bu oranının altı kelepirdir: köyde konuşulur, pazarlıkçı bile pazarlık etmez. */
export const BARGAIN = 0.85;
/** Bunun altı "uygun" sayılır, biraz itibar getirir; üstü market fiyatı gibidir. */
export const FAIR = 0.95;

/**
 * Müşterinin tepkisi. `second`: pazarlıktan sonraki son fiyat; bu kez tavanı aşarsa müşteri gider.
 * `firm`: sepet çoğunlukla temel gıda; tavanı aşan fiyata pazarlık etmeden gider (pressure.ts).
 * Karşı teklif market ile tavan arasında, tavanın altında kalır: oyuncuya ipucu verir.
 */
export function react(price: number, market: number, c: { ceiling: number; gossip: number }, second = false, firm = false): Reaction {
  const ceiling = ceilingOf(market, c);
  // akıl almaz fiyata pazarlık bile etmez: hemen çıkar gider
  if (price > absurdOf(ceiling)) return { mood: 'leave', rep: -4 };
  // temel gıdada köylü fiyatı bilir: tavanı aşan fiyata pazarlık etmez, marketten alır
  if (firm && price > ceiling) return { mood: 'leave', rep: -2 };
  if (price <= market) {
    // ucuz satış köyde konuşulur; çok ucuzsa daha çok. Market fiyatına çok yakın satış olağandır,
    // itibar kazandırmaz: itibar emekle yükselir
    const cheap = price <= market * BARGAIN ? 2 : price <= market * FAIR ? 1 : 0;
    return { mood: 'happy', sold: price, rep: Math.round(cheap * c.gossip) };
  }
  if (price <= ceiling) {
    // tavana yaklaştıkça daha çok söylenir; market fiyatına yakınsa söylenir ama kin tutmaz.
    // eşik karşı teklifin (aralığın %40'ı) altında: teklifi kabul etmek bedava olmasın
    const over = (price - market) / Math.max(1, ceiling - market);
    if (over <= 0.3) return { mood: 'grumble', sold: price, rep: 0, mild: true };
    return { mood: 'grumble', sold: price, rep: over > 0.7 ? -2 : -1 };
  }
  if (second) return { mood: 'leave', rep: -3 };
  const offer = Math.max(5, Math.floor((market + (ceiling - market) * 0.4) / 5) * 5);
  return { mood: 'counter', offer: Math.min(offer, ceiling), rep: 0 };
}

// Tepki, turist ve veresiye sözleri dialogue.ts'te
export { TOURIST_MARKUP, creditLine, lineFor, sayItems, touristLine } from './dialogue';

// --- veresiye ---

export interface Debt {
  who: string;
  name: string;
  amount: number;
  /** Malın toptancı maliyeti: borç batarsa zarar budur. */
  cost: number;
  day: number;
  /** Ödendiyse ödendiği gün. */
  paid?: number;
  /** Vadesi geçip battıysa battığı gün: mal gitti, para gelmeyecek. */
  lost?: number;
}

/** Veresiyenin vadesi: bu kadar gün içinde ödenmeyen borç batar. */
export const DEBT_DAYS = 7;
/** Bir akşam borcunu getirme olasılığı: köylünün ödeme huyu × bu pay. */
const PAY_CHANCE = 0.35;

/**
 * Gün sonunda veresiyeler: o günden önce yazılmış her açık borç, borçlunun ödeme huyuna göre bir
 * olasılıkla kapanır. Vadesi (DEBT_DAYS) dolan borç batar: huyu kötü olanın borcu çoğu zaman batar.
 */
export function settleDebts(debts: Debt[], seed: number, day: number, reputation = START_REPUTATION): Debt[] {
  const r = rng(seed * 17 + day * 101);
  // itibarı düşen dükkâna kimse borcunu getirmez: vadesi dolan batar
  const willing = reputation >= LOW_REP;
  return debts.map((d) => {
    if (d.paid || d.lost || d.day >= day) return d;
    const v = VILLAGERS.find((x) => x.id === d.who);
    if (willing && r() < (v?.pays ?? 0) * PAY_CHANCE) return { ...d, paid: day };
    return day - d.day >= DEBT_DAYS ? { ...d, lost: day } : d;
  });
}

// --- defter ---

/** Defter kaydı: oyuncunun o ürün için gördüğü tepkiler. Sepet satışları ürüne bağlanmaz. */
export interface LogEntry {
  product: string;
  day: number;
  price: number;
  mood: Mood;
  customer: string;
  /** Birden çok ürünlük sepetse ürünlerin adları. */
  basket?: string[];
}

export const profitOf = (sold: number, cost: number) => sold - cost;


/** Lira yazımı: "1.250 ₺". */
export const tl = (n: number) => `${n.toLocaleString('tr-TR')} ₺`;

/** Dükkân kapanınca verilen unvan: kaç gün dayandığına ve köydeki itibara göre. */
export function titleFor(days: number, reputation: number, gain?: number /* devralınan değere göre fark */): { title: string; note: string } {
  if (reputation < 35) return { title: 'Köyün Kurdu', note: 'Selam veren kalmadı. Muhtar seni kahvede konuşuyor.' };
  if (days >= 30 && gain !== undefined && gain < 0) return { title: 'Emaneti Eriten', note: 'Kasa dolu görünse de raflar boşaldı: Şükrü Amca\'nın malını sattın, yerine koymadın.' };
  if (days >= 30) return reputation >= 70 ? { title: 'Efsane Bakkal', note: 'Hem kasa hem gönül dolu. Köy düğününde baş köşe senin.' } : { title: 'Kurnaz Esnaf', note: 'Fiyatların kokusunu alıyorsun. Biraz gönül de al.' };
  if (days >= 14) return reputation >= 70 ? { title: 'Gönüllerin Bakkalı', note: 'Herkes senden alıyor. Zamları biraz daha yakından izle.' } : { title: 'Usta Bakkal', note: 'İki haftayı devirdin. Defteri tutan kazanır.' };
  if (days >= 7) return { title: 'Kalfa Bakkal', note: 'Bir haftayı çıkardın. Zamlar hızlanınca fiyatları da hızlandır.' };
  return { title: 'Çırak Bakkal', note: 'Kasa çabuk eridi. Siparişi az ver, fiyatı zamla birlikte yükselt.' };
}
