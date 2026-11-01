import type { LevelSpec, MoveId } from './model';

/*
 * Vardiyanın kavşakları: kolaydan zora, her biri trafik mühendisliğinin bir dersi. Kavşaklar elle
 * kurulmuş şemalardır; adlar semtlerden, ölçüler gerçek şerit genişliklerinden (3,3 m). Her
 * bölüm kontrolörde kötü bir planla açılır: oyuncu sayıları okuyup planı düzeltir, zirvede de
 * elle müdahale eder.
 */

export interface Level {
  spec: LevelSpec;
  title: string;
  place: string;
  order: string;
  tip: string;
}

const NS: MoveId[] = ['N.L', 'N.T', 'N.R', 'S.L', 'S.T', 'S.R'];
const EW: MoveId[] = ['E.L', 'E.T', 'E.R', 'W.L', 'W.T', 'W.R'];

export const LEVELS: Level[] = [
  {
    title: 'İlk vardiya',
    place: 'Kadıköy · Moda Caddesi',
    order:
      'Hoş geldin amirim. Bugün kontrol merkezindeki ilk günün; Moda Caddesi’ndeki sakin bir kavşakla başlıyoruz. Rehber seni adım adım götürecek: ışık sürelerini ayarlayacak, yolu kapatıp açacak, ışıkları elle çevirecek ve yoldaki bir arızaya ekip göndereceksin.',
    tip: 'Rehberin dediğini yap; parlayan düğme sıradaki iş. Takılırsan rehber kutusunda “Bu adımı atla” var.',
    spec: {
      id: 'moda',
      seed: 7,
      guided: true,
      lockMoves: true,
      landmarks: [{ kind: 'cami', corner: 'NE' }],
      legs: {
        N: { name: 'Altıyol', lanes: ['LTR'], out: 1, v: 10 },
        S: { name: 'Moda Burnu', lanes: ['LTR'], out: 1, v: 10 },
        E: { name: 'Bahariye', lanes: ['LTR'], out: 1, v: 9 },
        W: { name: 'İskele', lanes: ['LTR'], out: 1, v: 9 },
      },
      demand: [
        { mv: 'N.T', rate: 7 },
        { mv: 'N.L', rate: 0.8 },
        { mv: 'N.R', rate: 1 },
        { mv: 'S.T', rate: 6.5 },
        { mv: 'S.L', rate: 0.8 },
        { mv: 'S.R', rate: 1 },
        { mv: 'E.T', rate: 1.6 },
        { mv: 'E.R', rate: 0.6 },
        { mv: 'W.T', rate: 1.6 },
        { mv: 'W.R', rate: 0.6 },
      ],
      peds: [
        { leg: 'N', rate: 3 },
        { leg: 'S', rate: 3 },
        { leg: 'E', rate: 3 },
        { leg: 'W', rate: 3 },
      ],
      events: [{ at: 30, kind: 'note', text: 'Simitçi tezgâhını köşeye kurdu. Altıyol’dan kalabalık iniyor.' }],
      plan: {
        phases: [
          { moves: [...NS, 'E.P', 'W.P'], green: 12 },
          { moves: [...EW, 'N.P', 'S.P'], green: 34 },
        ],
        allRed: 2,
      },
      duration: 200,
    },
  },
  {
    title: 'Süreler ters',
    place: 'Kadıköy · Bahariye',
    order:
      'Bahariye Caddesi’ndeki kavşağın kontrolörü belediye bakımından ters ayarla dönmüş: kalabalık caddeye 15, boş sokağa 35 saniye yeşil veriyor. Evreler doğru, yalnızca süreler yanlış. Kuyrukları say, yeşili dağıt.',
    tip: 'Evre kartındaki − / + ile yeşili değiştir. Kural: kuyruğu uzun olan kola daha çok yeşil. Döngü çok uzarsa herkes bekler.',
    spec: {
      id: 'bahariye',
      seed: 11,
      lockMoves: true,
      legs: {
        N: { name: 'Altıyol', lanes: ['LTR'], out: 1, v: 11 },
        S: { name: 'Moda', lanes: ['LTR'], out: 1, v: 11 },
        E: { name: 'Kuşdili', lanes: ['LTR'], out: 1, v: 9 },
        W: { name: 'Rıhtım', lanes: ['LTR'], out: 1, v: 9 },
      },
      demand: [
        { mv: 'N.T', rate: 8 },
        { mv: 'N.L', rate: 1.2 },
        { mv: 'N.R', rate: 1.5 },
        { mv: 'S.T', rate: 7.5 },
        { mv: 'S.L', rate: 1 },
        { mv: 'S.R', rate: 1.5 },
        { mv: 'E.T', rate: 2.2 },
        { mv: 'E.L', rate: 0.6 },
        { mv: 'E.R', rate: 0.8 },
        { mv: 'W.T', rate: 2 },
        { mv: 'W.L', rate: 0.6 },
        { mv: 'W.R', rate: 0.8 },
      ],
      peds: [
        { leg: 'N', rate: 4 },
        { leg: 'S', rate: 4 },
        { leg: 'E', rate: 5 },
        { leg: 'W', rate: 5 },
      ],
      events: [
        { at: 20, kind: 'note', text: 'Altıyol’dan gelen kuyruk Boğa heykeline uzanıyor.' },
        { at: 95, kind: 'parked', leg: 'N', sec: 35, text: 'Altıyol’da biri çift sıra park etti: “İki dakika abi!” Kol yavaş akıyor.' },
      ],
      plan: {
        phases: [
          { moves: [...NS, 'E.P', 'W.P'], green: 15 },
          { moves: [...EW, 'N.P', 'S.P'], green: 35 },
        ],
        allRed: 2,
      },
      duration: 180,
    },
  },
  {
    title: 'Sola dönen bekler',
    place: 'Ataşehir · Finans Merkezi',
    order:
      'Bulvarın iki yanından plazalara sola dönenler, karşıdan akan düz trafikte boşluk bulamıyor. Sol şeritteki kuyruk her döngüde uzuyor. Sola dönüşe korumalı bir evre ver: o sırada karşı yön kırmızıda beklesin.',
    tip: '“+ Evre” ile yeni evre aç, iki yönün sol oklarını seç. Aynı evrede karşıdan gelen düzle sol yanarsa sola dönen boşluk kollar (izinli); çakışan oklar kilitlenir.',
    spec: {
      id: 'atasehir',
      seed: 23,
      legs: {
        E: { name: 'Kozyatağı', lanes: ['L', 'T', 'TR'], out: 2, median: 4, v: 13.9 },
        W: { name: 'Küçükbakkalköy', lanes: ['L', 'T', 'TR'], out: 2, median: 4, v: 13.9 },
        N: { name: 'Finans Merkezi', lanes: ['L', 'TR'], out: 2, v: 11 },
        S: { name: 'Ataşehir Bulvarı', lanes: ['L', 'TR'], out: 2, v: 11 },
      },
      demand: [
        { mv: 'E.T', rate: 16 },
        { mv: 'W.T', rate: 15 },
        { mv: 'E.L', rate: 8 },
        { mv: 'W.L', rate: 7 },
        { mv: 'E.R', rate: 2 },
        { mv: 'W.R', rate: 2 },
        { mv: 'N.T', rate: 3 },
        { mv: 'N.L', rate: 1.5 },
        { mv: 'N.R', rate: 2.5 },
        { mv: 'S.T', rate: 3 },
        { mv: 'S.L', rate: 1.5 },
        { mv: 'S.R', rate: 2 },
      ],
      peds: [
        { leg: 'N', rate: 3 },
        { leg: 'S', rate: 3 },
      ],
      events: [
        { at: 40, kind: 'note', text: 'Plazaların otoparkına giren kuyruk sol şeritten taştı.' },
        { at: 120, kind: 'courier', mv: 'E.T', text: 'Kozyatağı’ndan bir motokurye geliyor; ışığa bakan biri değil. Tüm kırmızıya güven.' },
      ],
      plan: {
        phases: [
          { moves: [...EW, 'N.P', 'S.P'], green: 40 },
          { moves: NS, green: 22 },
        ],
        allRed: 2,
      },
      duration: 200,
    },
  },
  {
    title: 'Okul çıkışı',
    place: 'Şişli · Halaskargazi',
    order:
      'Metro çıkışıyla lise aynı köşede. Kontrolörde yaya evresi hiç yok: insanlar araçların arasından geçiyor, sağa dönenler geçitte kilitleniyor. Saat 15.30’da zil çalınca kaldırımlar dolacak. Yayalara yeşil ver, ama caddeyi de kilitleme.',
    tip: 'Geçit düğmeleri (🚶) evreye yayayı ekler. Paralel akan araçla aynı evrede yürürler; dönen araç geçitte bekler. Yaya çoksa dört geçidi birden açan ayrı bir yaya evresi kur.',
    spec: {
      id: 'sisli',
      seed: 37,
      legs: {
        N: { name: 'Mecidiyeköy', lanes: ['LT', 'TR'], out: 2, v: 12.5 },
        S: { name: 'Osmanbey', lanes: ['LT', 'TR'], out: 2, v: 12.5 },
        E: { name: 'Teşvikiye', lanes: ['LTR'], out: 1, v: 9 },
        W: { name: 'Kurtuluş', lanes: ['LTR'], out: 1, v: 9 },
      },
      demand: [
        { mv: 'N.T', rate: 9 },
        { mv: 'S.T', rate: 9 },
        { mv: 'N.R', rate: 2 },
        { mv: 'S.R', rate: 2 },
        { mv: 'N.L', rate: 1 },
        { mv: 'S.L', rate: 1 },
        { mv: 'E.T', rate: 2 },
        { mv: 'W.T', rate: 2 },
        { mv: 'E.R', rate: 1.2 },
        { mv: 'W.R', rate: 1.2 },
        { mv: 'E.L', rate: 0.6 },
        { mv: 'W.L', rate: 0.6 },
      ],
      peds: [
        {
          leg: 'N',
          rate: [
            [0, 10],
            [70, 12],
            [90, 34],
            [150, 30],
            [190, 12],
          ],
        },
        {
          leg: 'S',
          rate: [
            [0, 8],
            [90, 26],
            [190, 10],
          ],
        },
        {
          leg: 'E',
          rate: [
            [0, 10],
            [80, 12],
            [100, 36],
            [190, 14],
          ],
        },
        {
          leg: 'W',
          rate: [
            [0, 8],
            [100, 22],
            [190, 10],
          ],
        },
      ],
      events: [
        { at: 88, kind: 'note', text: 'Zil çaldı. Lisenin kapısı açıldı, metrodan da bir tren boşaldı.' },
        { at: 150, kind: 'convoy', mv: 'W.T', n: 6, text: 'Kurtuluş’tan düğün konvoyu geliyor: altı araç, bayraklar ve susmayan kornalar.' },
      ],
      plan: {
        phases: [
          { moves: NS, green: 30 },
          { moves: EW, green: 18 },
        ],
        allRed: 2,
      },
      duration: 210,
    },
  },
  {
    title: 'Düğün var',
    place: 'Bağcılar · Mahmutbey Caddesi',
    order:
      'Cumartesi akşamı. Köşedeki düğün salonunun önünde üç düğün üst üste: konvoylar kornayla geliyor, biri mutlaka yolu kesip halay çekecek. Kontrolördeki plan T kavşağın sol dönüşünü unutmuş. Planı düzelt; düğün konvoyu kolu kapatınca “Trafik ekiplerine bildir”, gerekirse kolu kapatıp trafiği ara sokaklara ver.',
    tip: 'Olay kartındaki “Trafik ekiplerine bildir” ekibi yola çıkarır; ekip gelmezse düğün dakikalarca sürer. Kapalı koldan gelen sürücüler ara sokaklara sapar ama her biri 40 saniye kaybeder.',
    spec: {
      id: 'bagcilar',
      seed: 61,
      dusk: 0.55,
      bold: 1.4,
      landmarks: [
        { kind: 'dugun', corner: 'SE' },
        { kind: 'cami', corner: 'NW' },
      ],
      legs: {
        E: { name: 'Mahmutbey', lanes: ['L', 'T'], out: 2, v: 12 },
        W: { name: 'Bağcılar Meydanı', lanes: ['T', 'TR'], out: 2, v: 12 },
        S: { name: 'Düğün Salonu Sk.', lanes: ['L', 'R'], out: 1, v: 9 },
      },
      demand: [
        { mv: 'E.T', rate: 12 },
        { mv: 'W.T', rate: 11 },
        { mv: 'E.L', rate: 4 },
        { mv: 'W.R', rate: 2.2 },
        { mv: 'S.L', rate: 3.5 },
        { mv: 'S.R', rate: 3 },
      ],
      peds: [
        { leg: 'S', rate: 4 },
        { leg: 'E', rate: 3 },
        { leg: 'W', rate: 3 },
      ],
      events: [
        { at: 30, kind: 'convoy', mv: 'W.R', n: 5, text: 'Bağcılar Meydanı’ndan ilk düğün konvoyu: beş araç, gelin arabası önde, kornalar susmuyor.' },
        { at: 75, kind: 'wedding', leg: 'S', sec: 110, text: 'Düğün konvoyu Düğün Salonu Sokağı’nın ağzında durdu: davul zurna, halay! Sokak iki yönde de kapandı.' },
        { at: 150, kind: 'breakdown', mv: 'E.T', sec: 120, text: 'Mahmutbey kolunda bir kamyonet arızalandı: düz şerit kapandı, dörtlüler yanıyor.' },
        { at: 185, kind: 'convoy', mv: 'E.L', n: 4, text: 'İkinci düğün konvoyu Mahmutbey’den sola dönüyor: dört araç, camdan bayrak sallayan çocuklar.' },
      ],
      plan: {
        phases: [
          { moves: ['E.T', 'W.T', 'W.R', 'S.P'], green: 34 },
          { moves: ['S.L', 'S.R', 'E.P', 'W.P'], green: 20 },
        ],
        allRed: 2,
      },
      duration: 230,
    },
  },
  {
    title: 'Sarıdan sonra',
    place: 'Mecidiyeköy · Büyükdere',
    order:
      'Kontrolörün tüm kırmızısı sıfıra çekilmiş: bir evre biter bitmez öteki başlıyor. Dolmuşlar sarının sonunu kolluyor, kutunun ortasında dönmeyi bekleyenler kırmızıda kalıyor. Bir de iki ambulans yolda: biri Şişli Etfal’e dönecek, biri Zincirlikuyu’dan geliyor.',
    tip: 'Tüm kırmızıyı 1–2 saniyeye çıkar: kutu boşalmadan çapraz yeşil yanmasın. Ambulans gelince onun kolunun evre kartına dokun, “Şimdi geç” de: kuyruk boşalsın.',
    spec: {
      id: 'mecidiyekoy',
      seed: 41,
      bold: 2.4,
      legs: {
        N: { name: 'Levent', lanes: ['L', 'T', 'TR'], out: 3, median: 3, v: 13.9 },
        S: { name: 'Zincirlikuyu', lanes: ['L', 'T', 'TR'], out: 3, median: 3, v: 13.9 },
        E: { name: 'Şişli Etfal', lanes: ['LT', 'TR'], out: 2, v: 11 },
        W: { name: 'Okmeydanı', lanes: ['LT', 'TR'], out: 2, v: 11 },
      },
      demand: [
        { mv: 'N.T', rate: 16 },
        { mv: 'S.T', rate: 17 },
        { mv: 'N.L', rate: 3 },
        { mv: 'S.L', rate: 3 },
        { mv: 'N.R', rate: 3 },
        { mv: 'S.R', rate: 3 },
        { mv: 'E.T', rate: 4.5 },
        { mv: 'W.T', rate: 4.5 },
        { mv: 'E.L', rate: 2.5 },
        { mv: 'W.L', rate: 2.5 },
        { mv: 'E.R', rate: 2 },
        { mv: 'W.R', rate: 2 },
      ],
      peds: [
        { leg: 'E', rate: 4 },
        { leg: 'W', rate: 4 },
      ],
      events: [
        { at: 55, kind: 'ambulance', mv: 'W.T', text: 'Ambulans Okmeydanı’ndan geliyor, Şişli Etfal’e gidecek: Batı koluna yeşil lazım.' },
        { at: 135, kind: 'ambulance', mv: 'S.L', text: 'Ambulans Zincirlikuyu’dan geliyor, sola dönecek: Güney sola yeşil lazım.' },
        { at: 180, kind: 'parked', leg: 'W', sec: 15, text: 'Okmeydanı tarafında bir servis minibüsü çift sıra park etti. Kol yavaşladı.' },
      ],
      plan: {
        phases: [
          { moves: ['N.L', 'S.L'], green: 10 },
          { moves: ['N.T', 'N.R', 'S.T', 'S.R', 'E.P', 'W.P'], green: 34 },
          { moves: [...EW], green: 20 },
        ],
        allRed: 0,
      },
      duration: 200,
    },
  },
  {
    title: 'Mesai çıkışı',
    place: 'Levent · Büyükdere Caddesi',
    order:
      'Saat 17.45. Plazalardan aynı anda on binlerce kişi çıkıyor: önce servisler, sonra herkes. Büyükdere’de kuzeye akan kuyruk dakika dakika büyüyecek, Levent Çarşı’dan çıkan da sola dönmek isteyecek. Plan sabahtan kalmış: şehre giren yöne ağırlık veriyor. Akşamın yönüne çevir, rampayı izle.',
    tip: 'İş çıkışında talep zamanla artar: başta iyi görünen plan yirmi saniye sonra boğulur. Sensörlü çalıştır, kuyruk kolun yarısını geçince o evreye yeşil ekle.',
    spec: {
      id: 'levent',
      seed: 73,
      dusk: 0.35,
      bold: 1.3,
      landmarks: [
        { kind: 'plaza', corner: 'NW' },
        { kind: 'plaza', corner: 'NE' },
      ],
      legs: {
        S: { name: 'Zincirlikuyu', lanes: ['L', 'T', 'T', 'TR'], out: 3, median: 3, v: 13.9 },
        N: { name: 'Maslak', lanes: ['L', 'T', 'TR'], out: 4, median: 3, v: 13.9 },
        E: { name: 'Levent Çarşı', lanes: ['L', 'TR'], out: 2, v: 10 },
        W: { name: 'Plazalar', lanes: ['L', 'LTR'], out: 2, v: 10 },
      },
      demand: [
        {
          mv: 'S.T',
          rate: [
            [0, 14],
            [60, 20],
            [130, 28],
            [220, 26],
          ],
        },
        { mv: 'N.T', rate: 9 },
        { mv: 'S.L', rate: 2 },
        { mv: 'N.L', rate: 2 },
        { mv: 'S.R', rate: 3 },
        { mv: 'N.R', rate: 2 },
        {
          mv: 'W.L',
          rate: [
            [0, 2],
            [50, 5],
            [120, 8],
          ],
        },
        {
          mv: 'W.R',
          rate: [
            [0, 2],
            [50, 4],
            [120, 6],
          ],
        },
        { mv: 'W.T', rate: 1 },
        { mv: 'E.L', rate: 3 },
        { mv: 'E.T', rate: 1.5 },
        { mv: 'E.R', rate: 1.5 },
      ],
      peds: [
        {
          leg: 'W',
          rate: [
            [0, 6],
            [60, 18],
            [200, 14],
          ],
        },
        { leg: 'E', rate: 6 },
      ],
      events: [
        { at: 20, kind: 'note', text: 'Plazaların otopark çıkışları açıldı. Servis minibüsleri Plazalar kolunda dizildi.' },
        { at: 70, kind: 'parked', leg: 'W', sec: 60, text: 'Bir personel servisi Plazalar kolunda çift sıra durdu: “Herkes binene kadar abi!”' },
        { at: 140, kind: 'breakdown', mv: 'S.T', sec: 140, text: 'Zincirlikuyu kolunda bir otomobilin benzini bitti. Orta şerit kapandı.' },
        { at: 180, kind: 'ambulance', mv: 'S.T', text: 'Ambulans Zincirlikuyu’dan Maslak’a çıkıyor: Güney koluna yeşil lazım.' },
      ],
      plan: {
        phases: [
          { moves: ['N.L', 'S.L'], green: 10 },
          { moves: ['N.T', 'N.R', 'S.T', 'S.R', 'E.P', 'W.P'], green: 18 },
          { moves: [...EW], green: 30 },
        ],
        allRed: 2,
      },
      duration: 230,
    },
  },
  {
    title: 'Vapur yanaştı',
    place: 'Beşiktaş · Barbaros',
    order:
      'Akşam zirvesi, yağmur başladı. Önce herkes Barbaros’tan yukarı çıkıyor; sonra iskeleye vapur yanaşınca sahilden bir dalga gelecek, yayalar da onunla. Sabit plan bu kavşağı taşımaz. Sensörlü çalıştır, dalga gelince elle yönet.',
    tip: 'Sensör açıkken kimsenin beklemediği evre atlanır, araç kalmayınca yeşil erken biter. “Tut” yeşili sabitler; dalga geçince bırak.',
    spec: {
      id: 'besiktas',
      seed: 53,
      dusk: 0.75,
      rain: true,
      legs: {
        N: { name: 'Zincirlikuyu', lanes: ['L', 'T', 'T'], out: 3, median: 3, v: 13 },
        S: { name: 'Beşiktaş Çarşı', lanes: ['L', 'T', 'TR'], out: 2, median: 3, v: 12 },
        W: { name: 'İskele', lanes: ['L', 'LR'], out: 2, v: 10 },
        E: { name: 'Yıldız', lanes: ['LTR'], out: 2, v: 10 },
      },
      demand: [
        {
          mv: 'S.T',
          rate: [
            [0, 15],
            [90, 15],
            [120, 8],
          ],
        },
        { mv: 'N.T', rate: 9 },
        { mv: 'S.L', rate: 2 },
        { mv: 'N.L', rate: 2 },
        { mv: 'S.R', rate: 2 },
        {
          mv: 'W.L',
          rate: [
            [0, 1.5],
            [95, 2],
            [110, 9],
            [160, 8],
            [190, 2],
          ],
        },
        {
          mv: 'W.R',
          rate: [
            [0, 1],
            [95, 1],
            [110, 7],
            [160, 6],
            [190, 1],
          ],
        },
        { mv: 'E.T', rate: 1.2 },
        { mv: 'E.L', rate: 1 },
        { mv: 'E.R', rate: 1.2 },
      ],
      peds: [
        {
          leg: 'W',
          rate: [
            [0, 3],
            [100, 4],
            [115, 26],
            [170, 6],
          ],
        },
        {
          leg: 'N',
          rate: [
            [0, 3],
            [110, 16],
            [170, 4],
          ],
        },
        { leg: 'S', rate: 6 },
      ],
      events: [
        { at: 60, kind: 'convoy', mv: 'S.T', n: 5, text: 'Çarşı’dan maç sonrası konvoy çıktı: beş araç, kornalar susmuyor.' },
        { at: 100, kind: 'note', text: 'Vapur iskeleye yanaştı. Sahilden araçlar ve yolcular geliyor.' },
        { at: 150, kind: 'ambulance', mv: 'N.T', text: 'Ambulans Zincirlikuyu’dan iniyor, çarşıya düz geçecek.' },
      ],
      plan: {
        phases: [
          { moves: ['N.T', 'S.T', 'S.R', 'W.P'], green: 30 },
          { moves: ['N.L', 'S.L'], green: 12 },
          { moves: ['W.L', 'W.R', 'E.L', 'E.T', 'E.R'], green: 12 },
          { moves: ['N.P', 'S.P'], green: 12 },
        ],
        allRed: 1,
      },
      duration: 220,
    },
  },
  {
    title: 'Konvoy geçecek',
    place: 'Üsküdar · Çengelköy Sahil Yolu',
    order:
      'Kuleli’den haber geldi: Cumhurbaşkanlığı konvoyu sahil yolundan, İskele kolundan Beylerbeyi’ne geçecek. Konvoy ışıkta durmaz; kavşağa vardığında İskele kolunun kuyruğu boşalmış, çapraz yönler kırmızıda olmalı. Önünde iki dakika var. Planla: önce kuyruğu erit, sonra yolu tut ya da çapraz kolları kapat.',
    tip: 'Konvoy haberi gelince İskele kolunun evresini “Tut” ile sabitle ya da elle kumandaya geç. Çapraz kolları geçici olarak kapatırsan kutuya kimse girmez. Konvoy geçince her şeyi geri aç.',
    spec: {
      id: 'cengelkoy',
      seed: 89,
      dusk: 0.2,
      landmarks: [
        { kind: 'kosk', corner: 'NE' },
        { kind: 'cami', corner: 'SW' },
      ],
      legs: {
        W: { name: 'Çengelköy İskele', lanes: ['LT', 'T'], out: 2, v: 12 },
        E: { name: 'Beylerbeyi', lanes: ['T', 'TR'], out: 2, v: 12 },
        N: { name: 'Kuleli', lanes: ['LTR'], out: 1, v: 9 },
        S: { name: 'Kandilli Yokuşu', lanes: ['LTR'], out: 1, v: 9 },
      },
      demand: [
        { mv: 'W.T', rate: 10 },
        { mv: 'E.T', rate: 9 },
        { mv: 'W.L', rate: 1.2 },
        { mv: 'E.R', rate: 1.2 },
        { mv: 'N.T', rate: 2.2 },
        { mv: 'N.L', rate: 0.8 },
        { mv: 'N.R', rate: 1 },
        { mv: 'S.T', rate: 2.5 },
        { mv: 'S.L', rate: 1 },
        { mv: 'S.R', rate: 0.8 },
      ],
      peds: [
        { leg: 'N', rate: 5 },
        { leg: 'S', rate: 5 },
        { leg: 'W', rate: 3 },
      ],
      events: [
        { at: 15, kind: 'note', text: 'Çengelköy’de çınaraltı çay bahçesi doldu; sahil yolu yavaş.' },
        { at: 45, kind: 'note', text: 'Telsiz: “Merkez, konvoy Kuleli’den çıktı. Yaklaşık 75 saniye sonra İskele kolundan kavşağa girecek. Yolu açın.”' },
        { at: 120, kind: 'motorcade', mv: 'W.T', n: 5, text: 'Konvoy geliyor! Önde polis, ardında beş siyah araç; ışığa bakmayacaklar.' },
        { at: 175, kind: 'parked', leg: 'S', sec: 50, text: 'Kandilli Yokuşu’nda simit arabası yolun yarısına taştı. Kol yavaşladı.' },
      ],
      plan: {
        phases: [
          { moves: ['W.T', 'W.L', 'E.T', 'E.R', 'N.P', 'S.P'], green: 22 },
          { moves: [...NS], green: 22 },
        ],
        allRed: 2,
      },
      duration: 220,
    },
  },
];

export const PASS_SCORE = 60;

export function verdict(score: number, jammed: boolean, hits: number) {
  if (hits) return 'Geçitte yayaya çarpıldı. Kontrolörün anahtarı elinden alındı; bu kavşağı yeniden kurmalısın.';
  if (jammed) return 'Kuyruk bir önceki kavşağa dayandı, korna sesi Boğaz’ın öbür yakasından duyuldu. Yeniden dene.';
  if (score >= 90) return 'Kusursuz. Dolmuş şoförleri bile sesini çıkarmadı; kavşak sanki kendi kendine akıyor.';
  if (score >= 75) return 'İyi vardiya. Birkaç uzun kuyruk oldu ama kimse kırmızıda kalakalmadı.';
  if (score >= PASS_SCORE) return 'Geçer not. Kavşak aktı; yine de bazı kollar fazla bekledi.';
  return 'Kuyruklar uzadı, sabrı taşan kırmızıda geçti. Bu planla kavşak taşımıyor.';
}

export function shiftTitle(scores: number[]) {
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  if (avg >= 85) return { title: 'Yeşil Dalga Ustası', note: 'Bütün kavşakları trafik mühendisi gibi yönettin.', avg };
  if (avg >= 72) return { title: 'Kıdemli Kavşak Amiri', note: 'Sayıları okudun, ışıkları ona göre çevirdin.', avg };
  if (avg >= 60) return { title: 'Kavşak Amiri', note: 'Vardiya tamam; kornalar biraz yorucuydu.', avg };
  return { title: 'Stajyer Polis', note: 'Düdük senden, ışık başkasından.', avg };
}
