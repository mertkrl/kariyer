import * as snd from '../sounds';
import { CAM, clamp, depthScale, glow, INK, pick, poly, proj, shadeHex, shadow, worldDir, type Host, type Pt, type Thing } from './core';
import type { Route } from './signal';

/*
 * Araçlar: otomobil, taksi, sarı dolmuş, otobüs ve kurye motoru. Zeminde iki kutu (gövde ve kabin)
 * olarak çizilir; kameraya bakan yüzler, camlar, farlar, stop lambaları, plaka. Gövde yaylı bir
 * süspansiyonun üstündedir: frende burnu eğilir, kalkışta arkası çöker, çukurda önce ön sonra
 * arka teker zıplar. Dokununca her biri kendince tepki verir.
 */

export type Kind = 'car' | 'taxi' | 'dolmus' | 'bus' | 'kurye';

interface Spec {
  /** Boy (zeminde), en, gövde ve kabin yüksekliği. */
  L: number;
  Wd: number;
  Hb: number;
  Hc: number;
  /** Kabinin önden ve arkadan içeride kalan kısmı. */
  front: number;
  rear: number;
  v0: number;
  acc: number;
  dec: number;
}

const SPECS: Record<Kind, Spec> = {
  car: { L: 46, Wd: 24, Hb: 9, Hc: 9, front: 13, rear: 8, v0: 44, acc: 36, dec: 70 },
  taxi: { L: 46, Wd: 24, Hb: 9, Hc: 9, front: 13, rear: 8, v0: 50, acc: 42, dec: 80 },
  dolmus: { L: 54, Wd: 25, Hb: 11, Hc: 12, front: 7, rear: 2, v0: 40, acc: 30, dec: 85 },
  bus: { L: 94, Wd: 28, Hb: 13, Hc: 14, front: 3, rear: 2, v0: 30, acc: 20, dec: 55 },
  kurye: { L: 18, Wd: 7, Hb: 8, Hc: 0, front: 0, rear: 0, v0: 64, acc: 70, dec: 110 },
};

const CAR_COLORS = ['#dcd8cf', '#b23a2e', '#2f5d8c', '#6e7378', '#2b2d31', '#3f6e4b', '#c9b38a', '#8a2f3c'];

let ids = 0;

export class Vehicle implements Thing {
  readonly id = ++ids;
  readonly spec: Spec;
  readonly color: string;
  s = 0;
  v: number;
  acc = 0;
  depth = 0;
  dead = false;
  /** Süspansiyon: gövdenin yukarı kayması ve öne eğilmesi (ve hızları). */
  heave = 0;
  heaveV = 0;
  pitch = 0;
  pitchV = 0;
  /** Yeşilde kalkmadan önce bekleme. */
  wait = 0;
  /** Sert fren (dolmuşa dokununca), kurye şaha kalkışı, otobüs durakta. */
  hard = 0;
  wheelie = 0;
  dwell = 0;
  served = false;
  honk = 0;
  /** Teker çukura girdi (yama varsa bozulur). */
  onBump: (() => void) | null = null;
  private pos = { x: 0, y: 0, tx: 0, ty: 1 };

  readonly kind: Kind;
  readonly route: Route;
  readonly lane: number;

  constructor(kind: Kind, route: Route, lane: number) {
    this.kind = kind;
    this.route = route;
    this.lane = lane;
    this.spec = SPECS[kind];
    this.color = kind === 'taxi' ? '#f2c21b' : kind === 'dolmus' ? '#f0c419' : kind === 'bus' ? '#efe6d2' : kind === 'kurye' ? '#c7372b' : pick(CAR_COLORS);
    this.v = this.spec.v0 * 0.8;
    this.place();
  }

  get len() {
    return this.spec.L * 0.78;
  }

  private place() {
    this.pos = this.route.path.at(this.s);
    this.depth = this.pos.y;
  }

  /** İvme: akıllı sürücü modeli (IDM). `gap` önündeki engele boşluk, `dv` hız farkı. */
  idm(gap: number, dv: number) {
    const { v0, acc, dec } = this.spec;
    const T = 1.1;
    const s0 = 7;
    const sStar = s0 + Math.max(0, this.v * T + (this.v * dv) / (2 * Math.sqrt(acc * dec)));
    return acc * (1 - (this.v / v0) ** 4 - (sStar / Math.max(gap, 0.5)) ** 2);
  }

  update(h: Host, dt: number) {
    // süspansiyon yayı: ivmeye göre öne arkaya eğilir, çukurda zıplar
    const targetPitch = clamp(-this.acc * 0.0016, -0.09, 0.09) + (this.wheelie > 0 ? 0.55 : 0);
    this.pitchV += ((targetPitch - this.pitch) * 90 - this.pitchV * 11) * dt;
    this.pitch += this.pitchV * dt;
    this.heaveV += (-this.heave * 160 - this.heaveV * 12) * dt;
    this.heave += this.heaveV * dt;
    this.honk = Math.max(0, this.honk - dt);
    this.wheelie = Math.max(0, this.wheelie - dt);
    const prev = this.s;
    this.v = Math.max(0, this.v + this.acc * dt);
    this.s += this.v * dt;
    const r = this.route;
    // çukur: önce ön teker, sonra arka teker
    if (r.bump !== undefined && this.kind !== 'kurye') {
      const half = this.len / 2 - 4;
      for (const [off, sign] of [
        [half, 1],
        [-half, -1],
      ] as const)
        if (prev + off < r.bump && this.s + off >= r.bump) {
          this.heaveV += 22 + this.v * 0.25;
          this.pitchV += sign * (0.9 + this.v * 0.012);
          if (h.sound && sign > 0) snd.thud();
          this.onBump?.();
        }
    }
    if (this.s >= r.path.len) this.dead = true;
    this.place();
  }

  /** Yolun uçlarında belirip kaybolur (maket bir maket). */
  private alpha() {
    const L = this.route.path.len;
    return clamp(Math.min((this.s - 6) / 30, (L - this.s - 6) / 30), 0, 1);
  }

  hit(x: number, y: number) {
    const k = depthScale(this.pos.y);
    const hh = (this.spec.Hb + this.spec.Hc) * k;
    return Math.abs(x - this.pos.x) < this.spec.Wd * 0.7 * k + 4 && y < this.pos.y + 8 && y > this.pos.y - hh - this.len * 0.45 - 6;
  }

  at(): Pt {
    return { x: this.pos.x, y: this.pos.y - (this.spec.Hb + this.spec.Hc) * depthScale(this.pos.y) - 8 };
  }

  draw(g: CanvasRenderingContext2D, h: Host) {
    const a = this.alpha();
    if (a <= 0) return;
    g.globalAlpha = a;
    if (this.kind === 'kurye') this.drawBike(g, h);
    else this.drawBox(g, h);
    g.globalAlpha = 1;
  }

  /** Araç: alt gövde ve kabin iki kutu; kameraya bakan yüzler çizilir. */
  private drawBox(g: CanvasRenderingContext2D, h: Host) {
    const { night, dark } = h;
    const P = this.pos;
    const [fu, fv] = worldDir(P.tx, P.ty);
    const su = -fv;
    const sv = fu;
    const k = depthScale(P.y);
    const sp = this.spec;
    const L = sp.L * k;
    const Wd = sp.Wd * k;
    const clear = 3.2 * k;
    const at = (along: number, across: number, z: number) => {
      const zz = z + this.heave * k + this.pitch * along * -0.9;
      return proj(P, fu * along + su * across, fv * along + sv * across, zz);
    };
    const facing = (nu: number, nv: number) => nu * CAM.u + nv * CAM.v > 0.04;
    const ink = night.c(INK);
    const body = night.c(this.color);

    // gölge
    const sh = [at(L / 2 + 2, Wd / 2 + 2, -this.heave * k), at(L / 2 + 2, -Wd / 2 - 2, -this.heave * k), at(-L / 2 - 2, -Wd / 2 - 2, -this.heave * k), at(-L / 2 - 2, Wd / 2 + 2, -this.heave * k)].map((p) => ({ x: p.x + 2, y: p.y + 2 }));
    g.save();
    g.globalAlpha *= 0.3;
    g.fillStyle = '#140e08';
    poly(g, sh);
    g.fill();
    g.restore();

    // tekerler
    g.fillStyle = night.c('#1b1c1f');
    for (const al of [L / 2 - 8 * k, -L / 2 + 8 * k])
      for (const ac of [Wd / 2 - 1, -Wd / 2 + 1]) {
        const c = proj(P, fu * al + su * ac, fv * al + sv * ac, 3.6 * k);
        g.beginPath();
        g.ellipse(c.x, c.y, 3.2 * k, 3.7 * k, 0, 0, Math.PI * 2);
        g.fill();
      }

    const box = (al0: number, al1: number, ac: number, z0: number, z1: number, faceFill: (face: string, pts: Pt[]) => void, topFill: string) => {
      const faces: [string, number, number, Pt[]][] = [
        ['front', fu, fv, [at(al1, ac, z0), at(al1, -ac, z0), at(al1, -ac, z1), at(al1, ac, z1)]],
        ['back', -fu, -fv, [at(al0, -ac, z0), at(al0, ac, z0), at(al0, ac, z1), at(al0, -ac, z1)]],
        ['left', su, sv, [at(al0, ac, z0), at(al1, ac, z0), at(al1, ac, z1), at(al0, ac, z1)]],
        ['right', -su, -sv, [at(al1, -ac, z0), at(al0, -ac, z0), at(al0, -ac, z1), at(al1, -ac, z1)]],
      ];
      for (const [name, nu, nv, pts] of faces) if (facing(nu, nv)) faceFill(name, pts);
      const top = [at(al1, ac, z1), at(al1, -ac, z1), at(al0, -ac, z1), at(al0, ac, z1)];
      g.fillStyle = topFill;
      poly(g, top);
      g.fill();
      g.strokeStyle = ink;
      g.lineWidth = 0.8;
      g.stroke();
    };

    const shadeFace = (name: string) => (name === 'front' || name === 'back' ? -0.12 : -0.24);
    const lit = dark > 0.35;
    // alt gövde
    box(
      -L / 2,
      L / 2,
      Wd / 2,
      clear,
      sp.Hb * k,
      (name, pts) => {
        g.fillStyle = night.c(shadeHex(this.color, shadeFace(name)));
        poly(g, pts);
        g.fill();
        g.strokeStyle = ink;
        g.lineWidth = 0.8;
        g.stroke();
        const [p0, p1, , p3] = pts;
        const lerpP = (u: number, w: number) => ({ x: p0.x + (p1.x - p0.x) * u + (p3.x - p0.x) * w, y: p0.y + (p1.y - p0.y) * u + (p3.y - p0.y) * w });
        if (name === 'front') {
          // farlar, ızgara, plaka
          for (const u of [0.18, 0.82]) {
            const c = lerpP(u, 0.55);
            g.fillStyle = lit ? '#fff3c2' : '#e8e4d6';
            g.beginPath();
            g.ellipse(c.x, c.y, 2.3 * k, 1.4 * k, 0, 0, Math.PI * 2);
            g.fill();
            if (lit) glow(g, 'rgb(255,236,180)', c.x, c.y, 9 * k, 0.55 * dark);
          }
          const pl = lerpP(0.5, 0.25);
          g.fillStyle = night.c('#f4f2ea');
          g.fillRect(pl.x - 3.6 * k, pl.y - 1.2 * k, 7.2 * k, 2.4 * k);
          g.strokeStyle = night.c('#1d2a63');
          g.lineWidth = 0.6;
          g.strokeRect(pl.x - 3.6 * k, pl.y - 1.2 * k, 7.2 * k, 2.4 * k);
        } else if (name === 'back') {
          const braking = this.acc < -12 || this.v < 2;
          for (const u of [0.14, 0.86]) {
            const c = lerpP(u, 0.6);
            g.fillStyle = braking ? '#ff4a3a' : '#a8281f';
            g.fillRect(c.x - 2 * k, c.y - 1.2 * k, 4 * k, 2.4 * k);
            if (braking || lit) glow(g, 'rgb(255,60,40)', c.x, c.y, (braking ? 8 : 5) * k, braking ? 0.6 : 0.35 * dark);
          }
          const pl = lerpP(0.5, 0.35);
          g.fillStyle = night.c('#f4f2ea');
          g.fillRect(pl.x - 3.4 * k, pl.y - 1.1 * k, 6.8 * k, 2.2 * k);
        } else if (this.kind === 'dolmus') {
          // sarı dolmuşun damalı şeridi
          g.fillStyle = night.c('#1d1d1f');
          for (let i = 0; i < 12; i++) {
            const c = lerpP((i + 0.5) / 12, 0.62 + (i % 2) * 0.16);
            g.fillRect(c.x - 1.2 * k, c.y - 1 * k, 2.4 * k, 2 * k);
          }
        } else if (this.kind === 'bus') {
          g.fillStyle = night.c('#d0632a');
          const a0 = lerpP(0, 0.55);
          const a1 = lerpP(1, 0.55);
          const b1 = lerpP(1, 0.75);
          const b0 = lerpP(0, 0.75);
          poly(g, [a0, a1, b1, b0]);
          g.fill();
        }
      },
      night.c(shadeHex(this.color, 0.08)),
    );

    if (sp.Hc > 0) {
      // kabin: camlar ve direkler
      const ci = 2 * k;
      box(
        -L / 2 + sp.rear * k,
        L / 2 - sp.front * k,
        Wd / 2 - ci,
        sp.Hb * k,
        (sp.Hb + sp.Hc) * k,
        (name, pts) => {
          g.fillStyle = body;
          poly(g, pts);
          g.fill();
          g.strokeStyle = ink;
          g.lineWidth = 0.8;
          g.stroke();
          const [p0, p1, , p3] = pts;
          const P2 = (u: number, w: number) => ({ x: p0.x + (p1.x - p0.x) * u + (p3.x - p0.x) * w, y: p0.y + (p1.y - p0.y) * u + (p3.y - p0.y) * w });
          const panes = this.kind === 'bus' && (name === 'left' || name === 'right') ? 6 : this.kind === 'dolmus' && (name === 'left' || name === 'right') ? 3 : name === 'left' || name === 'right' ? 2 : 1;
          const glass = this.kind === 'bus' && lit ? '#e8c879' : night.c(name === 'front' ? '#3a4c58' : '#2c3b45');
          for (let i = 0; i < panes; i++) {
            const u0 = (i + 0.12) / panes;
            const u1 = (i + 0.88) / panes;
            poly(g, [P2(u0, 0.12), P2(u1, 0.12), P2(u1, 0.86), P2(u0, 0.86)]);
            g.fillStyle = glass;
            g.fill();
          }
          // camda gökyüzü yansıması
          g.strokeStyle = `rgba(255,255,255,${0.35 - dark * 0.25})`;
          g.lineWidth = 1;
          const r0 = P2(0.2, 0.75);
          const r1 = P2(0.45, 0.25);
          g.beginPath();
          g.moveTo(r0.x, r0.y);
          g.lineTo(r1.x, r1.y);
          g.stroke();
          if (this.kind === 'bus' && name === 'front') {
            // hat tabelası
            const d0 = P2(0.15, 0.78);
            const d1 = P2(0.85, 0.78);
            const d2 = P2(0.85, 0.98);
            const d3 = P2(0.15, 0.98);
            poly(g, [d0, d1, d2, d3]);
            g.fillStyle = '#1b1a17';
            g.fill();
            g.fillStyle = '#ffb02e';
            const m = P2(0.5, 0.88);
            g.fillRect(m.x - 5 * k, m.y - 0.8 * k, 10 * k, 1.6 * k);
            if (lit) glow(g, 'rgb(255,170,50)', m.x, m.y, 8 * k, 0.4);
          }
        },
        night.c(shadeHex(this.color, 0.12)),
      );
      if (this.kind === 'taxi') {
        // tavandaki taksi lambası
        const c = at(-2 * k, 0, (sp.Hb + sp.Hc) * k);
        g.fillStyle = lit ? '#fff2b0' : night.c('#f7f3e6');
        g.strokeStyle = ink;
        g.lineWidth = 0.7;
        g.fillRect(c.x - 4.5 * k, c.y - 3.4 * k, 9 * k, 3.4 * k);
        g.strokeRect(c.x - 4.5 * k, c.y - 3.4 * k, 9 * k, 3.4 * k);
        g.fillStyle = night.c('#1d1d1f');
        g.fillRect(c.x - 3 * k, c.y - 2.2 * k, 6 * k, 1 * k);
        if (lit) glow(g, 'rgb(255,230,140)', c.x, c.y - 2, 7 * k, 0.5);
      }
    }

    // gece farların yola düşen ışığı
    if (lit && facing(fu, fv)) {
      const c = at(L / 2 + 26 * k, 0, 0);
      glow(g, 'rgb(255,226,160)', c.x, c.y, 26 * k, 0.28 * dark);
    }
    if (this.honk > 0) this.drawHonk(g, h);
  }

  /** Kurye: iki teker, gövde, sürücü ve arkasında kutu. Şaha kalkınca arka teker üstünde döner. */
  private drawBike(g: CanvasRenderingContext2D, h: Host) {
    const { night, dark } = h;
    const P = this.pos;
    const k = depthScale(P.y) * 1.15;
    const tx = P.tx;
    const ty = P.ty * 0.75;
    const dir = Math.abs(tx) > 0.15 ? Math.sign(tx) : 1;
    shadow(g, P.x, P.y, 9 * k, 2.6 * k, 0.25);
    const rear = { x: P.x - tx * 7 * k, y: P.y - ty * 7 * k };
    g.save();
    g.translate(rear.x, rear.y);
    g.rotate(-this.pitch * 1.4 * dir);
    const fx = tx * 14 * k;
    const fy = ty * 14 * k;
    const ink = night.c(INK);
    g.lineWidth = 0.9;
    g.strokeStyle = ink;
    // tekerler
    g.fillStyle = night.c('#1b1c1f');
    for (const [x, y] of [
      [0, -2.6 * k],
      [fx, fy - 2.6 * k],
    ]) {
      g.beginPath();
      g.ellipse(x, y, 2.4 * k, 2.8 * k, 0, 0, Math.PI * 2);
      g.fill();
    }
    // gövde
    g.fillStyle = night.c(this.color);
    g.beginPath();
    g.moveTo(-1 * k, -4 * k);
    g.lineTo(fx * 0.9, fy - 6 * k);
    g.lineTo(fx * 0.75, fy - 2.5 * k);
    g.lineTo(fx * 0.2, -2.5 * k);
    g.closePath();
    g.fill();
    g.stroke();
    // kutu
    g.fillStyle = night.c('#2e8a85');
    g.fillRect(-4 * k, -13 * k, 7 * k, 7 * k);
    g.strokeRect(-4 * k, -13 * k, 7 * k, 7 * k);
    // sürücü
    g.strokeStyle = night.c('#2b3140');
    g.lineWidth = 2.4 * k;
    g.beginPath();
    g.moveTo(fx * 0.3, fy * 0.3 - 6 * k);
    g.lineTo(fx * 0.45, fy * 0.45 - 13 * k);
    g.lineTo(fx * 0.85, fy * 0.85 - 9 * k);
    g.stroke();
    g.fillStyle = night.c('#e8e6e0');
    g.beginPath();
    g.arc(fx * 0.48, fy * 0.48 - 16 * k, 2.6 * k, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = ink;
    g.lineWidth = 0.8;
    g.stroke();
    g.restore();
    if (dark > 0.35) glow(g, 'rgb(255,236,180)', P.x + tx * 9 * k, P.y + ty * 9 * k - 6 * k, 10 * k, 0.5 * dark);
    if (this.honk > 0) this.drawHonk(g, h);
  }

  /** Korna: kısa ses dalgaları. */
  private drawHonk(g: CanvasRenderingContext2D, h: Host) {
    const c = this.at();
    const t = (h.t * 3) % 1;
    g.strokeStyle = `rgba(255,250,235,${0.9 - t * 0.8})`;
    g.lineWidth = 1.2;
    for (const r of [5 + t * 6, 10 + t * 6]) {
      g.beginPath();
      g.arc(c.x, c.y + 4, r, -Math.PI * 0.85, -Math.PI * 0.15);
      g.stroke();
    }
  }

  tap(h: Host) {
    const at = this.at();
    if (this.kind === 'dolmus') {
      this.hard = 1.6;
      if (h.sound) {
        snd.screech();
        window.setTimeout(snd.horn, 350);
      }
      h.say('Dolmuşçu', pick(['Kadıköy, Kadıköy! Arkaya doğru ilerleyelim!', 'İnecek var mı? Yok mu? Bas gaza!', 'Bir kişilik daha yer var, sıkış biraz abla!']), at);
      h.secret('dolmus', at);
    } else if (this.kind === 'bus') {
      if (this.dwell > 0) {
        this.dwell = 0;
        this.served = true;
        if (h.sound) snd.busDoor();
        h.say('Otobüs şoförü', 'Doldu! Bir sonraki kırk beş dakika sonra.', at);
        h.secret('otobus', at);
      } else {
        this.honk = 0.8;
        if (h.sound) snd.busHorn();
        h.say('Otobüs şoförü', 'Arkaya doğru ilerleyelim, arka boş!', at);
      }
    } else if (this.kind === 'kurye') {
      this.wheelie = 1.6;
      if (h.sound) snd.rev();
      h.say('Kurye', pick(['Kapıdayım abi! (Değilim, köşedeyim.)', 'Sıcak sıcak geliyor! Soğursa trafik.']), at);
      h.secret('kurye', at);
    } else if (this.kind === 'taxi') {
      this.honk = 0.7;
      if (h.sound) snd.carHorn();
      h.say('Taksici', pick(['Kadıköy mü? Köprüden dolanırız abi, trafik var.', 'Taksimetre bozuk, gönlünden ne koparsa.']), at);
      h.secret('taksi', at);
    } else {
      this.honk = 0.6;
      if (h.sound) snd.carHorn();
      h.say('Şoför', pick(['Napıyorsun abi, dokunma arabaya!', 'Yıkattım daha dün, dokunma!', 'Park yeri arıyorum, yarım saattir.']), at);
    }
  }
}
