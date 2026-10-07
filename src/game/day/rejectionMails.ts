/*
 * Her günün sonu: geri çevirdiğin insanlara söylenir ya da söylenmez. Portal, kişi kişi neyin
 * gideceğini seçmeden günü kapatmaz. Sistemin elediği yüzlercesi otomatik cevabını çoktan aldı;
 * bunlar bir insanın okuduklarıdır.
 */
import { candidateOf } from '../data/candidates';
import { candidateDetails } from '../data/candidateDetails';
import type { Mail } from './mail';
import { PLAYER } from '../lib/player';

export type RejectTemplate = 'standard' | 'personal' | 'pool' | 'none';

export const TEMPLATES: { id: RejectTemplate; label: string; hint: string }[] = [
  { id: 'standard', label: 'Standart ret', hint: 'Hukukun onayladığı metin' },
  { id: 'personal', label: 'Kişisel geri bildirim', hint: 'Gerçek sebep · 2 dk' },
  { id: 'pool', label: '"Havuzda tutacağız"', hint: 'Havuz kimsenin açmadığı bir klasör' },
  { id: 'none', label: 'Gönderme', hint: 'Sessiz ret' },
];

/** Her şablonun gönderilmesinin sürdüğü dakika. */
export const TEMPLATE_MINUTES: Record<RejectTemplate, number> = { standard: 0.5, personal: 2, pool: 0.5, none: 0 };

const REASON: Record<string, string> = {
  experience: 'Deneyim süreniz ilandaki beklentinin altında kaldı; bu, yetkinliğinizle ilgili bir yargı değil.',
  skills: 'İlandaki teknik becerilerle eşleşme sınırlı kaldı; özellikle backend tarafında daha fazla deneyim arıyoruz.',
  salary: 'Maaş beklentiniz bu pozisyon için ayrılan bütçenin üzerinde kaldı.',
  motivation: 'Başvurunuzdaki motivasyon metni pozisyonun gerektirdiği işlerle yeterince örtüşmedi.',
  questions: 'Şirket sorularına verdiğiniz cevaplar pozisyonun beklentileriyle örtüşmedi.',
};

export function mailFor(id: string, template: RejectTemplate): { subject: string; body: string } | null {
  const c = candidateOf(id);
  const first = c.name.split(' ')[0];
  const strong = candidateDetails[id]?.highlights.find((h) => !h.startsWith('Öneri'));
  switch (template) {
    case 'standard':
      return {
        subject: 'Başvurunuz hakkında',
        body: `Sayın ${c.name},\n\nTavrinsa Labs'e gösterdiğiniz ilgi için teşekkür ederiz. Değerlendirme sonucunda başvurunuzla ilgili sürece devam edemiyoruz.\n\nKariyerinizde başarılar dileriz.\nTavrinsa Labs İK`,
      };
    case 'personal':
      return {
        subject: 'Başvurunuz hakkında — kısa bir geri bildirim',
        body: `Merhaba ${first},\n\nDosyanızı okudum ve kısa da olsa açık bir cevap vermek istedim. ${REASON[c.flaggedField] ?? REASON.experience}${strong ? `\n\nDosyanızda özellikle "${strong}" kısmı güçlüydü; bunu başvurularınızda daha görünür yapın.` : ''}\n\nBaşarılar dilerim.\nTavrinsa Labs İK`,
      };
    case 'pool':
      return {
        subject: 'Başvurunuz hakkında',
        body: `Sayın ${c.name},\n\nBaşvurunuz için teşekkür ederiz. Şu an için sürece devam edemiyoruz; ancak profilinizi gelecekteki pozisyonlar için aday havuzumuzda tutacağız.\n\nİlginiz için teşekkürler.\nTavrinsa Labs İK`,
      };
    case 'none':
      return null;
  }
}

const TR: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', İ: 'i', Ç: 'c', Ğ: 'g', Ö: 'o', Ş: 's', Ü: 'u' };
/** Bir aday için akla yatkın kişisel bir adres. */
export const addressOf = (id: string) =>
  `${candidateOf(id).name
    .split(' ')
    .map((p) => [...p].map((ch) => TR[ch] ?? ch).join('').toLowerCase())
    .join('.')}@eposta.test`;

const hash = (id: string) => [...id].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) % 9973, 11);

/** 17:00'ye kadar "Giden Kutusu"nda bekliyor. */
export function outboxMails(choices: Record<string, RejectTemplate>, day: number, at: number): Mail[] {
  return Object.entries(choices).flatMap(([id, t]) => {
    const mail = mailFor(id, t);
    if (!mail) return [];
    return [{ id: `outbox-${day}-${id}`, day, at, folder: 'outbox' as const, to: candidateOf(id).name, from: 'Sen', address: addressOf(id), subject: mail.subject, body: mail.body }];
  });
}

/** "Gönderilenler"e düşen kopyalar. */
export function sentMails(choices: Record<string, RejectTemplate>, day: number, at: number): Mail[] {
  return Object.entries(choices).flatMap(([id, t], i) => {
    const mail = mailFor(id, t);
    if (!mail) return [];
    return [{ id: `sent-${day}-${id}`, day, at: at + i * 0.2, folder: 'sent' as const, to: candidateOf(id).name, from: 'Sen', address: addressOf(id), subject: mail.subject, body: mail.body }];
  });
}

/*
 * Her cevap o kişinin kendisine ait: bir ses (resmîden acıya altı tane) ve kendi dosyasından
 * ayrıntılar: son işi, en çok gurur duyduğu şey, ne zamandır bu işi yaptığı.
 */
interface Who {
  first: string;
  full: string;
  job: string;
  proud: string;
  exp: string;
  city: string;
}

type Voice = Record<RejectTemplate, (w: Who) => { subject?: string; body: string }>;

const VOICES: Voice[] = [
  // resmî, dikkatli
  {
    personal: (w) => ({ body: `Sayın İnsan Kaynakları Ekibi,\n\nGeri bildiriminiz için teşekkür ederim. ${w.job} olarak geçirdiğim süre boyunca bu kadar açık bir değerlendirme almamıştım. Belirttiğiniz noktayı önümüzdeki dönemde geliştirmeyi planlıyorum.\n\nSaygılarımla,\n${w.full}` }),
    standard: (w) => ({ body: `Sayın Yetkili,\n\nBilgilendirmeniz için teşekkür ederim. ${w.exp} deneyimimin hangi açıdan yetersiz bulunduğunu paylaşabilirseniz, bir sonraki başvurumda daha doğru bir yol izleyebilirim.\n\nSaygılarımla,\n${w.full}` }),
    pool: (w) => ({ body: `Sayın Yetkili,\n\nProfilimi havuzda tutmanız için teşekkür ederim. Uygun bir pozisyon açıldığında tarafıma bilgi verilmesini rica ederim; ${w.city} içinde her lokasyona ulaşım sağlayabilirim.\n\nSaygılarımla,\n${w.full}` }),
    none: (w) => ({ subject: 'Başvurumun durumu hakkında', body: `Sayın Yetkili,\n\nYazılım Geliştirici pozisyonuna yaptığım başvuru portalda hâlâ "değerlendiriliyor" olarak görünmektedir. Sürecin hangi aşamada olduğunu öğrenebilir miyim?\n\nSaygılarımla,\n${w.full}` }),
  },
  // kısa ve öz
  {
    personal: (w) => ({ body: `Merhaba,\n\nAçık yazdığınız için sağ olun. ${w.job} deneyimimi bu gözle yeniden toparlayacağım.\n\n${w.first}` }),
    standard: (w) => ({ body: `Merhaba,\n\n${w.exp} deneyimle hangi kriterde elendiğimi söyleyebilir misiniz? Tek cümle yeterli.\n\n${w.first}` }),
    pool: (w) => ({ body: `Merhaba,\n\nHavuz ne kadar süre geçerli? ${w.city} dışındaki ofisleriniz için de değerlendirilir miyim?\n\n${w.first}` }),
    none: (w) => ({ subject: 'Başvuru durumu?', body: `Merhaba,\n\n${w.job} deneyimiyle yaptığım başvuru hakkında bir gelişme var mı?\n\n${w.first}` }),
  },
  // duygusal, dürüst
  {
    personal: (w) => ({ body: `Merhaba,\n\nE-postanızı okurken biraz duygulandım açıkçası. Aylardır başvurularıma ya hiç dönüş gelmiyor ya da aynı kalıp cümle geliyor. "${w.proud}" kısmını fark etmeniz bana iyi geldi. Pes etmeyeceğim.\n\nTeşekkürler,\n${w.first}` }),
    standard: (w) => ({ body: `Merhaba,\n\nBu dönemde çok başvuru yaptım ve çoğundan bu cümleyi aldım. ${w.job} deneyimimle nerede eksik kaldığımı bilmek bu kadar zor olmamalı diye düşünüyorum. Yine de dönüş yaptığınız için teşekkür ederim.\n\n${w.first}` }),
    pool: (w) => ({ body: `Merhaba,\n\nHavuzda tutacağınızı duymak umut verdi, gerçekten. Bir gün aranırsam, ${w.proud.toLocaleLowerCase('tr')} gibi işleri sizin için de yapmayı çok isterim.\n\n${w.first}` }),
    none: (w) => ({ subject: 'Bir bilgi rica ediyorum', body: `Merhaba,\n\nBaşvurumdan beri her sabah ilk iş portala bakıyorum; ${w.job} deneyimimle bir cevap almayı umuyordum. Olumsuz da olsa bir cevap almak beklemekten iyi olurdu. Rica etsem kısa bir bilgi verebilir misiniz?\n\n${w.first}` }),
  },
  // hafif, biraz mizahlı
  {
    personal: (w) => ({ body: `Merhaba,\n\nİlk kez bir ret e-postası okurken "haklı" dedim, bu da bir başarı sayılır 🙂 Önerinizi dikkate alıp bir dahaki sefere daha güçlü geleceğim.\n\nKolay gelsin,\n${w.first}` }),
    standard: (w) => ({ body: `Merhaba,\n\nBu e-postanın metnini artık ezbere biliyorum 🙂 Şaka bir yana, ${w.exp} deneyimi olan birine ne eksik geldi, merak ediyorum.\n\nİyi çalışmalar,\n${w.first}` }),
    pool: (w) => ({ body: `Merhaba,\n\nHavuzda yüzme bilen biri olarak beklemedeyim 🙂 ${w.job} deneyimim de yanımda; bir pozisyon açılırsa haberim olur umarım.\n\n${w.first}` }),
    none: (w) => ({ subject: 'Hâlâ buradayım 🙂', body: `Merhaba,\n\nBaşvurum "değerlendiriliyor" durumunda kaldı; ben de o arada biraz daha değerlendirildim sanki 🙂 Bir haber verebilirseniz sevinirim.\n\n${w.first}` }),
  },
  // kırgın
  {
    personal: (w) => ({ body: `Merhaba,\n\nGeri bildirim için teşekkürler, ama katılmıyorum. ${w.job} olarak yaptıklarım bu değerlendirmeye sığmıyor. Yine de bir insanın dosyama baktığını bilmek önemli.\n\n${w.first}` }),
    standard: (w) => ({ body: `Merhaba,\n\nDosyamı bir insanın okuyup okumadığını merak ediyorum. "${w.proud}" yazan bir CV bu cümleyle mi cevaplanır?\n\n${w.full}` }),
    pool: (w) => ({ body: `Merhaba,\n\n"Havuz" cümlesini daha önce de duydum. ${w.exp} deneyimle kaç havuzda beklediğimi saymayı bıraktım. Umarım bu sefer yanılırım.\n\n${w.first}` }),
    none: (w) => ({ subject: 'Cevap alabilecek miyim?', body: `Merhaba,\n\nBir haftadır hiçbir dönüş yok. ${w.exp} emek verdiğim bir mesleğe başvuran insanlara en azından bir "hayır" borçlusunuz bence.\n\n${w.full}` }),
  },
  // pratik, sonraki adımlar
  {
    personal: (w) => ({ body: `Merhaba,\n\nGeri bildiriminiz çok faydalı oldu, teşekkürler. Bir sonraki ilanınızda tekrar başvurursam önceki notlarım dosyamda kalıyor mu? Önerinize göre CV'mi güncelleyip göndermek isterim.\n\n${w.full}` }),
    standard: (w) => ({ body: `Merhaba,\n\nBilgilendirme için teşekkürler. Şirketinizde ileride junior ya da orta seviye başka pozisyonlar açılacak mı? ${w.city} dışında hibrit çalışmaya da açığım.\n\n${w.full}` }),
    pool: (w) => ({ body: `Merhaba,\n\nTeşekkürler. Havuzda tutulan profiller hangi sıklıkla gözden geçiriliyor? Güncel CV'mi ve portfolyo bağlantımı eklememi ister misiniz?\n\n${w.full}` }),
    none: (w) => ({ subject: 'Başvuru takibi', body: `Merhaba,\n\nBaşvurumun hangi aşamada olduğunu ve tahmini bir karar tarihi olup olmadığını öğrenebilir miyim? Bu arada başka süreçlerim de ilerliyor.\n\n${w.full}` }),
  },
];

function whoIs(id: string): Who {
  const c = candidateOf(id);
  const d = candidateDetails[id];
  const last = d?.workHistory.find((w) => w.title && w.title !== '—');
  return {
    first: c.name.split(' ')[0],
    full: c.name,
    job: last ? `${last.title} (${last.company})` : 'ilk işini arayan biri',
    proud: d?.highlights.find((h) => !h.startsWith('Öneri')) ?? 'Özgeçmişimdeki projeler',
    exp: c.experience.replace(/\s*\(.*\)$/, ''),
    city: d?.location.split(',')[0] ?? 'İstanbul',
  };
}

/**
 * Yaklaşık beşte ikisi cevap yazar: aynı öğleden sonra (geç saatse ertesi sabah). Hiçbir şey
 * almayanlar ertesi gün yazar ve birinin bakıp bakmadığını sorar.
 */
export function candidateReplies(choices: Record<string, RejectTemplate>, day: number, at: number): Mail[] {
  const entries = Object.entries(choices);
  // sabit bir pay cevap yazar; küçük günler ya hep ya hiç olmasın diye kararlı bir karıştırmayla seçilir
  const writers = new Set(
    [...entries]
      .sort(([a], [b]) => hash(a) - hash(b))
      .slice(0, Math.ceil(entries.length * 0.4))
      .map(([id]) => id),
  );
  // günün yazanlarının her biri farklı bir ses alır, böylece hiçbir iki cevap aynı tınlamaz
  const order = [...writers].sort();
  return entries.flatMap(([id, t]) => {
    const h = hash(id + t);
    if (!writers.has(id)) return [];
    const original = mailFor(id, t);
    const voice = VOICES[(order.indexOf(id) + day * 2) % VOICES.length][t](whoIs(id));
    const subject = voice.subject ?? `Re: ${original?.subject ?? 'Başvurunuz hakkında'}`;
    const body = voice.body;
    const nextMorning = t === 'none' || at + 30 > 520;
    const when = nextMorning ? { day: day + 1, at: 40 + (h % 120) } : { day, at: at + 25 + (h % 50) };
    // kişisel adreslerden gelen cevapların bir kısmı spam filtresine takılır
    const spam = h % 4 === 0;
    return [{ id: `reply-${day}-${id}`, ...when, reply: true, spam, from: candidateOf(id).name, address: addressOf(id), subject, body }];
  });
}

/*
 * Reddine cevap veren birine yazmak. Üç yol: kapıyı açık tutan sıcak bir teşekkür, sistemin
 * verdiği gerçek gerekçe (dürüst, ve şirket yapmamanı tercih eder) ya da her İK gelen kutusunun
 * gönderdiği cümle. Etkiler, her karar gibi, ekran dışında kalır.
 */
export type ReplyBack = 'warm' | 'reason' | 'formal';

export const REPLY_BACK: { kind: ReplyBack; label: string; effect: { performans: number; vicdan: number } }[] = [
  { kind: 'warm', label: 'Teşekkür et, kapıyı açık bırak', effect: { performans: 0, vicdan: 1 } },
  { kind: 'reason', label: 'Elenme gerekçesini açıkça söyle', effect: { performans: -1, vicdan: 2 } },
  { kind: 'formal', label: 'Kurumsal kısa yanıt', effect: { performans: 0, vicdan: 0 } },
];

/** Bir e-postanın kimin cevabı olduğu (`reply-<gün>-<aday>`) ya da başka her e-posta için null. */
export const replyAuthor = (mailId: string) => /^reply-\d+-(.+)$/.exec(mailId)?.[1] ?? null;

/** Bir adayın cevabına senin cevabın, "Gönderilenler"e düştüğü hâliyle. */
export function replyBackMail(reply: Mail, kind: ReplyBack, day: number, at: number): Mail | null {
  const id = replyAuthor(reply.id);
  if (!id) return null;
  const c = candidateOf(id);
  const first = c.name.split(' ')[0];
  const reason = /Gerekçe: ([^·]+)/.exec(c.systemLine)?.[1]?.trim();
  const body = {
    warm: `Merhaba ${first},\n\nYazdığınız için teşekkür ederim. Bu pozisyon için ilerleyemedik ama dosyanızı gerçekten okudum ve sizi gelecekte açılacak ilanlarımızda da görmek isterim. Yeni bir ilan açıldığında size haber vereceğim.\n\nİyi çalışmalar,\n${PLAYER.name}`,
    reason: `Merhaba ${first},\n\nSorunuza açık bir cevap vermek istiyorum: başvurunuz, ön eleme sistemimizin "${reason ?? 'otomatik değerlendirme'}" gerekçesiyle verdiği öneri doğrultusunda elendi. Bu gerekçenin sizin yetkinliğinizi tam yansıtmadığını düşünüyorsanız haklı olabilirsiniz; bunu ekibimizle de paylaşacağım.\n\nSaygılarımla,\n${PLAYER.name}`,
    formal: `Sayın ${c.name},\n\nİletiniz alınmıştır. Değerlendirme süreçlerimiz kurum politikalarımız doğrultusunda yürütülmektedir. İlginiz için teşekkür ederiz.\n\nTavrinsa Labs İnsan Kaynakları`,
  }[kind];
  return { id: `answer-${reply.id}`, day, at, folder: 'sent', to: c.name, from: 'Sen', address: addressOf(id), subject: reply.subject.startsWith('Re:') ? reply.subject : `Re: ${reply.subject}`, body };
}
