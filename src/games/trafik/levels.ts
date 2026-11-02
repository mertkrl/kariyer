import type { MoveId, NetSpec } from './model';

/*
 * Vardiyanın dokuz bölümü: kavşaktan caddeye büyür, her bölüm bir araç açar. 1: karta dokun,
 * kalabalığa yeşil yak (süreler kilitli). 2: ışık süreleri (yeşil, sarı, tüm kırmızı). 3: iki
 * kavşaklı cadde, yolu kesen düğüne ekip. 4: Yollar paneli; yol çalışması için kolu kapat,
 * trafiği çevir. 5: üç kavşaklı sahil yolu, makam konvoyu bütün caddeden durmadan geçsin.
 * 6: dedektör; maç çıkışında sakin kavşak birden dolar, yağmur başlar. 7: sinyal arızası; ışıklar
 * söner, kavşak dur-bak-geç işler, ekip çağrılmalı. 8: dört kavşaklı Vatan Caddesi; yeşil dalga.
 * 9: Mecidiyeköy; aralarında 120 metre olan üç kavşak, yağmur, konvoy, arıza ve ambulans bir arada.
 * Evreler hep doğrudur (çakışan yön birlikte yanmaz). Adlar semtlerden, ölçüler gerçek şerit
 * genişliklerinden (3,3 m). Komşu kavşakların birbirine bakan kolları aynı yolun iki yarısıdır:
 * soldakinin doğu kolunun şeritleri sağdakinin batı kolununkilerle eşleşir.
 */

export interface Level {
  spec: NetSpec;
  title: string;
  place: string;
  /** Vardiya emri: bir iki cümle. */
  order: string;
  /** Tek cümlelik ipucu: emrin altında ve oyunun başında. */
  tip: string;
  /** Tutanakta: bu işi gerçekte kim, nasıl yapar. */
  job: string;
}

const NS: MoveId[] = ['N.L', 'N.T', 'N.R', 'S.L', 'S.T', 'S.R'];
const EW: MoveId[] = ['E.L', 'E.T', 'E.R', 'W.L', 'W.T', 'W.R'];
const ALL = { timing: true, roads: true, detect: true } as const;

export const LEVELS: Level[] = [
  {
    title: 'Kalabalığa yeşil',
    place: 'Kadıköy · Bahariye',
    order: 'Kontrolör ters ayarlanmış: kalabalık caddeye kısa, boş sokağa uzun yeşil veriyor. Aşağıdaki Işıklar bölümünde her ışığın bir kartı var; ışığı oradan yönetiyorsun.',
    tip: 'Kalabalık yolun ışığında yeşil süresini + ile uzat, boş sokağınkini − ile kısalt. Kuyruk uzarsa “Yeşil yak”a bas.',
    job: 'Büyük şehirlerde ışıklar bir trafik kontrol merkezinden izlenir. Operatörler kameradan kuyruğu görür, gerektiğinde ışığı uzaktan değiştirir.',
    spec: {
      id: 'bahariye',
      city: { sea: { dir: 'S', at: 520 } },
      seed: 11,
      duration: 100,
      tools: { timing: true },
      events: [{ at: 12, kind: 'note', text: 'Altıyol’dan gelen kuyruk Boğa heykeline uzanıyor.' }],
      nodes: [
        {
          id: 'bahariye',
          name: 'Bahariye',
          x: 0,
          legs: {
            N: { name: 'Altıyol', lanes: ['LTR'], out: 1, v: 11 },
            S: { name: 'Moda', lanes: ['LTR'], out: 1, v: 11 },
            E: { name: 'Kuşdili', lanes: ['LTR'], out: 1, v: 9 },
            W: { name: 'Rıhtım', lanes: ['LTR'], out: 1, v: 9 },
          },
          demand: [
            { mv: 'N.T', rate: 13 },
            { mv: 'N.L', rate: 1 },
            { mv: 'N.R', rate: 1.5 },
            { mv: 'S.T', rate: 12.5 },
            { mv: 'S.L', rate: 1 },
            { mv: 'S.R', rate: 1.5 },
            { mv: 'E.T', rate: 2 },
            { mv: 'E.L', rate: 0.5 },
            { mv: 'E.R', rate: 0.8 },
            { mv: 'W.T', rate: 1.8 },
            { mv: 'W.L', rate: 0.5 },
            { mv: 'W.R', rate: 0.8 },
          ],
          peds: [
            { leg: 'N', rate: 3 },
            { leg: 'S', rate: 3 },
            { leg: 'E', rate: 4 },
            { leg: 'W', rate: 4 },
          ],
          plan: {
            phases: [
              { moves: [...NS, 'E.P', 'W.P'], green: 10 },
              { moves: [...EW, 'N.P', 'S.P'], green: 36 },
            ],
            allRed: 2,
          },
        },
      ],
    },
  },
  {
    title: 'Işık süreleri',
    place: 'Ataşehir · Finans Merkezi',
    order: 'Geniş bir bulvar: araçlar birikiyor, boş ara sokaklar ise boşuna uzun yeşil alıyor. Her ışığın kartında sarı ve “hepsi kırmızı” süreleri de var.',
    tip: 'Yeşili kalabalığa ver. Sarıyı kısaltırsan aceleciler kırmızıda kalır; “hepsi kırmızı” kavşağın ortasını boşaltır.',
    job: 'Trafik mühendisleri yeşil sürelerini sayımdan hesaplar: her yönden dakikada kaç araç geldiğini sayar, yeşili bu oranla dağıtır. Sarı ve tüm kırmızı da kavşağın genişliğine ve hıza göre seçilir.',
    spec: {
      id: 'atasehir',
      city: { towers: true },
      seed: 23,
      duration: 120,
      tools: { timing: true },
      events: [
        { at: 20, kind: 'note', text: 'Plazaların otoparkına giren kuyruk sol şeritten taştı.' },
        { at: 60, kind: 'ambulance', mv: 'W.T', text: 'Ambulans Küçükbakkalköy’den geliyor, hastaneye düz geçecek.' },
      ],
      nodes: [
        {
          id: 'atasehir',
          name: 'Finans Merkezi',
          x: 0,
          legs: {
            E: { name: 'Kozyatağı', lanes: ['L', 'T', 'TR'], out: 2, median: 4, v: 13.9 },
            W: { name: 'Küçükbakkalköy', lanes: ['L', 'T', 'TR'], out: 2, median: 4, v: 13.9 },
            N: { name: 'Finans Merkezi', lanes: ['L', 'TR'], out: 2, v: 11 },
            S: { name: 'Ataşehir Bulvarı', lanes: ['L', 'TR'], out: 2, v: 11 },
          },
          demand: [
            { mv: 'E.T', rate: 20 },
            { mv: 'W.T', rate: 16 },
            { mv: 'E.L', rate: 8 },
            { mv: 'W.L', rate: 7 },
            { mv: 'E.R', rate: 2 },
            { mv: 'W.R', rate: 2 },
            { mv: 'N.T', rate: 2.5 },
            { mv: 'N.L', rate: 1 },
            { mv: 'N.R', rate: 2 },
            { mv: 'S.T', rate: 2.5 },
            { mv: 'S.L', rate: 1 },
            { mv: 'S.R', rate: 1.5 },
          ],
          peds: [
            { leg: 'N', rate: 3 },
            { leg: 'S', rate: 3 },
          ],
          plan: {
            phases: [
              { moves: ['E.L', 'W.L'], green: 6 },
              { moves: ['E.T', 'E.R', 'W.T', 'W.R', 'N.P', 'S.P'], green: 18 },
              { moves: NS, green: 34 },
            ],
            allRed: 2,
          },
        },
      ],
    },
  },
  {
    title: 'Düğün var',
    place: 'Bağcılar · Mahmutbey Caddesi',
    order: 'Artık bir cadde senin: Meydan ve Düğün Salonu kavşakları arka arkaya. Birinden çıkan öbürüne girer; birinde kuyruk uzarsa öbürüne taşar. Cumartesi akşamı, konvoylar kornayla geliyor, biri yolu kesip halay çekecek.',
    tip: 'Üstteki sekmelerden ya da haritada kavşağa dokunarak kavşak seç. Yolu kesen olay çıkınca soldaki kartta “Trafik ekiplerine bildir”e bas.',
    job: 'Bir caddedeki ışıklar birlikte ayarlanır: biri ötekinin kuyruğunu doldurmasın diye. Yolu kapatan bir olayda kontrol merkezi trafik polisini ve gerekirse çekiciyi yönlendirir.',
    spec: {
      id: 'bagcilar',
      seed: 61,
      duration: 130,
      dusk: 0.55,
      bold: 1.4,
      tools: { timing: true },
      events: [
        { at: 12, node: 'meydan', kind: 'convoy', mv: 'W.T', n: 5, text: 'Güneşli’den ilk düğün konvoyu: beş araç, gelin arabası önde, Düğün Salonu’na gidiyor.' },
        { at: 40, node: 'salon', kind: 'wedding', leg: 'S', sec: 80, text: 'Düğün konvoyu Düğün Salonu Sokağı’nın ağzında durdu: davul zurna, halay! Sokak iki yönde de kapandı.' },
        { at: 90, node: 'salon', kind: 'convoy', mv: 'E.T', n: 4, text: 'İkinci düğün konvoyu Mahmutbey’den Meydan’a iniyor: dört araç, camdan bayrak sallayan çocuklar.' },
      ],
      nodes: [
        {
          id: 'meydan',
          name: 'Meydan',
          x: 0,
          landmarks: [{ kind: 'cami', corner: 'NW' }],
          legs: {
            W: { name: 'Güneşli', lanes: ['LT', 'TR'], out: 2, v: 12 },
            E: { name: 'Mahmutbey Cd.', lanes: ['LT', 'TR'], out: 2, v: 12, split: { L: 0.15, T: 0.7, R: 0.15 } },
            N: { name: 'Bağcılar Meydanı', lanes: ['LTR'], out: 1, v: 9 },
            S: { name: 'Kirazlı', lanes: ['LTR'], out: 1, v: 9 },
          },
          demand: [
            { mv: 'W.T', rate: 12 },
            { mv: 'W.L', rate: 1 },
            { mv: 'W.R', rate: 1.5 },
            { mv: 'N.T', rate: 2 },
            { mv: 'N.L', rate: 2.5 },
            { mv: 'N.R', rate: 1 },
            { mv: 'S.T', rate: 2 },
            { mv: 'S.R', rate: 2.5 },
            { mv: 'S.L', rate: 1 },
          ],
          peds: [
            { leg: 'N', rate: 4 },
            { leg: 'S', rate: 3 },
          ],
          plan: {
            phases: [
              { moves: [...EW, 'N.P', 'S.P'], green: 12 },
              { moves: [...NS], green: 28 },
            ],
            allRed: 2,
          },
        },
        {
          id: 'salon',
          name: 'Düğün Salonu',
          x: 300,
          landmarks: [{ kind: 'dugun', corner: 'SE' }],
          legs: {
            W: { name: 'Meydan yönü', lanes: ['LT', 'TR'], out: 2, v: 12, split: { T: 0.8, R: 0.2 } },
            E: { name: 'Mahmutbey', lanes: ['L', 'T'], out: 2, v: 12 },
            S: { name: 'Düğün Salonu Sk.', lanes: ['L', 'R'], out: 1, v: 9 },
          },
          demand: [
            { mv: 'E.T', rate: 11 },
            { mv: 'E.L', rate: 2.5 },
            { mv: 'S.L', rate: 3 },
            { mv: 'S.R', rate: 2.5 },
          ],
          peds: [
            { leg: 'S', rate: 4 },
            { leg: 'E', rate: 3 },
          ],
          plan: {
            phases: [
              { moves: ['E.T', 'E.L', 'W.T', 'W.R', 'S.P'], green: 16 },
              { moves: ['S.L', 'S.R', 'E.P', 'W.P'], green: 26 },
            ],
            allRed: 2,
          },
        },
      ],
    },
  },
  {
    title: 'Yol çalışması',
    place: 'Levent · Büyükdere Caddesi',
    order: 'Saat 17.45, plazalar boşalıyor. Yollar paneli artık açık: bir kolu kapatırsan oraya gidecek sürücüler öbür yollara çevrilir. Birazdan Levent’te Çarşı kolunda yol çalışması başlayacak; işçiler çalışırken kol kapalı olmalı.',
    tip: 'Telsiz gelince Levent kavşağını seç, Yollar panelinde Çarşı kolunu kapat. Çalışma bitince yeniden aç; kapalı yol sürücüye dolambaç demek.',
    job: 'Yol çalışmalarında belediye ve trafik polisi önceden bir trafik yönetim planı yapar: hangi kol kapanacak, trafik hangi yoldan çevrilecek, tabelalar nereye konacak.',
    spec: {
      id: 'levent',
      city: { towers: true },
      seed: 73,
      duration: 130,
      dusk: 0.35,
      bold: 1.3,
      tools: { timing: true, roads: true },
      events: [
        { at: 12, node: 'levent', kind: 'note', text: 'Telsiz: “Merkez, Levent Çarşı kolunda 40. saniyede yol çalışması başlayacak. Kolu kapatın, trafiği çevirin.”' },
        { at: 40, node: 'levent', kind: 'roadwork', leg: 'N', sec: 55, text: 'Yol çalışması başladı: Levent Çarşı kolunda kazı var, işçiler yolda.' },
        { at: 85, node: 'zincirlikuyu', kind: 'ambulance', mv: 'W.T', text: 'Ambulans Beşiktaş’tan geliyor, iki kavşaktan da düz geçip Maslak’a çıkacak.' },
      ],
      nodes: [
        {
          id: 'zincirlikuyu',
          name: 'Zincirlikuyu',
          x: 0,
          landmarks: [{ kind: 'plaza', corner: 'NE' }],
          legs: {
            W: { name: 'Beşiktaş', lanes: ['L', 'T', 'TR'], out: 3, median: 3, v: 13.9 },
            E: { name: 'Büyükdere Cd.', lanes: ['L', 'T', 'TR'], out: 3, median: 3, v: 13.9, split: { L: 0.15, T: 0.7, R: 0.15 } },
            N: { name: 'Esentepe', lanes: ['L', 'TR'], out: 2, v: 10 },
            S: { name: 'Balmumcu', lanes: ['L', 'TR'], out: 2, v: 10 },
          },
          demand: [
            {
              mv: 'W.T',
              rate: [
                [0, 16],
                [40, 22],
                [90, 26],
              ],
            },
            { mv: 'W.L', rate: 2 },
            { mv: 'W.R', rate: 2.5 },
            { mv: 'N.T', rate: 2 },
            { mv: 'N.L', rate: 2 },
            { mv: 'N.R', rate: 2 },
            { mv: 'S.T', rate: 2 },
            { mv: 'S.L', rate: 3 },
            { mv: 'S.R', rate: 1.5 },
          ],
          peds: [
            { leg: 'N', rate: 5 },
            { leg: 'S', rate: 4 },
          ],
          plan: {
            phases: [
              { moves: ['E.L', 'W.L'], green: 8 },
              { moves: ['E.T', 'E.R', 'W.T', 'W.R', 'N.P', 'S.P'], green: 14 },
              { moves: NS, green: 30 },
            ],
            allRed: 2,
          },
        },
        {
          id: 'levent',
          name: 'Levent',
          x: 320,
          landmarks: [
            { kind: 'plaza', corner: 'NW' },
            { kind: 'plaza', corner: 'SE' },
          ],
          legs: {
            W: { name: 'Zincirlikuyu yönü', lanes: ['L', 'T', 'TR'], out: 3, median: 3, v: 13.9, split: { L: 0.2, T: 0.6, R: 0.2 } },
            E: { name: 'Maslak', lanes: ['L', 'T', 'TR'], out: 3, median: 3, v: 13.9 },
            N: { name: 'Levent Çarşı', lanes: ['L', 'TR'], out: 2, v: 10 },
            S: { name: 'Plazalar', lanes: ['L', 'LTR'], out: 2, v: 10 },
          },
          demand: [
            { mv: 'E.T', rate: 9 },
            { mv: 'E.L', rate: 2 },
            { mv: 'E.R', rate: 2 },
            { mv: 'N.T', rate: 2 },
            { mv: 'N.L', rate: 2 },
            { mv: 'N.R', rate: 1.5 },
            {
              mv: 'S.L',
              rate: [
                [0, 2],
                [40, 5],
              ],
            },
            { mv: 'S.R', rate: 3 },
            { mv: 'S.T', rate: 1 },
          ],
          peds: [
            { leg: 'S', rate: 8 },
            { leg: 'N', rate: 4 },
          ],
          plan: {
            phases: [
              { moves: ['E.L', 'W.L'], green: 8 },
              { moves: ['E.T', 'E.R', 'W.T', 'W.R', 'N.P', 'S.P'], green: 14 },
              { moves: NS, green: 30 },
            ],
            allRed: 2,
          },
        },
      ],
    },
  },
  {
    title: 'Konvoy geçecek',
    place: 'Üsküdar · Sahil Yolu',
    order: 'Sahil yolunda üç kavşak: Kuzguncuk, Beylerbeyi, Çengelköy. Telsizden haber var: makam konvoyu Kuzguncuk’tan girip üç kavşağı da düz geçecek. Konvoy ışıkta durmaz; vardığı her kavşakta yol boş, çapraz yönler kırmızıda olmalı.',
    tip: 'Konvoy yaklaşırken sırayla her kavşakta sahil yolu ışığında “Yeşil yak”, sonra “Yeşil kalsın”a bas; konvoy geçince “Normale dön”.',
    job: 'Ambulans ve özel geçişlerde ışıklar güzergâh boyunca önceden ayarlanır, araç her kavşağa yeşilde varır. Buna yeşil dalga ya da sinyal önceliği denir; kontrol merkezi geçişi kameradan izler.',
    spec: {
      id: 'sahil',
      city: { sea: { dir: 'S', at: 330 } },
      seed: 89,
      duration: 130,
      dusk: 0.2,
      tools: { timing: true, roads: true },
      events: [
        { at: 8, kind: 'note', text: 'Telsiz: “Merkez, konvoy Harem’den çıktı. Otuz saniye sonra Kuzguncuk’tan sahil yoluna girecek, üç kavşağı da düz geçecek.”' },
        { at: 38, kind: 'motorcade', mv: 'W.T', n: 4, text: 'Konvoy geliyor! Önde polis, ardında dört siyah araç; ışığa bakmayacaklar.' },
        { at: 95, node: 'cengelkoy', kind: 'convoy', mv: 'N.T', n: 4, text: 'Kuleli’den maç dönüşü konvoy iniyor: dört araç, kornalar susmuyor.' },
      ],
      nodes: [
        {
          id: 'kuzguncuk',
          name: 'Kuzguncuk',
          x: 0,
          legs: {
            W: { name: 'Üsküdar', lanes: ['LT', 'T'], out: 2, v: 12 },
            E: { name: 'Sahil yolu', lanes: ['T', 'TR'], out: 2, v: 12, split: { T: 0.8, R: 0.2 } },
            N: { name: 'Kuzguncuk Çarşı', lanes: ['LTR'], out: 1, v: 9 },
          },
          demand: [
            { mv: 'W.T', rate: 22 },
            { mv: 'W.L', rate: 1.5 },
            { mv: 'N.L', rate: 1.5 },
            { mv: 'N.R', rate: 2 },
          ],
          peds: [{ leg: 'N', rate: 4 }],
          plan: {
            phases: [
              { moves: ['W.T', 'W.L', 'E.T', 'E.R', 'N.P'], green: 12 },
              { moves: ['N.L', 'N.R', 'E.P', 'W.P'], green: 24 },
            ],
            allRed: 2,
          },
        },
        {
          id: 'beylerbeyi',
          name: 'Beylerbeyi',
          x: 280,
          landmarks: [{ kind: 'cami', corner: 'SW' }],
          legs: {
            W: { name: 'Kuzguncuk yönü', lanes: ['LT', 'T'], out: 2, v: 12, split: { L: 0.15, T: 0.85 } },
            E: { name: 'Sahil yolu', lanes: ['T', 'TR'], out: 2, v: 12, split: { T: 0.85, R: 0.15 } },
            N: { name: 'Beylerbeyi Sarayı', lanes: ['LTR'], out: 1, v: 9 },
            S: { name: 'Burhaniye', lanes: ['LTR'], out: 1, v: 9 },
          },
          demand: [
            { mv: 'N.T', rate: 1.5 },
            { mv: 'N.L', rate: 1 },
            { mv: 'N.R', rate: 1 },
            { mv: 'S.T', rate: 2 },
            { mv: 'S.L', rate: 1.5 },
            { mv: 'S.R', rate: 1 },
          ],
          peds: [
            { leg: 'N', rate: 3 },
            { leg: 'S', rate: 3 },
          ],
          plan: {
            phases: [
              { moves: ['W.T', 'W.L', 'E.T', 'E.R', 'N.P', 'S.P'], green: 12 },
              { moves: [...NS], green: 24 },
            ],
            allRed: 2,
          },
        },
        {
          id: 'cengelkoy',
          name: 'Çengelköy',
          x: 560,
          landmarks: [{ kind: 'kosk', corner: 'NE' }],
          legs: {
            W: { name: 'Beylerbeyi yönü', lanes: ['LT', 'T'], out: 2, v: 12, split: { L: 0.1, T: 0.9 } },
            E: { name: 'Kandilli', lanes: ['T', 'TR'], out: 2, v: 12 },
            N: { name: 'Kuleli', lanes: ['LTR'], out: 1, v: 9 },
            S: { name: 'Çengelköy Çarşı', lanes: ['LTR'], out: 1, v: 9 },
          },
          demand: [
            { mv: 'E.T', rate: 20 },
            { mv: 'E.R', rate: 1.2 },
            { mv: 'N.T', rate: 2 },
            { mv: 'N.L', rate: 0.8 },
            { mv: 'N.R', rate: 1 },
            { mv: 'S.T', rate: 2.2 },
            { mv: 'S.L', rate: 1 },
            { mv: 'S.R', rate: 0.8 },
          ],
          peds: [
            { leg: 'N', rate: 4 },
            { leg: 'S', rate: 4 },
          ],
          plan: {
            phases: [
              { moves: ['W.T', 'W.L', 'E.T', 'E.R', 'N.P', 'S.P'], green: 12 },
              { moves: [...NS], green: 26 },
            ],
            allRed: 2,
          },
        },
      ],
    },
  },
  {
    title: 'Maç çıkışı',
    place: 'Kadıköy · Kuşdili',
    order: 'Stadyumun dibindeki kavşak. Maç sürerken yollar sakin; 45. saniyede düdük çalacak, otuz bin kişi aynı anda sokağa dökülecek. Yeni anahtarın var: Akıllı mod. Açarsan ışık yoldaki araca bakar, boş yola yeşil yakmaz.',
    tip: 'Sakin dakikalarda ışıkların üstündeki “Akıllı mod”u aç. Maç bitince stadyum yolunun yeşilini + ile uzat, kuyruk taşmasın.',
    job: 'Yola gömülü manyetik halkalar (dedektör) ya da kameralar aracı görür; kontrolör yeşili ona göre uzatır ya da erken bitirir. Maç ve konser gibi olaylarda ise mühendisler önceden özel bir "olay planı" hazırlar.',
    spec: {
      id: 'kusdili',
      seed: 131,
      duration: 130,
      dusk: 0.5,
      tools: ALL,
      events: [
        { at: 6, kind: 'note', text: 'Nevin Amir (telsiz): “Maç 45’te bitiyor. O zamana kadar kavşağı rahatlat, sonra stadyum yolunu boşaltmamız gerekecek.”' },
        { at: 45, kind: 'note', text: 'Düdük çaldı! Stadyum yolundan araç ve taraftar seli geliyor. Nevin Amir: “Stadyum koluna yeşil, hemen!”' },
        { at: 64, kind: 'rain', text: 'Yağmur başladı. Yol kaygan: sürücüler yavaşladı, aralarını açtı. Kavşak artık daha az araç geçiriyor.' },
        { at: 96, kind: 'ambulance', mv: 'N.T', text: 'Ambulans Söğütlüçeşme’den geliyor: stadyumda fenalaşan bir taraftar için düz geçecek.' },
      ],
      nodes: [
        {
          id: 'kusdili',
          name: 'Kuşdili',
          x: 0,
          landmarks: [{ kind: 'park', corner: 'SE' }],
          legs: {
            N: { name: 'Söğütlüçeşme', lanes: ['L', 'T', 'TR'], out: 2, median: 2, v: 12 },
            S: { name: 'Stadyum', lanes: ['L', 'T', 'TR'], out: 2, median: 2, v: 11 },
            E: { name: 'Kuşdili Cd.', lanes: ['LT', 'TR'], out: 2, v: 11 },
            W: { name: 'Rıhtım', lanes: ['LTR'], out: 1, v: 9 },
          },
          demand: [
            { mv: 'N.T', rate: 12 },
            { mv: 'N.L', rate: 1.5 },
            { mv: 'N.R', rate: 2 },
            { mv: 'S.T', rate: [[0, 4], [45, 4], [55, 24], [130, 18]] },
            { mv: 'S.L', rate: [[0, 1], [45, 1], [55, 6]] },
            { mv: 'S.R', rate: [[0, 1], [45, 1], [55, 6]] },
            { mv: 'E.T', rate: 4 },
            { mv: 'E.L', rate: 1.5 },
            { mv: 'E.R', rate: 1.5 },
            { mv: 'W.T', rate: 1.5 },
            { mv: 'W.L', rate: 0.8 },
            { mv: 'W.R', rate: 0.8 },
          ],
          peds: [
            { leg: 'S', rate: [[0, 2], [45, 2], [55, 20]] },
            { leg: 'E', rate: [[0, 3], [45, 3], [55, 12]] },
            { leg: 'N', rate: 3 },
            { leg: 'W', rate: 2 },
          ],
          plan: {
            phases: [
              { moves: ['N.L', 'S.L'], green: 12 },
              { moves: ['N.T', 'N.R', 'S.T', 'S.R', 'E.P', 'W.P'], green: 10 },
              { moves: [...EW, 'N.P', 'S.P'], green: 38 },
            ],
            allRed: 2,
          },
        },
      ],
    },
  },
  {
    title: 'Işıklar söndü',
    place: 'Bakırköy · İncirli',
    order: 'Akşam, iki kavşaklı İncirli Caddesi. Elektrik şebekesinde dalgalanma var; bir kontrolör her an pes edebilir. Işıklar sönerse kavşak “dur, bak, sırayla geç” işler ve çok yavaşlar. Arızayı yalnızca elektrik ekibi giderir.',
    tip: 'Işıklar sarı yanıp sönmeye başlayınca soldaki kartta “Elektrik ekibini çağır”a bas. Usta gelene kadar öbür kavşaktan arızalı kavşağa az araç yolla.',
    job: 'Sinyal arızasında kontrol merkezi önce bakım ekibini çağırır, kalabalık kavşağa trafik polisi gönderir. Büyük kavşaklarda kontrolör dolabında kesintisiz güç kaynağı (akü) bulunur, ışıklar elektrik gidince de birkaç saat yanar.',
    spec: {
      id: 'incirli',
      city: { sea: { dir: 'S', at: 420 } },
      seed: 149,
      duration: 130,
      dusk: 0.65,
      tools: ALL,
      events: [
        { at: 8, kind: 'note', text: 'Nevin Amir (telsiz): “İncirli’de şebeke oynuyor. Işık sönerse elektrik ekibini hemen çağır; Hüseyin usta yakında.”' },
        { at: 28, node: 'incirli', kind: 'fault', sec: 90, text: 'İncirli kavşağında ışıklar söndü! Sarı flaşör yanıyor; sürücüler çizgide durup sırayla geçiyor.' },
        { at: 62, node: 'ozgurluk', kind: 'breakdown', mv: 'E.T', text: 'Florya’dan gelen bir kamyonet Özgürlük kavşağına varmadan arızalandı, şeridi kapattı.' },
        { at: 92, node: 'incirli', kind: 'ambulance', mv: 'W.T', text: 'Ambulans Bahçelievler’den geliyor, iki kavşaktan da düz geçip Florya’ya gidecek.' },
      ],
      nodes: [
        {
          id: 'incirli',
          name: 'İncirli',
          x: 0,
          landmarks: [{ kind: 'plaza', corner: 'NE' }],
          legs: {
            W: { name: 'Bahçelievler', lanes: ['LT', 'TR'], out: 2, v: 12 },
            E: { name: 'Özgürlük yönü', lanes: ['LT', 'TR'], out: 2, v: 12, split: { L: 0.15, T: 0.7, R: 0.15 } },
            N: { name: 'Ataköy', lanes: ['LTR'], out: 1, v: 10 },
            S: { name: 'İncirli Metro', lanes: ['L', 'TR'], out: 2, v: 10 },
          },
          demand: [
            { mv: 'W.T', rate: 11 },
            { mv: 'W.L', rate: 1.5 },
            { mv: 'W.R', rate: 2 },
            { mv: 'N.T', rate: 3 },
            { mv: 'N.L', rate: 1 },
            { mv: 'N.R', rate: 1.5 },
            { mv: 'S.T', rate: 3 },
            { mv: 'S.L', rate: 3 },
            { mv: 'S.R', rate: 3 },
          ],
          peds: [
            { leg: 'N', rate: 4 },
            { leg: 'S', rate: 6 },
          ],
          plan: {
            phases: [
              { moves: [...EW, 'N.P', 'S.P'], green: 16 },
              { moves: [...NS], green: 26 },
            ],
            allRed: 2,
          },
        },
        {
          id: 'ozgurluk',
          name: 'Özgürlük',
          x: 310,
          landmarks: [{ kind: 'cami', corner: 'SW' }],
          legs: {
            W: { name: 'İncirli yönü', lanes: ['LT', 'TR'], out: 2, v: 12, split: { L: 0.15, T: 0.7, R: 0.15 } },
            E: { name: 'Florya', lanes: ['LT', 'TR'], out: 2, v: 12 },
            N: { name: 'Özgürlük Meydanı', lanes: ['LTR'], out: 1, v: 9 },
            S: { name: 'Sahil', lanes: ['LTR'], out: 1, v: 9 },
          },
          demand: [
            { mv: 'E.T', rate: 11 },
            { mv: 'E.L', rate: 1.5 },
            { mv: 'E.R', rate: 1.5 },
            { mv: 'N.T', rate: 2 },
            { mv: 'N.L', rate: 1.5 },
            { mv: 'N.R', rate: 1.5 },
            { mv: 'S.T', rate: 1.5 },
            { mv: 'S.L', rate: 1.5 },
            { mv: 'S.R', rate: 1.5 },
          ],
          peds: [
            { leg: 'N', rate: 5 },
            { leg: 'S', rate: 3 },
          ],
          plan: {
            phases: [
              { moves: [...EW, 'N.P', 'S.P'], green: 14 },
              { moves: [...NS], green: 24 },
            ],
            allRed: 2,
          },
        },
      ],
    },
  },
  {
    title: 'Yeşil dalga',
    place: 'Fatih · Vatan Caddesi',
    order: 'Vatan Caddesi’nde dört ışık var ve dördü de birbirinden habersiz: araç birinde yeşil alıyor, ötekinde kırmızıya çarpıyor. Yeni aracın: YEŞİL DALGA. Işıkları araç hızına göre sıraya dizer; batıdan giren araç dört kavşağı da durmadan geçer.',
    tip: 'Önce her kavşakta caddeye yeterli yeşil ver, sonra sağdaki Dalga sekmesinde “Dalgayı kur”a bas. Kesikli çizgi yeşil kutulardan geçince dalga oturmuştur.',
    job: 'Caddedeki ışıkları birbirine bağlamaya koordinasyon denir. Mühendis hepsine aynı döngüyü verir ve her ışığın yeşilini bir öncekinden, iki kavşak arası yolculuk süresi kadar geç yakar. Buna "ofset" denir; kâğıt üstünde zaman-yol çizelgesiyle çizilir.',
    spec: {
      id: 'vatan',
      seed: 167,
      duration: 130,
      dusk: 0.3,
      tools: { ...ALL, wave: true },
      events: [
        { at: 6, kind: 'note', text: 'Nevin Amir (telsiz): “Vatan’da araçlar her ışıkta duruyor, şikâyet yağıyor. Dört ışığı tek dalgaya bağla.”' },
        { at: 70, node: 'aksaray', kind: 'ambulance', mv: 'W.T', text: 'Ambulans Aksaray’dan girdi: dört kavşağı da düz geçip Çapa Tıp’a gidecek. Dalga oturduysa hiç durmaz.' },
        { at: 98, node: 'malta', kind: 'parked', leg: 'N', sec: 40, text: 'Malta’da bir servis aracı çift sıra park etti; Fındıkzade kolu yavaşladı.' },
      ],
      nodes: [
        {
          id: 'aksaray',
          name: 'Aksaray',
          x: 0,
          legs: {
            W: { name: 'Aksaray', lanes: ['LT', 'T', 'TR'], out: 3, median: 3, v: 13 },
            E: { name: 'Vatan Cd.', lanes: ['LT', 'T', 'TR'], out: 3, median: 3, v: 13, split: { L: 0.1, T: 0.8, R: 0.1 } },
            N: { name: 'Yusufpaşa', lanes: ['LTR'], out: 1, v: 9 },
            S: { name: 'Langa', lanes: ['LTR'], out: 1, v: 9 },
          },
          demand: [
            { mv: 'W.T', rate: 33.5 },
            { mv: 'W.L', rate: 1 },
            { mv: 'W.R', rate: 2 },
            { mv: 'N.T', rate: 2 },
            { mv: 'N.L', rate: 2 },
            { mv: 'N.R', rate: 1 },
            { mv: 'S.T', rate: 2 },
            { mv: 'S.L', rate: 1 },
            { mv: 'S.R', rate: 2 },
          ],
          peds: [
            { leg: 'N', rate: 4 },
            { leg: 'S', rate: 4 },
          ],
          plan: {
            phases: [
              { moves: [...EW, 'N.P', 'S.P'], green: 22 },
              { moves: [...NS], green: 22 },
            ],
            allRed: 2,
          },
        },
        {
          id: 'yusufpasa',
          name: 'Yusufpaşa',
          x: 240,
          legs: {
            W: { name: 'Aksaray yönü', lanes: ['LT', 'T', 'TR'], out: 3, median: 3, v: 13, split: { L: 0.08, T: 0.84, R: 0.08 } },
            E: { name: 'Malta yönü', lanes: ['LT', 'T', 'TR'], out: 3, median: 3, v: 13, split: { L: 0.08, T: 0.84, R: 0.08 } },
            N: { name: 'Millet Cd.', lanes: ['LTR'], out: 1, v: 9 },
            S: { name: 'Haseki', lanes: ['LTR'], out: 1, v: 9 },
          },
          demand: [
            { mv: 'N.T', rate: 2.5 },
            { mv: 'N.L', rate: 2 },
            { mv: 'N.R', rate: 2 },
            { mv: 'S.T', rate: 2 },
            { mv: 'S.L', rate: 1 },
            { mv: 'S.R', rate: 2 },
          ],
          peds: [
            { leg: 'N', rate: 4 },
            { leg: 'S', rate: 3 },
          ],
          plan: {
            phases: [
              { moves: [...EW, 'N.P', 'S.P'], green: 13 },
              { moves: [...NS], green: 27 },
            ],
            allRed: 2,
          },
        },
        {
          id: 'malta',
          name: 'Malta',
          x: 480,
          landmarks: [{ kind: 'cami', corner: 'NE' }],
          legs: {
            W: { name: 'Yusufpaşa yönü', lanes: ['LT', 'T', 'TR'], out: 3, median: 3, v: 13, split: { L: 0.08, T: 0.84, R: 0.08 } },
            E: { name: 'Edirnekapı yönü', lanes: ['LT', 'T', 'TR'], out: 3, median: 3, v: 13, split: { L: 0.08, T: 0.84, R: 0.08 } },
            N: { name: 'Fındıkzade', lanes: ['LTR'], out: 1, v: 9 },
            S: { name: 'Kocamustafapaşa', lanes: ['LTR'], out: 1, v: 9 },
          },
          demand: [
            { mv: 'N.T', rate: 2.5 },
            { mv: 'N.L', rate: 1 },
            { mv: 'N.R', rate: 2 },
            { mv: 'S.T', rate: 2 },
            { mv: 'S.L', rate: 2 },
            { mv: 'S.R', rate: 1 },
          ],
          peds: [
            { leg: 'N', rate: 3 },
            { leg: 'S', rate: 3 },
          ],
          plan: {
            phases: [
              { moves: [...EW, 'N.P', 'S.P'], green: 26 },
              { moves: [...NS], green: 14 },
            ],
            allRed: 2,
          },
        },
        {
          id: 'capa',
          name: 'Çapa',
          x: 720,
          landmarks: [{ kind: 'plaza', corner: 'SE' }],
          legs: {
            W: { name: 'Malta yönü', lanes: ['LT', 'T', 'TR'], out: 3, median: 3, v: 13, split: { L: 0.1, T: 0.8, R: 0.1 } },
            E: { name: 'Edirnekapı', lanes: ['LT', 'T', 'TR'], out: 3, median: 3, v: 13 },
            N: { name: 'Çapa Tıp', lanes: ['LTR'], out: 1, v: 9 },
            S: { name: 'Topkapı', lanes: ['LTR'], out: 1, v: 9 },
          },
          demand: [
            { mv: 'E.T', rate: 11 },
            { mv: 'E.L', rate: 1 },
            { mv: 'E.R', rate: 1 },
            { mv: 'N.T', rate: 2 },
            { mv: 'N.L', rate: 2 },
            { mv: 'N.R', rate: 1 },
            { mv: 'S.T', rate: 2 },
            { mv: 'S.L', rate: 1 },
            { mv: 'S.R', rate: 1 },
          ],
          peds: [
            { leg: 'N', rate: 5 },
            { leg: 'S', rate: 3 },
          ],
          plan: {
            phases: [
              { moves: [...EW, 'N.P', 'S.P'], green: 14 },
              { moves: [...NS], green: 26 },
            ],
            allRed: 2,
          },
        },
      ],
    },
  },
  {
    title: 'Kilit kutusu',
    place: 'Şişli · Mecidiyeköy',
    order: 'Vardiyanın son ve en zor işi. Mecidiyeköy’de üç kavşak arasında yalnızca 120 metre var: on araçlık kuyruk bir kavşağı öbürüne kilitler. Yağmur yağıyor, konvoy geçecek, şebeke de güvenilmez. Nevin Amir merkezden çıktı; kontrol tamamen sende.',
    tip: 'Kısa yolların dolmasına izin verme: iki kavşak arasındaki yol dolarsa ileri kavşakta o yolun yeşilini uzat. Konvoyda üç kavşağın da ana cadde ışığını “Yeşil kalsın” yap.',
    job: 'Kavşakların sık olduğu yerlerde mühendis, iki kavşak arasındaki kısa yola sığabilecek araç sayısını hesaplar ve öndeki kavşağın yeşilini önce yakar ki kuyruk geriye taşmasın. Bu kilitlenmeye İngilizcede "gridlock" denir.',
    spec: {
      id: 'mecidiyekoy',
      city: { towers: true },
      seed: 181,
      duration: 130,
      dusk: 0.85,
      rain: true,
      bold: 1.3,
      tools: { ...ALL, wave: true },
      events: [
        { at: 6, kind: 'note', text: 'Nevin Amir (telsiz): “Merkez senin. Konvoy yarım dakikaya Gayrettepe’den girecek, üç kavşağı da düz geçecek. Kolay gelsin.”' },
        { at: 34, kind: 'motorcade', mv: 'W.T', n: 3, text: 'Konvoy geliyor! Önde polis, ardında üç makam aracı; yağmurda bile ışığa bakmayacaklar.' },
        { at: 66, node: 'cevahir', kind: 'fault', sec: 80, text: 'Cevahir kavşağında ışıklar söndü! Ortadaki kavşak dur-bak-geç işliyor; iki yanı birden dolabilir.' },
        { at: 96, node: 'sisli', kind: 'breakdown', mv: 'E.T', text: 'Şişli’den gelen bir dolmuş yağmurda stop etti, şeridin ortasında kaldı.' },
        { at: 108, node: 'gayrettepe', kind: 'ambulance', mv: 'W.T', text: 'Son çağrı: ambulans Gayrettepe’den girdi, üç kavşağı da düz geçip Şişli Etfal’e gidecek.' },
      ],
      nodes: [
        {
          id: 'gayrettepe',
          name: 'Gayrettepe',
          x: 0,
          landmarks: [{ kind: 'plaza', corner: 'NW' }],
          legs: {
            W: { name: 'Gayrettepe', lanes: ['LT', 'TR'], out: 2, v: 11 },
            E: { name: 'Cevahir yönü', lanes: ['LT', 'TR'], out: 2, v: 11, split: { L: 0.15, T: 0.7, R: 0.15 } },
            N: { name: 'Esentepe', lanes: ['L', 'TR'], out: 2, v: 9 },
            S: { name: 'Kuştepe', lanes: ['LTR'], out: 1, v: 9 },
          },
          demand: [
            { mv: 'W.T', rate: 15 },
            { mv: 'W.L', rate: 1.5 },
            { mv: 'W.R', rate: 1.5 },
            { mv: 'N.T', rate: 2 },
            { mv: 'N.L', rate: 2.5 },
            { mv: 'N.R', rate: 1.5 },
            { mv: 'S.T', rate: 1.5 },
            { mv: 'S.L', rate: 1.5 },
            { mv: 'S.R', rate: 1.5 },
          ],
          peds: [
            { leg: 'N', rate: 4 },
            { leg: 'S', rate: 4 },
          ],
          plan: {
            phases: [
              { moves: [...EW, 'N.P', 'S.P'], green: 14 },
              { moves: [...NS], green: 24 },
            ],
            allRed: 2,
          },
        },
        {
          id: 'cevahir',
          name: 'Cevahir',
          x: 120,
          landmarks: [{ kind: 'plaza', corner: 'SE' }],
          legs: {
            W: { name: 'Gayrettepe yönü', lanes: ['LT', 'TR'], out: 2, v: 11, split: { L: 0.1, T: 0.8, R: 0.1 } },
            E: { name: 'Şişli yönü', lanes: ['LT', 'TR'], out: 2, v: 11, split: { L: 0.1, T: 0.8, R: 0.1 } },
            N: { name: 'Büyükdere', lanes: ['LTR'], out: 1, v: 9 },
            S: { name: 'Metrobüs', lanes: ['LTR'], out: 1, v: 9 },
          },
          demand: [
            { mv: 'N.T', rate: 2 },
            { mv: 'N.L', rate: 1 },
            { mv: 'N.R', rate: 1.5 },
            { mv: 'S.T', rate: 1.5 },
            { mv: 'S.L', rate: 1.5 },
            { mv: 'S.R', rate: 1 },
          ],
          peds: [
            { leg: 'S', rate: 9 },
            { leg: 'N', rate: 4 },
          ],
          plan: {
            phases: [
              { moves: [...EW, 'N.P', 'S.P'], green: 11 },
              { moves: [...NS], green: 28 },
            ],
            allRed: 2,
          },
        },
        {
          id: 'sisli',
          name: 'Şişli',
          x: 240,
          landmarks: [{ kind: 'cami', corner: 'NE' }],
          legs: {
            W: { name: 'Cevahir yönü', lanes: ['LT', 'TR'], out: 2, v: 11, split: { L: 0.15, T: 0.7, R: 0.15 } },
            E: { name: 'Şişli', lanes: ['LT', 'TR'], out: 2, v: 11 },
            N: { name: 'Okmeydanı', lanes: ['L', 'TR'], out: 2, v: 9 },
            S: { name: 'Halaskargazi', lanes: ['LTR'], out: 1, v: 9 },
          },
          demand: [
            { mv: 'E.T', rate: 14 },
            { mv: 'E.L', rate: 1.5 },
            { mv: 'E.R', rate: 1.5 },
            { mv: 'N.T', rate: 2 },
            { mv: 'N.L', rate: 2 },
            { mv: 'N.R', rate: 1.5 },
            { mv: 'S.T', rate: 1.5 },
            { mv: 'S.L', rate: 1.5 },
            { mv: 'S.R', rate: 1.5 },
          ],
          peds: [
            { leg: 'N', rate: 4 },
            { leg: 'S', rate: 5 },
          ],
          plan: {
            phases: [
              { moves: [...EW, 'N.P', 'S.P'], green: 15 },
              { moves: [...NS], green: 25 },
            ],
            allRed: 2,
          },
        },
      ],
    },
  },
];

export const PASS_SCORE = 60;

export function verdict(score: number, jammed: boolean, hits: number, pass = PASS_SCORE) {
  if (hits) return 'Geçitte yayaya çarpıldı. Kontrolörün anahtarı elinden alındı; bu kavşağı yeniden kurmalısın.';
  if (jammed) return 'Kuyruk bir önceki kavşağa dayandı, korna sesi Boğaz’ın öbür yakasından duyuldu. Yeniden dene.';
  if (score >= 90) return 'Kusursuz. Dolmuş şoförleri bile sesini çıkarmadı; kavşak sanki kendi kendine akıyor.';
  if (score >= 75) return 'İyi vardiya. Birkaç uzun kuyruk oldu ama kimse kırmızıda kalakalmadı.';
  if (score >= pass) return 'Geçer not. Kavşak aktı; yine de bazı kollar fazla bekledi.';
  return 'Kuyruklar uzadı, sabrı taşan kırmızıda geçti. Bu planla kavşak taşımıyor.';
}

/** Tutanağın yıldızları: geçer not bir, on dört puan üstü iki, yirmi yedi puan üstü üç yıldız. */
export function starsOf(score: number, pass = PASS_SCORE) {
  return score < pass ? 0 : score >= pass + 27 ? 3 : score >= pass + 14 ? 2 : 1;
}

export function shiftTitle(scores: number[]) {
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  if (avg >= 85) return { title: 'Yeşil Dalga Ustası', note: 'Bütün kavşakları trafik mühendisi gibi yönettin.', avg };
  if (avg >= 72) return { title: 'Kıdemli Kavşak Amiri', note: 'Sayıları okudun, ışıkları ona göre çevirdin.', avg };
  if (avg >= 60) return { title: 'Kavşak Amiri', note: 'Vardiya tamam; kornalar biraz yorucuydu.', avg };
  return { title: 'Stajyer Polis', note: 'Düdük senden, ışık başkasından.', avg };
}
