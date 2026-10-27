import { beforeEach, expect, it, vi } from "vitest";

const failure = new Error("database temporarily unavailable");
const mocks = vi.hoisted(() => ({ query: vi.fn(), programs: vi.fn() }));
vi.mock("@/db/client", () => ({
  db: {
    select: () => ({
      from: () => ({
        // biome-ignore lint/suspicious/noThenProperty: Drizzle query builders support awaiting and chained selects.
        then: (
          resolve: (value: unknown) => unknown,
          reject: (error: unknown) => unknown
        ) => mocks.query().then(resolve, reject),
        where: () => ({
          limit: () => mocks.query(),
          orderBy: () => ({ limit: () => mocks.query() }),
        }),
      }),
    }),
  },
}));
vi.mock("@/server/publication/list-public-opportunities", () => ({
  getPublicOpportunityById: async () => null,
}));
vi.mock("@/server/programs", () => ({
  getVisiblePrograms: mocks.programs,
  findProgram: () => undefined,
}));
vi.mock("@/components/programs/program-detail-loader", () => ({
  default: () => null,
}));

import ProgramDetailPage from "@/app/(marketing)/programas-e-bolsas/[id]/page";
import { getHomeHighlights } from "@/server/home-highlights";
import {
  getInternationalOpportunityForPage,
  getNationalOpportunityForPage,
} from "@/server/opportunity-detail";
import { getOpportunityMetadata } from "@/server/opportunity-metadata";
import { getInternationalOpportunityPage } from "@/server/opportunity-page";

const id = "10000000-0000-4000-8000-000000000001";
beforeEach(() => {
  mocks.query.mockRejectedValue(failure);
  mocks.programs.mockRejectedValue(failure);
});

it("does not turn a failed metadata read into a cacheable not-found result", async () => {
  await expect(getOpportunityMetadata("international", id)).rejects.toThrow(
    failure
  );
});
it("does not turn a failed slug lookup into a cacheable not-found result", async () => {
  await expect(
    getInternationalOpportunityPage("bolsa-10000000")
  ).rejects.toThrow(failure);
});
it.each([
  getInternationalOpportunityForPage,
  getNationalOpportunityForPage,
])("does not cache partial opportunity details after a database error", async (read) => {
  await expect(read(id)).rejects.toThrow(failure);
});
it("does not cache empty homepage sections after a database error", async () => {
  await expect(getHomeHighlights()).rejects.toThrow(failure);
});
it("does not cache a program loading skeleton after a database error", async () => {
  await expect(
    ProgramDetailPage({
      params: Promise.resolve({ id }),
      searchParams: Promise.resolve({}),
    })
  ).rejects.toThrow(failure);
});
it("still distinguishes a genuinely missing opportunity", async () => {
  mocks.query.mockResolvedValue([]);
  await expect(getOpportunityMetadata("international", id)).resolves.toBeNull();
  await expect(getInternationalOpportunityForPage(id)).resolves.toBeUndefined();
});
