import { useState } from 'react';
import { createPortal } from 'react-dom';
import { projectsOf } from '../../game/data/portfolios';
import { SiteBrowser } from '../pc/sites/SiteBrowser';
import { useGameStore } from '../../game/store/store';
import styles from './ProjectList.module.css';

/**
 * CV'nin Projeler bölümü: adı, tek cümlelik açıklaması ve varsa adresi. Adres sıradan bir bağlantı
 * gibi görünür; tıklayınca site portal penceresinin tamamında açılır. Hüküm vermez, siteye oyuncu
 * bakar. Sitesi olmayan projeler yalnızca yazılı durur.
 */
export function ProjectList({ id, disabled }: { id: string; disabled: boolean }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const noteSite = useGameStore((s) => s.noteSite);
  const projects = projectsOf(id);
  if (!projects.length) return null;
  const site = projects.find((p) => p.site)?.site;
  return (
    <>
      <ul className={styles.list}>
        {projects.map((p) => (
          <li key={p.name}>
            <b>{p.name}</b>
            <span>{p.desc}</span>
            {p.link && (
              <a
                href={`https://${p.link}`}
                className={styles.link}
                aria-disabled={disabled}
                onClick={(e) => {
                  e.preventDefault();
                  if (disabled) return;
                  noteSite(id);
                  setHost(e.currentTarget.closest<HTMLElement>('[data-site-host]') ?? document.body);
                }}
              >
                {p.link}
              </a>
            )}
            {!p.link && <small className={styles.none}>Sitesi yok</small>}
          </li>
        ))}
      </ul>
      {host && site && createPortal(<SiteBrowser site={site} onClose={() => setHost(null)} />, host)}
    </>
  );
}
