// Everything is stored in kilograms; these helpers convert for display and input.

export type Unit = "kg" | "lb";

export const KG_PER_LB = 0.45359237;

export function toKg(value: number, unit: Unit): number {
  return unit === "kg" ? value : value * KG_PER_LB;
}

export function fromKg(kg: number, unit: Unit): number {
  return unit === "kg" ? kg : kg / KG_PER_LB;
}

/** Rounds to at most `decimals` places and drops trailing zeros: 82.40 -> "82.4", 80 -> "80". */
export function formatNumber(value: number, decimals = 1): string {
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: decimals, useGrouping: false });
}

/** "82.4 kg" / "181.7 lb" */
export function formatWeight(kg: number, unit: Unit, decimals = 1): string {
  return `${formatNumber(fromKg(kg, unit), decimals)} ${unit}`;
}

/** Converts a stored kg value into the number to prefill an input with. */
export function inputValue(kg: number | null | undefined, unit: Unit): string {
  if (kg == null) return "";
  return formatNumber(fromKg(kg, unit), 2);
}

/** Parses user input ("82,5" or "82.5") in their unit into kg rounded to 2 dp, or null if invalid. */
export function parseWeightInput(raw: string, unit: Unit): number | null {
  const value = Number(raw.trim().replace(",", "."));
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(toKg(value, unit) * 100) / 100;
}
