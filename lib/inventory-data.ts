export type StockStatus = "unchecked" | "ok" | "low" | "critical";

/** Allowed unit labels — singular only, consistent across the app */
export const STANDARD_UNITS = [
  "Bag",
  "Batch",
  "Bottle",
  "Box",
  "Bund",
  "Pack",
  "Sack",
] as const;

export type StandardUnit = (typeof STANDARD_UNITS)[number];

export type InventoryItem = {
  id: string;
  section: string;
  name: string;
  unit: StandardUnit;
  status: StockStatus;
  note: string;
};

type SeedRow = { name: string; unit: StandardUnit };

const SECTIONS: { section: string; items: SeedRow[] }[] = [
  {
    section: "Foams & Prep",
    items: [
      { name: "Aquafaba", unit: "Batch" },
      { name: "Foam Classic", unit: "Batch" },
      { name: "Foam Vanilla", unit: "Batch" },
      { name: "Gomme Syrup", unit: "Batch" },
      { name: "Agave Syrup", unit: "Bottle" },
    ],
  },
  {
    section: "Infusions",
    items: [
      { name: "Velvet Vodka", unit: "Batch" },
      { name: "Purple Rain", unit: "Batch" },
      { name: "Purple No Rain 0.0", unit: "Batch" },
      { name: "Muse", unit: "Batch" },
      { name: "Basil Gin", unit: "Batch" },
      { name: "Mango Bango", unit: "Batch" },
      { name: "Modern Mojito", unit: "Batch" },
      { name: "Lila Gin", unit: "Batch" },
      { name: "Peaches & Cream", unit: "Batch" },
    ],
  },
  {
    section: "Fresh",
    items: [
      { name: "Limetten", unit: "Box" },
      { name: "Zitronen", unit: "Sack" },
      { name: "Minze", unit: "Bund" },
      { name: "Rosmarin", unit: "Bund" },
    ],
  },
  {
    section: "Ice",
    items: [
      { name: "Ice Cubes", unit: "Bag" },
      { name: "Crushed Ice", unit: "Bag" },
    ],
  },
  {
    section: "Core Spirits",
    items: [
      { name: "Vodka", unit: "Bottle" },
      { name: "Gin", unit: "Bottle" },
      { name: "Gin 0.0", unit: "Bottle" },
      { name: "Tequila", unit: "Bottle" },
      { name: "Mezcal", unit: "Bottle" },
      { name: "Rum white", unit: "Bottle" },
      { name: "Rum dark", unit: "Bottle" },
      { name: "Bourbon", unit: "Bottle" },
      { name: "Pisco", unit: "Bottle" },
    ],
  },
  {
    section: "Beer",
    items: [
      { name: "Tegernseer Hell", unit: "Box" },
      { name: "Corona", unit: "Box" },
      { name: "Moretti", unit: "Box" },
      { name: "Non-Alcoholic Beer", unit: "Box" },
    ],
  },
  {
    section: "Wine & Crémant",
    items: [
      { name: "Crémant", unit: "Bottle" },
      { name: "Lugana", unit: "Bottle" },
      { name: "Grauburgunder", unit: "Bottle" },
      { name: "Sauvignon Blanc", unit: "Bottle" },
      { name: "Primitivo", unit: "Bottle" },
    ],
  },
  {
    section: "Soft Drinks",
    items: [
      { name: "Water still", unit: "Box" },
      { name: "Water sparkling", unit: "Box" },
      { name: "Coca-Cola", unit: "Box" },
      { name: "Coca-Cola Light", unit: "Box" },
      { name: "Tonic", unit: "Box" },
      { name: "Ginger Beer", unit: "Box" },
      { name: "Thomas Henry Mango", unit: "Box" },
    ],
  },
  {
    section: "Snacks",
    items: [
      { name: "Popcorn", unit: "Pack" },
      { name: "Chips", unit: "Pack" },
      { name: "Nachos / Totopos", unit: "Pack" },
      { name: "Oliven", unit: "Pack" },
      { name: "Peanuts", unit: "Pack" },
      { name: "WASA Cracker", unit: "Pack" },
      { name: "Truffle Chips", unit: "Pack" },
    ],
  },
  {
    section: "Bar Essentials",
    items: [
      { name: "Dried Fruits", unit: "Pack" },
      { name: "Sugar Packs", unit: "Pack" },
      { name: "Paper Towels", unit: "Pack" },
      { name: "Toilet Paper", unit: "Pack" },
    ],
  },
];

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function sectionHeading(section: string): string {
  const map: Record<string, string> = {
    "Foams & Prep": "FOAMS & PREP",
    Infusions: "INFUSIONS",
    Fresh: "FRESH",
    Ice: "ICE",
    "Core Spirits": "CORE SPIRITS",
    Beer: "BEER",
    "Wine & Crémant": "WINE & CRÉMANT",
    "Soft Drinks": "SOFT DRINKS",
    Snacks: "SNACKS",
    "Bar Essentials": "BAR ESSENTIALS",
  };
  return map[section] ?? section.toUpperCase();
}

/** Stable DOM id for section headings (scroll targets). */
export function sectionDomId(section: string): string {
  return `inv-section-${slug(section)}`;
}

export function createInitialInventory(): InventoryItem[] {
  const out: InventoryItem[] = [];
  for (const { section, items } of SECTIONS) {
    const sec = slug(section);
    for (const row of items) {
      out.push({
        id: `${sec}-${slug(row.name)}`,
        section,
        name: row.name,
        unit: row.unit,
        status: "unchecked",
        note: "",
      });
    }
  }
  return out;
}

export const INVENTORY_TOTAL = SECTIONS.reduce(
  (n, s) => n + s.items.length,
  0,
);
