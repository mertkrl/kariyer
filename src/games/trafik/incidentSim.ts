import { faulty } from './controller';
import { crossPoint, exitOf, outPoint, type LegGeo } from './junction';
import { legOf, TEAM_READY, TEAM_V, TOW_LOAD, TOW_V, turnOf, type Car, type Dir, type Incident, type IncidentKind, type Turn } from './model';
import { say, type Sim } from './sim';

/*
 * Kavşaktaki olaylar ve trafik ekipleri: kaza, arıza, çift sıra park, düğün konvoyu, yol çalışması
 * ve sinyal arızası. Oyuncu "Trafik ekiplerine bildir" derse polis (gerekirse ardından çekici)
 * yola çıkar; demezse olay uzun süre yolda kalır, sonunda başka bir sürücü ihbar eder. Arızada
 * kavşak dur-bak-geç işler (stepFault). sim.ts'in adımı bunları her 0,1 saniyede çağırır.
 */

export function addIncident(s: Sim, kind: IncidentKind, x: number, y: number, text: string, sec: number, cars: number[], leg?: Dir) {
  s.incidents.push({ id: s.nextId++, kind, at: s.t, x, y, leg, text, cars, until: s.t + sec });
}

/** Olayın kalkması: araçlar çekilir, kol yeniden akar. */
function clearIncident(s: Sim, i: Incident, byTeam: boolean) {
  i.cleared = s.t;
  const ids = new Set(i.cars);
  s.cars = s.cars.filter((c) => !ids.has(c.id));
  if (i.kind === 'parked' && i.leg) s.slow[i.leg] = 0;
  if (i.kind === 'wedding' && i.leg) s.block[i.leg] = 0;
  if (i.kind === 'crash') for (const p of s.peds) if (p.hit && Math.hypot(crossPoint(s.j.legs[p.leg]!, p.t, p.side)[0] - i.x, crossPoint(s.j.legs[p.leg]!, p.t, p.side)[1] - i.y) < 6) p.since = -999;
  if (i.kind === 'fault') {
    // onarılan kontrolör tüm kırmızıyla açılır: kutuda dur-bak-geç ile kalan araç çıksın
    s.fault = 0;
    s.turn.leg = null;
    s.ctl.stage = 'allred';
    s.ctl.t = -2;
    s.ctl.hold = false;
    s.ctl.cut = false;
  }
  const what =
    i.kind === 'crash'
      ? 'Kaza yeri temizlendi, araçlar çekiciye yüklendi.'
      : i.kind === 'breakdown'
        ? 'Arızalı araç çekildi, şerit açıldı.'
        : i.kind === 'parked'
          ? 'Çift sıra park eden araç kaldırıldı, sürücüsüne ceza yazıldı.'
          : i.kind === 'fault'
            ? 'Hüseyin usta kontrolör dolabını kapattı: “Sigorta atmış, değiştirdim.” Işıklar yeniden çalışıyor.'
            : 'Düğün konvoyu ikna edildi: “Gelin hanıma sağlık, yol açılsın.” Kol açıldı.';
  say(s, byTeam ? `${i.kind === 'fault' ? 'Elektrik ekibi' : 'Trafik ekibi'}: ${what}` : `${what} (Ekip çağrılmadığı için ${Math.round(s.t - i.at)} saniye sürdü.)`, byTeam ? 'good' : 'info');
}

/** Ekibin geleceği kol: olayın kolu ya da olaya en yakın kol. */
function teamLeg(s: Sim, i: Incident) {
  const legs = Object.values(s.j.legs);
  return (i.leg && s.j.legs[i.leg]) || legs.reduce((m, l) => (Math.hypot(l.u[0] * 30 - i.x, l.u[1] * 30 - i.y) < Math.hypot(m.u[0] * 30 - i.x, m.u[1] * 30 - i.y) ? l : m));
}

const pathLen = (pts: [number, number][]) => pts.reduce((m, p, k) => (k ? m + Math.hypot(p[0] - pts[k - 1][0], p[1] - pts[k - 1][1]) : 0), 0);

/** Polis motosikleti: kolun ortasındaki çizgiden (şeritlerin arasından) olayın yanına. */
function motoRoute(i: Incident, g: LegGeo): [number, number][] {
  const mid = (d: number): [number, number] => [g.u[0] * d, g.u[1] * d];
  const along = i.x * g.u[0] + i.y * g.u[1];
  const stopAt = Math.max(g.edge, Math.min(140, along + 4));
  const side: [number, number] = [i.x - g.u[0] * along, i.y - g.u[1] * along];
  const near: [number, number] = [g.u[0] * stopAt + side[0] * 0.4, g.u[1] * stopAt + side[1] * 0.4];
  return [mid(150), mid(stopAt), near];
}

/** Çekici: kolun kapatılan giden şeridinden (araçlara karşı değil, boşaltılmış şeritten) olaya. */
function towRoute(i: Incident, g: LegGeo): [number, number][] {
  const along = i.x * g.u[0] + i.y * g.u[1];
  const sTo = Math.max(g.edge, Math.min(140, along + 6));
  const a = outPoint(g, 0, 150);
  const b = outPoint(g, 0, sTo);
  const dx = i.x - b[0];
  const dy = i.y - b[1];
  const d = Math.hypot(dx, dy) || 1;
  return [a, b, [i.x - (dx / d) * 4, i.y - (dy / d) * 4]];
}

/** "Trafik ekiplerine bildir": polis yola çıkar; gerekirse ardından çekici gelir. */
export function dispatch(s: Sim, id: number, auto = false) {
  const i = s.incidents.find((x) => x.id === id);
  if (!i || i.team || i.cleared !== undefined || i.kind === 'roadwork') return;
  const g = teamLeg(s, i);
  const moto = motoRoute(i, g);
  const arrive = s.t + TEAM_READY + pathLen(moto) / TEAM_V;
  const tow = i.kind !== 'wedding' && i.kind !== 'fault';
  const color = s.cars.find((c) => i.cars.includes(c.id))?.color;
  i.team = { sent: s.t, arrive, fix: tow ? Infinity : arrive + (i.kind === 'fault' ? 12 : 9), leg: g.dir, moto, ...(tow ? { tow: { path: towRoute(i, g), color } } : {}), ...(auto ? { auto } : {}) };
  say(
    s,
    auto
      ? `${INCIDENT_NAME[i.kind]} için başka bir sürücü 155’i aradı; ekip ancak şimdi yola çıktı.`
      : i.kind === 'fault'
        ? `Merkez: “Elektrik ekibi yönlendirildi, Hüseyin usta ${Math.round(arrive - s.t)} saniyeye orada. O gelene kadar kavşak dur-bak-geç işler.”`
        : `Merkez: “${INCIDENT_NAME[i.kind]} için trafik polisi yönlendirildi, ${Math.round(arrive - s.t)} saniyeye orada.${tow ? ' Ardından çekici gelecek.' : ''}”`,
    auto ? 'bad' : 'good',
  );
}

/** Olay kartındaki durum: ekip ve çekici nerede. */
export function incidentStatus(sim: Sim, i: Incident) {
  const team = i.team;
  const sec = (x: number) => Math.max(0, Math.ceil(x - sim.t));
  if (i.cleared !== undefined) return 'Çözüldü';
  if (i.kind === 'roadwork') return `${i.leg && sim.closed[i.leg] ? 'Kol kapalı, ekip güvende' : 'Kol açık: kapat!'} · ${sec(i.until)} sn`;
  if (!team) return `Kendiliğinden kalkması ~${sec(i.until)} sn`;
  if (sim.t < team.arrive) return `${i.kind === 'fault' ? 'Elektrik ekibi' : 'Polis'} yolda · ${sec(team.arrive)} sn`;
  const tow = team.tow;
  if (!tow) return i.kind === 'fault' ? `Usta onarıyor · ${sec(team.fix)} sn` : `Polis ikna ediyor · ${sec(team.fix)} sn`;
  if (tow.start === undefined) return 'Polis şeridi boşaltıyor';
  return `Çekici yolda · ${sec(tow.arrive!)} sn`;
}

export const INCIDENT_NAME: Record<IncidentKind, string> = { crash: 'Kaza', breakdown: 'Arızalı araç', parked: 'Çift sıra park', wedding: 'Düğün konvoyu', roadwork: 'Yol çalışması', fault: 'Sinyal arızası' };

/**
 * Arızada geçiş sırası: karşılıklı iki kol (kuzey-güney, doğu-batı) birlikte geçer, sola dönen
 * karşıdan geleni kollar. Kutuda öbür çiftten hareket eden araç yokken, çizgide bekleyeni olan
 * sıradaki çifte dört saniyelik geçiş hakkı verilir.
 */
export function stepFault(s: Sim) {
  if (!faulty(s)) return;
  const tr = s.turn;
  const pair = (d: Dir): Dir[] => (d === 'N' || d === 'S' ? ['N', 'S'] : ['E', 'W']);
  const atLine = (c: Car) => c.s < c.path.stop && c.path.stop - c.s < 3.5 && c.v < 0.6 && c.crashed === undefined && !c.broken;
  // sola dönen, karşıda çizgide bekleyen ya da kutuda ilerleyen varken kalkmaz
  const opp = (d: Dir) => pair(d).find((x) => x !== d)!;
  const oppBusy = (d: Dir) => s.cars.some((o) => legOf(o.mv) === opp(d) && o.crashed === undefined && (atLine(o) || (o.amber === 'go' && o.s - o.len < o.path.boxOut + 1)));
  const release = (d: Dir) => {
    for (const c of s.cars) if (pair(d).includes(legOf(c.mv)) && atLine(c) && (turnOf(c.mv) !== 'L' || !oppBusy(legOf(c.mv)))) c.amber = 'go';
  };
  if (tr.leg && s.t < tr.until) return release(tr.leg);
  tr.leg = null;
  const order: Dir[] = (['N', 'E'] as Dir[]).filter((d) => pair(d).some((x) => s.j.legs[x]));
  const from = tr.last ? order.indexOf(tr.last) + 1 : 0;
  for (let k = 0; k < order.length; k++) {
    const d = order[(from + k) % order.length];
    if (!s.cars.some((c) => pair(d).includes(legOf(c.mv)) && atLine(c))) continue;
    // kutuda araç varsa (ilerleyen de, çıkışı dolu diye duran da) beklenir
    if (s.cars.some((c) => c.crashed === undefined && (c.s > c.path.stop - 0.5 || c.amber === 'go') && c.s - c.len < c.path.boxOut + 1)) return;
    tr.leg = d;
    tr.last = d;
    tr.until = s.t + 3;
    return release(d);
  }
}

export function stepIncidents(s: Sim) {
  for (const i of s.incidents) {
    const team = i.team;
    // yol çalışması ekip beklemez: süresi dolunca biter
    if (i.kind === 'roadwork') {
      if (i.cleared === undefined && s.t >= i.until) {
        i.cleared = s.t;
        if (i.leg) s.slow[i.leg] = 0;
        say(s, `Yol çalışması bitti: ${s.spec.legs[i.leg!]!.name} kolunu yeniden açabilirsin.`, 'good');
      }
      continue;
    }
    if (!team) {
      // ekip çağrılmazsa olay uzun süre yolda kalır, sonunda başkası ihbar eder
      if (s.t >= i.until) dispatch(s, i.id, true);
      continue;
    }
    if (s.t < team.arrive) continue;
    const tow = team.tow;
    if (!tow) {
      if (i.cleared === undefined && s.t >= team.fix) clearIncident(s, i, !team.auto);
      continue;
    }
    // polis vardı: çekicinin gireceği giden şeridi kapatır, şerit boşalınca çekici yola çıkar
    s.closeOut[team.leg] = true;
    if (tow.start === undefined) {
      const busy = s.cars.some((c) => exitOf(legOf(c.mv), turnOf(c.mv) as Turn) === team.leg && c.s > c.path.boxOut - 2 && c.crashed === undefined && !i.cars.includes(c.id));
      if (!busy || s.t - team.arrive > 20) {
        tow.start = s.t;
        tow.arrive = s.t + pathLen(tow.path) / TOW_V;
        say(s, 'Polis şeridi kapattı; çekici boşalan şeritten geliyor.', 'info');
      }
    } else if (i.cleared === undefined && s.t >= tow.arrive!) {
      clearIncident(s, i, !team.auto);
      tow.leave = s.t + TOW_LOAD;
      tow.done = tow.leave + pathLen(tow.path) / TOW_V;
    } else if (tow.done !== undefined && s.t >= tow.done && s.closeOut[team.leg]) {
      // çekici çıktı: şerit açılır (aynı kolda başka bir çekici çalışmıyorsa)
      if (!s.incidents.some((o) => o !== i && o.team?.leg === team.leg && o.team.tow && o.team.tow.done === undefined && s.t >= o.team.arrive)) delete s.closeOut[team.leg];
    }
  }
  // biten olaylar, çekici de çekildikten sonra listeden düşer
  s.incidents = s.incidents.filter((i) => i.cleared === undefined || s.t - i.cleared < 8 || (i.team?.tow?.done ?? 0) > s.t);
}

/** Deneme için: kolda hemen bir arıza çıkarır. */
export function breakdownNow(s: Sim, mv: `${Dir}.${Turn}`, text: string, sec = 150) {
  if (!s.breakNext.some((b) => b.mv === mv)) s.breakNext.push({ mv, sec, text });
}
