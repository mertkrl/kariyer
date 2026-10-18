import { accusative } from '../lib/turkish';
import { leavesCompany, type OfferOutcome } from './offer';
/*
 * Cuma gecesi: annen arar. Konuşma haftanın gerçekte nasıl geçtiğinden kurulur: kimi işe aldığın,
 * kaç CV'ye hiçbir insanın bakmadığı, müdüre karşı durup durmadığın, mesajlarına cevap verip
 * vermediğin, 18:40'ta Hakan Bey'e ne dediğin; arada ne söyleyeceğini seçtiğin birkaç an var.
 * Sonuncusu haftanın evde nasıl bittiğidir (engine/ending.ts).
 */

export type CallLine = { who: 'mom' | 'me'; text: string };
export interface CallChoice {
  label: string;
  reply: string;
  tag?: string;
}
export type CallStep = { kind: 'line'; line: CallLine } | { kind: 'choice'; choices: CallChoice[] };

export interface WeekSummary {
  hiredName: string | null;
  /** Kurul başka yöne gittiyse kimi önerdiğin. */
  recommendedName?: string | null;
  /** İşe alınan, komşunun oğlu. */
  hiredNeighbour?: boolean;
  processed: number;
  autoRejected: number;
  refusals: number;
  complies: number;
  vicdan: number;
  performans: number;
  momMessages: number;
  momAnswered: number;
  aiUses: number;
  events: number;
  dmHonest: number;
  dmIgnored: number;
  /** 18:40'ta Hakan Bey'in teklifinden ne çıktığı (null: eski bir kayıt). */
  offer: OfferOutcome | null;
}

/** Kadro haberini nasıl duyduğu ve senin ne cevap verebileceğin. */
function offerNews(o: OfferOutcome): CallStep[] {
  switch (o) {
    case 'stay':
      return [
        me('Kadro bende anne. Pazartesi kalıcıyım.'),
        mom('Oh çok şükür! Deneme süresi bitti yani, değil mi? …Ayşe dediğin kız ne oldu peki?'),
        choose(
          { label: 'Onun süresi uzatılmadı', reply: 'Vah… Ama sen ne yapacaktın, kendi işini mi bırakacaktın?' },
          { label: 'Bilmiyorum anne, sormaya yüzüm olmadı', reply: 'Pazartesi bir çay ısmarla ona. Bir çay çok şey söyler.' },
        ),
      ];
    case 'stayReform':
      return [
        me('Kadro bende anne. Bir de şart koydum, kabul etti.'),
        mom('Şart mı koydun? Sen mi? Müdürüne?'),
        choose(
          { label: 'Mülakatlar herkese aynı olacak artık', reply: 'Aferin sana. Bizim zamanımızda kimse sormazdı bunu.' },
          { label: 'Küçük bir şey ama başlangıç', reply: 'Küçük şeyden başlar her şey yavrum.' },
        ),
      ];
    case 'stayAfterRefusal':
      return [
        me('Kadro bende. Bir şart koydum ama… geri aldım.'),
        mom('Geri mi aldın? Neydi şartın?'),
        choose(
          { label: 'Önemli değil anne', reply: 'Önemli değilse neden sesin böyle?' },
          { label: 'Bir gün yine soracağım', reply: 'Sor yavrum. Kapı bir kere kapanmakla kilitlenmez.' },
        ),
      ];
    case 'gaveToAyse':
      return [
        me("Kadroyu Ayşe'ye bıraktım anne."),
        mom('Bıraktın mı? …O kız iki yıl iş aradı demiştin, değil mi?'),
        choose(
          { label: 'Evet. Bir yerde durmak lazımdı', reply: 'Seninle gurur duyuyorum. Ama karnını doyuracağız, onu da düşüneceğiz.' },
          { label: 'Doğru mu yaptım bilmiyorum', reply: 'Doğruyu bilmek için bazen önce yapmak lazım.' },
        ),
      ];
    case 'quit':
      return [
        me('İstifa ediyorum anne. Pazartesi yazılı vereceğim.'),
        mom('…On bir ay sonra? Yavrum, emin misin?'),
        choose(
          { label: 'Eminim. O masada kalamazdım', reply: 'Tamam. Ben arkandayım. Bir yolunu buluruz.' },
          { label: 'Değilim. Ama dönmeyeceğim', reply: 'Emin olmadan da doğru yapılır bazen.' },
        ),
      ];
    case 'reformRefused':
      return [
        me('Kadroyu bir şartla istedim, vermediler. Ben de almadım.'),
        mom('Şart yüzünden mi? Ne şartıydı bu?'),
        choose(
          { label: 'İnsanlara adil davranılsın diye', reply: 'O zaman doğru yapmışsın. Gerisini konuşuruz.' },
          { label: 'Belki fazla ileri gittim', reply: 'İleri gitmek değil o yavrum, dik durmak.' },
        ),
      ];
    case 'notOffered':
      return [
        me('Deneme süremi uzatmadılar anne.'),
        mom('Ah yavrum… Ne dediler peki?'),
        choose(
          { label: '"Uyum sorunu" dediler', reply: 'Kime uyacaktın? Neye uyacaktın? Boş ver onları.' },
          { label: 'Rakamlar tutmadı dediler', reply: 'Rakam rakamdır. Sen insansın. Bulursun yenisini.' },
        ),
      ];
  }
}

const mom = (text: string): CallStep => ({ kind: 'line', line: { who: 'mom', text } });
const me = (text: string): CallStep => ({ kind: 'line', line: { who: 'me', text } });
const choose = (...choices: CallChoice[]): CallStep => ({ kind: 'choice', choices });

/** Şirketten ayrıldıysan Hakan Bey'in son sözü: annen sorar. */
function managerAfterLeaving(o: OfferOutcome): CallStep[] {
  const ask = o === 'quit' ? 'Hakan Bey ne dedi peki istifa ettiğini söyleyince?' : 'Müdürün ne dedi peki, öylece bıraktı mı seni?';
  return [
    mom(ask),
    choose(
      { label: '"Sana iyi bir referans yazarım" dedi', reply: 'Yazsın. Hak ettin. Ama sen kimsenin referansına muhtaç değilsin.' },
      { label: 'Bir şey demedi, ceketini alıp gitti', reply: 'Kapanan kapının arkasına bakılmaz yavrum. Önüne bak.' },
    ),
  ];
}

export function buildCall(w: WeekSummary): CallStep[] {
  const left = w.offer !== null && leavesCompany(w.offer);
  const steps: CallStep[] = [
    mom('Alo yavrum! Teyzendeyim, sesini duyayım dedim. Hafta bitti mi sonunda?'),
    choose(
      { label: 'Bitti anne… çok yorucuydu', reply: 'Canım benim, sesinden belli. Bu hafta sonu bir güzel dinlen.' },
      { label: 'Bitti ama kafam hâlâ işte', reply: 'Eve iş getirme yavrum, dert de getirme. Anlat bakalım, ne oldu?' },
      { label: 'İyiyim anne, sen nasılsın?', reply: 'Ben iyiyim, beni boş ver. Asıl sen nasılsın?' },
    ),
  ];

  // ayrılıyorsan haftanın asıl haberi bu: annen sesinden anlar, konuşma oradan başlar
  if (left && w.offer) {
    steps.push(mom('Sesin bir tuhaf geliyor… Bir şey mi oldu yavrum?'));
    steps.push(...offerNews(w.offer));
    steps.push(...managerAfterLeaving(w.offer));
  }

  steps.push(mom('Bu hafta birini işe alacaktın hani, ne oldu?'));
  if (w.hiredName && w.hiredNeighbour) {
    steps.push(me(w.recommendedName ? `Ben ${accusative(w.recommendedName)} önermiştim ama kurul Onur'u aldı.` : "Onur'u önerdim anne. Kurul da onu aldı."));
    steps.push(mom('Onur mu? Nermin Hanım\'ın Onur\'u! Kadın bayram eder şimdi. …Ama millet "komşusunu soktu" demesin?'));
    steps.push(
      choose(
        { label: 'Kararı kurul verdi anne', reply: 'Tamam, tamam. Ben de öyle söylerim o zaman.' },
        { label: 'Açıkçası ben de emin değilim', reply: 'İçine sinmiyorsa söyle yavrum. Susmak da bir şey değil.' },
      ),
    );
  } else if (w.hiredName) {
    steps.push(
      me(
        w.recommendedName
          ? `Ben ${accusative(w.recommendedName)} önermiştim ama kurul ${accusative(w.hiredName)} seçti.`
          : `${accusative(w.hiredName)} önerdim, kurul da onayladı.`,
      ),
    );
    steps.push(mom(w.recommendedName ? 'Senin dediğin olmadı yani. Üzüldün mü?' : 'Hayırlı olsun! İçin rahat mı peki?'));
    steps.push(
      choose(
        w.recommendedName
          ? { label: 'Biraz. Karar benim değildi', reply: 'Sen elinden geleni yapmışsın ya, ona bak.' }
          : { label: 'Rahat. Hak eden birini seçtik', reply: 'Ne güzel. Birinin bir hafta boyunca beklediği haberi sen vermişsin.' },
        { label: 'Bilmiyorum anne, düşünmem lazım', reply: 'Düşün yavrum. Acele etme.' },
      ),
    );
  } else {
    steps.push(me('Kimseyi alamadık anne…'));
    steps.push(mom('Olsun, nasipse olur. Sen üzülme.'));
  }

  if (w.offer && !left) {
    steps.push(mom('Bir de… deneme süren bugün bitiyordu, değil mi? Ne dediler?'));
    steps.push(...offerNews(w.offer));
  }

  if (w.dmHonest >= 2) {
    steps.push(mom('Reddettiğin insanlara tek tek cevap yazmışsın, öyle mi?'));
    steps.push(
      choose(
        { label: 'Birkaçına yazdım, gerçeği söyledim', reply: 'Kimse yazmaz o insanlara. Aferin sana.' },
        { label: 'Yazmamam gerekiyordu aslında', reply: 'Gerekiyor muydu, doğru muydu? İkisi aynı şey değil yavrum.' },
      ),
    );
  } else if (w.dmIgnored >= 2) {
    steps.push(mom('Sana yazan o gençlere cevap verdin mi bari?'));
    steps.push(
      choose(
        { label: 'Veremedim anne', reply: 'Bir satır bile olsa insana iyi gelir… Neyse.' },
        { label: 'Şirket izin vermiyor', reply: 'Şirket izin vermiyor, sen ne diyorsun?' },
      ),
    );
  }

  if (left) {
    // müdürü zaten konuştunuz; artık onun memnuniyeti sorulmaz
  } else if (w.refusals >= 3) {
    steps.push(mom('Müdürün hâlâ kızgın mı sana?'));
    steps.push(
      choose(
        { label: 'Kızsın, doğru bildiğimi yaptım', reply: 'Doğruyu söyleyeni dokuz köyden kovarlar, ama onuncu köyde baş tacı ederler.' },
        { label: 'Pazartesi gönlünü alırım herhalde', reply: 'Sen bilirsin yavrum. Ama kendini de ezdirme.' },
      ),
    );
  } else if (w.complies >= 3) {
    steps.push(mom('Müdürün memnun mu senden bari?'));
    steps.push(
      choose(
        { label: 'Memnun… ama ben memnun muyum bilmiyorum', reply: 'Önce sen huzurlu ol, gerisi gelir. Kimse için kendinden vazgeçme.' },
        { label: 'Çok memnun, terfi bile olabilir!', reply: 'Maşallah! Ama kendini de unutma, olur mu?' },
      ),
    );
  } else {
    steps.push(mom('Müdürün nasıl, iyi davranıyor mu?'));
    steps.push(
      choose(
        { label: 'İdare ediyoruz anne', reply: 'İdare etmek de bir hünerdir.' },
        { label: 'Zor biri ama anlıyorum onu da', reply: 'Herkesin bir derdi var yavrum.' },
      ),
    );
  }

  // söylediğin son şey, haftanın evde nasıl bittiğidir
  steps.push(mom('Eee, hafta sonu ne yapacaksın?'));
  steps.push(
    choose(
      { label: 'Pazar kahvaltıya geliyorum', reply: 'Oh ne güzel! Menemen yaparım, sucuklu', tag: 'breakfast' },
      { label: 'Sadece uyuyacağım', reply: 'Uyu yavrum uyu, hak ettin. Ama yemeğini de ye!', tag: 'sleep' },
      left
        ? { label: 'Yeni başvurular yapacağım. Bu sefer CV\'leri okuyan yerlere', reply: 'Öyle yerler vardır yavrum. Sen de onlardan biri olacaksın zaten', tag: 'search' }
        : { label: 'Anne… iş değiştirmeyi düşünüyorum', reply: 'Ne karar verirsen arkandayım. Yeter ki mutlu ol', tag: 'quit' },
    ),
  );
  steps.push(
    mom(
      w.offer === 'quit'
        ? 'Pazartesi o mektubu verirken beni ara, olur mu? Yalnız değilsin. Öpüyorum çok çok'
        : left
          ? 'Yeni bir kapı açılır yavrum, merak etme. Öpüyorum çok çok'
          : 'Hadi, seni tutmayayım. Öpüyorum çok çok',
    ),
  );
  return steps;
}
