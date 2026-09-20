import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadPublication } from "../../src/lib/load-publication";

describe("generated content package", () => {
  it("loads the committed fixture package", async () => {
    const publication = await loadPublication(resolve("content/generated"));
    expect(publication.articles.length).toBeGreaterThan(0);
    expect(publication.index.schemaVersion).toBe(1);
  });
});
