/*
 * Hakan Bey'in, haftanın nasıl gittiğine bağlı sabit hat aramaları — değişiklik önerisi,
 * sabah değerlendirmesi, geri alınan davetler — ve Cuma kurulunun hesabı. Durumun saf
 * fonksiyonları; ne zaman çalacaklarına store karar verir.
 */
import type { Decision } from './types';
import type { Mail } from './mail';
import { NEPHEW_ID, candidateOf, candidates } from './data/candidates';
import { candidateDetails } from './data/candidateDetails';
import { REQUEST_CALL_PREFIX, deskCall, type DeskCall } from './desk';
import { managerReaction, managerTone, replyText, requestCallLines, type ManagerTone } from './manager';
import { referenceFor } from './references';
import { visitCall, LOBBY_PREFIX, VISIT_PREFIX } from './visits';
import type { Finalist, GameState, StoryState } from './storeTypes';
import { WEDNESDAY } from './weekdays';

/**
 * İtirafından sonra sadece onaylamak ya da itiraz etmek yerine bir düzeltme önerebilirsin.
 * Çoğunlukla hayır der: küçük değişikliği yalnızca güvendiği biri (iyi rakamlar, az ret)
 * geçirebilir, büyüğü daha fazlasını ister. Kendi tablosunun denetlenmesini istemek hiç işe yaramaz.
 */
export function reformCall(performans: number, refusals: number, day: number): DeskCall {
  const trust = performans >= 60 && refusals <= 2;
  const structured = trust;
  const blind = trust && performans >= 70;
  return {
    id: 'reform',
    day,
    at: 0,
    caller: 'Hakan Bey',
    line: 'İK Müdürü · dahili 210',
    lines: ['"Dinliyorum."'],
    choices: [
      {
        text: 'Yapılandırılmış mülakat: yarın her adaya aynı sorular, Ümit Bey\'le aynı puan kartı.',
        reply: structured
          ? '…Yarın deneyelim. Ümit de sever bunu. Listemdeki soruları da çıkar o zaman. Ama sonuç kötü çıkarsa bu senin fikrindi.'
          : '"Yapılandırılmış" mülakat mı? Yarın sabah mülakat var, form mu yetiştireceğiz? Başka bahara.',
        vicdan: structured ? 3 : 2,
        reform: { kind: 'structured', accepted: structured },
      },
      {
        text: 'Kör CV: ilk elemede isim, yaş, fotoğraf ve adres gizlensin.',
        reply: blind
          ? 'Holding "kapsayıcılık" diye sever bunu aslında. Bir sonraki ilanda deneriz. Ama benim fikrimmiş gibi sunacağım, bilesin.'
          : '"Kör CV" mi? Adayı tanımadan uyumu nasıl ölçeceğiz? Bu şirkette işler öyle yürümüyor.',
        vicdan: blind ? 3 : 2,
        reform: { kind: 'blind', accepted: blind },
      },
      {
        text: 'Sistemin skorlarını bir insan denetlesin: hangi kriter kimi eliyor, görelim.',
        reply: 'O tabloyu açarsak altında ilk ben kalırım. Hayır. Bu konuşma olmadı.',
        vicdan: 2,
        performans: -1,
        reform: { kind: 'audit', accepted: false },
      },
    ],
    minutes: 4,
    missed: { note: '' },
  };
}

/**
 * Ona karşı çıktığın günün ertesi sabahı: odası, kapı kapalı, alıntılanabilecek hiçbir şey
 * söylenmez. Dosyaların adını sayar, "ekip"ten söz eder ve — bu sürdüyse — bundan sonra her
 * reddin yazılı gerekçesini ister.
 */
export function reviewCall(defied: string[], tone: ManagerTone, justify: boolean, day: number): DeskCall {
  const names = defied.map((id) => candidates[id]?.name.split(' ')[0]).filter(Boolean).join(', ');
  return {
    id: 'review',
    day,
    at: 0,
    caller: 'Hakan Bey',
    line: 'İK Müdürü · dahili 210',
    lines: [
      'Hakan Kaya. Kısa bir değerlendirme yapmak istiyorum, telefonda halledelim.',
      `"Dünkü dosyalara baktım${names ? `: ${names}` : ''}. Kararlarınızı gerekçeleriyle birlikte değerlendirdim."`,
      tone >= 2
        ? '"Deneme sürecinizin nasıl ilerlediğini ikimiz de görüyoruz. Bu ekip bir bütün; herkes aynı yöne bakmak zorunda."'
        : '"Deneme sürecinde herkes kendi tarzını bulmaya çalışır, anlıyorum. Ama bu ekip bir bütün. Kararlarınızın ekiple uyumlu olmasını bekliyorum."',
      ...(justify ? ['"Bundan sonra her ret kararınıza kısa bir gerekçe notu ekleyin. Yazılı."'] : []),
    ],
    choices: [
      { text: 'Anlaşıldı Hakan Bey. Daha dikkatli olacağım.', reply: '"Güzel. Kolay gelsin."', performans: 1, vicdan: -1 },
      { text: 'Kararlarımın gerekçeleri dosyalarda yazılı. İsterseniz birlikte bakalım.', reply: '"…Gerek yok. Anlaşıldı." Kısa bir sessizlik; kalem sesi. Sonra hat kapanıyor.', performans: -1, vicdan: 1 },
    ],
    minutes: 25,
    missed: { note: '' },
  };
}

/** Pozisyonun bütçesi: şirketin ayda ödeyeceği en yüksek tutar. */
export const SALARY_CAP = 50000;

/** Bir adayın belirttiği aylık beklenti (TL) ya da rakam vermediyse null. */
export function salaryOf(id: string): number | null {
  const m = /(\d{1,3}(?:\.\d{3})+|\d{4,})\s*TL/.exec(candidates[id]?.salary ?? '');
  return m ? Number(m[1].replace(/\./g, '')) : null;
}

/**
 * Cuma kurulu. Ümit, bütçenin ödeyebileceği kişiler arasında en iyi cevap vereni destekler
 * (seninki onların en iyileri arasındaysa seninkini); Hakan Bey yeğeni odadaysa onu, yoksa sana
 * çağırmanı söylediği adayı, o da yoksa seni destekler. İki oy kazanır; üçü de ayrı düşerse
 * ekibin sahibi olan ekip lideri karar verir.
 *
 * Mülakattan: `agreed` kişi başına pazarlıkla indirilen (ya da korunan) maaş, inmediği yerde
 * null; `convinced` Ümit'i notlarınla kendi seçimine ikna ettiğin anlamına gelir.
 */
export interface PanelInput {
  agreed?: Record<string, number | null>;
  convinced?: boolean;
}

export function panelDecision(recommended: string, finalists: Finalist[], requests: { candidateId: string; want: Decision }[], input: PanelInput = {}) {
  const ids = finalists.map((f) => f.id);
  const fitOf = (id: string) => candidateDetails[id]?.hireFit ?? 0;
  const pay = (id: string) => (input.agreed && id in input.agreed ? (input.agreed[id] ?? salaryOf(id)) : salaryOf(id)) ?? 0;
  const affordable = (id: string) => pay(id) <= SALARY_CAP;
  const pool = ids.some(affordable) ? ids.filter(affordable) : ids;
  const best = Math.max(...pool.map(fitOf));
  const lead =
    (input.convinced && affordable(recommended)) || (pool.includes(recommended) && fitOf(recommended) === best)
      ? recommended
      : (pool.find((id) => fitOf(id) === best) ?? recommended);
  const his = ids.includes(NEPHEW_ID) ? NEPHEW_ID : (requests.find((r) => r.want === 'approve' && ids.includes(r.candidateId))?.candidateId ?? recommended);
  const hired = recommended === lead || recommended === his ? recommended : lead === his ? lead : lead;
  return { lead, his, hired, overBudget: !affordable(recommended) };
}

/** İki daveti geri alır; içlerinden biri ertesi sabah cevap yazar. */
export function revokeInvites(state: GameState, honest: boolean | null): Partial<GameState> {
  const ids = revokeTargets(state.finalists);
  if (ids.length < 2) return {};
  const first = candidates[ids[0]];
  const reply: Mail = {
    id: 'revoke-reply',
    day: state.currentDayIndex + 1,
    at: 0,
    from: first.name,
    address: `${first.name.split(' ')[0].toLocaleLowerCase('tr-TR')}@posta.com`,
    subject: 'Re: Mülakat davetiniz hk.',
    important: true,
    body: honest
      ? `Merhaba,\n\nDavetin geri alındığını ve nedenini açıkça yazdığınız için teşekkür ederim. Üzüldüm, saklamayacağım; iki gündür hazırlanıyordum. Ama en azından ne olduğunu biliyorum.\n\nİyi çalışmalar,\n${first.name}`
      : `Merhaba,\n\n"Sehven" mi? İki gündür mülakata hazırlanıyordum, izin bile ayarlamıştım. Bir hata olduysa bunu kimin yaptığını bilmek isterim.\n\n${first.name}`,
  };
  return {
    finalists: state.finalists.filter((f) => !ids.includes(f.id)),
    revoked: { ids, honest },
    extraMails: [...state.extraMails, reply],
  };
}

/*
 * Çarşamba öğleden sonra: "holding kadro planını revize etti". Zaten davet ettiğin iki kişiye
 * davetin sehven gönderildiğini söyleyen bir e-posta gidecek. Kendi seçtiklerinin en yaşlı
 * ikisini seçer. E-posta her durumda gider; senin karar verebileceğin, yalan söyleyip söylemeyeceği.
 */
/** Çarşamba öğleden sonra: davetlerinden ikisi geri alınacak. */
export const REVOKE_DAY = WEDNESDAY;
export const REVOKE_AT = 420;

export function revokeTargets(finalists: Finalist[]) {
  const mine = finalists.filter((f) => !f.byManager);
  if (mine.length < 3) return [];
  return [...mine].sort((a, b) => candidateOf(b.id).age - candidateOf(a.id).age).slice(0, 2).map((f) => f.id);
}

export function revokeCall(finalists: Finalist[], refusals: number, day: number): DeskCall {
  const ids = revokeTargets(finalists);
  const names = ids.map((id) => candidateOf(id).name).join(' ve ');
  return {
    id: 'revoke',
    day,
    at: 0,
    caller: 'Hakan Bey',
    line: 'İK Müdürü · dahili 210',
    lines: [
      managerTone(refusals) >= 2 ? 'Hakan Kaya. Kısa bir talimat.' : 'Merhaba, Hakan ben. Kısa bir konu.',
      `Dün davet gönderdiğiniz ${names}. Holding kadro planını revize etti; ikisinin daveti geri alınacak.`,
      'Bugün bir e-posta atın: "Davetiniz sehven gönderilmiştir." Gerekçe yazmayın, uzatmayın.',
    ],
    choices: [
      { text: 'Anlaşıldı, e-postayı hazırlıyorum.', reply: 'Teşekkür ederim. Bu tür şeyler olur.', revoke: 'draft' },
      { text: 'Gerekçesiz bir iptal adaylara haksızlık olur.', reply: 'Haksızlık olup olmadığına ben karar veririm. Gönderin.', vicdan: 1, performans: -1, revoke: 'draft' },
    ],
    minutes: 4,
    missed: { note: 'Hakan Bey aradı, açmadın. Davetleri geri alan e-postayı kendisi göndermiş: "sehven gönderilmiştir."', vicdan: -1 },
  };
}

/**
 * Perşembe 15:40, yalnızca Tolga'yı mülakata çağırdıysan: Kars'ta kar, havalimanı kapandı, Sarıkamış
 * yolu da. Cuma sabahı İstanbul'da olamayacak; görüşmeyi ekrandan yapmayı rica eder. Hakan Bey'in
 * kuralı "yüz yüze"; istisnayı isteyecek olan sensin. Hayır dersen ya da açmazsan listeden düşer.
 */
export const SNOW_CALL_ID = 'tolga-snow';
export const SNOW_CALL_AT = 460;

/** Yolu kapanan aday listeden düşer; final ekranı onun gelemediğini bilir. */
export function strandFinalist(state: Pick<GameState, 'finalists' | 'story'>, id: string): Partial<GameState> {
  return { finalists: state.finalists.filter((f) => f.id !== id), story: { ...state.story, stranded: [...(state.story.stranded ?? []), id] } };
}

export function tolgaSnowCall(day: number): DeskCall {
  return {
    id: SNOW_CALL_ID,
    day,
    at: 0,
    caller: 'Tolga Şen',
    line: 'Dış hat · Kars · santralden aktarıldı',
    stakes: 'Yarınki mülakat',
    lines: [
      'İyi günler, ben Tolga Şen. Kusura bakmayın, santrale üç kez anlatmam gerekti.',
      'Yarınki mülakat için akşam uçağına biletim vardı. Kar yüzünden Kars\'ta bütün seferler iptal; Sarıkamış yolu da kapandı, otobüs de kalkmıyor.',
      'Yarın sabah orada olamayacağım. Görüşmeyi ekrandan yapabilir miyiz? Kameram var, internet… köy kahvesinden de bağlanırım gerekirse.',
    ],
    choices: [
      {
        text: 'Ekrandan bağlanın. Hakan Bey\'e ben anlatırım.',
        reply: 'Gerçekten mi? …Çok sağ olun. Sabah dokuzda hazır olurum, kar dursa da durmasa da.',
        vicdan: 2,
        performans: -1,
      },
      {
        text: 'Mülakatlar yüz yüze, kural böyle. Gelemezseniz listeden düşmeniz gerekecek.',
        reply: '…Anlıyorum. Karı ben yağdırmadım ama… anlıyorum. İyi günler.',
        vicdan: -3,
        performans: 1,
        strand: 'tolga',
      },
    ],
    minutes: 4,
    missed: { note: 'Santral not bırakmış: "Kars\'tan Tolga Şen aradı, ulaşamadı. Yarın gelemeyecekmiş, kar." Listeden düşürüldü.', vicdan: -2 },
  };
}

/** Bir sabit hat kimliğinin arkasındaki arama: senaryolu bir arama ya da rica isteyen müdür. */
export function callFor(
  state: Pick<GameState, 'managerRequests' | 'managerStance' | 'currentDayIndex' | 'desk'> & { performans?: number; story?: StoryState; justifyRejects?: boolean; finalists?: Finalist[]; decisions?: Record<string, Decision> },
  id: string,
): DeskCall | undefined {
  if (id === 'revoke') return revokeCall(state.finalists ?? [], state.managerStance.refusals, state.currentDayIndex);
  if (id === SNOW_CALL_ID) return tolgaSnowCall(state.currentDayIndex);
  if (id === 'reform') return reformCall(state.performans ?? 50, state.managerStance.refusals, state.currentDayIndex);
  if (id === 'review') return reviewCall(state.story?.managerDay.defied ?? [], managerTone(state.managerStance.refusals), !!state.justifyRejects, state.currentDayIndex);
  if (id.startsWith('ref:')) {
    const cid = id.slice(4);
    const ref = referenceFor(cid);
    if (!ref) return undefined;
    return {
      id,
      day: state.currentDayIndex,
      at: 0,
      caller: ref.who,
      line: `Dış hat · ${candidateOf(cid).name} için referans`,
      lines: ref.lines,
      choices: [{ text: 'Bilgi için teşekkür ederim, iyi günler.', reply: 'Rica ederim, iyi çalışmalar.' }],
      minutes: 0,
      missed: { note: '' },
      outgoing: true,
    };
  }
  if (id.startsWith('thanks:')) {
    const c = candidates[id.slice(7)];
    const first = c.name.split(' ')[0];
    return {
      id,
      day: state.currentDayIndex,
      at: 0,
      caller: c.name,
      line: 'Dış hat · santralden aktarıldı',
      lines: [`Merhaba, ben ${first}. Kusura bakmayın, santrale yalvardım.`, 'Mülakata çağrıldığımı öğrendim. Aylardır ilk olumlu dönüş bu. Annem ağladı, inanır mısınız?', 'Sadece teşekkür etmek istedim. Biri CV\'mi gerçekten okumuş.'],
      choices: [
        { text: 'Cuma görüşürüz. Hazırlıklı gelin.', reply: 'Hazırlanıyorum, söz! Tekrar teşekkürler.', vicdan: 1 },
        { text: 'Rica ederim. Ama söz veremem, bilin.', reply: 'Biliyorum. Yine de… teşekkürler.', vicdan: 1 },
      ],
      minutes: 3,
      missed: { note: `${first} aramış, santral not bırakmış: "Sadece teşekkür etmek istedi."` },
    };
  }
  if (id.startsWith(VISIT_PREFIX) || id.startsWith(LOBBY_PREFIX)) return visitCall(id, state.currentDayIndex);
  if (!id.startsWith(REQUEST_CALL_PREFIX)) return deskCall(id);
  const r = state.managerRequests.find((x) => x.id === id.slice(REQUEST_CALL_PREFIX.length));
  if (!r) return undefined;
  const refusals = state.managerStance.refusals;
  const name = candidateOf(r.candidateId).name.split(' ')[0];
  return {
    id,
    day: state.currentDayIndex,
    at: 0,
    caller: 'Hakan Bey',
    line: 'İK Müdürü · dahili 210',
    lines: requestCallLines(r.template ?? 0, r.candidateId, managerTone(refusals), state.desk.calls[id] === 'missed'),
    choices: [
      { text: replyText('comply', state.managerStance), reply: managerReaction('comply', managerTone(refusals)) },
      { text: replyText('refuse', state.managerStance), reply: managerReaction('refuse', managerTone(refusals + 1)) },
    ],
    minutes: 4,
    missed: { note: `Hakan Bey iki kez aradı, açmadın. Sekreteri not bırakmış: "${name} konusunda sizinle görüşmek istedi."`, performans: -2 },
  };
}
