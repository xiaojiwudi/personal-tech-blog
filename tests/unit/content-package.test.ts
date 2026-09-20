import { createHash } from "node:crypto";
import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateContentPackage } from "../../src/lib/content-package";

const article = `---\ntitle: 测试文章\nslug: test-article\nsummary: 一篇公开测试文章\npublishedAt: 2026-09-21\nlastUpdated: 2026-09-21\nprimaryLayer: 80-agent\nstackLayers: [80-agent]\ntags: [test]\naliases: []\noutboundSlugs: []\n---\n# 测试文章\n\n正文。\n`;

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "blog-package-"));
  await mkdir(join(root, "articles"), { recursive: true });
  await writeFile(join(root, "articles/test-article.md"), article);
  const hash = createHash("sha256").update(article).digest("hex");
  const manifest = {
    schemaVersion: 1,
    source: { repository: "robot-kb", commitSha: "a".repeat(40) },
    articles: [{ slug: "test-article", path: "articles/test-article.md", sha256: hash, resources: [] }],
    files: [{ path: "articles/test-article.md", kind: "article", sha256: hash, bytes: Buffer.byteLength(article), mediaType: "text/markdown" }]
  };
  await writeFile(join(root, "manifest.json"), JSON.stringify(manifest));
  return root;
}

describe("validateContentPackage", () => {
  it("accepts a valid deterministic package", async () => {
    const result = await validateContentPackage(await fixture());
    expect(result.articles.map((item) => item.slug)).toEqual(["test-article"]);
  });

  it("rejects checksum tampering", async () => {
    const root = await fixture();
    await writeFile(join(root, "articles/test-article.md"), `${article}\nchanged`);
    await expect(validateContentPackage(root)).rejects.toThrow(/checksum/i);
  });

  it("rejects unregistered extra files", async () => {
    const root = await fixture();
    await writeFile(join(root, "extra.txt"), "not listed");
    await expect(validateContentPackage(root)).rejects.toThrow(/unregistered/i);
  });

  it("rejects symlinks", async () => {
    const root = await fixture();
    await symlink("articles/test-article.md", join(root, "linked.md"));
    await expect(validateContentPackage(root)).rejects.toThrow(/symlink/i);
  });

  it("rejects path traversal in the manifest", async () => {
    const root = await fixture();
    const manifestPath = join(root, "manifest.json");
    const manifest = JSON.parse(await (await import("node:fs/promises")).readFile(manifestPath, "utf8"));
    manifest.files[0].path = "../private.md";
    await writeFile(manifestPath, JSON.stringify(manifest));
    await expect(validateContentPackage(root)).rejects.toThrow(/path/i);
  });
});
