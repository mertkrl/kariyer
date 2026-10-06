import { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../../audio/audioEngine';
import { MAX_SUGAR, SIP_VOLUME, TEA_HOT_MS, TEA_LINES, pick } from './lunch';
import { GLASS_HEIGHT, TAVSAN_KANI, glassHalfWidth, heightForVolume, planPour, runPour, teaColors, type PourElements } from './teaPour';
import type { Reactions } from './useReactions';

type PoolNode = 'droplets' | 'rings' | 'foam';
type SingleNode = Exclude<keyof PourElements, PoolNode | 'stops'>;

/** Çay bardağı: dökme (önce demlik, sonra su), şeker, karıştırma, yudumlama, soğuma. */
export function useTea({ say, bump, later }: Pick<Reactions, 'say' | 'bump' | 'later'>) {
  const [teaVolume, setTeaVolume] = useState(1);
  const [teaConcentration, setTeaConcentration] = useState(TAVSAN_KANI);
  const [teaHotUntil, setTeaHotUntil] = useState(() => Date.now() + TEA_HOT_MS);
  const [now, setNow] = useState(() => Date.now());
  const [sugar, setSugar] = useState(0);
  const [undissolved, setUndissolved] = useState(0);
  const [glasses, setGlasses] = useState(1);
  const [stirring, setStirring] = useState(false);
  const [pouring, setPouring] = useState(false);
  const pourEls = useRef<Partial<PourElements>>({ droplets: [], rings: [], foam: [] });
  const cancelPour = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelPour.current?.(), []);
  const [drops, setDrops] = useState<number[]>([]);
  const dropSeq = useRef(0);

  // sen bakmazken çay soğur
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 2000);
    return () => window.clearInterval(interval);
  }, []);

  const teaHot = now < teaHotUntil;
  const teaEmpty = teaVolume < 0.02;

  function sipTea() {
    if (pouring || stirring) return;
    if (teaEmpty) {
      say('Bardak boş. Çaydanlıktan bir tane daha koy.');
      return;
    }
    audioEngine.playSip();
    bump('tea');
    const next = Math.max(0, teaVolume - SIP_VOLUME);
    const wasFull = teaVolume > 0.97;
    setTeaVolume(next < 0.02 ? 0 : next);
    if (next < 0.02) say('Bardağın dibini gördün. Bir çay daha?');
    else if (!teaHot) say('Çay soğumuş… Çaydanlıktan tazelesen iyi olur.');
    else if (undissolved > 0) say('Şeker dipte kaldı. Önce bir karıştır.');
    else if (sugar >= 3) say('Bu kadar şeker biraz fazla… ama mola senin.');
    else if (teaConcentration > 0.6) say('Bu çay fazla demli… tavşan kanı değil, zift gibi.');
    else if (teaConcentration < 0.25) say('Biraz açık olmuş, ama içilir.');
    else if (sugar === 0 && wasFull) say('Şekersiz, demli. Tam İK çayı.');
    else say(pick(TEA_LINES));
  }

  function addSugar() {
    if (pouring) return;
    if (teaEmpty) {
      say('Önce çay koy, sonra şeker.');
      return;
    }
    if (sugar >= MAX_SUGAR) {
      say('Şekerlik bitmek üzere. Bu kadarı yeter :)');
      return;
    }
    const dropId = ++dropSeq.current;
    setDrops((d) => [...d, dropId]);
    bump('sugar');
    // Küp şekerlikten kavis çizer, çaya düşer (~0.7 sn), sonra dibe çöker (~1.2 sn).
    later(() => audioEngine.playClink(), 680);
    later(() => {
      setSugar((s) => s + 1);
      setUndissolved((u) => u + 1);
      setDrops((d) => d.filter((x) => x !== dropId));
    }, 1220);
    const n = sugar + 1;
    say(n === 1 ? 'Bir kesme şeker attın. Karıştırmayı unutma.' : `${n} şeker oldu. Tatlı dil yılanı deliğinden çıkarır.`);
  }

  function stir() {
    if (stirring || pouring) return;
    // Eriyecek bir şey yok, karıştırılacak bir şey yok.
    if (teaEmpty || sugar === 0) {
      say(teaEmpty ? 'Bardak boş, karıştıracak bir şey yok.' : 'Çayında şeker yok — karıştırmaya gerek yok.');
      return;
    }
    setStirring(true);
    audioEngine.playClink(5);
    later(() => {
      setStirring(false);
      setUndissolved(0);
    }, 950);
    if (undissolved > 0) say('Şıkır şıkır… Şekerler eridi.');
    else say('Kaşık bardağa çarptı: şıkır şıkır. Yemekhanenin müziği.');
  }

  function pourTea() {
    if (pouring || stirring) return;
    if (teaVolume > 0.97 && teaHot) {
      say('Bardak zaten dolu. Önce bir yudum al.');
      return;
    }
    const els = pourEls.current;
    if (!els.demlik || !els.kettle || !els.stream || !els.fill || !els.surface || !els.stops) return;

    // Dolu ama soğumuş bardak önce boşaltılır.
    let startVolume = teaVolume;
    let startConcentration = teaConcentration;
    const newGlass = teaEmpty;
    if (teaVolume > 0.97) {
      startVolume = 0;
      startConcentration = 0;
      setTeaVolume(0);
    }

    setPouring(true);
    cancelPour.current = runPour(planPour(startVolume, startConcentration), els as PourElements, {
      onStage: (kind) =>
        say(
          kind === 'brew'
            ? 'Önce demlikten koyu çay… (acele etme, dem önemli)'
            : 'Sonra çaydanlıktan kaynar su. Rengine bak: tavşan kanı!',
        ),
      onDone: (volume, concentration) => {
        cancelPour.current = null;
        setTeaVolume(volume);
        setTeaConcentration(concentration);
        setTeaHotUntil(Date.now() + TEA_HOT_MS);
        setNow(Date.now());
        if (newGlass) {
          setGlasses((g) => g + 1);
          setSugar(0);
          setUndissolved(0);
        }
        setPouring(false);
        say(newGlass ? `${glasses + 1}. bardak hazır. Tavşan kanı, ince belli bardakta.` : 'Çayını tazeledin, yine sıcacık.');
      },
    });
  }

  function setStop(i: 0 | 1 | 2, node: SVGStopElement | null) {
    if (!node) return;
    const stops = (pourEls.current.stops ?? [node, node, node]) as PourElements['stops'];
    stops[i] = node;
    pourEls.current.stops = stops;
  }

  /** Çizilen bardağı, çaydanlığı ve akışı dökme animasyonuna veren ref geri çağrıları. */
  function bindPour<K extends SingleNode>(key: K) {
    return (node: PourElements[K] | null) => {
      pourEls.current[key] = node ?? undefined;
    };
  }
  function bindPool<K extends PoolNode>(key: K, i: number) {
    return (node: PourElements[K][number] | null) => {
      if (node) (pourEls.current[key] as PourElements[K][number][])[i] = node;
    };
  }

  const teaHeight = heightForVolume(teaVolume);
  return {
    bindPour,
    bindPool,
    setStop,
    sipTea,
    addSugar,
    stir,
    pourTea,
    pouring,
    stirring,
    drops,
    undissolved,
    teaHot,
    teaEmpty,
    teaHeight,
    teaFrac: teaHeight / GLASS_HEIGHT,
    teaSurfaceScale: glassHalfWidth(teaHeight) / 28,
    teaTint: teaColors(teaConcentration),
  };
}

export type Tea = ReturnType<typeof useTea>;
