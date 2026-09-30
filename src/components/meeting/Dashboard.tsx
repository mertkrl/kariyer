import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import {
  ATS_PASSED,
  COLLEAGUE_STATS,
  PLAYER,
  DAILY_APPLICATIONS,
  SHORTLIST,
  TOTAL_APPLICATIONS,
  type Board,
  type BoardMetric,
  type BoardPage,
  type TeamStats,
} from '../../game/meeting';
import styles from './Dashboard.module.css';

/*
 * Selin's shared screen: a BI report the way these tools look — a dark title bar, visuals on
 * white cards, page tabs along the bottom. It follows the conversation: whoever is being talked
 * about gets cross-filtered (everything else fades), the numbers count up to the new values,
 * and Selin's pointer drifts to what she is showing.
 */

const PAGES: { id: Exclude<BoardPage, 'off'>; label: string }[] = [
  { id: 'overview', label: 'Genel Bakış' },
  { id: 'people', label: 'Kişi Bazında' },
  { id: 'shortlist', label: 'Cuma Kısa Liste' },
  { id: 'funnel', label: 'Eleme Hunisi' },
];

const METRICS: { id: BoardMetric; label: string; unit: string; fmt: (t: TeamStats) => number }[] = [
  { id: 'files', label: 'İncelenen dosya', unit: '', fmt: (t) => t.files },
  { id: 'avg', label: 'Ort. süre (sn)', unit: ' sn', fmt: (t) => t.avg },
  { id: 'invites', label: 'Mülakat daveti', unit: '', fmt: (t) => t.invites },
  { id: 'ai', label: 'YZ kullanımı', unit: '%', fmt: (t) => Math.round(t.ai * 100) },
];

/** The report's colour theme (a BI tool's default categorical palette). */
const PERSON_COLOR: Record<string, string> = { emre: '#118dff', ayse: '#12239e', you: '#e66c37' };
const nf = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });

/** A number that counts from its previous value to the new one. */
function Count({ value, prefix = '', suffix = '', decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / 700);
      const e = 1 - Math.pow(1 - k, 3);
      const v = a + (value - a) * e;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value]);
  const n = decimals ? Number(shown.toFixed(decimals)) : Math.round(shown);
  return (
    <>
      {prefix}
      {nf.format(n)}
      {suffix}
    </>
  );
}

function Card({ title, children, hot, className }: { title: string; children: ReactNode; hot?: boolean; className?: string }) {
  return (
    <section className={`${styles.card} ${hot ? styles.hot : ''} ${className ?? ''}`} data-hot={hot || undefined}>
      <h4>{title}</h4>
      {children}
    </section>
  );
}

function Kpi({ label, value, suffix, prefix, hot, tone, decimals }: { label: string; value: number; suffix?: string; prefix?: string; hot?: boolean; tone?: 'alert'; decimals?: number }) {
  return (
    <section className={`${styles.card} ${styles.kpi} ${hot ? styles.hot : ''} ${tone === 'alert' ? styles.alert : ''}`} data-hot={hot || undefined}>
      <b>
        <Count value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
      </b>
      <small>{label}</small>
    </section>
  );
}

function Overview({ team, focus }: { team: Record<string, TeamStats>; focus: string[] }) {
  const reviewed = Object.values(team).reduce((n, t) => n + t.files, 0);
  const invites = Object.values(team).reduce((n, t) => n + t.invites, 0);
  const human = (reviewed / TOTAL_APPLICATIONS) * 100;
  const max = Math.max(...DAILY_APPLICATIONS.map(([, v]) => v));
  const hot = focus.includes('human');
  // donut: who made the call on this week's applications
  const r = 38;
  const c = 2 * Math.PI * r;
  const humanArc = (reviewed / TOTAL_APPLICATIONS) * c;
  return (
    <div className={styles.gridOverview}>
      <Kpi label="Toplam başvuru" value={TOTAL_APPLICATIONS} />
      <Kpi label="İnsan incelemesi" value={reviewed} hot={hot} />
      <Kpi label="Mülakat daveti" value={invites} />
      <Kpi label="İnsan gözü oranı" value={human} prefix="%" decimals={1} tone="alert" hot={hot} />
      <Card title="Günlük başvuru · Pzt–Çar" className={styles.span2}>
        <div className={styles.columns}>
          {DAILY_APPLICATIONS.map(([d, v]) => (
            <div key={d} className={styles.column}>
              <span className={styles.colValue}>{nf.format(v)}</span>
              <span className={styles.colBar} style={{ height: `${(v / max) * 100}%` }} />
              <span className={styles.colLabel}>{d}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Kararı kim verdi?" className={styles.span2} hot={hot}>
        <div className={styles.donutWrap}>
          <svg viewBox="0 0 100 100" className={styles.donut}>
            <circle cx="50" cy="50" r={r} fill="none" stroke="#118dff" strokeWidth="16" />
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="#e66c37"
              strokeWidth={hot ? 20 : 16}
              strokeDasharray={`${humanArc} ${c}`}
              transform="rotate(-90 50 50)"
              className={styles.arc}
            />
          </svg>
          <ul className={styles.legend}>
            <li>
              <i style={{ background: '#118dff' }} /> Sistem (ATS) <b>{nf.format(TOTAL_APPLICATIONS - reviewed)}</b>
            </li>
            <li className={hot ? styles.legendHot : undefined}>
              <i style={{ background: '#e66c37' }} /> İnsan <b>{nf.format(reviewed)}</b>
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

function People({ team, focus, metric }: { team: Record<string, TeamStats>; focus: string[]; metric: BoardMetric }) {
  const m = METRICS.find((x) => x.id === metric)!;
  const rows = (['emre', 'ayse', 'you'] as const).map((id) => ({ id, name: id === 'you' ? PLAYER.first : id === 'emre' ? 'Emre' : 'Ayşe', t: team[id] }));
  const max = Math.max(1, ...rows.map((r) => m.fmt(r.t)));
  const filtered = focus.filter((f) => f in team);
  const dim = (id: string) => filtered.length > 0 && !filtered.includes(id);
  // with one person selected, the cards show that person (a cross-filter); otherwise the team
  const one = filtered.length === 1 ? team[filtered[0]] : null;
  const sum = (f: (t: TeamStats) => number) => rows.reduce((n, r) => n + f(r.t), 0);
  const files = one ? one.files : sum((t) => t.files);
  const avg = one ? one.avg : Math.round(sum((t) => t.avg * t.files) / Math.max(1, files));
  const ai = one ? one.ai * 100 : (sum((t) => t.ai * t.files) / Math.max(1, files)) * 100;
  return (
    <div className={styles.gridPeople}>
      <div className={styles.slicer}>
        <span>Ölçü</span>
        {METRICS.map((x) => (
          <em key={x.id} className={x.id === metric ? styles.slicerOn : undefined}>
            {x.label}
          </em>
        ))}
        <span className={styles.filterChip}>{filtered.length ? `Filtre: ${filtered.map((f) => (f === 'you' ? PLAYER.first : f === 'emre' ? 'Emre' : 'Ayşe')).join(', ')}` : 'Filtre yok'}</span>
      </div>
      <Kpi label={one ? 'Dosya (seçili)' : 'Dosya (ekip)'} value={files} hot={metric === 'files' && !!one} />
      <Kpi label={one ? 'Ort. süre (seçili)' : 'Ort. süre (ekip)'} value={avg} suffix=" sn" hot={metric === 'avg' && !!one} />
      <Kpi label={one ? 'YZ kullanımı (seçili)' : 'YZ kullanımı (ekip)'} value={ai} prefix="%" hot={metric === 'ai' && !!one} />
      <Card title={`${m.label} · kişi bazında`} className={styles.span3}>
        <div className={styles.bars}>
          {rows.map((r) => {
            const v = m.fmt(r.t);
            const hot = filtered.includes(r.id);
            return (
              <div key={r.id} className={`${styles.barRow} ${dim(r.id) ? styles.dim : ''}`} data-hot={hot || undefined}>
                <span className={styles.barName}>{r.name}</span>
                <span className={styles.barTrack}>
                  <span className={styles.bar} style={{ width: `${Math.max(1.5, (v / max) * 100)}%`, background: PERSON_COLOR[r.id] }} />
                  {metric === 'avg' && <span className={styles.target} style={{ left: `${(20 / max) * 100}%` }} title="Hedef: 20 sn" />}
                </span>
                <span className={styles.barValue}>
                  {m.id === 'ai' ? '%' : ''}
                  <Count value={v} />
                  {m.id === 'avg' ? ' sn' : ''}
                </span>
              </div>
            );
          })}
        </div>
        {metric === 'avg' && <p className={styles.note}>┆ Hedef: dosya başına 20 sn</p>}
      </Card>
    </div>
  );
}

function Shortlist({ focus, you }: { focus: string[]; you: TeamStats }) {
  const dim = (id: string) => focus.length > 0 && !focus.includes(id);
  // the table has room for a few of your own; the rest are counted
  const picks = (you.picks ?? []).slice(0, 3);
  const more = (you.picks?.length ?? 0) - picks.length;
  const all = [...SHORTLIST.map((c) => c.ats), ...(you.picks ?? []).map((c) => c.ats)];
  return (
    <div className={styles.gridShort}>
      <Card title="Cuma mülakat listesi · aday bazında" className={styles.span3}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Aday</th>
              <th>Öneren</th>
              <th>ATS skoru</th>
              <th>GitHub katkı (12 ay)</th>
              <th>Kariyer arası</th>
            </tr>
          </thead>
          <tbody>
            {SHORTLIST.map((c) => {
              const hot = focus.includes(c.id);
              return (
                <tr key={c.id} className={`${dim(c.id) ? styles.dim : ''} ${hot ? styles.rowHot : ''}`} data-hot={hot || undefined}>
                  <td>{c.name}</td>
                  <td>{c.by === 'ayse' ? 'Ayşe' : 'Emre'}</td>
                  <td>
                    <span className={styles.dataBar} style={{ width: `${c.ats * 0.6}px`, background: c.ats >= 90 ? '#118dff' : '#8fc3ff' }} />
                    {c.ats}
                  </td>
                  <td>
                    <span className={styles.dataBar} style={{ width: `${Math.max(2, c.commits / 7)}px`, background: c.commits ? '#1aab40' : '#d64550' }} />
                    {c.commits}
                  </td>
                  <td className={c.gap ? styles.flag : undefined}>{c.gap ? `${c.gap} yıl ⚠` : '—'}</td>
                </tr>
              );
            })}
            {picks.map((c) => (
              <tr key={c.id} className={focus.length ? styles.dim : undefined}>
                <td>{c.name}</td>
                <td>{PLAYER.first}</td>
                <td>
                  <span className={styles.dataBar} style={{ width: `${c.ats * 0.6}px`, background: c.ats >= 90 ? '#118dff' : c.ats >= 60 ? '#8fc3ff' : '#f2a8a0' }} />
                  {c.ats}
                </td>
                <td colSpan={2} className={styles.muted}>
                  Levent'in incelemesi bekleniyor
                </td>
              </tr>
            ))}
            {more > 0 && (
              <tr className={focus.length ? styles.dim : undefined}>
                <td colSpan={5} className={styles.muted}>
                  + {PLAYER.first}'nin {more} adayı daha
                </td>
              </tr>
            )}
            {!you.picks?.length && (
              <tr className={focus.length ? styles.dim : undefined}>
                <td>—</td>
                <td>{PLAYER.first}</td>
                <td colSpan={3} className={styles.muted}>
                  Henüz mülakata çağrılan aday yok
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
      <Kpi label="Ort. ATS skoru (liste)" value={all.reduce((n, v) => n + v, 0) / all.length} decimals={1} hot={focus.includes('sarp') && focus.length === 1} />
      <Kpi label="Kodu görülen aday" value={SHORTLIST.filter((c) => c.commits > 0).length} suffix={` / ${SHORTLIST.length}`} hot={focus.includes('nehir') && focus.includes('sarp')} />
      <Kpi label="Arası olan aday" value={SHORTLIST.filter((c) => c.gap > 0).length} tone="alert" hot={focus.length === 1 && focus[0] === 'nehir'} />
    </div>
  );
}

function Funnel({ team, focus, proposal }: { team: Record<string, TeamStats>; focus: string[]; proposal?: boolean }) {
  const reviewed = Object.values(team).reduce((n, t) => n + t.files, 0);
  const invites = Object.values(team).reduce((n, t) => n + t.invites, 0);
  const steps = [
    { id: 'applied', label: 'Başvuru', v: TOTAL_APPLICATIONS },
    { id: 'threshold', label: 'ATS eşiğini geçen (≥ %60)', v: ATS_PASSED },
    { id: 'human', label: 'İnsan incelemesi', v: reviewed },
    { id: 'invite', label: 'Mülakat daveti', v: invites },
  ];
  const eliminated = TOTAL_APPLICATIONS - reviewed;
  const hotElim = focus.includes('eliminated');
  const stepFocus = focus.some((f) => steps.some((s) => s.id === f));
  return (
    <div className={styles.gridFunnel}>
      <Card title="Eleme hunisi · bu hafta" className={`${styles.span2} ${styles.funnelCard}`}>
        <div className={styles.funnel}>
          {steps.map((s) => {
            const hot = focus.includes(s.id);
            return (
              <div key={s.id} className={`${styles.funnelRow} ${stepFocus && !hot ? styles.dim : ''}`} data-hot={hot || undefined}>
                <span className={styles.funnelBar} style={{ width: `${Math.max(3, Math.sqrt(s.v / TOTAL_APPLICATIONS) * 100)}%` }}>
                  <Count value={s.v} />
                </span>
                <small>{s.label}</small>
              </div>
            );
          })}
        </div>
      </Card>
      <Kpi label="Elenen · hiç okunmadı" value={eliminated} tone="alert" hot={hotElim} />
      <Kpi label={proposal ? `Elle kontrol · ${PLAYER.first}'nin önerisi (gün başına)` : 'Elenenlerden elle kontrol'} value={proposal ? 5 : 0} hot={hotElim} />
      <Card title="Neden elendi? (sistem gerekçesi)" className={styles.span2} hot={focus.includes('threshold')}>
        <ul className={styles.reasons}>
          {[
            ['ATS skoru < %60', 71],
            ['Anahtar kelime eksik', 14],
            ['Kariyer arası > 12 ay', 8],
            ['Yaş / lokasyon uyumu', 7],
          ].map(([l, p]) => (
            <li key={l as string}>
              <span>{l}</span>
              <span className={styles.reasonTrack}>
                <span style={{ width: `${p}%` }} />
              </span>
              <b>%{p}</b>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function Dashboard({ board, you }: { board: Board; you: TeamStats }) {
  const team: Record<string, TeamStats> = { emre: COLLEAGUE_STATS.emre, ayse: COLLEAGUE_STATS.ayse, you };
  const focus = board.focus ?? [];
  const canvasRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);

  // Selin's pointer goes to whatever is being talked about
  useLayoutEffect(() => {
    const root = canvasRef.current;
    if (!root) return;
    const id = window.setTimeout(() => {
      const hot = root.querySelector('[data-hot]');
      const r = root.getBoundingClientRect();
      if (!hot) {
        setPointer({ x: r.width * 0.86, y: r.height * 0.9 });
        return;
      }
      const h = hot.getBoundingClientRect();
      setPointer({ x: h.left - r.left + Math.min(h.width * 0.7, 180), y: h.top - r.top + h.height * 0.55 });
    }, 120);
    return () => window.clearTimeout(id);
  }, [board]);

  if (board.page === 'off') {
    return (
      <div className={styles.stopped}>
        <span className={styles.stoppedIcon}>🖥</span>
        Selin Aksoy ekran paylaşımını durdurdu.
      </div>
    );
  }

  return (
    <div className={styles.report}>
      <div className={styles.titleBar}>
        <span className={styles.logo}>▮▮▮</span>
        <b>İK Operasyon Panosu</b>
        <span className={styles.crumb}>/ Hafta 39 · Yazılım Geliştirici</span>
        <span className={styles.refresh}>Son yenileme 10:58</span>
      </div>
      <div ref={canvasRef} className={styles.canvas}>
        <div key={board.page} className={styles.page}>
          {board.page === 'overview' && <Overview team={team} focus={focus} />}
          {board.page === 'people' && <People team={team} focus={focus} metric={board.metric ?? 'avg'} />}
          {board.page === 'shortlist' && <Shortlist focus={focus} you={you} />}
          {board.page === 'funnel' && <Funnel team={team} focus={focus} proposal={board.proposal} />}
        </div>
        {pointer && (
          <svg className={styles.pointer} style={{ transform: `translate(${pointer.x}px, ${pointer.y}px)` }} viewBox="0 0 16 22" aria-hidden="true">
            <path d="M1 1 L1 17 L5 13 L8 20 L11 19 L8 12 L14 12 Z" fill="#fff" stroke="#111" strokeWidth="1.3" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <nav className={styles.tabs}>
        {PAGES.map((p) => (
          <span key={p.id} className={p.id === board.page ? styles.tabOn : undefined}>
            {p.label}
          </span>
        ))}
      </nav>
    </div>
  );
}
