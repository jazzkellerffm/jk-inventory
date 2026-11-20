export function shiftMonth(month: string, delta: number) {
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year, number - 1 + delta, 1)).toISOString().slice(0, 7);
}
export function earliestNightMonth(current: string) {
  return [shiftMonth(current, -12), '2026-06'].sort().at(-1)!;
}
export function validNightMonth(month: string, current: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month) && month >= earliestNightMonth(current) && month <= current;
}
