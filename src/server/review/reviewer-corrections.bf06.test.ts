import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("BF-06 reviewer correction URL binding", () => {
  it("binds a corrected link status to the URL currently being reviewed", () => {
    const source = readFileSync(
      new URL("./reviewer-corrections.ts", import.meta.url),
      "utf8"
    );

    expect(source).toContain("originalUrl: currentApplicationUrl");
    expect(source).not.toContain(
      "originalUrl: previous?.originalUrl ?? currentApplicationUrl"
    );
  });
});
