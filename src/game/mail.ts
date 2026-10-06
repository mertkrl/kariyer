/*
 * The company inbox on your computer: onboarding, IT notices, the manager's formal side (the
 * favours come by phone), the building, a colleague's cake — and a bounce from an address that
 * no longer exists. Mail arrives at its time of day and stays in the inbox all week.
 */

import { PLAYER } from './player';

export interface Mail {
  id: string;
  day: number;
  /** Workday minute it arrives. */
  at: number;
  from: string;
  address: string;
  subject: string;
  body: string;
  /** Flagged in red in the list. */
  important?: boolean;
  /** Mail you sent sits in "Gönderilenler", mail waiting for 17:00 in "Giden Kutusu"; everything else is the inbox. */
  folder?: 'inbox' | 'sent' | 'outbox';
  /** Sent mail: who it went to. */
  to?: string;
  /** A candidate writing back: it pops up like important mail. */
  reply?: boolean;
  /** An attachment shown under the mail: this week's interview list, or Hakan Bey's question list. */
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

Modülün puanlama ağırlıkları lisans sağlayıcısına aittir ve tarafımızca görüntülenemez.

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

Bu hafta hedefimiz, ön elemeyi eksiksiz tamamlayıp cuma günü en fazla 10 adayla mülakat aşamasına geçmektir.

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
    from: 'Levent Arslan',
    address: 'levent.arslan@tavrinsalabs.test',
    subject: 'Cuma mülakatları hk.',
    body: `Merhaba ${PLAYER.first},

Ben Levent, yazılım ekip lideri. Cuma mülakatlarında ben de olacağım; işe alacağımız kişi benim ekibimde çalışacak.

Bir ricam var: kısa listeyi hazırlarken ATS skoruna değil, adayların gerçekte ne yaptığına bakın. Tanıdığım en iyi geliştiricilerin çoğu iyi CV yazmayı bilmez.

Kolay gelsin,
Levent`,
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
    from: 'Levent Arslan',
    address: 'levent.arslan@tavrinsalabs.test',
    subject: 'Re: Sistem',
    body: `Sistemin çöktüğünü duydum. Açıkçası bizim ekip için kötü haber sayılmaz.

Kısa listeye kimi koyduysanız yarın göreceğim. Tek isteğim: listeye "skoru yüksek" diye değil, "işi yapabilir" diye girsinler.

Levent`,
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
  {
    id: 'privacy',
    day: 3,
    at: 400,
    from: 'İK Direktörlüğü',
    address: 'direktorluk@tavrinsalabs.test',
    subject: 'Hatırlatma: Şirket belgelerinin gizliliği',
    important: true,
    body: `Değerli çalışanlarımız,

Şirket içi belgelerin fotoğraflanması, kopyalanması veya üçüncü kişilerle paylaşılması disiplin yönetmeliği kapsamında kesinlikle yasaktır.

Güvenlik kameralarının kayıtları düzenli olarak incelenmektedir.

İK Direktörlüğü`,
  },
];

/** Everything in the inbox by now (this week, up to this minute), newest first. */
export function inbox(dayIndex: number, minutes: number, extra: Mail[] = []): Mail[] {
  return [...MAILS, ...extra].filter((m) => m.day < dayIndex || (m.day === dayIndex && m.at <= minutes)).sort((a, b) => b.day - a.day || b.at - a.at);
}
