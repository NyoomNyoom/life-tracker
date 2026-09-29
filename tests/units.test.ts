import { describe, expect, it } from "vitest";
import { formatNumber, formatWeight, fromKg, inputValue, parseWeightInput, toKg } from "@/lib/units";

describe("units", () => {
  it("round-trips pounds through kilograms without drift at display precision", () => {
    for (const lb of [100, 135, 185, 225, 315, 182.5]) {
      const kg = parseWeightInput(String(lb), "lb")!;
      expect(formatNumber(fromKg(kg, "lb"), 1)).toBe(formatNumber(lb, 1));
    }
  });

  it("parses comma decimals and rejects junk", () => {
    expect(parseWeightInput("82,5", "kg")).toBe(82.5);
    expect(parseWeightInput(" 80 ", "kg")).toBe(80);
    expect(parseWeightInput("abc", "kg")).toBeNull();
    expect(parseWeightInput("-5", "kg")).toBeNull();
  });

  it("formats weights in the user's unit", () => {
    expect(formatWeight(82.4, "kg")).toBe("82.4 kg");
    expect(formatWeight(80, "kg")).toBe("80 kg");
    expect(formatWeight(toKg(185, "lb"), "lb")).toBe("185 lb");
    expect(inputValue(null, "kg")).toBe("");
    expect(inputValue(83.91, "lb")).toBe("184.99");
  });
});
