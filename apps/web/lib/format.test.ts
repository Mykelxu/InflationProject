import { describe, expect, it } from "vitest";
import { formatCurrency } from "./format";

describe("formatCurrency", () => {
  it("formats cents into USD", () => {
    expect(formatCurrency(12345)).toBe("$123.45");
  });
});
