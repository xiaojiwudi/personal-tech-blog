import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { validateInteractiveHtml } from "./html-policy";
import type { ArticleInput } from "./types";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_PACKAGE_BYTES = 100 * 1024 * 1024;
const hex64 = /^[0-9a-f]{64}$/;
const allowed = new Map([
  [".md", "text/markdown"], [".html", "text/html"], [".png", "image/png"],
  [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"], [".webp", "image/webp"], [".avif", "image/avif"]
]);

const fileSchema = z.object({
  path: z.string().min(1),
  kind: z.enum(["article", "media", "interactive"]),
  sha256: z.string().regex(hex64),
  bytes: z.number().int().positive().max(MAX_FILE_BYTES),
  mediaType: z.enum(["text/markdown", "text/html", "image/png", "image/jpeg", "image/webp", "image/avif"])
});
const manifestSchema = z.object({
  schemaVersion: z.literal(1),
  source: z.object({ repository: z.literal("robot-kb"), commitSha: z.string().regex(/^[0-9a-f]{40}$/) }),
  articles: z.array(z.object({ slug: z.string(), path: z.string(), sha256: z.string().regex(hex64), resources: z.array(z.string()) })),
  files: z.array(fileSchema)
});

async function walk(root: string, current = root): Promise<string[]> {
  const entries = await readdir(current, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const absolute = resolve(current, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink is forbidden: ${relative(root, absolute)}`);
    if (entry.isDirectory()) return walk(root, absolute);
    return [relative(root, absolute).split(sep).join("/")];
  }));
  return files.flat().sort();
}

function safePath(root: string, value: string): string {
  if (value.startsWith("/") || value.includes("\\") || value.split("/").includes("..")) throw new Error(`Unsafe path: ${value}`);
  const absolute = resolve(root, value);
  if (!absolute.startsWith(`${resolve(root)}${sep}`)) throw new Error(`Path escapes package: ${value}`);
  return absolute;
}

function sha256(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function frontmatterToInput(data: Record<string, unknown>): ArticleInput {
  const dateValue = (value: unknown) => value instanceof Date ? value.toISOString().slice(0, 10) : value as string;
  return {
    title: data.title as string,
    slug: data.slug as string,
    summary: data.summary as string,
    publishedAt: dateValue(data.publishedAt),
    lastUpdated: dateValue(data.lastUpdated),
    primaryLayer: data.primaryLayer as string,
    stackLayers: data.stackLayers as string[],
    tags: data.tags as string[],
    aliases: data.aliases as string[],
    outboundSlugs: data.outboundSlugs as string[]
  };
}

export async function validateContentPackage(root: string) {
  const manifest = manifestSchema.parse(JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8")));
  for (const file of manifest.files) safePath(root, file.path);
  for (const article of manifest.articles) {
    safePath(root, article.path);
    for (const resource of article.resources) safePath(root, resource);
  }
  const actualFiles = await walk(root);
  const registered = new Set(["manifest.json", ...manifest.files.map((file) => file.path)]);
  const extra = actualFiles.find((file) => !registered.has(file));
  if (extra) throw new Error(`Unregistered file: ${extra}`);
  if (actualFiles.length !== registered.size) throw new Error("Manifest references a missing file");

  let totalBytes = 0;
  for (const file of manifest.files) {
    const absolute = safePath(root, file.path);
    const stat = await lstat(absolute);
    if (stat.isSymbolicLink()) throw new Error(`Symlink is forbidden: ${file.path}`);
    const data = await readFile(absolute);
    totalBytes += data.byteLength;
    const expectedType = allowed.get(extname(file.path).toLowerCase());
    if (!expectedType || expectedType !== file.mediaType) throw new Error(`Media type mismatch: ${file.path}`);
    if (sha256(data) !== file.sha256) throw new Error(`Checksum mismatch: ${file.path}`);
    if (data.byteLength !== file.bytes) throw new Error(`Byte count mismatch: ${file.path}`);
    if (file.kind === "interactive") validateInteractiveHtml(data.toString("utf8"));
  }
  if (totalBytes > MAX_PACKAGE_BYTES) throw new Error("Content package exceeds 100 MiB");

  const fileByPath = new Map(manifest.files.map((file) => [file.path, file] as const));
  const articles = manifest.articles.map((article) => {
    const file = fileByPath.get(article.path);
    if (!file || file.kind !== "article" || file.sha256 !== article.sha256) throw new Error(`Article manifest mismatch: ${article.slug}`);
    for (const resource of article.resources) {
      if (!fileByPath.has(resource)) throw new Error(`Missing article resource: ${resource}`);
    }
    const parsed = matter.read(safePath(root, article.path));
    if (parsed.data.slug !== article.slug) throw new Error(`Article slug mismatch: ${article.slug}`);
    return { slug: article.slug, input: frontmatterToInput(parsed.data), markdown: parsed.content };
  });
  return { manifest, articles };
}
