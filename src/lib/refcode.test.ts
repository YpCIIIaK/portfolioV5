import { describe, expect, it } from "vitest";
import { decodeRef, encodeRef } from "./refcode";

describe("refcode", () => {
  it("round-trips Latin and Cyrillic company names", () => {
    for (const name of ["IQoko", "Ozon Tech", "Медиа Технолоджи", "AbeloHost B.V.", "Ozon Tech — Frontend-разработчик, WebCRM"]) {
      expect(decodeRef(encodeRef(name))).toBe(name);
    }
  });
  it("does not spell out the company", () => {
    expect(encodeRef("IQoko").toLowerCase()).not.toContain("iqoko");
  });
  it("decodes a link that was cut short", () => {
    expect(decodeRef("NgoMWVItFQBfUpvw9xc0Cx8NQxcXFE7m8qnAs4Cj-aDT58OpzrK1o_6")).toBe("Ozon Tech — Frontend-разработч");
  });
  it("rejects garbage", () => {
    expect(decodeRef("!!!")).toBeNull();
  });
});
