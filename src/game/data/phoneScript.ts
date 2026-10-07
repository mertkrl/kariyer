/*
 * Telefonlarda söylenen her şey, metin olarak: Hakan Bey'in istediği ricalar, her ruh hâlindeki
 * selamları, annenin mesajları, ofis grubu, doğum günü sürprizi, ekibin dün yaptıklarına tepkisi.
 * Burada davranış yok: neyin ne zaman gönderileceğine manager.ts karar verir.
 */
import { accusative, genitive } from '../lib/turkish';
import { PLAYER } from '../lib/player';
import type { Ambient, ManagerTone, QuickReply, RequestTemplate } from '../day/phoneTypes';

// Ricalar oyunun konusu olan belirli bir önyargıyı hedefler; `ids`ten bugünün kuyruğunda olan
// ilk aday hedef olur.
export const REQUESTS: RequestTemplate[] = [
  {
    ids: ['okan'],
    want: 'approve',
    text: (n) => `${accusative(n)} mülakat listesine eklemenizi rica ederim. Referansı bana aittir; kendisini çok yakından tanırım. Bu konunun aramızda kalmasını rica ederim.`,
  },
  {
    ids: ['serkan'],
    want: 'approve',
    text: (n) => `${accusative(n)} mülakat listesine eklemenizi rica ederim. Kendisi değerli bir iş ortağımızın tavsiyesidir; ayrıca ATS skoru %98'dir.`,
  },
  {
    ids: ['kerem', 'handan', 'asli', 'hakan'],
    want: 'reject',
    text: (n) => `${genitive(n)} başvurusunun değerlendirme dışı bırakılmasını uygun görüyorum. Ekibin yaş profiliyle uyumlu olmadığı kanaatindeyim.`,
  },
  {
    ids: ['gokce', 'elif', 'seda', 'tuncay'],
    want: 'reject',
    text: (n) => `${accusative(n)} süreçten çıkarmanızı rica ederim. Aile durumu göz önüne alındığında devamlılık riski yüksek görünüyor. Bu hususun yazışmalarda kalmasını tercih ederim.`,
  },
  {
    ids: ['cem', 'nihan', 'ozan', 'duygu'],
    want: 'reject',
    text: (n) => `${genitive(n)} ücret beklentisi bütçemizin üzerindedir. Mülakat aşamasına alınmamasını rica ederim.`,
  },
  {
    ids: ['ugur'],
    want: 'reject',
    text: (n) => `${n} haftanın çoğunda uzaktan çalışmak istiyor. Ekip ruhu ofiste olur; bu adayla ilerlememenizi öneririm.`,
  },
  {
    ids: ['gizem', 'nazli', 'ceren'],
    want: 'reject',
    text: (n) => `${n} şehrin diğer ucunda ikamet etmektedir. Mesai düzenine uyum sağlaması güç olacaktır; değerlendirme dışı bırakınız.`,
  },
  {
    ids: ['derya', 'volkan'],
    want: 'reject',
    text: (n) => `${genitive(n)} özgeçmişindeki boşluklar istikrar açısından soru işareti oluşturuyor. Olumsuz değerlendirilmesini rica ederim.`,
  },
  {
    ids: ['deniz', 'tolga', 'pinar'],
    want: 'reject',
    text: (n) => `${n} için örgün eğitim ve kurumsal deneyim bulunmamaktadır. Zaman kaybetmeden süreci sonlandırınız.`,
  },
  {
    ids: ['melis', 'selin'],
    want: 'reject',
    text: (n) => `${n} yeterli deneyime sahip değildir. İlk günden sorumluluk alabilecek profillere odaklanmanızı rica ederim.`,
  },
  {
    ids: ['ferhat', 'murat', 'burak'],
    want: 'approve',
    text: (n) => `${accusative(n)} mülakata davet etmenizi rica ederim. Ücret beklentisi düşük; müzakerede avantajlı konumdayız.`,
  },
  {
    ids: ['kaan', 'mert', 'irem', 'sibel', 'nazli'],
    want: 'reject',
    text: (n) => `${genitive(n)} özgeçmişi sistem tarafından dahi okunamamış. Özensiz bir başvuru olarak değerlendirilmesini uygun görüyorum.`,
  },
  {
    ids: ['yusuf', 'ece'],
    want: 'reject',
    text: (n) => `${n} ücret konusunda şeffaf değil. Şeffaf olmayan başvurularla ilerlemeyelim.`,
  },
  {
    ids: ['baris'],
    want: 'approve',
    text: (n) => `${accusative(n)} mülakata davet etmenizi rica ederim. Eski bir çalışma arkadaşımın oğlu; ama dosyasına bakarsanız tavsiyeye ihtiyacı olmadığını göreceksiniz.`,
  },
  {
    ids: ['zeynep'],
    want: 'reject',
    text: (n) => `${genitive(n)} yurt dışı deneyimi bulunmamaktadır. Global pozisyon için uygun olmadığını düşünüyorum; bu değerlendirmenin yazılı kayda geçmemesini rica ederim.`,
  },
  {
    ids: ['caner', 'ahmet', 'aylin'],
    want: 'approve',
    text: (n) => `${accusative(n)} mülakata davet etmenizi rica ederim. Kendisi yakın çevremden bir tavsiyedir.`,
  },
];

// Gün başına sabah selamı (nazik-resmî); daha soğuk tonlar aşağıda onu ezer.
export const GREETINGS = [
  'Günaydın. Bugün kuyrukta {n} başvuru bulunmaktadır. Tüm dosyaların mesai bitimine kadar sonuçlandırılmasını rica ederim. İyi çalışmalar.',
  'Günaydın. Dünkü raporunuzu inceledim. Bugün {n} dosya sizi bekliyor; aynı özeni göstermenizi rica ederim.',
  'Günaydın. Bütçe toplantısından yeni çıktım. Bugünkü {n} başvuruda ücret beklentilerine özellikle dikkat etmenizi rica ederim.',
  'Günaydın. Yapay zekâ sistemimiz arızalı; bilgi işlem ekibi çalışıyor. Bugünkü {n} dosyayı kendi değerlendirmenizle sonuçlandırmanız gerekecek.',
];

export const TONED: Record<'greeting' | 'lunch', Record<Exclude<ManagerTone, 0>, string>> = {
  greeting: {
    1: 'Günaydın. Bugün {n} dosya bulunmaktadır. Dünkü tutumun tekrarlanmamasını bekliyorum.',
    2: 'Sayın uzman, bugün {n} dosya bulunmaktadır. Talimatlara harfiyen uyulmasını önemle rica ederim.',
    3: 'Bugün {n} dosya var. Tutumunuz yönetim kuruluna raporlanmıştır. Bu hafta her kararınız kayıt altındadır.',
  },
  lunch: {
    1: 'Öğle arası sona ermiştir. Dosyalara dönmenizi bekliyorum.',
    2: 'Moladan dönüşünüzü takiben dosyalara geçmeniz gerekmektedir.',
    3: 'Öğle arası bitti. Masanızda olduğunuzu varsayıyorum.',
  },
};

export const FAMILY: { at: number; text: string; replies?: QuickReply[] }[][] = [
  [
    {
      at: 205,
      text: 'Kardeşin dün akşam çok moralsizdi. Okulu ilk 10\'da değil diye staj başvurularına kimse dönmüyormuş. "CV\'den okulun adını silsem mi?" diyor. Ne diyeyim ona?',
      replies: [
        { text: 'Silmesin anne. Okulun adı değil, yaptığı işler önemli; projelerini öne koysun.', reaction: 'Öyle dedim ben de. Akşam sen de bir ara onu, sesini duysun.', vicdan: 1 },
        { text: 'Silsin anne, maalesef öyle bakıyorlar.', reaction: 'Peki… Söylerim. Çok üzüldü ama.', vicdan: -2 },
      ],
    },
  ],
  [
    {
      at: 150,
      text: 'Bugün pazarda eski fabrikadan Nuran\'ı gördüm. Hatırlıyor musun, bizi 50 yaşında "genç kan lazım" deyip çıkarmışlardı. Sen iyi ki karar veren taraftasın yavrum',
      replies: [
        { text: 'Hatırlıyorum anne.', reaction: 'Unutma, her dosyanın arkasında bir anne var. Kolay gelsin' },
        { text: 'Bazen karar ben vermiyorum anne, sistem veriyor.', reaction: 'Sistemi de insan yazmıyor mu yavrum?', vicdan: -1, followUp: [
          { text: 'Haklısın anne. Dosyaları okuyorum, merak etme.', reaction: 'Bilirim seni. Kolay gelsin yavrum' },
          { text: 'Yazıyor ama bana sormuyorlar ki.', reaction: 'Sormasınlar, sen yine de bak. Gözün açık olsun' },
        ] },
      ],
    },
  ],
  [
    {
      at: 330,
      text: 'Yavrum, alt kattaki Nermin Hanım\'ın oğlu bir yıldır iş arıyor. Bilgisayar mühendisi. Senin şirkete CV\'sini göndersin mi?',
      replies: [
        { text: 'Anne, ilana kendisi başvursun. Ben aracı olamam.', reaction: 'Peki, öyle söylerim. Biraz bozulur ama haklısın.' },
        {
          text: 'Göndersin, bir bakayım.',
          reaction: 'Çok sevinecekler! Adı Onur, Onur Kaplan. Geçen yıl mezun oldu, stajı da var. Yarın portaldan yazılım geliştirici ilanına başvuracakmış',
          neighbourCv: true,
        },
      ],
    },
  ],
];

export const AMBIENT: Ambient[][] = [
  [
    {
      at: 60, thread: 'office', sender: 'Ayşe', text: 'Günaydın herkese. Kahve makinesi yine bozuk ☕',
      replies: [
        { text: 'Günaydın. Çay ocağında çay var, oradan idare edelim.', reaction: 'İyi fikir, ben de geçiyorum 🙂', reactionSender: 'Ayşe' },
        { text: 'Günaydın. Teknik servise haber verildi mi?', reaction: 'Üç kere aradım, gelmiyorlar 🙄', reactionSender: 'Emre' },
      ],
      followUps: [
        { after: 3, sender: 'Emre', text: 'Yine mi? Geçen hafta tamir edilmişti 😩' },
        { after: 40, sender: 'Selin (İK)', text: 'Teknik servis geldi, makine çalışıyor ☕', closes: true },
      ],
    },
    {
      at: 8, thread: 'office', sender: 'Selin (İK)', text: `Aramıza yeni katılan İK uzmanı arkadaşımız ${PLAYER.first}'ye hoş geldin diyoruz 👋 Bir ihtiyacın olursa sormaktan çekinme.`,
      followUps: [{ after: 2, sender: 'Emre', text: 'Hoş geldin! 🙌' }],
    },
    {
      // herkes hoş geldin dedikten sonra: ilk cevabın teşekkür, ondan önce gruptaki hiçbir şeye cevap verilmez
      at: 14, thread: 'office', first: true, sender: 'Ayşe', text: 'Hoş geldin, kolay gelsin. Öğle yemeğinde tanışırız 🙂',
      replies: [
        { text: 'Hepinize çok teşekkür ederim, iyi çalışmalar.', reaction: 'Biz teşekkür ederiz, kolay gelsin 🙂', reactionSender: 'Selin (İK)' },
        { text: 'Teşekkürler, sıcak karşılamanız için sağ olun. Sorularım olursa sizi rahatsız edeceğim.', reaction: 'Rahatsızlık değil, rica ederim 🙂', reactionSender: 'Selin (İK)' },
      ],
    },
    {
      at: 330, thread: 'office', sender: 'Selin (İK)', text: 'Öğleden sonra yapay zekânın analiz butonu yavaş, sabırlı olalım.',
      replies: [{ text: 'Bilgi için teşekkürler Selin Hanım.', reaction: 'Rica ederim 🙂', reactionSender: 'Selin (İK)' }],
      followUps: [{ after: 4, sender: 'Emre', text: 'Bende de öyle, yarım saattir dönüyor.' }],
    },
    {
      at: 420, thread: 'office', sender: 'Emre', text: 'Bilginize: 3. kattaki yazıcı çalışıyor, 2. kattaki arızalı 🖨️',
      replies: [{ text: 'Teşekkürler Emre.', reaction: 'Rica ederim 👍', reactionSender: 'Emre' }],
      followUps: [{ after: 14, sender: 'Ayşe', text: 'Toner de bitmek üzere, idareli kullanalım.' }],
    },
  ],
  [
    {
      at: 90, thread: 'ayse', text: 'Gruba yazmak istemedim. Nurten Hanım söyledi: deneme süresi bitince ikimizden sadece biri kalıyormuş. Kadro bir kişilik 😬',
      replies: [
        { text: 'Ciddi misin?', reaction: 'Keşke olmasa. Hakan Bey cuma akşamı söyleyecekmiş. Haftanın daha ilk günü bitti, düşünsene 😩' },
        { text: 'Kim kalırsa kalsın, birbirimizi ezmeyelim.', reaction: 'Anlaştık. Ama sayılarımı tutturmam lazım, bilmiş ol 😅' },
      ],
    },
    {
      at: 200, thread: 'office', sender: 'Ayşe', text: 'Köprü yine kilitti, metrobüste köprünün ortasında 25 dakika durduk 😩',
      replies: [
        { text: 'Ben de. Bağcılar\'dan çıkıp köprüyü geçmek 1,5 saat sürdü.', reaction: 'Avrupa yakasından gelenler kulübüne hoş geldin 🤝', reactionSender: 'Ayşe' },
        { text: 'Marmaray\'a geçin, denizin altı daha sakin.', reaction: 'Ayrılık Çeşmesi aktarması da ayrı bir maraton ama 😂', reactionSender: 'Emre' },
      ],
      followUps: [
        { after: 2, sender: 'Emre', text: 'Ben Kadıköy\'deyim, köprü derdim yok 😎 Ama D-100\'de kaza vardı, ona ben de takıldım.' },
        { after: 25, sender: 'Selin (İK)', text: 'Ben vapura geçtim; Karaköy–Kadıköy, sonra metro. Köprüden daha hızlı.' },
      ],
    },
    {
      at: 350, thread: 'office', sender: 'Selin (İK)', text: 'ATS eşiği %60 oldu diye yarım saattir aynı CV\'ye bakıyorum. %59. Ne yapayım şimdi 😐',
      replies: [
        { text: 'Dosyayı okuyup ona göre karar vermek lazım.', reaction: 'Haklısın. Okuyorum 🙂', reactionSender: 'Selin (İK)' },
        { text: 'Kural kural, eleyelim.', reaction: 'Peki… Yine de içim rahat değil.', reactionSender: 'Selin (İK)' },
      ],
      followUps: [
        { after: 3, sender: 'Ayşe', text: 'Eşik eşiktir 😅 Hakan Bey öyle diyor.' },
        { after: 20, sender: 'Emre', text: 'Eşik koyulmasa 600 dosyayı kim okuyacak? Kural kuraldır, Hakan Bey haklı bence.' },
      ],
    },
  ],
  [
    { at: 100, thread: 'office', sender: 'Selin (İK)', text: 'Hatırlatma: 11:00\'de haftalık İK toplantısı online, bağlantı takvimde. Hakan Bey genel müdürlükten, Ümit Bey evden bağlanıyor.' },
    {
      at: 250, thread: 'office', sender: 'Emre', text: 'Toplantı odasını su basmış, sandalyeler koridorda 🌊 İyi ki toplantı online\'dı.',
      followUps: [
        { after: 5, sender: 'Ayşe', text: 'Öğle yemeğini de ayakta yeriz artık 😂' },
        { after: 30, sender: 'Selin (İK)', text: 'İdari işler ilgileniyormuş, yarına kurur dediler.' },
      ],
    },
    {
      at: 430, thread: 'office', sender: 'Ayşe', text: 'Şemsiyesi olmayan var mı? Bende iki tane var ☔',
      replies: [{ text: 'Ben alabilirim, çıkışta uğrarım. Teşekkürler.', reaction: 'Masamda, mavi olan senin ☂️', reactionSender: 'Ayşe' }],
      followUps: [{ after: 10, sender: 'Emre', text: 'Bende de bir tane var, lazım olan alsın.' }],
    },
    // Çarşamba, yağmur dinmeden, ıslak toplantı odasının önünde ofisin iki tarafı kendini anlatır
    {
      at: 470, thread: 'office', sender: 'Ayşe', text: 'Emre, sen neden hep kurallardan yanasın? Merak ettim sadece 🙂',
      followUps: [
        { after: 3, sender: 'Emre', text: 'Önceki işimde bir adayı "ama çok iyi biri" diye kuralın dışında aldırdım. İki ayda ayrıldı; hesabı sorulan ilk isim ben oldum.' },
        { after: 4, sender: 'Emre', text: 'O günden beri kural neyse o. Kimse de bana bir şey diyemiyor.' },
        { after: 7, sender: 'Ayşe', text: 'Bilmiyordum… Ben de iki yıl iş aradım, bir kişi bile CV\'mi okumadı. Belki ondan bu kadar takılıyorum.' },
        { after: 9, sender: 'Selin (İK)', text: 'İkiniz de kendi yerinden haklısınız. Çaylar soğuyor ☕' },
      ],
      replies: [
        { text: 'Bence ikiniz de aynı şeyden korkuyorsunuz: yanlış kişiye haksızlık etmekten.', reaction: 'Hiç böyle düşünmemiştim. Haklısın galiba.', reactionSender: 'Emre' },
        { text: 'Ben de iş ararken aynısını yaşadım Ayşe. Ondan her CV\'yi okumaya çalışıyorum.', reaction: 'Biliyordum 🙂 Cuma mülakatta aynı tarafta olacağız.', reactionSender: 'Ayşe' },
        { text: 'Kurallar olmasa 600 dosyayı nasıl bitirirdik, Emre haklı.', reaction: 'Sağ ol. Bunu söyleyen ilk kişi sensin.', reactionSender: 'Emre' },
      ],
    },
  ],
  [
    {
      at: 80, thread: 'office', sender: 'Emre', text: 'Yapay zekâ sistemi tamamen çöktü 😱 IT\'de herkes panikte',
      replies: [
        { text: 'Neyse ki test puanları elimizde.', reaction: 'Puanlar var da… soruları gördün mü? 🙃', reactionSender: 'Ayşe' },
        { text: 'Bugün iş uzun sürecek.', reaction: 'Kesin. Akşam fazla mesai var gibi 😩', reactionSender: 'Emre' },
      ],
      followUps: [
        { after: 4, sender: 'Selin (İK)', text: 'Hakan Bey\'den not: "70 altı listeye girmez. Sayılar ortada." Bilginize.' },
        { after: 10, sender: 'Emre', text: 'Sistem gitti ama test duruyor. Bence test puanı daha bile nesnel. Sayı sayıdır.' },
        { after: 25, sender: 'Ayşe', text: 'IT "öğleden sonra belki" diyor. Belki 🙃' },
      ],
    },
    {
      at: 300, thread: 'office', sender: 'Selin (İK)', text: 'Bir adayın cevap kâğıdına baktım. "Hangisi farklı: Pazartesi, Çarşamba, Cumartesi" sorusunda doğru cevap "Hiçbiri, hepsi iş günüdür"müş. Gülsem mi ağlasam mı.',
      replies: [
        { text: 'Ben de fark ettim. Mantıklı cevap verenler puan kaybetmiş.', reaction: 'Bir şey söylüyor bu bize 🙂', reactionSender: 'Selin (İK)' },
        { text: 'Kurum kültürü testi işte 🙂', reaction: 'Kültürümüz buysa… 😶', reactionSender: 'Selin (İK)' },
      ],
      followUps: [
        { after: 6, sender: 'Ayşe', text: 'Ben dün akşam kendim çözdüm. 58 aldım. Beni de işe almazdınız yani 🙃' },
        { after: 14, sender: 'Emre', text: 'Ben 91 aldım 😎 Test ne derse o.' },
      ],
    },
    {
      at: 420, thread: 'office', sender: 'Selin (İK)', text: 'Hakan Bey\'den duyuru: sistem arızası ve mülakat listesi yüzünden bugün hep beraber 19:00\'a kadar kalıyoruz. Akşam yemeği şirketten 🍕',
      replies: [
        { text: 'Anlaşıldı, ben de kalıyorum.', reaction: 'Hep beraber bitiririz 💪', reactionSender: 'Ayşe' },
        { text: 'Evdekilere haber vereyim o zaman.', reaction: 'Ben de annemi aradım, "yine mi" dedi 😅', reactionSender: 'Ayşe' },
      ],
      followUps: [
        { after: 3, sender: 'Emre', text: 'En azından pizza var 🍕' },
        { after: 8, sender: 'Ayşe', text: 'Fazla mesai ücreti? 😅' },
        { after: 10, sender: 'Emre', text: 'Şirket zor durumda Ayşe, böyle günlerde omuz vermek lazım.' },
      ],
    },
    { at: 560, thread: 'office', sender: 'Emre', text: 'Pizzalar geldi, herkesin masasına bir kutu bıraktım 🍕', followUps: [{ after: 20, sender: 'Selin (İK)', text: 'Teşekkürler Emre, masada yiyorum, bir dosyam kaldı.' }] },
    {
      at: 630, thread: 'office', sender: 'Ayşe', text: 'Saat yediye geliyor. Kimde dosya kaldı?',
      replies: [
        { text: 'Bende bitti, çıkıyorum. İyi akşamlar.', reaction: 'İyi akşamlar, yarın mülakatta görüşürüz 👋', reactionSender: 'Selin (İK)' },
        { text: 'Birkaç tane kaldı, bitirip çıkacağım.', reaction: 'Kolay gelsin, ben de az sonra çıkıyorum.', reactionSender: 'Ayşe' },
      ],
    },
    {
      at: 400, thread: 'office', sender: 'Ayşe', text: 'Hakan Bey bugün çok gergin, dikkatli olalım 😬',
      replies: [
        { text: 'Bu hafta herkes için zor geçiyor.', reaction: 'Dayanın, yarın cuma 💪', reactionSender: 'Ayşe' },
        { text: 'Bilgi için teşekkürler.', reaction: '🙂', reactionSender: 'Ayşe' },
      ],
      followUps: [{ after: 3, sender: 'Emre', text: 'Kapıyı üç kez çarptı, duydunuz mu 😬' }],
    },
  ],
];

/** 14:30, mutfakta çeyrek saat. */
export const BIRTHDAY_PARTY = { at: 390, minutes: 15 };
export const BIRTHDAY_YES = 'Ben de geliyorum.';

/** Salı: Ayşe, Emre'nin doğum günü için bir sürpriz hazırlar (Emre grupta yok). Gitmek çeyrek saate mal olur. */
export const BIRTHDAY: Ambient[] = [
  {
    at: 70, thread: 'birthday', sender: 'Ayşe', text: 'Selam herkese! Bugün Emre\'nin doğum günü 🎂 14:30\'da mutfakta sürpriz pasta yapıyoruz, sakın çaktırmayın 🤫 Kimler geliyor?',
    replies: [
      {
        text: BIRTHDAY_YES,
        reaction: 'Süper, 14:30 mutfakta 🙂',
        reactionSender: 'Ayşe',
        event: { ...BIRTHDAY_PARTY, text: '🎂 Mutfakta Emre\'ye sürpriz: pasta, alkış, iki fotoğraf. 15 dakika.' },
      },
      { text: 'Dosyalar yetişmeyecek, gelemeyeceğim. Emre\'ye benden de iyi dilekler.', reaction: 'İletiriz, sana da bir dilim ayırırız 🙂', reactionSender: 'Selin (İK)' },
    ],
    followUps: [
      { after: 5, sender: 'Selin (İK)', text: 'Ben geliyorum 🙋' },
      { after: 45, sender: 'Nurten (Muhasebe)', text: 'Ben de geleceğim, muhasebeden iki kişi daha gelir.' },
    ],
  },
  { at: 240, thread: 'birthday', sender: 'Selin (İK)', text: 'Hediyeyi aldım. Bir de doğum günü kartı var; pastaya gelince herkes kartın içine iki satır yazsın ✍️' },
  { at: 385, thread: 'birthday', sender: 'Ayşe', text: 'Emre mutfağa geliyor, herkes yerine! 🤫🎂' },
];

/**
 * Anneden gündelik hayat. Havuz oyun başına bir kez karıştırılır (store'daki `momOrder`) ve her
 * iş günü sıradaki ikisini alır; böylece günde iki kez yazar, hiçbir zaman aynı şeyi iki kez değil.
 */
export const MOM_POOL: { text: string; replies: QuickReply[] }[] = [
  {
    text: 'Yavrum işler nasıl gidiyor? Yemeğini ye, aç kalma',
    replies: [
      { text: 'İyi geçiyor anne, merak etme', reaction: 'Aferin yavruma Akşam ararım.' },
      { text: 'Çok yoğunum anne, sonra ararım.', reaction: 'Tamam yavrum, kendini yorma. Öptüm.' },
    ],
  },
  {
    text: 'Akşam hava soğuyacakmış, hırkanı al',
    replies: [
      { text: 'Aldım anne', reaction: 'Aferin. Bir de atkı al bence' },
      { text: 'Anne ofisteyim, hırka ne alaka', reaction: 'Ben söyleyeyim de. Hasta olursan bana gelme' },
    ],
  },
  {
    text: 'Baban selam söylüyor. Hafta sonu gelir misin?',
    replies: [
      { text: 'Gelirim anne, sarma yap', reaction: 'Yaparım tabii! Baban çok sevindi' },
      { text: 'Bu hafta zor anne, yoruldum.', reaction: 'Olsun yavrum, dinlen. Seni seviyoruz' },
    ],
  },
  {
    text: 'Akşam trafik çok kötüymüş, eve dikkatli dön',
    replies: [
      { text: 'Dikkat ederim anne, merak etme.', reaction: 'Eve gidince mesaj at' },
      { text: 'Bugün geç çıkacağım galiba.', reaction: 'Aman yavrum, taksiye bin. Parası benden' },
    ],
  },
  {
    text: 'Kargon geldi, kapıcı aldı',
    replies: [
      { text: 'Sağ ol anne', reaction: 'Rica ederim, akşam uğra al.' },
      { text: 'Ne kargosu?', reaction: 'Bilmiyorum, kutu kocaman. Yine ne aldın?', followUp: [
        { text: 'Kitap sipariş etmiştim, unutmuşum.', reaction: 'Kitapsa iyi. Akşam gel al' },
        { text: 'Hiçbir şey almadım, açma sakın.', reaction: 'Tamam açmam. Kapıcıya da sordururum' },
      ] },
    ],
  },
  {
    text: 'Anahtarını evde unutmuşsun Akşam ben açarım kapıyı.',
    replies: [
      { text: 'Eyvah, sağ ol anne', reaction: 'Sen olmasan… neyse, akşam görüşürüz' },
      { text: 'Yedek anahtar var bende.', reaction: 'Hangi yedek? O da burada' },
    ],
  },
  {
    text: 'Faturayı yatırdın mı? Son gün bugün',
    replies: [
      { text: 'Yatırdım anne.', reaction: 'Aferin' },
      { text: 'Unuttum, şimdi yatırıyorum!', reaction: 'Bak gördün mü, iyi ki yazdım.' },
    ],
  },
  {
    text: 'Teyzen aradı, kızının CV\'sini sana gönderecekmiş',
    replies: [
      { text: 'Anne işe torpil yok', reaction: 'Tamam tamam, ben bir şey demedim' },
      { text: 'Gönderirse bakarım.', reaction: 'Sen bilirsin yavrum, ben söyledim sadece.' },
    ],
  },
  {
    text: 'Öğlen ne yedin? Fotoğraf at bakayım',
    replies: [
      { text: 'Tabldot anne, kuru fasulye', reaction: 'Aferin, iyi beslen. Ekmeği az ye.' },
      { text: 'Vakit olmadı yemeye.', reaction: 'Olmaz öyle! Hemen bir şey ye' },
    ],
  },
  {
    text: 'Powerbank\'ini unutmuşsun, şarjına dikkat et',
    replies: [{ text: 'Sağ ol, ofiste şarj ederim.', reaction: 'Tamam, telefonun kapanmasın, merak ederim.' }],
  },
  {
    text: 'Bankadan sana bir mektup geldi, açmadım. Akşam bakarsın',
    replies: [
      { text: 'Tamam anne, bakarım.', reaction: 'Masanın üstüne koydum.' },
      { text: 'KYK\'dan olabilir, aç bakalım.', reaction: 'Açtım: "taksit hatırlatması" yazıyor. Tarih gelecek ay.' },
    ],
  },
];

/*
 * Ekip, Hakan Bey'in ricalarında hangi yöne gittiğini fark eder; kimse bunu yüksek sesle söylemez.
 * Uyduysan: Hakan Bey birden sana sıcak davranır, Ayşe biraz resmîleşir. Direndiysen: odasının
 * geç saatteki ışığı ve sessiz bir kahve teklifi.
 */
export const TEAM_COMPLIED: Ambient[] = [
  {
    at: 130, thread: 'office', sender: 'Ayşe', text: 'Hakan Bey bu sabah çok keyifli, koridorda bana bile günaydın dedi 😄 Seninle aranız iyi galiba?',
    replies: [
      { text: 'Bilmem, işimi yapıyorum.', reaction: 'Tabii tabii 🙂', reactionSender: 'Ayşe' },
      { text: 'Nereden çıktı bu?', reaction: 'Hiç, öyle dikkatimi çekti. Kolay gelsin.', reactionSender: 'Ayşe' },
    ],
    followUps: [
      { after: 3, sender: 'Emre', text: 'Bana da gülümsedi, korktum 😅' },
      { after: 20, sender: 'Emre', text: 'Hakan Bey ne yapıyorsa şirket için yapıyor bence.' },
    ],
  },
  {
    at: 125, thread: 'office', sender: 'Ayşe', text: 'Mülakat listesini gördüm bu arada. Bazı isimler… tanıdık geldi 🙂',
    replies: [
      { text: 'Hepsi dosyasıyla girdi.', reaction: 'Eminim öyledir 🙂', reactionSender: 'Ayşe' },
      { text: 'Bazen öyle oluyor.', reaction: 'Biliyorum. Ben bir şey demedim zaten.', reactionSender: 'Ayşe' },
    ],
    followUps: [
      { after: 3, sender: 'Emre', text: 'Hangi isimler? 👀' },
      { after: 12, sender: 'Selin (İK)', text: 'Burada konuşmayalım bence 🙂' },
    ],
  },
  {
    at: 120, thread: 'office', sender: 'Emre', text: 'Öğlen yemekhanede Ayşe\'yle aynı masaya oturacağız. Sen yoğunsundur herhalde, değil mi? 🙂',
    replies: [
      { text: 'Yok, ben de gelirim.', reaction: 'Aa… tamam, tabii 🙂 Bir sandalye daha çekeriz.', reactionSender: 'Ayşe' },
      { text: 'Evet, bugün yoğunum.', reaction: 'Tahmin etmiştik 🙂', reactionSender: 'Emre' },
    ],
    followUps: [{ after: 15, sender: 'Selin (İK)', text: 'Ben de gelirim, 12:00\'de yemekhanede.' }],
  },
];

export const TEAM_DEFIED: Ambient[] = [
  {
    at: 130, thread: 'office', sender: 'Emre', text: 'Dün akşam Hakan Bey\'in odasının ışığı geç saate kadar yanıyordu. Hayırdır? 👀',
    replies: [
      { text: 'Bilmiyorum.', reaction: 'Bir şey olursa buradayız, bilmiş ol ☕', reactionSender: 'Ayşe' },
      { text: 'Benimle ilgili olabilir.', reaction: 'Hmm. Öğlen kahve? Benden 🙂', reactionSender: 'Ayşe' },
    ],
    followUps: [
      { after: 4, sender: 'Selin (İK)', text: 'Bütçe raporu hazırlıyormuş diye duydum.' },
      { after: 30, sender: 'Emre', text: 'Yöneticiler de zor durumda, holding baskı yapıyor. Kimse kötü niyetli değil bence.' },
    ],
  },
  {
    at: 125, thread: 'office', sender: 'Ayşe', text: 'Bu sabah Hakan Bey senin masanın önünden iki kez geçti, hiç durmadan 😬 Her şey yolunda mı?',
    replies: [
      { text: 'Yolunda, merak etme.', reaction: 'Tamam. Ama öğlen yemeğe bizimle gel, tek başına oturma 🙂', reactionSender: 'Ayşe' },
      { text: 'Pek sayılmaz.', reaction: 'Anladım. Bir şey demene gerek yok. Kahven benden ☕', reactionSender: 'Ayşe' },
    ],
    followUps: [{ after: 8, sender: 'Emre', text: 'Biz buradayız, bilmiş ol 💪' }],
  },
  {
    at: 120, thread: 'office', sender: 'Selin (İK)', text: 'Bu arada Hakan Bey sabah toplantıda "bazı arkadaşlar süreci yavaşlatıyor" dedi. İsim vermedi 🙂',
    replies: [
      { text: 'Anlaşıldı.', reaction: 'Ben sadece duyduğumu söylüyorum. Dikkat et yeter 🤫', reactionSender: 'Selin (İK)' },
      { text: 'Yavaşlatan süreç değil, soru sormak.', reaction: 'Ben de öyle düşünüyorum aslında. Ama bunu ben demedim 🙂', reactionSender: 'Ayşe' },
    ],
    followUps: [{ after: 5, sender: 'Emre', text: 'Kim acaba 🤔' }],
  },
];

/** 17:00 geçip hâlâ ofisteyken annen: bir kez hemen ardından, bir kez daha sonra. */
export const OVERTIME_MOM: { after: number; text: string; replies: QuickReply[] }[][] = [
  [
    {
      after: 15,
      text: 'Yavrum saat beşi geçti, çıktın mı? İlk gün nasıl geçti, anlat bakalım',
      replies: [
        { text: 'Dosyalar bitmedi anne, biraz kalacağım.', reaction: 'İlk günden mi? Aman yavrum, kendini paralama. Yemeğin ocakta.' },
        { text: 'Az kaldı, çıkınca ararım.', reaction: 'Tamam, yolda mesaj at' },
      ],
    },
    {
      after: 95,
      text: 'Hâlâ ofiste misin? Baban soruyor: "Bu kadar geç kalınca parasını veriyorlar mı?"',
      replies: [
        { text: 'Vermiyorlar anne. Dosyaları bitirmem lazım.', reaction: 'Olmaz ki böyle… Neyse, dikkatli gel. Kapıyı kilitlemiyorum.' },
        { text: 'Veriyorlar anne, merak etmeyin.', reaction: 'İyi bari. Yine de çok geç kalma.' },
      ],
    },
  ],
  [
    {
      after: 15,
      text: 'Çıktın mı işten? Köprü yine kilitmiş diyorlar, seni yemeğe bekleyelim mi?',
      replies: [
        { text: 'Beklemeyin anne, geç çıkacağım.', reaction: 'Peki. Tabağını fırına koydum, ısıtırsın.' },
        { text: 'Birazdan çıkıyorum.', reaction: 'Tamam, sofrayı kurmuyorum o zaman, gelince kurarız' },
      ],
    },
    {
      after: 100,
      text: 'Saat altıyı geçti yavrum. Her gün böyle mi olacak?',
      replies: [
        { text: 'Bu hafta yoğun anne, geçecek.', reaction: 'İnşallah. Sağlığın her şeyden önemli, unutma.' },
        { text: 'Bilmiyorum anne.', reaction: 'Deneme süresi bitince konuşursun bence. Gel hadi.' },
      ],
    },
  ],
  [
    {
      after: 15,
      text: 'Yağmur hiç dinmedi. Hâlâ işte misin? Servisi kaçırma sakın',
      replies: [
        { text: 'Servis gitti anne, dosyalar bitmedi.', reaction: 'Eyvah… Dönüşte taksiye bin, parasını ben veririm.' },
        { text: 'Kaçırmam, merak etme.', reaction: 'Tamam yavrum. Şemsiyen yanında mı?', followUp: [
          { text: 'Yanımda anne.', reaction: 'Aferin. Islanma' },
          { text: 'Unuttum, ofistekinden alırım.', reaction: 'Al mutlaka, hasta olma sonra' },
        ] },
      ],
    },
    {
      after: 105,
      text: 'Kardeşin de sordu, "hâlâ işte mi?" diye. Ne diyeyim?',
      replies: [
        { text: 'Birazdan çıkıyorum de.', reaction: 'Tamam. O da seni bekliyor, konuşacakmış.' },
        { text: 'İşteyim de, merak etmesin.', reaction: 'Peki. Sen de kendini bu kadar yorma.' },
      ],
    },
  ],
  [
    {
      after: 15,
      text: 'Yollar buz tutmuş, köprüde araçlar kaymış diyor haberler. Çıkabildin mi?',
      replies: [
        { text: 'Daha çıkamadım anne, dosyalar var.', reaction: 'Karda gece yolculuğu… Ne olur dikkat et. Çıkınca yaz.' },
        { text: 'Birazdan çıkarım, merak etme.', reaction: 'Merak etmemek elimde değil ki. Yaz ama.' },
      ],
    },
    {
      after: 110,
      text: 'Çorbanı ısıttım, soğudu. Yine ısıttım',
      replies: [
        { text: 'Geliyorum anne', reaction: 'Gel yavrum. Bir kere daha ısıtırım.' },
        { text: 'Kusura bakma anne.', reaction: 'Senin ne kusurun var? Gel hadi.' },
      ],
    },
  ],
];
