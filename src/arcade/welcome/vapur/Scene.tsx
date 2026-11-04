import type { CSSProperties, ReactNode } from 'react';
import { Ferry } from './Ferry';
import { Far, Mid, Near } from './Panorama';
import { FAR_W, H, HORIZON, MID_W, NEAR_W, type Palette } from './palettes';
import { Sky } from './Sky';
import { Glitter, Wake, Waves } from './Water';
import s from './Scene.module.css';

/*
 * Vapurun güvertesinden bakış. Gökyüzü sabit; rota katmanları (uzak, orta, yakın) yolculuk
 * süresince bir kez kayar: uzak az, yakın çok yol alır, Karaköy'den çıkılır, Kadıköy'e varılır.
 * "Bir tur daha"da (reverse) aynı yol geri gidilir. Dalgalar ve köpük sürekli kayar, ufuk hafifçe
 * sallanır. Hareketi azalt diyende (still) hiçbir şey kaymaz.
 */

/** Rota boyunca bir kez kayan katman: ekranın yüksekliğine ölçeklenir. */
function Pan({ w, trip, children }: { w: number; trip: number; children: ReactNode }) {
  return (
    <div className={s.strip}>
      <svg className={s.pan} viewBox={`0 0 ${w} ${H}`} style={{ aspectRatio: `${w} / ${H}`, animationDuration: `${trip}s` } as CSSProperties} aria-hidden="true">
        {children}
      </svg>
    </div>
  );
}

export function Scene({ p, low, reverse, still, moving, trip }: { p: Palette; low: boolean; reverse: boolean; still: boolean; moving: boolean; trip: number }) {
  const vars = {
    '--sky-top': p.sky[0],
    '--sky-mid': p.sky[1],
    '--sky-low': p.sky[2],
    '--horizon': `${(HORIZON / H) * 100}%`,
  } as CSSProperties;
  return (
    <div className={[s.scene, reverse ? s.reverse : '', still ? s.sceneStill : '', moving ? s.moving : ''].join(' ')} style={vars} aria-hidden="true">
      <Sky p={p} low={low} />
      <div className={s.world}>
        <Pan w={FAR_W} trip={trip}>
          <Far p={p} />
        </Pan>
        <Pan w={MID_W} trip={trip}>
          <Mid p={p} />
        </Pan>
        <Glitter p={p} />
        {!still && <Ferry p={p} />}
        <Pan w={NEAR_W} trip={trip}>
          <Near p={p} />
        </Pan>
        <Waves p={p} low={low} />
        <Wake p={p} />
      </div>
    </div>
  );
}
