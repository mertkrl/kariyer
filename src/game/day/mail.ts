/*
 * Bilgisayarındaki şirket gelen kutusu: oryantasyon, bilgi işlem duyuruları, müdürün resmî
 * yüzü (ricalar telefonla gelir), bina ve bir iş arkadaşının pastası. E-posta günün kendi
 * saatinde gelir ve bütün hafta gelen kutusunda kalır.
 */

import { PLAYER } from '../lib/player';

export interface Mail {
  id: string;
  day: number;
  /** Geldiği mesai dakikası. */
  at: number;
  from: string;
  address: string;
  subject: string;
  body: string;
  /** Listede kırmızıyla işaretli. */
  important?: boolean;
  /** Gönderdiğin e-posta "Gönderilenler"de, 17:00'yi bekleyen e-posta "Giden Kutusu"nda durur; geri kalan her şey gelen kutusudur. */
  folder?: 'inbox' | 'sent' | 'outbox';
  /** Gönderilen e-posta: kime gittiği. */
  to?: string;
  /** Cevap yazan bir aday: kariyer@ kuralıyla "Kariyer" klasörüne yönlenir. */
  reply?: boolean;
  /** Spam filtresine takılan e-posta: bildirim gelmez, "Spam" klasöründe bekler. */
  spam?: boolean;
  /** E-postanın altında gösterilen ek: bu haftanın mülakat listesi ya da Hakan Bey'in soru listesi. */
  attachment?: { name: string; kind: 'finalists' | 'questions' };
}

export const MAILS: Mail[] = [
  {
    id: 'welcome',
    day: 0,
    at: 0,
    from: 'İK Ekibi',
    address: 'ik@tavrinsalabs.test',
    subject: 'Aramıza hoş geldin! 🎉',
    body: `Merhaba ${PLAYER.first},

Tavrinsa Labs ailesine hoş geldin! Biz burada bir aileyiz 💛 Bu hafta açık pozisyonumuzun ön elemesini sen yürüteceksin.

Birkaç pratik bilgi:
• 2 aylık deneme süren bugün başladı. Bu sürede değerlendirmen İK Müdürümüz Hakan Kaya'dadır.
• Mesai 08:00–17:00, öğle arası 12:00–13:00.
• Kartın resepsiyonda, Gülay Hanım'dan alabilirsin.
• Yan haklarımız: çay-kahve serbest, ayda bir meyve günü ve katımızdaki su sebili 💧

Sorun olursa dahili 100'den bize ulaşabilirsin.

Sevgiler,
İK Ekibi`,
  },
  {
    id: 'ats-guide',
    day: 0,
    at: 0,
    from: 'Bilgi İşlem',
    address: 'it-destek@tavrinsalabs.test',
    subject: 'İK Sistemi v4.2 — kısa kullanım kılavuzu',
    body: `Merhaba ${PLAYER.first},

İşe Alım Portalı'na masaüstündeki simgeden ulaşabilirsin.

• "Değerlendir" düğmesi adayın dosyasını yapay zekâ modülüne gönderir. Modül her alan için olumlu/olumsuz işaret koyar.
• Modülün kararları bağlayıcı değildir; son karar İK uzmanına aittir.
• "Sistem notu" alanı adaya gösterilmez.

Modül, adayları "Aday Puanlama Tablosu"ndaki ağırlıklara göre sıralar (yaş aralığı, ikamet ilçesi, mezun olunan okul, kariyer boşluğu vb.). Tablo holding tarafından hazırlanmış ve İK Müdürü onayıyla sisteme yüklenmiştir (onaylayan: H. Kaya). Ağırlıklar lisans sözleşmesi gereği tarafımızca görüntülenemez.

İyi çalışmalar,
Bilgi İşlem`,
  },
  {
    id: 'targets',
    day: 0,
    at: 95,
    from: 'Hakan Kaya',
    address: 'hakan.kaya@tavrinsalabs.test',
    subject: 'Haftalık hedefler',
    body: `Sayın ${PLAYER.first} Hanım,

Bu hafta hedefimiz, ön elemeyi eksiksiz tamamlayıp her gün en fazla 1 adayı mülakata çağırarak cuma günü mülakat aşamasına geçmektir.

Günlük dosyaların mesai bitimine kadar sonuçlandırılmasını ve yapay zekâ modülünün önerilerinin dikkate alınmasını rica ederim.

Bilginize: ilan metnine "25–35 yaş arası, dinamik ekibimize uyum sağlayacak" ibaresi eklenmiştir.

Deneme sürenizin ilk haftası olduğunu hatırlatırım.

Saygılarımla,
Hakan Kaya
İnsan Kaynakları Müdürü`,
  },
  {
    id: 'flood',
    day: 0,
    at: 150,
    from: 'Kariyer Platformu',
    address: 'bildirim@kariyer-platform.com',
    subject: 'İlanınıza 270 yeni başvuru!',
    body: `Tebrikler! İlanınız son 24 saatte 270 yeni başvuru aldı.

Premium ATS filtreleriyle başvuruları otomatik olarak ön elemeden geçirebilirsiniz. Otomatik eleme ile İK ekipleri ortalama %87 zaman kazanıyor!

Bu e-postayı otomatik bildirim tercihleriniz nedeniyle aldınız.`,
  },
  {
    id: 'menu',
    day: 0,
    at: 390,
    from: 'Yemekhane',
    address: 'yemekhane@tavrinsalabs.test',
    subject: 'Yarının menüsü',
    body: `Mercimek çorbası · Tavuk sote · Bulgur pilavı · Cacık · Sütlaç

Afiyet olsun!`,
  },
  {
    id: 'criteria',
    day: 1,
    at: 10,
    from: 'Hakan Kaya',
    address: 'hakan.kaya@tavrinsalabs.test',
    subject: 'Değerlendirme kriterleri güncellemesi',
    body: `Sayın ${PLAYER.first} Hanım,

Dünkü rapor incelenmiştir. Bugünden itibaren ATS skoru %60'ın altında kalan adayların mülakat aşamasına alınmamasını rica ederim.

Bu uygulama tüm adaylara eşit olarak uygulanacağından adil bir kriterdir.

Saygılarımla,
Hakan Kaya`,
  },
  {
    id: 'culture-module',
    day: 1,
    at: 130,
    from: 'Bilgi İşlem',
    address: 'it-destek@tavrinsalabs.test',
    subject: 'Duyuru: "Kültür Uyumu" modülü devrede',
    body: `Merhaba ${PLAYER.first},

Lisans sağlayıcımızın gönderdiği "Kültür Uyumu" modülü dün gece sisteme yüklenmiştir. Modül, adayların şirket kültürüne uyumunu "tarihsel işe alım verilerine" dayanarak puanlar.

Bu nedenle bazı skorlarda değişiklik görülebilir.

Bilgi İşlem`,
  },

  {
    id: 'flooded-room',
    day: 2,
    at: 262,
    from: 'İdari İşler',
    address: 'idari@tavrinsalabs.test',
    subject: 'Toplantı odası kullanım dışı',
    body: `Değerli çalışanlarımız,

Öğlen artan yağmur nedeniyle 2. kat toplantı odasına su girmiştir. Oda günün geri kalanında kullanım dışıdır.

Anlayışınız için teşekkür ederiz.
İdari İşler`,
  },
  {
    id: 'levent-intro',
    day: 1,
    at: 60,
    from: 'Ümit Arslan',
    address: 'umit.arslan@tavrinsalabs.test',
    subject: 'Cuma mülakatları hk.',
    body: `Merhaba ${PLAYER.first},

Ben Ümit, yazılım ekip lideri. Cuma mülakatlarında ben de olacağım; işe alacağımız kişi benim ekibimde çalışacak.

Bir ricam var: kısa listeyi hazırlarken ATS skoruna değil, adayların gerçekte ne yaptığına bakın. Tanıdığım en iyi geliştiricilerin çoğu iyi CV yazmayı bilmez.

Kolay gelsin,
Ümit`,
  },
  {
    // Ümit'in yanıldığı tek dosya: Perşembe e-postasında bunu kendisi söyler (echoes.leventMail)
    id: 'levent-ozan',
    day: 1,
    at: 510,
    from: 'Ümit Arslan',
    address: 'umit.arslan@tavrinsalabs.test',
    subject: 'Çarşamba değerlendirmesi: Ozan Tan (Kıdemli Yazılım Geliştirici) hk.',
    body: `Merhaba ${PLAYER.first},

Yarın değerlendireceğiniz dosyalar arasında Ozan Tan'ın başvurusu da yer alıyor. Sistemin maaş beklentisi nedeniyle dosyayı işaretlemiş olabileceğini, referans kontrolünde de bazı olumsuz ifadelerle karşılaşabileceğinizi biliyorum.

Ozan'ın çalışmalarını iki yıl önce bir sektör konferansında yakından inceleme fırsatım oldu. Teknik açıdan bu ilana başvuranların en güçlüsü olduğunu düşünüyorum. Referanslardaki olumsuz görüşlerin bir kısmının önceki ekipteki kişisel gerginliklerden kaynaklandığı kanaatindeyim.

Uygun görürseniz Cuma günkü mülakatlarda kendisini birlikte değerlendirmek isterim.

İyi çalışmalar,
Ümit Arslan
Yazılım Ekip Lideri`,
  },
  {
    id: 'crash',
    day: 3,
    at: 0,
    from: 'Bilgi İşlem',
    address: 'it-destek@tavrinsalabs.test',
    subject: 'ACİL: Yapay zekâ modülü çalışmıyor',
    important: true,
    body: `Merhaba ${PLAYER.first},

Lisans sunucusundaki bir arıza nedeniyle yapay zekâ modülü bugün kullanılamayacaktır. Değerlendirmelerin manuel olarak yapılması gerekmektedir.

Bilgi İşlem`,
  },
  {
    id: 'levent-crash',
    day: 3,
    at: 160,
    from: 'Ümit Arslan',
    address: 'umit.arslan@tavrinsalabs.test',
    subject: 'Re: Sistem',
    body: `Sistemin çöktüğünü duydum. Açıkçası bizim ekip için kötü haber sayılmaz.

Kısa listeye kimi koyduysanız yarın göreceğim. Tek isteğim: listeye "skoru yüksek" diye değil, "işi yapabilir" diye girsinler.

Ümit`,
  },
  {
    id: 'shortlist',
    day: 3,
    at: 230,
    from: 'Hakan Kaya',
    address: 'hakan.kaya@tavrinsalabs.test',
    subject: 'Mülakat listesi yarın kesinleşiyor',
    attachment: { name: 'Mulakat_Listesi.xlsx', kind: 'finalists' },
    body: `Sayın ${PLAYER.first} Hanım,

Cuma günkü mülakat listesi bu akşam kesinleşecektir. Listenin "şirket kültürümüzle uyumlu" adaylardan oluşmasını bekliyorum.

Saygılarımla,
Hakan Kaya`,
  },
  {
    id: 'overtime',
    day: 3,
    at: 430,
    from: 'Hakan Kaya',
    address: 'hakan.kaya@tavrinsalabs.test',
    subject: 'Yarınki mülakatlar — hazırlık ve soru listesi',
    attachment: { name: 'Mulakat_Soru_Listesi.pdf', kind: 'questions' },
    body: `Sayın ${PLAYER.first} Hanım,

Yarın mülakatlar sonrası akşam 20:00'ye kadar kalınması beklenmektedir. Ekip ruhu gereği bu çalışma fazla mesai kapsamında değerlendirilmeyecektir.

Ekte standart soru listemiz yer almaktadır. "Uzun vadeli uyumun" değerlendirilebilmesi için adayların önümüzdeki dönem planları (aile, askerlik vb.) hakkında da bilgi alınmasını rica ederim.

Bu bilgilerin forma değil, notlarınıza işlenmesi yeterlidir.

Saygılarımla,
Hakan Kaya`,
  },
];

/** Şimdiye kadar gelen kutusundaki her şey (bu hafta, bu dakikaya kadar), en yeni önce. */
export function inbox(dayIndex: number, minutes: number, extra: Mail[] = []): Mail[] {
  return [...MAILS, ...extra].filter((m) => m.day < dayIndex || (m.day === dayIndex && m.at <= minutes)).sort((a, b) => b.day - a.day || b.at - a.at);
}
