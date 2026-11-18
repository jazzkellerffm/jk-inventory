// Presentation only: keep the original booking identity and source data intact.
export function displayBookingName(name: string): string {
  return name.trim().split(/\s+/u).map(word => {
    if (word !== word.toLocaleUpperCase("de") && word !== word.toLocaleLowerCase("de")) return word;
    return word.toLocaleLowerCase("de").replace(/(^|[-’'])\p{L}/gu, part => part.toLocaleUpperCase("de"));
  }).join(" ");
}
