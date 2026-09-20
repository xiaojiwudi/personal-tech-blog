export const LAYER_IDS = [
  "00-foundations",
  "10-middleware",
  "20-perception",
  "30-localization",
  "40-navigation",
  "50-control",
  "60-learning",
  "70-system",
  "80-agent"
] as const;

export type LayerId = (typeof LAYER_IDS)[number];

export interface ArticleInput {
  readonly title: string;
  readonly slug: string;
  readonly summary: string;
  readonly publishedAt: string;
  readonly lastUpdated: string;
  readonly primaryLayer: string;
  readonly stackLayers: readonly string[];
  readonly tags: readonly string[];
  readonly aliases: readonly string[];
  readonly outboundSlugs: readonly string[];
}

export interface PublicArticle extends ArticleInput {
  readonly backlinkSlugs: readonly string[];
}

export interface LoadedArticle extends PublicArticle {
  readonly markdown: string;
  readonly html: string;
  readonly headings: readonly { depth: number; text: string; id: string }[];
}

export interface ArticlesIndexV1 {
  readonly schemaVersion: 1;
  readonly articles: readonly PublicArticle[];
}
