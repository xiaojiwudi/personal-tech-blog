import { Marked, Renderer, type Tokens } from "marked";
import { markedHighlight } from "marked-highlight";
import markedKatex from "marked-katex-extension";
import sanitizeHtml from "sanitize-html";
import { codeToHtml } from "shiki";
import { buildPublicationModel } from "./publication-model";
import { validateContentPackage } from "./content-package";
import type { ArticlesIndexV1, LoadedArticle } from "./types";

function headingId(text: string): string {
  return text.normalize("NFKC").toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
}

export async function renderMarkdown(markdown: string) {
  const headings: { depth: number; text: string; id: string }[] = [];
  const renderer = new Renderer();
  renderer.heading = ({ tokens, depth }: Tokens.Heading) => {
    const text = renderer.parser.parseInline(tokens);
    const id = headingId(text);
    headings.push({ depth, text: text.replace(/<[^>]+>/g, ""), id });
    return `<h${depth} id="${id}">${text}</h${depth}>`;
  };
  const parser = new Marked(
    markedKatex({ throwOnError: false }),
    markedHighlight({
      async: true,
      async highlight(code, language) {
        return codeToHtml(code, { lang: language || "text", theme: "github-dark" });
      }
    })
  );
  const raw = await parser.parse(markdown, { renderer, gfm: true, async: true });
  const html = sanitizeHtml(raw, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "iframe", "details", "summary", "span", "math", "semantics", "annotation", "mrow", "mi", "mo", "mn", "msup", "msub", "mfrac"]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      "*": ["id", "class", "style", "aria-hidden"],
      img: ["src", "alt", "title", "loading"],
      iframe: ["src", "title", "sandbox", "loading", "width", "height"]
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedIframeHostnames: []
  });
  return { html, headings };
}

export async function loadPublication(root: string) {
  const validated = await validateContentPackage(root);
  const model = buildPublicationModel(validated.articles.map((article) => article.input));
  const markdownBySlug = new Map(validated.articles.map((article) => [article.input.slug, article.markdown] as const));
  const articles: LoadedArticle[] = await Promise.all(model.articles.map(async (article) => {
    const markdown = markdownBySlug.get(article.slug) ?? "";
    const rendered = await renderMarkdown(markdown);
    return { ...article, markdown, html: rendered.html, headings: rendered.headings };
  }));
  const index: ArticlesIndexV1 = { schemaVersion: 1, articles: articles.map(({ markdown: _m, html: _h, headings: _t, ...article }) => article) };
  return { ...model, articles, index, manifest: validated.manifest };
}
