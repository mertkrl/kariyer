import { useState } from 'react';
import type { LunchMenu } from '../../game/data/lunchMenus';
import { audioEngine } from '../../audio/audioEngine';
import { AYRAN_SIPS, BREAD_BITES, DISH_BITES, DISH_LINES, SOUP_COLORS, SOUP_SIPS, pick, type DishKey } from './lunch';
import type { Reactions } from './useReactions';

/** The tabldot: soup (with lemon), the tray's five dishes, two slices of bread and an ayran. */
export function useLunch(menu: LunchMenu, { say, bump, later }: Pick<Reactions, 'say' | 'bump' | 'later'>) {
  const [dishes, setDishes] = useState<Record<DishKey, number>>({ ...DISH_BITES });
  const [soup, setSoup] = useState(SOUP_SIPS);
  const [lemonSqueezed, setLemonSqueezed] = useState(false);
  const [lemonPhase, setLemonPhase] = useState<'plate' | 'lift' | 'squeeze'>('plate');
  const [juiceActive, setJuiceActive] = useState(false);
  const [bread, setBread] = useState([BREAD_BITES, BREAD_BITES]);
  const [ayran, setAyran] = useState({ open: false, level: AYRAN_SIPS });

  const foodLeft = Object.values(dishes).reduce((a, b) => a + b, 0) + soup + bread[0] + bread[1] + ayran.level;

  function checkAllDone(nextLeft: number) {
    if (nextLeft === 0) {
      later(() => say('Afiyet olsun! Tepsi tertemiz — bulaşıkhane seni sevecek.'), 900);
    }
  }
  function eatDish(key: DishKey) {
    const name = menu[key].name;
    if (dishes[key] === 0) {
      say(`${name} bitti. Tabak tertemiz.`);
      return;
    }
    audioEngine.playBite();
    bump(key);
    const next = dishes[key] - 1;
    setDishes((d) => ({ ...d, [key]: next }));
    say(next === 0 ? `${name} bitti. Eline sağlık aşçıbaşı!` : pick(DISH_LINES[key](name)));
    checkAllDone(foodLeft - 1);
  }

  function sipSoup() {
    if (soup === 0) {
      say('Çorba kasesi boş. Keşke bir kepçe daha olsa.');
      return;
    }
    audioEngine.playSip();
    bump('soup');
    const next = soup - 1;
    setSoup(next);
    if (next === 0) say(`${menu.soup.name} bitti. İçini ısıttı.`);
    else if (!lemonSqueezed && next === SOUP_SIPS - 2) say('Limon sıksan daha güzel olmaz mı?');
    else say(soup === SOUP_SIPS ? `Sıcacık ${menu.soup.name.toLowerCase()}. Önce çorba, sonra iş.` : 'Bir kaşık daha…');
    checkAllDone(foodLeft - 1);
  }

  function squeezeLemon() {
    if (lemonPhase !== 'plate') return;
    if (lemonSqueezed) {
      say('Limonun suyu kalmadı.');
      return;
    }
    // Lift over the bowl → squeeze (juice drips into the soup) → back to the plate.
    setLemonPhase('lift');
    later(() => {
      setLemonPhase('squeeze');
      audioEngine.playSqueeze();
      if (soup > 0) setJuiceActive(true);
    }, 560);
    later(() => {
      setLemonSqueezed(true);
      setLemonPhase('plate');
    }, 1700);
    later(() => setJuiceActive(false), 2600);
    say(soup > 0 ? 'Limonu çorbanın üstüne sıktın. Şimdi tam oldu.' : 'Limonu sıktın ama çorba çoktan bitmiş.');
  }

  function eatBread(i: number) {
    if (bread[i] === 0) return;
    audioEngine.playBite();
    bump(`bread${i}`);
    const next = bread.map((b, j) => (j === i ? b - 1 : b));
    setBread(next);
    say(next[0] + next[1] === 0 ? 'Ekmek bitti. Sepette hep bir dilim daha vardır…' : 'Ekmeksiz doymaz bu millet.');
    checkAllDone(foodLeft - 1);
  }

  function drinkAyran() {
    bump('ayran');
    if (!ayran.open) {
      audioEngine.playUiClick();
      setAyran({ open: true, level: ayran.level });
      say('Ayranın kapağını açtın. Az kalsın gömleğe sıçrıyordu.');
      return;
    }
    if (ayran.level === 0) {
      say('Ayran bitti. Bıyık yaptı mı?');
      return;
    }
    audioEngine.playSip();
    setAyran({ open: true, level: ayran.level - 1 });
    say(ayran.level === 1 ? 'Son yudum. Köpüklü ayran gibisi yok.' : 'Buz gibi ayran, tam yemeğin üstüne.');
    checkAllDone(foodLeft - 1);
  }

  return {
    dishes,
    eatDish,
    soup,
    sipSoup,
    soupRatio: soup / SOUP_SIPS,
    soupColors: SOUP_COLORS[menu.soup.kind],
    lemonPhase,
    lemonSqueezed,
    juiceActive,
    squeezeLemon,
    bread,
    eatBread,
    ayran,
    ayranRatio: ayran.level / AYRAN_SIPS,
    drinkAyran,
  };
}

export type Lunch = ReturnType<typeof useLunch>;
