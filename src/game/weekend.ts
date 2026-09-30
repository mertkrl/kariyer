import { accusative } from './turkish';
/*
 * Friday night: Mom calls. The conversation is assembled from how your week actually went —
 * who you hired, how many CVs no human ever saw, whether you stood up to the manager, whether
 * you answered her texts — with a few moments where you choose what to say.
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
  /** Who you recommended, if the panel went another way. */
  recommendedName?: string | null;
  /** The hire is the neighbour's son. */
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
  bills: Partial<Record<'fatura' | 'kart' | 'yurt', 'paid' | 'skipped'>>;
  rentPaid: boolean;
}

const mom = (text: string): CallStep => ({ kind: 'line', line: { who: 'mom', text } });
const me = (text: string): CallStep => ({ kind: 'line', line: { who: 'me', text } });
const choose = (...choices: CallChoice[]): CallStep => ({ kind: 'choice', choices });

export function buildCall(w: WeekSummary): CallStep[] {
  const steps: CallStep[] = [
    mom('Alo yavrum! Teyzendeyim, sesini duyayım dedim. Hafta bitti mi sonunda?'),
    choose(
      { label: 'Bitti anne… çok yorucuydu', reply: 'Canım benim, sesinden belli. Bu hafta sonu bir güzel dinlen.' },
      { label: 'Bitti ama kafam hâlâ işte', reply: 'Eve iş getirme yavrum, dert de getirme. Anlat bakalım, ne oldu?' },
      { label: 'İyiyim anne, sen nasılsın?', reply: 'Ben iyiyim, beni boş ver. Asıl sen nasılsın?' },
    ),
  ];

  // a conversation, not a monologue: she says one thing, you answer, she answers that
  if (w.momMessages > 0) {
    if (w.momAnswered >= w.momMessages) {
      steps.push(mom('Bu hafta mesajlarımın hepsine cevap verdin, o kadar işin arasında.'));
      steps.push(
        choose(
          { label: 'Sen yazınca iyi geliyor anne', reply: 'Ben de yazmaya devam ederim o zaman.' },
          { label: 'Bazen ancak bir kelime yazabildim', reply: 'Bir kelime de yeter yavrum. Sesini duymuş gibi oluyorum.' },
        ),
      );
    } else {
      steps.push(mom(w.momAnswered === 0 ? 'Mesajlarıma hiç cevap vermedin bu hafta, merak ettim.' : 'Mesajlarımın bazılarına cevap veremedin, merak ettim biraz.'));
      steps.push(
        choose(
          { label: 'Kusura bakma anne, çok yoğundu', reply: 'Biliyorum yavrum, kızmıyorum. Sadece merak ediyorum.' },
          { label: 'Telefona bakacak halim yoktu', reply: 'Olsun. Bir "iyiyim" yazsan yeter bana.' },
        ),
      );
    }
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

  steps.push(mom('Kaç kişiye baktın bu hafta?'));
  steps.push(
    choose(
      { label: `${w.processed} CV'ye baktım`, reply: 'Maşallah. Hepsini okudun mu tek tek?' },
      { label: `${w.autoRejected.toLocaleString('tr-TR')} başvuruya kimse bakmadı bile`, reply: 'Vah vah… O kadar insan. Biri de şimdi telefon başında bekliyordur.' },
    ),
  );

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

  if (w.aiUses === 0 || w.aiUses >= 12) {
    steps.push(mom(w.aiUses === 0 ? 'Hani o bilgisayar seçiyordu insanları? Sen hepsine kendin mi baktın?' : 'O yapay zekâ dediğin şey her şeye karar veriyormuş, doğru mu?'));
    steps.push(
      choose(
        w.aiUses === 0
          ? { label: 'Evet, hepsini kendim okudum', reply: 'Aferin sana. Makine insanı ne bilir.' }
          : { label: 'Çoğunu o seçti, ben imzaladım', reply: 'İmza senin ama yavrum. Unutma.' },
        { label: 'Karışık anne, anlatması uzun', reply: 'Anlatırsın bir ara, çayla.' },
      ),
    );
  }

  if (w.refusals >= 3) {
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

  if (w.vicdan <= 35) {
    steps.push(mom('Sesin biraz buruk geliyor… İçine sinmeyen bir şey mi var?'));
    steps.push(
      choose(
        { label: 'Biraz var anne', reply: 'Söyle bana. Ya da söyleme, ama içinde tutma.' },
        { label: 'Yorgunluktan', reply: 'Peki… Ben yine de sorarım, bilesin.' },
      ),
    );
  }

  steps.push(mom('Eee, hafta sonu ne yapacaksın?'));
  steps.push(
    choose(
      { label: 'Pazar kahvaltıya geliyorum', reply: 'Oh ne güzel! Menemen yaparım, sucuklu', tag: 'breakfast' },
      { label: 'Sadece uyuyacağım', reply: 'Uyu yavrum uyu, hak ettin. Ama yemeğini de ye!', tag: 'sleep' },
      { label: 'Anne… iş değiştirmeyi düşünüyorum', reply: 'Ne karar verirsen arkandayım. Yeter ki mutlu ol', tag: 'quit' },
    ),
  );
  steps.push(mom('Hadi, seni tutmayayım. Öpüyorum çok çok'));
  return steps;
}
