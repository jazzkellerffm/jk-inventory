export type StockStatus = "unchecked" | "ok" | "low" | "critical";

export type InventoryItem = {
  id: string;
  section: string;
  name: string;
  helper: string;
  status: StockStatus;
  note: string;
};

type SeedRow = { name: string; helper: string };

const SECTIONS: { section: string; items: SeedRow[] }[] = [
  {
    section: "Foams & Prep",
    items: [
      { name: "Aquafaba", helper: "Batch" },
      { name: "Foam Classic", helper: "Batch" },
      { name: "Foam Vanilla", helper: "Batch" },
      { name: "Gomme Syrup", helper: "Bottle" },
      { name: "Purple Rain", helper: "Batch" },
      { name: "Dream / Muse", helper: "Batch" },
    ],
  },
  {
    section: "Fresh",
    items: [
      { name: "Lemons", helper: "Box" },
      { name: "Limes", helper: "Box" },
      { name: "Mint", helper: "Bunch" },
      { name: "Basil", helper: "Bunch" },
      { name: "Cucumber", helper: "Each" },
      { name: "Oranges", helper: "Each" },
    ],
  },
  {
    section: "Bar",
    items: [
      { name: "Ice Cubes", helper: "Bag" },
      { name: "Crushed Ice", helper: "Bag" },
      { name: "Big Cubes", helper: "Pack" },
      { name: "Espresso", helper: "Pack" },
    ],
  },
  {
    section: "Mixers",
    items: [
      { name: "Tonic", helper: "Box" },
      { name: "Ginger Beer", helper: "Box" },
      { name: "Grapefruit", helper: "Box" },
      { name: "Coke", helper: "Box" },
      { name: "Coke Zero", helper: "Box" },
      { name: "Water Still", helper: "Box" },
      { name: "Water Sparkling", helper: "Box" },
    ],
  },
  {
    section: "House",
    items: [
      { name: "Toilet Paper", helper: "Packs" },
      { name: "Paper Towels", helper: "Packs" },
      { name: "Trash Bags", helper: "Rolls" },
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
    "Foams & Prep": "FOAMS",
    Fresh: "FRESH",
    Bar: "BAR",
    Mixers: "MIXERS",
    House: "HOUSE",
  };
  return map[section] ?? section.toUpperCase();
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
        helper: row.helper,
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
