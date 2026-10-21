import { describe, expect, it } from "vitest";
import { countryNamesIn, findCountries } from "./geo";

describe("countryNamesIn", () => {
  it.each([
    ["Estados Unidos", ["Estados Unidos"]],
    ["EUA", ["Estados Unidos"]],
    ["Estados Unidos; Canadá", ["Estados Unidos", "Canadá"]],
    ["Estados Unidos / Canadá", ["Estados Unidos", "Canadá"]],
    ["Estados Unidos e Canadá", ["Estados Unidos", "Canadá"]],
    ["Estados Unidos (final)", ["Estados Unidos"]],
    ["Estados Unidos / Online", ["Estados Unidos"]],
    ["Estados Unidos / Remoto", ["Estados Unidos"]],
    ["Online; final 2026 nos Estados Unidos", ["Estados Unidos"]],
    ["França / conforme projeto", ["França"]],
    ["Canadá (competição realizada na escola no Brasil)", ["Canadá"]],
    ["China (Hong Kong)", ["China"]],
    ["Holanda", ["Países Baixos"]],
    ["Inglaterra", ["Reino Unido"]],
  ])("%s → %j", (value, expected) => {
    expect(countryNamesIn(value).sort()).toEqual([...expected].sort());
  });

  it("names every country in a list", () => {
    expect(countryNamesIn("Tailândia, Laos, Vietnã e Camboja").sort()).toEqual(
      ["Camboja", "Laos", "Tailândia", "Vietnã"].sort()
    );
  });

  it("finds no country in place-free text", () => {
    expect(countryNamesIn("Internacional")).toEqual([]);
    expect(countryNamesIn("Online")).toEqual([]);
  });
});

describe("findCountries", () => {
  it("matches whole words only", () => {
    expect(findCountries("Roma, Itália").map((country) => country.iso)).toEqual(
      ["IT"]
    );
  });
});
