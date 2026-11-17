// Relative preparation effort per item. These are starting estimates for the bar crew.
const cocktails = /\b(mini dream|manhattan|martini|caipirinha|mojito|margarita|negroni|daiquiri|sour|colada|mule|paloma|aviation|old fashioned|cocktail|mocktail|basil bliss|purple (no )?rain|the (artist|muse)|crafted lemonade|jazzy fizz|iced tea)\b/i;
const simple = /wasser|water|\b(pils|bier|beer|wein|wine|lugana|primitivo|moretti|tegernseer|1664 blanc|sauvignon blanc|cremant|cola)\b/i;

function normalizeName(name: string) {
  return name.normalize("NFD").replace(/\p{M}/gu, "").replace(/[-_]/g, " ");
}

export function isCocktail(name: string) {
  const label = normalizeName(name);
  return cocktails.test(label) || /\b(spritz|highball|gin(?: and)? tonic|gintonic|fizz|gimlet|boulevardier)\b/i.test(label);
}

export function prepWeight(name: string, categories: string[] = []) {
  if (categories.some(category => category.trim().toLocaleLowerCase("de") === "bar snacks")) return 0;
  const label = normalizeName(name);
  if (cocktails.test(label)) return 1;
  if (simple.test(label)) return 0.125;
  return 0.5;
}

export function isDrink(name: string) {
  return isCocktail(name) || simple.test(normalizeName(name));
}

// Missing or stale data must never produce a reassuring "Ruhig" signal.
// Known work can still establish a lower bound of "Zieht an" or "Viel los".
export function barLoadLevel(paidEffort: number, openEffort: number, complete: boolean): 0 | 1 | 2 | 3 {
  const effort = paidEffort + openEffort;
  return effort >= 5 ? 3 : effort >= 3 ? 2 : complete ? 1 : 0;
}

export function isFreshSnapshot(asOf: string | undefined, now: number): boolean {
  return !!asOf && Number.isFinite(Date.parse(asOf)) && now - Date.parse(asOf) <= 45_000;
}
