import { GAMES, SITE_NAME } from './games';
import type { Progress } from './progress';
import { CARD_H, CARD_W, shareResult, siteLink, type ResultCard, type ShareOutcome } from './share';

/*
 * Mahalle karnesi: salonun paylaşım kartı. Tek oyunun değil, oyuncunun bütün mahallesinin özeti:
 * kaç durakta mesai bitti, her durağın son sonucu. Bağlantı salona (ana sayfa) gider; arkadaş
 * bütün mahalleyi görür, istediği durağa girer. Salonun ilk paketine girmez: düğmeye basınca iner.
 */

const DISPLAY = "'Fraunces', Georgia, serif";
const BODY = "'Work Sans', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";
const BG = '#1d2733';
const PAPER = '#f4efe4';
const GOLD = '#e0b94f';
const MUTED = 'rgba(244,239,228,.55)';

/** Uzun sonucu satıra sığdırır. */
function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

export function mahalleCard(progress: Progress): ResultCard {
  const done = GAMES.filter((g) => progress.played[g.route]);
  const list = done.map((g) => `${g.title} (${progress.played[g.route]!.result})`).join(', ');
  return {
    link: siteLink(),
    fileName: 'mesai-disi-mahalle-karnesi',
    kicker: 'Mahalle karnesi',
    title: `${done.length}/${GAMES.length} durakta mesai bitti`,
    stats: [],
    question: 'Sen kaç durakta mesai bitirirsin?',
    text: `${SITE_NAME}: ${done.length}/${GAMES.length} durakta mesai bitti. ${list}.`,
    paint(ctx, link) {
      const pad = 80;
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, CARD_W, CARD_H);
      ctx.fillStyle = 'rgba(255,255,255,.05)';
      for (let y = 11; y < CARD_H; y += 22) for (let x = 11; x < CARD_W; x += 22) ctx.fillRect(x, y, 2, 2);
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = MUTED;
      ctx.font = `600 24px ${MONO}`;
      ctx.fillText(`${SITE_NAME.toLocaleUpperCase('tr-TR')} · KASM MAHALLESİ`, pad, 120);
      ctx.fillStyle = PAPER;
      ctx.font = `700 64px ${DISPLAY}`;
      ctx.fillText('Mahalle karnesi', pad, 200);
      ctx.fillStyle = GOLD;
      ctx.font = `700 120px ${DISPLAY}`;
      ctx.fillText(`${done.length}/${GAMES.length}`, pad, 340);
      ctx.fillStyle = PAPER;
      ctx.font = `500 34px ${BODY}`;
      ctx.fillText('durakta mesai bitti', pad + 4, 392);
      // duraklar: bitirilen sonucuyla, bitirilmeyen soluk
      let y = 480;
      for (const g of GAMES) {
        const p = progress.played[g.route];
        ctx.fillStyle = p ? GOLD : 'rgba(244,239,228,.25)';
        ctx.beginPath();
        ctx.arc(pad + 10, y - 11, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = p ? PAPER : MUTED;
        ctx.font = `600 32px ${BODY}`;
        ctx.fillText(g.title, pad + 36, y);
        ctx.font = `400 26px ${BODY}`;
        ctx.fillStyle = p ? 'rgba(244,239,228,.82)' : 'rgba(244,239,228,.35)';
        ctx.fillText(fit(ctx, p ? p.result : 'henüz değil', CARD_W - pad * 2 - 36), pad + 36, y + 36);
        y += 82;
      }
      ctx.fillStyle = PAPER;
      ctx.font = `700 40px ${DISPLAY}`;
      ctx.fillText('Sen kaç durakta mesai bitirirsin?', pad, CARD_H - 96);
      ctx.fillStyle = MUTED;
      ctx.font = `500 26px ${BODY}`;
      ctx.fillText(link, pad, CARD_H - 52);
    },
  };
}

export const shareMahalle = (progress: Progress): Promise<ShareOutcome> => shareResult(mahalleCard(progress));
