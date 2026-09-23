import { expect, it } from "vitest";
import { resolveNationalLocations } from "./resolve-location";

it("retains every identified city in a multi-campus opportunity", () => {
  const locations = resolveNationalLocations(
    "São Paulo; São José dos Campos; Rio de Janeiro; Belo Horizonte"
  );
  expect(locations.map((location) => location.label)).toEqual([
    "São Paulo",
    "São José dos Campos",
    "Rio de Janeiro",
    "Belo Horizonte",
  ]);
});
