import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("quotes commas, quotes and newlines, and defuses spreadsheet formulas", () => {
    expect(toCsv(["a", "b"], [["x,y", 'say "hi"'], ["=SUM(A1)", null], [1.5, true]])).toBe(
      'a,b\r\n"x,y","say ""hi"""\r\n\'=SUM(A1),\r\n1.5,true\r\n',
    );
  });
});
