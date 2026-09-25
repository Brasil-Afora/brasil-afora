import { describe, expect, it } from "vitest";
import { z } from "zod";
import costProfiles from "@/data/cost-profiles.json";
import {
  fundingLabel,
  fundingOption,
  getCostProfile,
  priceBand,
  priceDetail,
  priceLabel,
} from "./cost-profile";

const priceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("free") }).strict(),
  z.object({ kind: z.literal("free_public_school") }).strict(),
  z.object({ kind: z.literal("covered") }).strict(),
  z.object({ kind: z.literal("stipend") }).strict(),
  z.object({ kind: z.literal("paid") }).strict(),
  z
    .object({
      amount: z.number().positive(),
      currency: z.string().length(3),
      from: z.literal(true).optional(),
      kind: z.literal("amount"),
    })
    .strict(),
]);

const fileSchema = z
  .object({
    exchangeRates: z
      .object({
        brlPerUnit: z.record(z.string().length(3), z.number().positive()),
        date: z.iso.date(),
        source: z.string().min(1),
      })
      .strict(),
    profiles: z.record(
      z.string().min(1),
      z
        .object({
          applicationFee: z
            .enum(["free", "free_public_school", "paid"])
            .optional(),
          funding: z
            .enum(["full", "full_possible", "partial", "none"])
            .optional(),
          name: z.string().min(1),
          price: priceSchema.optional(),
        })
        .strict()
    ),
  })
  .strict();

/** Intl and the labels keep "R$" and its number together with a no-break space. */
const plain = (label: string | null): string | null =>
  label?.replaceAll("\u00a0", " ") ?? null;

const DETAIL_REGEX =
  /^US\$ 7\.500 \(cerca de R\$ 39 mil pelo câmbio de 25\/09\/2026\)$/;

describe("cost-profiles.json", () => {
  const file = fileSchema.parse(costProfiles);

  it("has an exchange rate for every foreign currency it uses", () => {
    const currencies = Object.values(file.profiles).flatMap((profile) =>
      profile.price?.kind === "amount" && profile.price.currency !== "BRL"
        ? [profile.price.currency]
        : []
    );
    for (const currency of currencies) {
      expect(file.exchangeRates.brlPerUnit[currency]).toBeGreaterThan(0);
    }
  });

  it("covers the verified selection", () => {
    for (const id of [
      "lester-b-pearson-2027",
      "yale-young-global-scholars-2027",
      "febrace-2027",
    ]) {
      expect(getCostProfile(id)).toBeDefined();
    }
  });
});

describe("price labels", () => {
  const usd = (amount: number) =>
    plain(priceLabel({ amount, currency: "USD", kind: "amount" }));

  it("rounds converted prices so they read as estimates", () => {
    expect(usd(7500)).toBe("≈ R$ 39 mil");
    expect(usd(750)).toBe("≈ R$ 3,9 mil");
    expect(usd(20)).toBe("≈ R$ 100");
  });

  it("keeps reais exact", () => {
    const brl = (amount: number) =>
      plain(priceLabel({ amount, currency: "BRL", kind: "amount" }));
    expect(brl(159.9)).toBe("R$ 159,90");
    expect(brl(18_000)).toBe("R$ 18.000");
  });

  it("marks the lowest of several prices", () => {
    const label = priceLabel({
      amount: 30,
      currency: "USD",
      from: true,
      kind: "amount",
    });
    expect(plain(label)).toBe("A partir de ≈ R$ 160");
  });

  it("shows the published amount and the rate date on the detail page", () => {
    const detail = priceDetail({
      amount: 7500,
      currency: "USD",
      kind: "amount",
    });
    expect(plain(detail)).toMatch(DETAIL_REGEX);
  });

  it("has no label for an unknown price", () => {
    expect(priceLabel(undefined)).toBeNull();
  });
});

describe("price bands", () => {
  it("counts covered, stipend and public-school prices as free", () => {
    expect(priceBand({ kind: "covered" })).toBe("Gratuito");
    expect(priceBand({ kind: "stipend" })).toBe("Gratuito");
    expect(priceBand({ kind: "free_public_school" })).toBe("Gratuito");
  });

  it("files paid-but-undisclosed and unknown prices together", () => {
    expect(priceBand({ kind: "paid" })).toBe("Valor não divulgado");
    expect(priceBand(undefined)).toBe("Valor não divulgado");
  });

  it("bands by the amount in reais", () => {
    expect(priceBand({ amount: 1000, currency: "BRL", kind: "amount" })).toBe(
      "Até R$ 1 mil"
    );
    expect(priceBand({ amount: 1500, currency: "USD", kind: "amount" })).toBe(
      "R$ 1 mil a 10 mil"
    );
    expect(priceBand({ amount: 3200, currency: "USD", kind: "amount" })).toBe(
      "R$ 10 mil a 30 mil"
    );
    expect(priceBand({ amount: 7500, currency: "USD", kind: "amount" })).toBe(
      "Acima de R$ 30 mil"
    );
  });
});

describe("funding", () => {
  it("files need-based full aid under Integral but labels it honestly", () => {
    expect(fundingOption("full_possible")).toBe("Integral");
    expect(fundingLabel("full_possible")).toBe("Bolsa de até 100%");
    expect(fundingLabel("full")).toBe("Bolsa integral");
  });

  it("offers no option for unknown funding", () => {
    expect(fundingOption(undefined)).toBeNull();
    expect(fundingLabel("none")).toBeNull();
  });
});
