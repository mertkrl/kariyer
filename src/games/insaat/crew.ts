/*
 * Şantiye defteri: her aşamada sahada kim var, hangi makine çalışıyor, kim ne yazdı, hangi
 * kontrol yapıldı ve hangi İSG önlemi alındı. Amcalar yorum yapar; defteri meslek sahipleri tutar.
 * Kaba inşaatta defter aşamaya değil, katın alt adımına göre yazılır.
 */

export const ROLES = {
  muh: 'İnşaat mühendisi',
  sef: 'Şantiye şefi',
  isg: 'İSG uzmanı',
  isci: 'Düz işçi',
  mimar: 'Mimar',
  mekanik: 'Makine mühendisi',
  elektrik: 'Elektrik mühendisi',
  jeoloji: 'Jeoloji mühendisi',
  jeofizik: 'Jeofizik mühendisi',
  harita: 'Harita mühendisi',
  peyzaj: 'Peyzaj mimarı',
  icmimar: 'İç mimar',
  denetim: 'Yapı denetim mühendisi',
  kalipci: 'Kalıpçı',
  demirci: 'Demirci',
  betoncu: 'Betoncu',
  duvarci: 'Duvar ustası',
  sivaci: 'Sıvacı ve alçıcı',
  boyaci: 'Boyacı',
  seramik: 'Fayans ve seramik ustası',
  catici: 'Çatı ustası',
  vinc: 'Kule vinç operatörü',
  makine: 'İş makinesi operatörü',
  pompa: 'Pompa ve mikser operatörü',
  sofor: 'Kamyon şoförü',
} as const;
export type Role = keyof typeof ROLES;

export interface Plan {
  crew: Role[];
  machines: string[];
  /** Defter kayıtları: aşama ilerledikçe sırayla yazılır. */
  log: { who: Role; text: string }[];
  /** Kalite ve denetim kontrolleri: ilerledikçe tek tek işaretlenir. */
  checks: string[];
  isg: string;
}

export const STAGE_PLANS: Record<string, Plan> = {
  arsa: {
    crew: ['mimar', 'muh', 'sef'],
    machines: [],
    log: [
      { who: 'mimar', text: 'Mimari proje, imar durumu ve çekme mesafelerine göre onaylandı; TAKS ve KAKS sınırda.' },
      { who: 'muh', text: 'Statik proje TBDY 2018’e göre hazırlandı: DD-2 deprem yer hareketi, betonarme perdeli çerçeve.' },
      { who: 'sef', text: 'Yapı ruhsatı alındı, şantiye şefi ve yapı denetim firması sözleşmesi belediyeye bildirildi.' },
    ],
    checks: ['İmar durumu belgesi', 'Mimari ve statik proje onayı', 'Yapı ruhsatı', 'Yapı denetim sözleşmesi'],
    isg: 'Arsa çevresi geçici olarak şeritlendi; çocukların girmemesi için uyarı levhası asıldı.',
  },
  etut: {
    crew: ['jeoloji', 'jeofizik', 'isci', 'sofor'],
    machines: ['Sondaj makinesi', 'Sismik ölçüm seti'],
    log: [
      { who: 'jeoloji', text: 'Üç noktada 20 m sondaj yapıldı; her 1,5 m’de SPT darbe sayısı kaydedildi.' },
      { who: 'jeoloji', text: 'Örselenmemiş numuneler laboratuvara gitti: kıvam limitleri, şişme ve kesme deneyi.' },
      { who: 'jeofizik', text: 'MASW ve mikrotremor ölçümü: Vs30 ≈ 410 m/s, zemin sınıfı ZC.' },
      { who: 'jeoloji', text: 'Yeraltı suyu −6,2 m’de; sıvılaşma riski düşük. Zemin etüt raporu onaya sunuldu.' },
    ],
    checks: ['Sondaj logları', 'SPT ve laboratuvar deneyleri', 'Vs30 ve zemin sınıfı', 'Zemin etüt raporu onayı'],
    isg: 'Sondaj makinesinin dönen tij bölgesi bariyerle ayrıldı; ekip kask, gözlük ve kulaklık kullanıyor.',
  },
  aplikasyon: {
    crew: ['harita', 'sef', 'isg', 'isci', 'sofor'],
    machines: ['Total station', 'GNSS alıcısı', 'Konteyner kamyonu'],
    log: [
      { who: 'harita', text: 'Parsel köşeleri GNSS ile doğrulandı, üç kalıcı röper noktası tesis edildi.' },
      { who: 'harita', text: 'Bina aksları ve kazı sınırı total station ile zemine aplike edildi, kotlar işaretlendi.' },
      { who: 'sef', text: 'Şantiye konteynerleri, şantiye elektriği ve su aboneliği kuruldu; şantiye defteri açıldı.' },
      { who: 'isg', text: 'Risk değerlendirmesi ve acil durum planı hazırlandı; tüm ekibe işe giriş İSG eğitimi verildi.' },
    ],
    checks: ['Röper ve aks aplikasyonu', 'Aplikasyon krokisi onayı', '2 m şantiye çiti ve tabela', 'İSG risk değerlendirmesi'],
    isg: 'Şantiye çevresi 2 m sac çitle kapatıldı; yaya yolu korunaklı geçide alındı, KKD dolabı kuruldu.',
  },
  hafriyat: {
    crew: ['makine', 'sofor', 'muh', 'jeoloji', 'harita', 'isg', 'isci'],
    machines: ['Paletli ekskavatör', 'Beko loder', 'Damperli kamyon', 'Fore kazık makinesi'],
    log: [
      { who: 'makine', text: 'Kazı kademeli ilerliyor; şev ve iksa projesi neyse o, fazla kazı yapılmıyor.' },
      { who: 'sofor', text: 'Kamyonlar branda ile kapatılıp lastik yıkamadan geçiyor; hafriyat belgeli döküm sahasına.' },
      { who: 'muh', text: 'Komşu bina tarafında fore kazık ve ankrajlı iksa tamamlandı; deplasman ölçümleri izleniyor.' },
      { who: 'jeoloji', text: 'Kazı tabanında zemin raporla uyumlu; yumuşak cep yok, yeraltı suyuna ulaşılmadı.' },
      { who: 'harita', text: 'Kazı taban kotu −4,50 kontrol edildi; fazla kazı yok.' },
    ],
    checks: ['İksa ve komşu bina tespiti', 'Hafriyat döküm belgesi', 'Kazı taban kotu ölçümü', 'Taban zemin uygunluk tutanağı'],
    isg: 'Kazı kenarında 1 m korkuluk; makine dönüş alanına kimse girmiyor, kamyon geri manevrasında işaretçi var.',
  },
  temel: {
    crew: ['demirci', 'kalipci', 'betoncu', 'pompa', 'elektrik', 'denetim', 'muh'],
    machines: ['Beton pompası', 'Transmikser', 'Vibratör', 'Demir bükme tezgâhı'],
    log: [
      { who: 'betoncu', text: '10 cm grobeton döküldü; üzerine bitümlü membran su yalıtımı ve koruma betonu.' },
      { who: 'elektrik', text: 'Temel topraklaması: 30×3,5 mm galvaniz şerit radye içinde halka yapıldı.' },
      { who: 'demirci', text: 'Radye alt ve üst donatısı Ø20/15 B420C; paspayı takozları 5 cm, filizler kolon yerinde.' },
      { who: 'denetim', text: 'Demir kontrolü yapıldı, projeye uygun. Döküm izni tutanağa bağlandı.' },
      { who: 'pompa', text: 'Pompa ayakları plakalı açıldı; mikser irsaliyesi C30/37, çıkış saatinden 90 dk geçmedi.' },
      { who: 'betoncu', text: 'Slump 14 cm; beton tabakalar hâlinde vibratörle yerleşiyor, numune küpleri alındı.' },
    ],
    checks: ['Grobeton ve su yalıtımı', 'Temel topraklaması', 'Demir kontrol tutanağı', 'Slump ve küp numune', 'Kür başladı'],
    isg: 'Pompa bomunun altında kimse durmuyor; çukura iniş merdivenle, demir filiz uçları mantar kapakla kapalı.',
  },
  duvar: {
    crew: ['duvarci', 'isci', 'vinc', 'mimar', 'isg'],
    machines: ['Kule vinç', 'Harç mikseri', 'İskele'],
    log: [
      { who: 'mimar', text: 'Duvarlar mimari projeye göre işaretlendi; kapı ve pencere boşlukları kaba ölçüyle bırakıldı.' },
      { who: 'duvarci', text: 'Dış duvar 20 cm, iç duvar 10 cm gazbeton; ince yatak harcıyla şaşırtmalı örülüyor.' },
      { who: 'duvarci', text: 'Lento ve hatıllar döküldü; duvar üstü ile kiriş arasında esnek derz bırakıldı.' },
      { who: 'vinc', text: 'Paletler kancada dengeli; rüzgâr 20 m/s’yi geçince kaldırma durur.' },
    ],
    checks: ['Duvar aplikasyonu', 'Lento ve hatıllar', 'Kat yüksekliği kontrolü', 'Yangın kaçış yolu duvarları'],
    isg: 'Döşeme kenarlarında korkuluk ve güvenlik ağı; iskelede yeşil kart asılı, kemer kancası takılı.',
  },
  cati: {
    crew: ['catici', 'vinc', 'muh', 'isg'],
    machines: ['Kule vinç', 'Yaşam hattı'],
    log: [
      { who: 'catici', text: 'Ahşap makas çatı kuruldu; mertekler 50 cm arayla, emprenyeli kereste.' },
      { who: 'catici', text: 'OSB, su yalıtım örtüsü, çıta ve kiremit; mahya ve dereler kurşun bantla kapatıldı.' },
      { who: 'muh', text: 'Kar ve rüzgâr yükü TS 498’e göre kontrol edildi; ankrajlar betonarmeye bağlı.' },
    ],
    checks: ['Makas ve ankraj kontrolü', 'Su yalıtım örtüsü', 'Kiremit ve mahya', 'Yağmur oluğu ve iniş boruları'],
    isg: 'Çatıda yaşam hattı ve tam vücut emniyet kemeri; alt kotta düşen malzeme alanı kapatıldı.',
  },
  pencere: {
    crew: ['mimar', 'isci', 'vinc', 'denetim'],
    machines: ['Cephe asansörü'],
    log: [
      { who: 'mimar', text: 'Doğramalar ısı yalıtımlı PVC, çift cam Low-E; balkon korkuluğu 110 cm.' },
      { who: 'isci', text: 'Kasalar dübelle sabitlenip montaj köpüğü ve dış bantla sızdırmaz yapıldı.' },
      { who: 'denetim', text: 'Pencere denizlikleri eğimli; doğrama ile duvar birleşiminde su yalıtımı kontrol edildi.' },
    ],
    checks: ['Kaba ölçü ve kasa terazisi', 'Sızdırmazlık bandı', 'Balkon korkuluk yüksekliği'],
    isg: 'Cam taşımada vantuz ve iki kişi; açık balkonlarda geçici korkuluk yerinde.',
  },
  tesisat: {
    crew: ['mekanik', 'elektrik', 'isci', 'denetim'],
    machines: ['Kanal açma makinesi', 'Basınç test pompası', 'İzolasyon test cihazı'],
    log: [
      { who: 'mekanik', text: 'Temiz su PPRC, pis su PVC; pis su boruları %2 eğimle şafta bağlandı.' },
      { who: 'mekanik', text: 'Temiz su hattına 10 bar basınç testi uygulandı, 24 saat düşüş yok.' },
      { who: 'mekanik', text: 'Doğalgaz kolon hattı ve havalandırma şaftı; yangın dolabı hattı yerinde.' },
      { who: 'elektrik', text: 'Sıva altı spiral borular, dağıtım kutuları ve kat panoları; kaçak akım rölesi 30 mA.' },
      { who: 'elektrik', text: 'Zayıf akım: diafon, uydu, fiber ve yangın algılama hatları ayrı borularda.' },
      { who: 'elektrik', text: 'İzolasyon ve topraklama ölçümü yapıldı; topraklama direnci 2 Ω’un altında.' },
    ],
    checks: ['Temiz su basınç testi', 'Pis su eğim kontrolü', 'Doğalgaz projesi onayı', 'Elektrik izolasyon ölçümü', 'Topraklama ölçümü', 'Asansör montajı'],
    isg: 'Kaynakta sıcak iş izni ve yangın söndürücü; elektrikte kilitle-etiketle uygulaması.',
  },
  siva: {
    crew: ['sivaci', 'boyaci', 'isci', 'isg'],
    machines: ['Cephe iskelesi', 'Sıva makinesi'],
    log: [
      { who: 'sivaci', text: 'Dış cephede 5 cm taşyünü mantolama: yapıştırma harcı, dübel ve file.' },
      { who: 'sivaci', text: 'Pencere köşelerinde file takviyesi; dış cephe sıvası iki kat.' },
      { who: 'boyaci', text: 'Astar üstüne silikonlu dış cephe boyası, iki kat; renk mimarın seçtiği numunede.' },
    ],
    checks: ['Mantolama dübel sayısı', 'File bindirmeleri', 'Boya numunesi onayı'],
    isg: 'Cephe iskelesi her sabah kontrol ediliyor; iskelede yeşil kart, alttaki yaya yolu kapalı.',
  },
  ince: {
    crew: ['sivaci', 'isci', 'seramik', 'boyaci', 'icmimar', 'mekanik', 'elektrik'],
    machines: ['Şap pompası', 'Seramik kesme makinesi'],
    log: [
      { who: 'sivaci', text: 'İç duvarlarda makine alçı sıva; köşe profilleri teraziye alındı.' },
      { who: 'isci', text: 'Yüzer şap: ses yalıtım levhası, kenar bandı ve 5 cm şap.' },
      { who: 'seramik', text: 'Islak hacimlerde sürme su yalıtımı, köşelerde bant; seramik derzleri 2 mm.' },
      { who: 'icmimar', text: 'Mutfak dolapları, tezgâh ve vitrifiyeler yerine oturdu; malzeme listesiyle karşılaştırıldı.' },
      { who: 'boyaci', text: 'İç cephe: macun, zımpara, astar ve iki kat silinebilir boya.' },
      { who: 'elektrik', text: 'Anahtar, priz ve armatürler takıldı; panolar etiketlendi.' },
    ],
    checks: ['Islak hacim su yalıtımı', 'Şap terazisi', 'Seramik derz kontrolü', 'Mahal listesi kontrolü'],
    isg: 'Kesme makinesinde sulu kesim ve toz maskesi; boya sırasında pencereler açık.',
  },
  peyzaj: {
    crew: ['peyzaj', 'makine', 'isci', 'harita'],
    machines: ['Mini ekskavatör', 'Silindir'],
    log: [
      { who: 'peyzaj', text: 'Bahçeye 30 cm bitkisel toprak serildi; damla sulama hattı döşendi.' },
      { who: 'peyzaj', text: 'Yerli türler seçildi: çınar, ıhlamur, lavanta; ağaçlar çapraz kazıkla bağlandı.' },
      { who: 'harita', text: 'Otopark ve engelli rampası kotu ölçüldü; rampa eğimi %6.' },
    ],
    checks: ['Bitkisel toprak', 'Engelli rampası eğimi', 'Sığınak ve otopark sayısı'],
    isg: 'Bahçe işleri sırasında bina girişi tek yönlü; iş makinesine işaretçi eşlik ediyor.',
  },
  teslim: {
    crew: ['denetim', 'sef', 'mimar', 'mekanik', 'elektrik'],
    machines: [],
    log: [
      { who: 'denetim', text: 'Yangın yönetmeliği kontrolü: kaçış merdiveni, yangın kapıları, algılama sistemi çalışıyor.' },
      { who: 'mekanik', text: 'Asansör TSE uygunluk belgesi ve doğalgaz açma onayı alındı.' },
      { who: 'sef', text: 'Şantiye defteri kapatıldı; yapı denetim iş bitirme tutanağı imzalandı.' },
      { who: 'denetim', text: 'Yapı kullanma izin belgesi (iskân) için dosya belediyeye teslim edildi.' },
    ],
    checks: ['Yangın güvenliği', 'Asansör belgesi', 'Enerji kimlik belgesi', 'İş bitirme tutanağı', 'İskân başvurusu'],
    isg: 'Şantiye çiti kaldırıldı, son çevre temizliği yapıldı; artık burası bir ev.',
  },
};

/** Kaba inşaatın her alt adımının defteri (FLOOR_STEPS ile aynı sırada, kimliğe göre). */
export const FLOOR_PLANS: Record<string, Plan> = {
  aks: {
    crew: ['harita', 'kalipci', 'sef'],
    machines: ['Total station'],
    log: [{ who: 'harita', text: 'Kat döşemesine akslar ve kolon yerleri röperlerden aktarıldı; şakül kontrolü yapıldı.' }],
    checks: ['Aks aplikasyonu'],
    isg: 'Döşeme boşluklarının üstü sabit kapakla kapalı.',
  },
  rebar: {
    crew: ['demirci', 'vinc', 'isci'],
    machines: ['Kule vinç', 'Demir bükme tezgâhı'],
    log: [
      { who: 'demirci', text: 'Kolon boyuna donatısı Ø20, etriyeler Ø10 ve uçları 135° kancalı; sarılma bölgesinde sıklaştırıldı.' },
      { who: 'demirci', text: 'Bindirme boyları projede yazıldığı gibi; perde uç bölgeleri ayrıca sarıldı.' },
    ],
    checks: ['Boyuna donatı çapı', 'Etriye aralığı ve kancalar'],
    isg: 'Demir uçlarına mantar kapak; vinç yükünün altında kimse yok.',
  },
  form: {
    crew: ['kalipci', 'vinc', 'isci'],
    machines: ['Kule vinç', 'Teleskopik dikme'],
    log: [
      { who: 'kalipci', text: 'Kolon kalıpları şakülde; plywood yüzeylere kalıp yağı sürüldü.' },
      { who: 'kalipci', text: 'Döşeme kalıbı teleskopik dikmeler üzerinde; dikme aralıkları kalıp projesine göre.' },
    ],
    checks: ['Kalıp şakülü', 'Dikme aralıkları'],
    isg: 'Döşeme kenarında geçici korkuluk; kalıp kurarken emniyet kemeri takılı.',
  },
  mesh: {
    crew: ['demirci', 'mekanik', 'elektrik', 'vinc'],
    machines: ['Kule vinç'],
    log: [
      { who: 'demirci', text: 'Döşeme alt-üst donatısı ve kiriş etriyeleri bağlandı; paspayı takozu 2,5 cm.' },
      { who: 'mekanik', text: 'Tesisat şaftı ve döşeme geçişleri için kılıf borular yerleştirildi.' },
      { who: 'elektrik', text: 'Tavan aydınlatma buatları ve döşeme içi borular demire bağlandı.' },
    ],
    checks: ['Paspayı takozları', 'Tesisat kılıfları'],
    isg: 'Demir üstünde yürüme için geçiş tahtası; boşluk kenarları işaretli.',
  },
  check: {
    crew: ['denetim', 'muh', 'sef'],
    machines: [],
    log: [
      { who: 'denetim', text: 'Kolon, kiriş ve döşeme demirleri projeyle tek tek karşılaştırıldı; fotoğraflar sisteme yüklendi.' },
      { who: 'muh', text: 'Eksik bulunan iki etriye tamamlandı; döküm izni verildi.' },
    ],
    checks: ['Demir kontrol tutanağı', 'Döküm izni'],
    isg: 'Döküm öncesi pompa yeri ve mikser yolu güvenli hâle getirildi.',
  },
  pour: {
    crew: ['pompa', 'betoncu', 'denetim', 'sofor', 'isci'],
    machines: ['Beton pompası', 'Transmikser', 'Vibratör'],
    log: [
      { who: 'pompa', text: 'Pompa ayakları plakaya basıyor; bom elektrik hattından güvenli mesafede.' },
      { who: 'sofor', text: 'Mikser irsaliyesi C30/37, çıkış saati yazılı; su eklenmedi.' },
      { who: 'betoncu', text: 'Önce kolonlar, sonra kiriş ve döşeme; vibratör betona dik daldırılıyor.' },
      { who: 'denetim', text: 'Slump 14 cm; 7 ve 28 günlük kırım için 15 cm küp numuneler alındı.' },
    ],
    checks: ['İrsaliye ve çıkış saati', 'Slump deneyi', 'Küp numune'],
    isg: 'Pompa hortumunun ucunu iki kişi tutuyor; bom altında kimse yok.',
  },
  cure: {
    crew: ['isci', 'muh'],
    machines: [],
    log: [
      { who: 'isci', text: 'Döşeme yedi gün boyunca sabah akşam sulanıyor; üstü örtüyle kapalı.' },
      { who: 'muh', text: '7 günlük kırım sonucu beklenen dayanımı geçti; üst kata yük bindirilebilir.' },
    ],
    checks: ['Kür sulaması', '7 günlük kırım sonucu'],
    isg: 'Taze döşemede istif yapılmıyor.',
  },
  strip: {
    crew: ['kalipci', 'vinc', 'isci'],
    machines: ['Kule vinç'],
    log: [
      { who: 'kalipci', text: 'Kolon kalıpları söküldü; döşeme altındaki geri dikmeler iki kat boyunca yerinde kalıyor.' },
      { who: 'vinc', text: 'Kalıp paketleri bağlanıp bir üst kata alındı.' },
    ],
    checks: ['Söküm süresi', 'Geri dikmeler'],
    isg: 'Söküm alanı şeritle kapatıldı; çiviler ayıklanıp istiflendi.',
  },
};

/** Defterin şu anki satırı ve işaretlenmiş kontrol sayısı (0–1 ilerlemeye göre). */
export function planProgress(plan: Plan, p: number) {
  const log = plan.log[Math.min(plan.log.length - 1, Math.floor(p * plan.log.length))];
  const checked = Math.min(plan.checks.length, Math.floor(p * (plan.checks.length + 0.999)));
  return { log, checked };
}
