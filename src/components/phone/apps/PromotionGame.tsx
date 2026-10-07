import { useEffect, useState } from 'react';
import { audioEngine } from '../../../audio/audioEngine';
import styles from './PromotionGame.module.css';

/* ── Terfi (kariyer basamaklı bir 2048) ──────────────────────────────────── */

type Dir = 'up' | 'down' | 'left' | 'right';

const SIZE = 4;
const LADDER = ['Stajyer', 'Junior', 'Uzman', 'Kıdemli', 'Takım Lideri', 'Müdür', 'Direktör', 'Genel Müdür', 'CEO', 'Yön. Kurulu', 'Hissedar'];
const LADDER_COLORS = ['#e9e4d6', '#e3d6b4', '#e8c07a', '#e8a15a', '#e0784a', '#d0584a', '#7c6a8c', '#4c7fb0', '#3f6b63', '#2f4a44', '#c9a227'];
const TERFI_BEST_KEY = 'kariyerweb-terfi-best';

interface Tile {
  id: number;
  level: number;
  r: number;
  c: number;
  isNew?: boolean;
  merged?: boolean;
}

let tileSeq = 1;

function spawnTile(tiles: Tile[]): Tile[] {
  const free: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!tiles.some((t) => t.r === r && t.c === c)) free.push([r, c]);
  if (free.length === 0) return tiles;
  const [r, c] = free[Math.floor(Math.random() * free.length)];
  return [...tiles, { id: tileSeq++, level: Math.random() < 0.9 ? 0 : 1, r, c, isNew: true }];
}

/** Her satırı/sütunu `dir` yönüne kaydırır; eşit komşuları hamle başına bir kez birleştirir. */
function slide(tiles: Tile[], dir: Dir): { tiles: Tile[]; gained: number; moved: boolean } {
  const horizontal = dir === 'left' || dir === 'right';
  const forward = dir === 'right' || dir === 'down';
  let gained = 0;
  let moved = false;
  const out: Tile[] = [];
  for (let line = 0; line < SIZE; line++) {
    const inLine = tiles
      .filter((t) => (horizontal ? t.r === line : t.c === line))
      .sort((a, b) => (horizontal ? a.c - b.c : a.r - b.r));
    if (forward) inLine.reverse();
    let pos = 0;
    for (let i = 0; i < inLine.length; i++) {
      const t = inLine[i];
      const next = inLine[i + 1];
      let level = t.level;
      let merged = false;
      if (next && next.level === t.level) {
        level += 1;
        merged = true;
        gained += 2 ** (level + 1);
        i++;
      }
      const idx = forward ? SIZE - 1 - pos : pos;
      const r = horizontal ? line : idx;
      const c = horizontal ? idx : line;
      if (r !== t.r || c !== t.c || merged) moved = true;
      out.push({ id: t.id, level, r, c, merged });
      pos++;
    }
  }
  return { tiles: out, gained, moved };
}

function canMove(tiles: Tile[]) {
  if (tiles.length < SIZE * SIZE) return true;
  return tiles.some((t) => tiles.some((u) => u.level === t.level && Math.abs(u.r - t.r) + Math.abs(u.c - t.c) === 1));
}

function newBoard() {
  return spawnTile(spawnTile([]));
}

export function PromotionGame() {
  const [tiles, setTiles] = useState<Tile[]>(newBoard);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => {
    try {
      const stored = Number(localStorage.getItem(TERFI_BEST_KEY));
      return Number.isSafeInteger(stored) && stored > 0 ? stored : 0;
    } catch {
      return 0;
    }
  });
  const [touch, setTouch] = useState<{ x: number; y: number } | null>(null);
  const over = !canMove(tiles);
  const top = tiles.reduce((m, t) => Math.max(m, t.level), 0);

  function move(dir: Dir) {
    if (over) return;
    const result = slide(tiles, dir);
    if (!result.moved) return;
    const next = spawnTile(result.tiles);
    setTiles(next);
    if (result.gained) {
      audioEngine.playUi('select', Math.min(3, Math.floor(Math.log2(result.gained) / 3)));
      setScore((s) => {
        const total = s + result.gained;
        if (total > best) {
          setBest(total);
          try {
            localStorage.setItem(TERFI_BEST_KEY, String(total));
          } catch {
            // storage unavailable
          }
        }
        return total;
      });
    } else {
      audioEngine.playKeyTick();
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const map: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
      if (map[e.key]) {
        e.preventDefault();
        move(map[e.key]);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function reset() {
    setTiles(newBoard());
    setScore(0);
  }

  return (
    <div className={styles.game}>
      <div className={styles.scoreboard}>
        <div>
          <span className={styles.scoreLabel}>Puan</span>
          <span className={`${styles.scoreValue} mono`} key={score}>
            {score}
          </span>
        </div>
        <div>
          <span className={styles.scoreLabel}>Kariyer</span>
          <span className={styles.scoreTitle}>{LADDER[Math.min(top, LADDER.length - 1)]}</span>
        </div>
        <div>
          <span className={styles.scoreLabel}>Rekor</span>
          <span className={`${styles.scoreValue} mono`}>{best}</span>
        </div>
      </div>

      <div
        className={styles.terfiBoard}
        onPointerDown={(e) => setTouch({ x: e.clientX, y: e.clientY })}
        onPointerUp={(e) => {
          if (!touch) return;
          const dx = e.clientX - touch.x;
          const dy = e.clientY - touch.y;
          setTouch(null);
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
          move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
        }}
      >
        {Array.from({ length: SIZE * SIZE }).map((_, i) => (
          <span key={i} className={styles.terfiSlot} style={{ left: `${(i % SIZE) * 25}%`, top: `${Math.floor(i / SIZE) * 25}%` }} />
        ))}
        {tiles.map((t) => (
          <span
            key={t.id}
            className={styles.terfiTile}
            style={{ left: `${t.c * 25}%`, top: `${t.r * 25}%` }}
          >
            <span
              key={`${t.id}-${t.level}`}
              className={`${styles.terfiFace} ${t.isNew ? styles.terfiNew : ''} ${t.merged ? styles.terfiMerged : ''}`}
              style={{ background: LADDER_COLORS[Math.min(t.level, LADDER_COLORS.length - 1)], color: t.level >= 5 ? '#fff' : '#3a2e1c' }}
            >
              <b>{LADDER[Math.min(t.level, LADDER.length - 1)]}</b>
              <small className="mono">{2 ** (t.level + 1)}</small>
            </span>
          </span>
        ))}
        {over && (
          <div className={styles.gameOverlay}>
            <strong>Kariyer tıkandı</strong>
            <span>
              Ulaştığın unvan: {LADDER[Math.min(top, LADDER.length - 1)]} · {score} puan
            </span>
            <button className={styles.gameButton} onClick={reset}>
              Yeniden başla
            </button>
          </div>
        )}
      </div>
      <span className={styles.gameHint}>Aynı unvanları kaydırıp birleştir → terfi. Yön tuşları ya da parmakla kaydır.</span>
    </div>
  );
}
