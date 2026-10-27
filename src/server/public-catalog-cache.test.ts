import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enrich: vi.fn(),
  from: vi.fn(),
  internationalDetail: vi.fn(),
  nationalDetail: vi.fn(),
  publicDetail: vi.fn(),
  publicList: vi.fn(),
  programs: vi.fn(),
  requireAdmin: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/db/client", () => ({ db: { select: mocks.select } }));
vi.mock("@/server/geo/resolve-location", () => ({
  resolveInternationalLocations: () => [],
  resolveNationalLocations: () => [],
}));
vi.mock("@/server/publication/curated-catalog", () => ({
  enrichCuratedRecords: mocks.enrich,
}));
vi.mock("@/server/programs", () => ({ getVisiblePrograms: mocks.programs }));
vi.mock("@/server/opportunity-detail", () => ({
  readInternationalOpportunityRecord: mocks.internationalDetail,
  readNationalOpportunityRecord: mocks.nationalDetail,
}));
vi.mock("@/server/publication/list-public-opportunities", () => ({
  getPublicOpportunityById: mocks.publicDetail,
  listPublicOpportunities: mocks.publicList,
}));
vi.mock("@/server/route-auth", () => ({
  requireAdminInRoute: mocks.requireAdmin,
}));

import { GET as nationalDetail } from "@/app/api/national-opportunities/[id]/route";
import { GET as national } from "@/app/api/national-opportunities/route";
import { GET as internationalDetail } from "@/app/api/opportunities/[id]/route";
import { GET as international, POST } from "@/app/api/opportunities/route";
import { GET as programs } from "@/app/api/programs/route";
import { GET as publicDetail } from "@/app/api/v1/opportunities/[id]/route";
import { GET as publicList } from "@/app/api/v1/opportunities/route";

const PUBLISHED_ID = "10000000-0000-4000-8000-000000000001";
const request = new NextRequest("https://brasilafora.org/api/opportunities");
const context = () => ({ params: Promise.resolve({ id: PUBLISHED_ID }) });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.select.mockReturnValue({ from: mocks.from });
  mocks.from.mockResolvedValue([{ id: "published", name: "Bolsa pública" }]);
  mocks.enrich.mockImplementation(async (rows) => rows);
  mocks.programs.mockResolvedValue([{ id: "program", nome: "Programa" }]);
  mocks.internationalDetail.mockResolvedValue({ id: PUBLISHED_ID });
  mocks.nationalDetail.mockResolvedValue({ id: PUBLISHED_ID });
  mocks.publicDetail.mockResolvedValue({ id: PUBLISHED_ID });
});

describe("public catalog HTTP caching", () => {
  it.each([
    ["international", internationalDetail, "opportunity"],
    ["national", nationalDetail, "nationalOpportunity"],
    ["v1", publicDetail, "data"],
  ] as const)("caches published %s details without changing the record", async (_, read, key) => {
    const response = await read(request, context());
    expect(response.headers.get("Vercel-CDN-Cache-Control")).toBe(
      "public, s-maxage=300"
    );
    expect((await response.json())[key].id).toBe(PUBLISHED_ID);
  });

  it.each([
    ["international", internationalDetail, 200],
    ["national", nationalDetail, 200],
    ["v1", publicDetail, 404],
  ] as const)("leaves missing %s details uncached", async (_, read, status) => {
    mocks.internationalDetail.mockResolvedValue(null);
    mocks.nationalDetail.mockResolvedValue(null);
    mocks.publicDetail.mockResolvedValue(null);
    const response = await read(request, context());
    expect(response.status).toBe(status);
    expect(response.headers.get("Vercel-CDN-Cache-Control")).toBeNull();
  });

  it("preserves filters on cacheable v1 lists and does not cache validation failures", async () => {
    mocks.publicList.mockImplementation(async (_, filters) => ({
      items: [{ id: PUBLISHED_ID, limit: filters.limit }],
    }));
    for (const limit of [1, 2]) {
      const response = await publicList(
        new NextRequest(
          `https://brasilafora.org/api/v1/opportunities?limit=${limit}`
        )
      );
      expect(response.headers.get("Vercel-CDN-Cache-Control")).toBe(
        "public, s-maxage=300"
      );
      expect((await response.json()).data.items[0].limit).toBe(limit);
    }
    const invalid = await publicList(
      new NextRequest(
        "https://brasilafora.org/api/v1/opportunities?private=true"
      )
    );
    expect(invalid.status).toBe(422);
    expect(invalid.headers.get("Vercel-CDN-Cache-Control")).toBeNull();
    const invalidDetail = await publicDetail(request, {
      params: Promise.resolve({ id: "invalid" }),
    });
    expect(invalidDetail.status).toBe(422);
    expect(invalidDetail.headers.get("Vercel-CDN-Cache-Control")).toBeNull();
  });

  it.each([
    ["international", international, "opportunities"],
    ["national", national, "nationalOpportunities"],
    ["programs", programs, null],
  ] as const)("caches successful %s reads at the CDN and preserves the payload", async (_, read, key) => {
    const response = await read();
    expect(response.status).toBe(200);
    expect(response.headers.get("Vercel-CDN-Cache-Control")).toBe(
      "public, s-maxage=300"
    );
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=0, must-revalidate"
    );
    expect(response.headers.get("set-cookie")).toBeNull();
    const payload = await response.json();
    expect(key ? payload[key][0].id : payload[0].id).toBe(
      key ? "published" : "program"
    );
    expect(mocks.requireAdmin).not.toHaveBeenCalled();
  });

  it.each([
    ["international", international, 500],
    ["national", national, 500],
    ["programs", programs, 503],
  ] as const)("does not cache %s failures", async (_, read, status) => {
    mocks.from.mockRejectedValue(new Error("database unavailable"));
    mocks.programs.mockRejectedValue(new Error("database unavailable"));
    const response = await read();
    expect(response.status).toBe(status);
    expect(response.headers.get("Vercel-CDN-Cache-Control")).toBeNull();
  });

  it("keeps mutations protected and outside the shared cache", async () => {
    mocks.requireAdmin.mockResolvedValue({
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const response = await POST(
      new NextRequest("https://brasilafora.org/api/opportunities", {
        method: "POST",
      })
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("Vercel-CDN-Cache-Control")).toBeNull();
    expect(mocks.select).not.toHaveBeenCalled();
  });
});
