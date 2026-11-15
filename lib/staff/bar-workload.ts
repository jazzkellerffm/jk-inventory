// Relative preparation effort per item. These are starting estimates for the bar crew.
const cocktails = /\b(manhattan|martini|caipirinha|mojito|margarita|negroni|daiquiri|sour|colada|mule|paloma|aviation|old fashioned|cocktail|mocktail|basil bliss|purple (no )?rain|the (artist|muse)|crafted lemonade|jazzy fizz|iced tea)\b/i;
const simple = /wasser|water|\b(pils|bier|beer|wein|wine|lugana|primitivo|moretti|tegernseer|1664 blanc|sauvignon blanc|cremant|cola)\b/i;

export function prepWeight(name: string) {
  const label = name.normalize("NFD").replace(/\p{M}/gu, "").replace(/[-_]/g, " ");
  if (cocktails.test(label)) return 1;
  if (simple.test(label)) return 0.125;
  return 0.5;
}
