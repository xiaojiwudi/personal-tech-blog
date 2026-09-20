import { z } from "zod";
import type { ArticleInput, PublicArticle } from "./types";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const articleSchema = z.object({
  title: z.string().trim().min(1),
  slug: z.string().regex(slugPattern),
  summary: z.string().trim().min(1).max(320),
  publishedAt: z.string().regex(datePattern),
  lastUpdated: z.string().regex(datePattern),
  primaryLayer: z.string().trim().min(1),
  stackLayers: z.array(z.string().trim().min(1)).min(1),
  tags: z.array(z.string().trim().min(1)).min(1),
  aliases: z.array(z.string().regex(slugPattern)),
  outboundSlugs: z.array(z.string().regex(slugPattern))
});

function normalizeArticle(input: ArticleInput): ArticleInput {
  const parsed = articleSchema.parse(input);
  if (parsed.lastUpdated < parsed.publishedAt) {
    throw new Error(`lastUpdated precedes publishedAt for ${parsed.slug}`);
  }
  const normalizedLayers = [...new Set([parsed.primaryLayer, ...parsed.stackLayers])];
  return {
    ...parsed,
    stackLayers: normalizedLayers,
    tags: [...new Set(parsed.tags.map((tag) => tag.normalize("NFKC").toLowerCase()))],
    aliases: [...new Set(parsed.aliases)].sort(),
    outboundSlugs: [...new Set(parsed.outboundSlugs)].sort()
  };
}

export function buildPublicationModel(inputs: readonly ArticleInput[]) {
  const normalized = inputs.map(normalizeArticle);
  const owners = new Map<string, string>();
  for (const article of normalized) {
    for (const value of [article.slug, ...article.aliases]) {
      const owner = owners.get(value);
      if (owner) throw new Error(`Slug or alias conflict: ${value} belongs to ${owner} and ${article.slug}`);
      owners.set(value, article.slug);
    }
  }

  const canonical = new Set(normalized.map((article) => article.slug));
  for (const article of normalized) {
    const unknown = article.outboundSlugs.find((slug) => !canonical.has(slug));
    if (unknown) throw new Error(`Unknown public slug ${unknown} linked from ${article.slug}`);
  }

  const backlinks = new Map(normalized.map((article) => [article.slug, [] as string[]]));
  for (const article of normalized) {
    for (const target of article.outboundSlugs) backlinks.get(target)?.push(article.slug);
  }

  const articles: PublicArticle[] = normalized
    .map((article) => ({ ...article, backlinkSlugs: [...(backlinks.get(article.slug) ?? [])].sort() }))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug));
  return { articles, bySlug: new Map(articles.map((article) => [article.slug, article] as const)) };
}
