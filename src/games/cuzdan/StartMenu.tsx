import { useEffect, useRef } from 'react';
import { hrefOf } from '../../arcade/route';
import { isOldLira, type Year } from './data';
import { AppIcon, type IconId } from './icons';
import type { Persona, Theme } from './model';
import m from './StartMenu.module.css';

/*
 * Cüzdan TL'nin başlat menüsü, üç dönemde üç düzen (aynı içerik, StartMenu.module.css):
 * - 2002–2005: iki sütun; solda beyaz zeminde masalar, sağda açık mavi zeminde belgeler ve ayarlar,
 *   altta mavi şeritte "Kullanıcı değiştir" ve kırmızı "Mesaiyi bitir".
 * - 2008–2012: koyu cam; solda beyaz liste, sağda cam üstünde kullanıcı resmi ve bağlantılar, güç
 *   düğmesi sağ sütunun dibinde.
 * - 2016–2020: ortada açılan kart; üstte sabitlenmiş simgeler ızgarası, altta kullanıcı ve güç.
 * "Mesaiyi bitir" salona döner; Escape ya da dışarı tıklama menüyü kapatır.
 */

const GAMES: { id: IconId; label: string; desc: string }[] = [
  { id: 'gunluk', label: 'Günün Sepeti', desc: 'Bugünün 5 sorusu, herkese aynı' },
  { id: 'gecmis', label: 'Geçmişi Bil', desc: 'Bugünkü fiyattan o yılkini bul' },
  { id: 'ucuz', label: 'Hangisi Ucuz?', desc: 'İki etiketten ucuzunu seç' },
  { id: 'web', label: 'Zaman Bakkalı', desc: "O yılın harçlığıyla alışveriş" },
  { id: 'oyun', label: 'Dönemin Oyunu', desc: 'Her dönemde başka bir mini oyun' },
];
const TOOLS: { id: IconId; label: string }[] = [
  { id: 'not', label: 'bordro.txt' },
  { id: 'saat', label: 'Saati Geri Al' },
  { id: 'muzik', label: 'Medya Çalar' },
];

export function StartMenu({ theme, year, persona, onOpen, onLogout, onClose }: { theme: Theme; year: Year; persona: Persona; onOpen: (id: IconId) => void; onLogout: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const out = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (!ref.current?.contains(t) && !t.closest('[data-start]')) onClose();
    };
    window.addEventListener('keydown', key);
    window.addEventListener('pointerdown', out);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('pointerdown', out);
    };
  }, [onClose]);

  const money = isOldLira(year) ? 'eski TL' : year < 2009 ? 'YTL' : 'TL';
  const flat = theme === 'flat';

  return (
    <div ref={ref} className={m.menu} role="menu" aria-label="Cüzdan menüsü">
      <div className={m.head}>
        <span className={m.avatar} aria-hidden="true">
          {persona.avatar}
        </span>
        <span className={m.who}>
          <b>{persona.name}</b>
          <small>
            {persona.role} · {year} · {money}
          </small>
        </span>
      </div>

      <div className={m.body}>
        <div className={m.left}>
          {flat && <div className={m.section}>Sabitlenmiş</div>}
          <div className={m.games}>
            {GAMES.map((g) => (
              <button key={g.id} type="button" role="menuitem" className={m.game} onClick={() => onOpen(g.id)}>
                <AppIcon id={g.id} theme={theme} size={flat ? 34 : 32} />
                <span>
                  <b>{g.label}</b>
                  <small>{g.desc}</small>
                </span>
              </button>
            ))}
            {flat &&
              TOOLS.map((t) => (
                <button key={t.id} type="button" role="menuitem" className={m.game} onClick={() => onOpen(t.id)}>
                  <AppIcon id={t.id} theme={theme} size={34} />
                  <span>
                    <b>{t.label}</b>
                  </span>
                </button>
              ))}
          </div>
        </div>
        {!flat && (
          <div className={m.right}>
            {TOOLS.map((t) => (
              <button key={t.id} type="button" role="menuitem" className={m.link} onClick={() => onOpen(t.id)}>
                <AppIcon id={t.id} theme={theme} size={22} />
                {t.label}
              </button>
            ))}
            <div className={m.sep} />
            <p className={m.hint}>
              Saat <b>{year}</b>.{year > 2002 ? ' Milyonlu eski lirayı görmek için saati 2002’ye al.' : ' Altı sıfır 2005’te atılacak.'}
            </p>
          </div>
        )}
      </div>

      <div className={m.foot}>
        <button type="button" role="menuitem" className={m.footBtn} onClick={onLogout}>
          <span className={`${m.footIcon} ${m.user}`} aria-hidden="true">
            👤
          </span>
          Kullanıcı değiştir
        </button>
        <a role="menuitem" className={m.footBtn} href={hrefOf('arcade')}>
          <span className={`${m.footIcon} ${m.power}`} aria-hidden="true">
            ⏻
          </span>
          Mesaiyi bitir
        </a>
      </div>
    </div>
  );
}
