import { CraneArt, DeskArt, ExamArt, FacadeArt, JunctionArt, PatchArt, WalletArt, ScreenArt, ShopArt } from './CardArt';
import type { GameRoute } from './slugs';

/** Her oyunun salondaki çizimi: kartlar, önizleme görselleri ve tasarım konseptleri aynı çizimi kullanır. */
export const GAME_ART: Record<GameRoute, () => React.JSX.Element> = {
  iseAlim: DeskArt,
  test: ExamArt,
  insaat: CraneArt,
  bakkal: ShopArt,
  ekran: ScreenArt,
  meydan: FacadeArt,
  asfalt: PatchArt,
  trafik: JunctionArt,
  cuzdan: WalletArt,
};

export const fileNo = (n: number) => `DOSYA ${String(n).padStart(3, '0')}`;
