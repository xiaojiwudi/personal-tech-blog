import { describe, expect, it } from "vitest";
import { buildPublicationModel } from "../../src/lib/publication-model";

const base = {
  title: "Alpha",
  slug: "alpha",
  summary: "Alpha summary",
  publishedAt: "2026-09-20",
  lastUpdated: "2026-09-21",
  primaryLayer: "80-agent",
  stackLayers: ["80-agent"],
  tags: ["Agent", "AI"],
  aliases: ["old-alpha"],
  outboundSlugs: ["beta"]
};

describe("buildPublicationModel", () => {
  it("normalizes tags and computes public backlinks", () => {
    const model = buildPublicationModel([
      base,
      { ...base, title: "Beta", slug: "beta", aliases: [], tags: ["AI"], outboundSlugs: [] }
    ]);
    expect(model.articles[0]?.tags).toEqual(["agent", "ai"]);
    expect(model.bySlug.get("beta")?.backlinkSlugs).toEqual(["alpha"]);
  });

  it("rejects duplicate aliases and slugs", () => {
    expect(() => buildPublicationModel([base, { ...base, title: "Beta", slug: "beta", aliases: ["alpha"] }])).toThrow(/conflict/i);
  });

  it("rejects links to unknown public slugs", () => {
    expect(() => buildPublicationModel([{ ...base, outboundSlugs: ["missing"] }])).toThrow(/unknown/i);
  });

  it("sorts articles by published date then slug", () => {
    const model = buildPublicationModel([
      { ...base, title: "Beta", slug: "beta", publishedAt: "2026-09-21", aliases: [], outboundSlugs: [] },
      { ...base, outboundSlugs: [] }
    ]);
    expect(model.articles.map((item) => item.slug)).toEqual(["beta", "alpha"]);
  });

  it("rejects updates dated before publication", () => {
    expect(() => buildPublicationModel([{ ...base, publishedAt: "2026-09-21", lastUpdated: "2026-09-20", outboundSlugs: [] }])).toThrow(/precedes/i);
  });
});
