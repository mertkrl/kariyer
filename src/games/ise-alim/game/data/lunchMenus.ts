export type SoupKind = 'mercimek' | 'ezogelin' | 'yayla' | 'domates' | 'tarhana';

export type FoodKind =
  | 'fasulye'
  | 'nohut'
  | 'sote'
  | 'karniyarik'
  | 'kofte'
  | 'pilav'
  | 'bulgur'
  | 'salata'
  | 'tursu'
  | 'cacik'
  | 'yogurt'
  | 'sutlac'
  | 'kazandibi'
  | 'serbetli';

export interface LunchDish {
  name: string;
  kind: FoodKind;
}

export interface LunchMenu {
  soup: { name: string; kind: SoupKind };
  main: LunchDish;
  side: LunchDish;
  salad: LunchDish;
  meze: LunchDish;
  dessert: LunchDish;
}

/** Her iş günü için bir tabldot menüsü, currentDayIndex ile sıralanır. */
export const lunchMenus: LunchMenu[] = [
  {
    soup: { name: 'Mercimek Çorbası', kind: 'mercimek' },
    main: { name: 'Kuru Fasulye', kind: 'fasulye' },
    side: { name: 'Pirinç Pilavı', kind: 'pilav' },
    salad: { name: 'Çoban Salata', kind: 'salata' },
    meze: { name: 'Karışık Turşu', kind: 'tursu' },
    dessert: { name: 'Fırın Sütlaç', kind: 'sutlac' },
  },
  {
    soup: { name: 'Ezogelin Çorbası', kind: 'ezogelin' },
    main: { name: 'Tavuk Sote', kind: 'sote' },
    side: { name: 'Bulgur Pilavı', kind: 'bulgur' },
    salad: { name: 'Mevsim Salata', kind: 'salata' },
    meze: { name: 'Cacık', kind: 'cacik' },
    dessert: { name: 'Revani', kind: 'serbetli' },
  },
  {
    soup: { name: 'Yayla Çorbası', kind: 'yayla' },
    main: { name: 'Karnıyarık', kind: 'karniyarik' },
    side: { name: 'Pirinç Pilavı', kind: 'pilav' },
    salad: { name: 'Çoban Salata', kind: 'salata' },
    meze: { name: 'Yoğurt', kind: 'yogurt' },
    dessert: { name: 'Kazandibi', kind: 'kazandibi' },
  },
  {
    soup: { name: 'Domates Çorbası', kind: 'domates' },
    main: { name: 'İzmir Köfte', kind: 'kofte' },
    side: { name: 'Bulgur Pilavı', kind: 'bulgur' },
    salad: { name: 'Mevsim Salata', kind: 'salata' },
    meze: { name: 'Cacık', kind: 'cacik' },
    dessert: { name: 'Şekerpare', kind: 'serbetli' },
  },
  {
    soup: { name: 'Tarhana Çorbası', kind: 'tarhana' },
    main: { name: 'Etli Nohut', kind: 'nohut' },
    side: { name: 'Pirinç Pilavı', kind: 'pilav' },
    salad: { name: 'Çoban Salata', kind: 'salata' },
    meze: { name: 'Karışık Turşu', kind: 'tursu' },
    dessert: { name: 'Sütlaç', kind: 'sutlac' },
  },
];
