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
      events: [{ at: 20, kind: 'note', text: 'Altıyol’dan gelen kuyruk Boğa heykeline uzanıyor.' }],
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
      events: [{ at: 40, kind: 'note', text: 'Plazaların otoparkına giren kuyruk sol şeritten taştı.' }],
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
      events: [{ at: 88, kind: 'note', text: 'Zil çaldı. Lisenin kapısı açıldı, metrodan da bir tren boşaldı.' }],
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
  if (avg >= 85) return { title: 'Yeşil Dalga Ustası', note: 'Beş kavşağı da trafik mühendisi gibi yönettin.', avg };
  if (avg >= 72) return { title: 'Kıdemli Kavşak Amiri', note: 'Sayıları okudun, ışıkları ona göre çevirdin.', avg };
  if (avg >= 60) return { title: 'Kavşak Amiri', note: 'Vardiya tamam; kornalar biraz yorucuydu.', avg };
  return { title: 'Stajyer Polis', note: 'Düdük senden, ışık başkasından.', avg };
}
