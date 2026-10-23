import { describe, expect, it } from "vitest";
import { decodeRef, encodeRef } from "./refcode";

describe("refcode", () => {
  it("round-trips Latin and Cyrillic company names", () => {
    for (const name of ["IQoko", "Ozon Tech", "Медиа Технолоджи", "AbeloHost B.V."]) {
      expect(decodeRef(encodeRef(name))).toBe(name);
    }
  });
  it("does not spell out the company", () => {
    expect(encodeRef("IQoko").toLowerCase()).not.toContain("iqoko");
  });
  it("rejects garbage", () => {
    expect(decodeRef("!!!")).toBeNull();
  });
});
