// src/lib/drinks.ts

export type GutDrinkTag = 'caffeine' | 'lactose' | 'alcohol' | 'fructose' | 'gluten';

export interface DrinkItem {
  id: string;
  name: string;
  category: 'water' | 'juice' | 'smoothie' | 'hot-drink' | 'dairy' | 'alcohol' | 'sports';
  // Dietary fibre per 100ml (USDA FoodData Central)
  fiberGPer100ml: number;
  // Net water equivalent per ml consumed.
  // <1 means diuretic: caffeine (Killer et al. 2014 PLOS ONE); alcohol (Shirreffs & Maughan 1997)
  hydrationFactor: number;
  gutTags: GutDrinkTag[];
}

export const DRINKS: DrinkItem[] = [
  // ── Water-like ──────────────────────────────────────────────────────────────
  { id: 'water',          name: 'Water',                  category: 'water',    fiberGPer100ml: 0,   hydrationFactor: 1.00, gutTags: [] },
  { id: 'sparkling-water',name: 'Sparkling Water',         category: 'water',    fiberGPer100ml: 0,   hydrationFactor: 1.00, gutTags: [] },
  { id: 'coconut-water',  name: 'Coconut Water',           category: 'water',    fiberGPer100ml: 0.3, hydrationFactor: 0.95, gutTags: [] },
  { id: 'sports-drink',   name: 'Sports / Isotonic Drink', category: 'sports',   fiberGPer100ml: 0,   hydrationFactor: 1.00, gutTags: [] },
  // ── Hot drinks ───────────────────────────────────────────────────────────────
  { id: 'coffee',         name: 'Coffee',                  category: 'hot-drink',fiberGPer100ml: 0,   hydrationFactor: 0.85, gutTags: ['caffeine'] },
  { id: 'espresso',       name: 'Espresso',                category: 'hot-drink',fiberGPer100ml: 0,   hydrationFactor: 0.70, gutTags: ['caffeine'] },
  { id: 'black-tea',      name: 'Black Tea',               category: 'hot-drink',fiberGPer100ml: 0,   hydrationFactor: 0.90, gutTags: ['caffeine'] },
  { id: 'green-tea',      name: 'Green Tea',               category: 'hot-drink',fiberGPer100ml: 0,   hydrationFactor: 0.90, gutTags: ['caffeine'] },
  { id: 'herbal-tea',     name: 'Herbal Tea',              category: 'hot-drink',fiberGPer100ml: 0,   hydrationFactor: 0.95, gutTags: [] },
  // ── Dairy ────────────────────────────────────────────────────────────────────
  { id: 'milk',           name: 'Milk',                    category: 'dairy',    fiberGPer100ml: 0,   hydrationFactor: 0.90, gutTags: ['lactose'] },
  { id: 'chocolate-milk', name: 'Chocolate Milk',          category: 'dairy',    fiberGPer100ml: 0.1, hydrationFactor: 0.85, gutTags: ['lactose', 'caffeine'] },
  { id: 'hot-chocolate',  name: 'Hot Chocolate',           category: 'dairy',    fiberGPer100ml: 0.4, hydrationFactor: 0.80, gutTags: ['lactose', 'caffeine'] },
  // ── Juice ─────────────────────────────────────────────────────────────────────
  // USDA FDC: OJ 168217 ~0.2g/100ml; Apple juice 168178 ~0.1g/100ml; Tomato juice 168948 ~0.4g/100ml
  { id: 'orange-juice',   name: 'Orange Juice',            category: 'juice',    fiberGPer100ml: 0.2, hydrationFactor: 0.90, gutTags: ['fructose'] },
  { id: 'apple-juice',    name: 'Apple Juice',             category: 'juice',    fiberGPer100ml: 0.1, hydrationFactor: 0.90, gutTags: ['fructose'] },
  { id: 'tomato-juice',   name: 'Tomato Juice',            category: 'juice',    fiberGPer100ml: 0.4, hydrationFactor: 0.90, gutTags: [] },
  // ── Smoothie ──────────────────────────────────────────────────────────────────
  { id: 'fruit-smoothie', name: 'Fruit Smoothie',          category: 'smoothie', fiberGPer100ml: 0.8, hydrationFactor: 0.85, gutTags: ['fructose'] },
  { id: 'green-smoothie', name: 'Green Smoothie',          category: 'smoothie', fiberGPer100ml: 1.2, hydrationFactor: 0.85, gutTags: [] },
  // ── Alcohol ───────────────────────────────────────────────────────────────────
  // Hydration factors: Shirreffs & Maughan (1997) 4%/12%/40% ABV → 0.70/0.60/0.40
  { id: 'beer',           name: 'Beer',                    category: 'alcohol',  fiberGPer100ml: 0,   hydrationFactor: 0.70, gutTags: ['alcohol', 'gluten'] },
  { id: 'wine',           name: 'Wine',                    category: 'alcohol',  fiberGPer100ml: 0,   hydrationFactor: 0.60, gutTags: ['alcohol'] },
  { id: 'spirits',        name: 'Spirits',                 category: 'alcohol',  fiberGPer100ml: 0,   hydrationFactor: 0.40, gutTags: ['alcohol'] },
];

export const DRINK_MAP = new Map(DRINKS.map((d) => [d.id, d]));
export const DEFAULT_DRINK_ID = 'water';
