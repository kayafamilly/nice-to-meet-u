import { describe, expect, it } from "vitest";
import { csvDocument, safeCsvCell } from "@/lib/management/csv";

describe("management CSV exports", () => {
  it("neutralizes spreadsheet formulas and removes line breaks", () => {
    expect(safeCsvCell("=HYPERLINK(\"https://example.com\")")).toBe('"\'=HYPERLINK(""https://example.com"")"');
    expect(safeCsvCell("one\r\ntwo")).toBe('"one two"');
  });
  it("emits an Excel-compatible UTF-8 document", () => {
    expect(csvDocument([["Name"], ["Élodie"]])).toMatch(/^\uFEFF/);
  });
});
