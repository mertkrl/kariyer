import { ease, overlayAt, type StopOverlay } from './lines';
import { callOverlayAt, clockText, nameFor } from './live';
import { H, W, type Design } from './model';

/*
 * Geçişli ekranın tam ekran kartları. Ulaşımda iki kart sırayla gelir: "Sonraki durak" sağdan
 * kayarak girer (altında hattın küçük şeridi ve ilerleyen araç), araç durağa varınca kurum
 * renginde "Duraktayız" kartına döner, durak adı nabız gibi atar, kapı uyarısı yanıp söner.
 * Hastanede her çağrıda "Sıradaki hasta" kartı yukarıdan iner. Her şey `seconds`'tan hesaplanır.
 */

const FONT = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
const up = (x: string) => x.toLocaleUpperCase('tr-TR');

/** Rengin üstünde okunacak yazı rengi. */
function inkOn(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l > 0.6 ? '#10151c' : '#ffffff';
}

/** Uzun durak adı kutuya sığsın diye yazı boyu küçülür. */
const fit = (name: string, max: number, width: number) => Math.min(max, (width / Math.max(4, name.length)) * 1.4);

function Vehicle({ x, y, preset, color }: { x: number; y: number; preset: Design['preset']; color: string }) {
  const long = preset === 'marmaray' || preset === 'metrobus';
  const w = long ? 64 : 44;
  return (
    <g transform={`translate(${x - w / 2} ${y - 13})`}>
      <rect width={w} height={22} rx={6} fill={color} />
      {Array.from({ length: long ? 5 : 3 }, (_, k) => (
        <rect key={k} x={5 + k * 11.5} y={4} width={8} height={7} rx={1.5} fill="#ffffff" fillOpacity={0.85} />
      ))}
      <circle cx={10} cy={23} r={3.5} fill="#10151c" />
      <circle cx={w - 10} cy={23} r={3.5} fill="#10151c" />
    </g>
  );
}

function NextStop({ o, design, now }: { o: StopOverlay; design: Design; now: Date }) {
  const { trip } = o;
  const accent = design.accent;
  const show = ease(o.t / 0.7);
  const size = fit(o.name, 128, W - 140);
  // şerit: şimdiki durak, sıradaki (vurgulu) ve sonraki iki durak
  const strip = trip.line.stops.slice(trip.at, trip.at + 4);
  const sx = (k: number) => 110 + k * ((W - 220) / 3);
  const p = Math.min(1, o.t / 2.5);
  return (
    <g transform={`translate(${W * (1 - o.shown)} 0)`}>
      <rect width={W} height={H} fill="#0d1726" />
      <rect width={W} height={H} fill={accent} fillOpacity={0.18} />
      <rect width={18} height={H} fill={accent} />
      <g fontFamily={FONT} fill="#ffffff">
        {design.preset === 'otobus' && (
          <g>
            <rect x={60} y={52} width={120} height={64} rx={10} fill={accent} stroke="#ffffff" strokeOpacity={0.4} />
            <text x={120} y={85} textAnchor="middle" dominantBaseline="central" fontSize={36} fontWeight={800}>
              {trip.line.name}
            </text>
          </g>
        )}
        <text x={design.preset === 'otobus' ? 204 : 60} y={76} fontSize={30} fontWeight={700} letterSpacing={4} fillOpacity={0.9}>
          SONRAKİ DURAK
        </text>
        <text x={design.preset === 'otobus' ? 204 : 60} y={108} fontSize={20} letterSpacing={3} fillOpacity={0.55}>
          NEXT STOP
        </text>
        <text x={60} y={330 + (1 - show) * 40} fontSize={size} fontWeight={800} opacity={show}>
          {up(o.name)}
        </text>
        <text x={60} y={420} fontSize={24} fillOpacity={0.7} opacity={show}>
          Son durak: {up(trip.terminus)}
        </text>
        <text x={W - 50} y={86} textAnchor="end" fontSize={52} fontWeight={700}>
          {clockText(now)}
        </text>
      </g>
      {/* hat şeridi: geçilen kısım soluk, araç durağa doğru ilerler */}
      <g fontFamily={FONT}>
        <line x1={sx(0)} y1={600} x2={sx(strip.length - 1)} y2={600} stroke="#ffffff" strokeOpacity={0.25} strokeWidth={8} strokeLinecap="round" />
        <line x1={sx(0)} y1={600} x2={sx(0) + (sx(1) - sx(0)) * p} y2={600} stroke={accent} strokeWidth={8} strokeLinecap="round" />
        {strip.map((name, k) => (
          <g key={k}>
            <circle cx={sx(k)} cy={600} r={k === 1 ? 16 : 10} fill={k === 0 ? accent : '#0d1726'} stroke={k === 1 ? '#ffd34d' : '#ffffff'} strokeWidth={k === 1 ? 5 : 3} />
            <text x={sx(k)} y={656} textAnchor="middle" fontSize={k === 1 ? 24 : 18} fontWeight={k === 1 ? 800 : 500} fill={k === 1 ? '#ffd34d' : '#ffffff'} fillOpacity={k === 0 ? 0.5 : 1}>
              {up(name).length > 20 ? `${up(name).slice(0, 19)}…` : up(name)}
            </text>
          </g>
        ))}
        <Vehicle x={sx(0) + (sx(1) - sx(0)) * p} y={560} preset={design.preset} color={accent} />
      </g>
    </g>
  );
}

function Arrive({ o, design }: { o: StopOverlay; design: Design }) {
  const accent = design.accent;
  const ink = inkOn(accent);
  const size = fit(o.name, 150, W - 120);
  const pulse = 1 + Math.sin(o.t * 5) * 0.025;
  const blink = Math.sin(o.t * 7) > -0.2;
  const door = design.preset === 'marmaray' ? `Kapılar ${o.trip.at % 2 ? 'sağ' : 'sol'} taraftan açılacaktır` : 'Lütfen araç tamamen durmadan ayağa kalkmayınız';
  const flash = Math.max(0, 1 - o.t / 0.35);
  return (
    <g transform={`translate(${W * (1 - o.shown)} 0)`} fontFamily={FONT}>
      <rect width={W} height={H} fill={accent} />
      {/* varışta açılan halkalar */}
      {[0, 1, 2].map((k) => {
        const r = ((o.t * 260 + k * 180) % 540) + 20;
        return <circle key={k} cx={W / 2} cy={H / 2 - 20} r={r} fill="none" stroke={ink} strokeOpacity={Math.max(0, 0.18 - r / 3600)} strokeWidth={3} />;
      })}
      <rect width={W} height={H} fill="#ffffff" fillOpacity={flash * 0.6} />
      <text x={W / 2} y={190} textAnchor="middle" fontSize={34} fontWeight={700} letterSpacing={8} fill={ink} fillOpacity={0.85}>
        DURAK · STOP
      </text>
      <g transform={`translate(${W / 2} ${H / 2 - 10}) scale(${pulse})`}>
        <text textAnchor="middle" dominantBaseline="central" fontSize={size} fontWeight={900} fill={ink}>
          {up(o.name)}
        </text>
      </g>
      <g opacity={blink ? 1 : 0.35}>
        <rect x={W / 2 - 330} y={560} width={660} height={64} rx={32} fill={ink} fillOpacity={0.14} />
        <text x={W / 2} y={593} textAnchor="middle" dominantBaseline="central" fontSize={26} fontWeight={600} fill={ink}>
          {door}
        </text>
      </g>
    </g>
  );
}

function Call({ design, seconds }: { design: Design; seconds: number }) {
  const c = callOverlayAt(seconds);
  if (!c) return null;
  const accent = design.accent;
  const ink = inkOn(accent);
  const mask = design.widgets.find((wd) => wd.kind === 'patient')?.mask ?? true;
  const pop = 1 + 0.35 * (1 - ease(c.t / 0.6));
  const blink = c.t < 2.2 && Math.sin(c.t * 9) < -0.3;
  const wobble = Math.sin(c.t * 18) * 14 * Math.max(0, 1 - c.t / 1.4);
  return (
    <g transform={`translate(0 ${-H * (1 - c.shown)})`} fontFamily={FONT}>
      <rect width={W} height={H} fill={accent} />
      <rect width={W} height={H} fill="#000000" fillOpacity={0.12} />
      <g transform={`translate(${W / 2} 120) rotate(${wobble})`}>
        <path d="M-26 18 Q-26 -26 0 -30 Q26 -26 26 18 L34 26 L-34 26 Z" fill={ink} />
        <circle cy={34} r={7} fill={ink} />
      </g>
      <text x={W / 2} y={215} textAnchor="middle" fontSize={34} fontWeight={700} letterSpacing={8} fill={ink} fillOpacity={0.85}>
        SIRADAKİ HASTA
      </text>
      <g transform={`translate(${W / 2} 390) scale(${pop})`} opacity={blink ? 0.35 : 1}>
        <text textAnchor="middle" dominantBaseline="central" fontSize={240} fontWeight={900} fill={ink}>
          {c.patient.no}
        </text>
      </g>
      <text x={W / 2} y={560} textAnchor="middle" fontSize={56} fontWeight={700} fill={ink}>
        {nameFor(c.patient, mask)}
      </text>
      <text x={W / 2} y={660} textAnchor="middle" fontSize={28} fill={ink} fillOpacity={0.85}>
        Lütfen muayene odasına giriniz
      </text>
    </g>
  );
}

export function Overlay({ design, seconds, now }: { design: Design; seconds: number; now: Date }) {
  if (design.motion !== 'gecisli') return null;
  if (design.preset === 'hastane') return <Call design={design} seconds={seconds} />;
  const o = overlayAt(seconds, design.preset);
  if (!o) return null;
  return o.kind === 'next' ? <NextStop o={o} design={design} now={now} /> : <Arrive o={o} design={design} />;
}
