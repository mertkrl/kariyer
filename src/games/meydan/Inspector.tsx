import { useState } from 'react';
import { OPTIONS, SITE_OPTIONS, SWATCHES, applies, type BuildingShape, type Choice, type Defects, type Place, type Site, type SiteKey, type Spec, type SpecKey } from './model';
import { DEFECT_LABEL, buildingCost, defectState, formatCost, seismic, type Report } from './report';
import styles from './Inspector.module.css';

/*
 * Sağ paneldeki ayarlar: seçili binanın renkleri, mimarın seçenekleri (cephe, doğrama, korkuluk,
 * çatı, saçak, vitrin, aydınlatma) ve mühendisin seçenekleri (güçlendirme, kaçak kat); hiçbir şey
 * seçili değilken meydanın zemini, yeşili ve direkleri. Her seçeneğin birim fiyatı ve bir cümlelik
 * notu yanında durur; sahnenin üstündeki şerit projenin puanını ve bedelini canlı gösterir.
 */

const FIX: Record<keyof Defects, string> = {
  illegal: 'Yapı sekmesinde yık ya da ruhsatlandır.',
  bare: 'Bir cephe malzemesi seç.',
  enclosed: 'Yeni bir korkuluk seç.',
  patch: 'Bir cephe malzemesi seç.',
  leanTo: 'Çatıyı yenile.',
  cracked: 'Yapı sekmesinde güçlendir.',
};

const UNIT: Partial<Record<SpecKey, string>> = { cladding: 'm²', windows: 'pencere', railing: 'balkon', roof: 'm²', eave: 'm', structure: 'm²' };

const ARCH: SpecKey[] = ['cladding', 'windows', 'railing', 'roof', 'eave', 'shopfront', 'lighting'];
const ENG: SpecKey[] = ['structure', 'extra'];

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (c: string) => void }) {
  return (
    <fieldset className={styles.color}>
      <legend>{label}</legend>
      <div className={styles.swatches}>
        {SWATCHES.map((c) => (
          <button key={c} type="button" className={styles.swatch} style={{ background: c }} aria-label={c} aria-pressed={value === c} onClick={() => onChange(c)} />
        ))}
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={`${label}: özel renk`} />
      </div>
    </fieldset>
  );
}

function price(ch: Choice, unit?: string) {
  if (!ch.cost) return '—';
  return unit ? `${ch.cost.toLocaleString('tr-TR')} ₺/${unit}` : formatCost(ch.cost);
}

function OptionField({ label, who, choices, value, unit, local, onChange }: { label: string; who?: string; choices: Record<string, Choice>; value: string; unit?: string; local?: string[]; onChange: (v: string) => void }) {
  const chosen = choices[value];
  return (
    <fieldset className={styles.option}>
      <legend>
        {label}
        {who && <small>{who}</small>}
      </legend>
      <div className={styles.choices}>
        {Object.entries(choices).map(([k, ch]) => (
          <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)}>
            <span>
              {ch.label}
              {local?.includes(k) && <em className={styles.local}>yöresel</em>}
            </span>
            <small>{price(ch, unit)}</small>
          </button>
        ))}
      </div>
      {chosen && <p className={styles.optNote}>{chosen.note}</p>}
    </fieldset>
  );
}

type Tab = 'renk' | 'mimari' | 'yapi';

export function BuildingPanel({ place, b, s, onSpec, onClear }: { place: Place; b: BuildingShape; s: Spec; onSpec: (p: Partial<Spec>) => void; onClear: () => void }) {
  const [tab, setTab] = useState<Tab>('mimari');
  const defects = Object.entries(defectState(b, s)) as [keyof Defects, boolean][];
  const quake = seismic(b, s);
  const covered = s.cladding === 'tugla' || s.cladding === 'ahsap' || s.cladding === 'kompozit' || s.cladding === 'tas';
  return (
    <>
      <header className={styles.head}>
        <h2>{b.name}</h2>
        <p>
          {b.year} yapımı · {b.floors ? `${b.floors} kat + zemin` : 'tek katlı'}
        </p>
      </header>
      {defects.length > 0 && (
        <ul className={styles.defects} aria-label="Kusurlar">
          {defects.map(([k, isOpen]) => (
            <li key={k} data-open={isOpen}>
              <b>{isOpen ? '✗' : '✓'}</b> {DEFECT_LABEL[k]}
              {isOpen && <small>{FIX[k]}</small>}
            </li>
          ))}
        </ul>
      )}
      <div className={styles.tabs} role="tablist">
        {(
          [
            ['mimari', 'Mimari'],
            ['yapi', 'Yapı'],
            ['renk', 'Renk'],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'renk' && (
        <>
          <ColorField label={covered ? 'Cephe (malzeme kapatıyor)' : 'Cephe'} value={s.wall} onChange={(c) => onSpec({ wall: c })} />
          <ColorField label="Doğrama ve korniş" value={s.trim} onChange={(c) => onSpec({ trim: c })} />
          <ColorField label="Zemin kat" value={s.shop} onChange={(c) => onSpec({ shop: c })} />
        </>
      )}
      {tab === 'mimari' &&
        ARCH.filter((k) => applies(b, k)).map((k) => (
          <OptionField key={k} label={OPTIONS[k].label} choices={OPTIONS[k].choices} value={s[k] as string} unit={UNIT[k]} local={k === 'cladding' ? place.local : undefined} onChange={(v) => onSpec({ [k]: v })} />
        ))}
      {tab === 'yapi' && (
        <>
          <p className={quake.safe ? styles.safe : styles.risk}>
            <b>{quake.safe ? 'Deprem: güvenli' : 'Deprem: riskli'}</b>
            {quake.note}
          </p>
          {ENG.filter((k) => applies(b, k)).map((k) => (
            <OptionField key={k} label={OPTIONS[k].label} who={OPTIONS[k].who} choices={OPTIONS[k].choices} value={s[k] as string} unit={UNIT[k]} onChange={(v) => onSpec({ [k]: v })} />
          ))}
        </>
      )}
      <p className={styles.cost}>
        Bu binanın keşfi <b>{formatCost(buildingCost(b, s))}</b>
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.danger} onClick={onClear}>
          Bu cepheyi temizle
        </button>
      </div>
    </>
  );
}

export function SitePanel({ site, onSite, onSignCode, stats }: { site: Site; onSite: (p: Partial<Site>) => void; onSignCode: () => void; stats: { label: string; value: number }[] }) {
  return (
    <>
      <header className={styles.head}>
        <h2>Meydan</h2>
        <p>Bir binaya ya da tabelaya tıkla. Hiçbir şey seçili değilken meydanın kendisini düzenlersin.</p>
      </header>
      {(Object.keys(SITE_OPTIONS) as SiteKey[]).map((k) => (
        <OptionField key={k} label={SITE_OPTIONS[k].label} choices={SITE_OPTIONS[k].choices} value={site[k]} unit={k === 'paving' ? 'm²' : undefined} onChange={(v) => onSite({ [k]: v } as Partial<Site>)} />
      ))}
      <fieldset className={styles.option}>
        <legend>
          Tabela yönetmeliği<small>Mimar</small>
        </legend>
        <p className={styles.optNote}>Her dükkâna vitrinin üstünde tek pano, aynı hizada; afişler ve cam folyolar sökülür.</p>
        <button type="button" className={styles.wide} onClick={onSignCode}>
          Yönetmeliği uygula
        </button>
      </fieldset>
      <dl className={styles.stats}>
        {stats.map((s) => (
          <div key={s.label}>
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

/** Sahnenin üstündeki şerit: estetik puan, deprem, açık kusur ve keşif bedeli. */
export function ScoreStrip({ r }: { r: Report }) {
  const tone = r.score >= 60 ? 'good' : r.score >= 35 ? 'mid' : 'bad';
  return (
    <div className={styles.strip} aria-label="Proje raporu">
      <div className={styles.meter} data-tone={tone}>
        <span>Estetik</span>
        <b>{r.score}</b>
        <i>
          <i style={{ width: `${r.score}%` }} />
        </i>
        <small>önce {r.scoreBefore}</small>
      </div>
      <div data-tone={r.safe === r.total ? 'good' : 'bad'}>
        <span>Deprem</span>
        <b>
          {r.safe}/{r.total}
        </b>
        <small>güvenli bina</small>
      </div>
      <div data-tone={r.defectsOpen ? 'bad' : 'good'}>
        <span>Açık kusur</span>
        <b>{r.defectsOpen}</b>
        <small>önce {r.defectsBefore}</small>
      </div>
      <div>
        <span>Keşif</span>
        <b>{formatCost(r.cost)}</b>
        <small>yaklaşık</small>
      </div>
    </div>
  );
}
