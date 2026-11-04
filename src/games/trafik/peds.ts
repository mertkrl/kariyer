import { signal } from './controller';
import { crossPoint } from './junction';
import { CRASH_CLEAR, DIFFICULTY, DT, PED_COLORS, PED_PATIENCE, PED_V, type Ped } from './model';
import { body } from './driving';
import { rateAt, say, type Sim } from './sim';

/*
 * Yayalar: geçitlere bölümün takvimindeki hızla gelir, yeşilde (yaklaşan araç yoksa) karşıya
 * geçer. Beklemeyi uzun bulan yaya, araçlar uzaktaysa kırmızıda geçer; önü kesilen yaya birkaç
 * saniye sonra aracın çevresinden dolaşır. sim.ts'in adımı her 0,1 saniyede çağırır.
 */

export function stepPeds(s: Sim) {
  for (const d of s.spec.peds) {
    const g = s.j.legs[d.leg];
    if (!g?.crosswalk) continue;
    s.pedAcc[d.leg] = (s.pedAcc[d.leg] ?? 0) + ((rateAt(d.rate, s.t) * DIFFICULTY[s.diff].demand) / 60) * DT * (0.4 + s.rand() * 1.2);
    while ((s.pedAcc[d.leg] ?? 0) >= 1) {
      s.pedAcc[d.leg]! -= 1;
      const dir = s.rand() < 0.5 ? 1 : -1;
      if (s.peds.filter((p) => p.leg === d.leg && p.dir === dir && !p.walking).length > 24) continue;
      s.peds.push({ id: s.nextId++, leg: d.leg, dir, t: dir > 0 ? -0.01 - s.rand() * 0.03 : 1.01 + s.rand() * 0.03, walking: false, speed: PED_V * (0.95 + s.rand() * 0.45), side: (s.rand() - 0.5) * 3, since: s.t, color: Math.floor(s.rand() * PED_COLORS.length) });
    }
  }
  let jayWave = false;
  for (const p of s.peds) {
    const g = s.j.legs[p.leg]!;
    const width = g.inW + g.outW + 2;
    if (p.hit) continue;
    if (!p.walking) {
      const sig = signal(s, `${p.leg}.P`);
      // yaya da bakar: geçide girmek üzere olan araç varsa kaldırımda bekler
      const clear = (secs: number) => !s.cars.some((c) => c.v > 1.5 && c.path.cross.some((x) => x.leg === p.leg && c.s - c.len < x.s1 && x.s0 - c.s < c.v * secs + 3));
      if (sig === 'green') {
        if (s.rand() < 0.25 && clear(1.5)) start(s, p);
      } else if (sig === 'red' && s.t - p.since > PED_PATIENCE * (0.7 + ((p.id * 37) % 60) / 100)) {
        // sabrı tükenen yaya, araçlar uzaktaysa kırmızıda geçer
        if (clear(3)) {
          start(s, p);
          p.jay = true;
          s.jay++;
          jayWave = true;
        }
      }
      continue;
    }
    // önündeki bir buçuk metrede araç gövdesi varsa durur
    const [ax, ay] = crossPoint(g, p.t + (p.dir * 1.5) / width, p.side);
    // önü kesik kalan yaya birkaç saniye sonra aracın çevresinden dolaşır (kutu kilitlenmesin)
    if (s.cars.some((c) => c.path.cross.some((x) => x.leg === p.leg && c.s > x.s0 && c.s - c.len < x.s1) && body(c).some(([x, y]) => Math.hypot(x - ax, y - ay) < 1.5))) {
      p.stuck = (p.stuck ?? 0) + DT;
      if (p.stuck < 4) continue;
    } else p.stuck = 0;
    p.t += (p.dir * p.speed * DT) / width;
  }
  if (jayWave && !s.log.some((l) => l.text.includes('kırmızıda') && s.t - l.t < 20)) say(s, 'Yayalar beklemekten sıkıldı, kırmızıda karşıya geçiyor.', 'bad');
  s.peds = s.peds.filter((p) => {
    const gone = p.walking && (p.t > 1.04 || p.t < -0.04);
    if (gone) s.pedDone++;
    return !gone && !(p.hit && s.t - p.since > CRASH_CLEAR);
  });
}

function start(s: Sim, p: Ped) {
  p.walking = true;
  s.pedWait += s.t - p.since;
  p.since = s.t;
}
