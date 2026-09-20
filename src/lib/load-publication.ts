import { Marked, Renderer, type Tokens } from "marked";
import { markedHighlight } from "marked-highlight";
import markedKatex from "marked-katex-extension";
import sanitizeHtml from "sanitize-html";
import { codeToHtml } from "shiki";
import { buildPublicationModel } from "./publication-model";
import { validateContentPackage } from "./content-package";
import { validateIframe } from "./html-policy";
import type { ArticlesIndexV1, LoadedArticle } from "./types";

function headingId(text: string): string {
  return text.normalize("NFKC").toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
}

function readableHeading(text: string): string {
  return text
    .replace(/\$+/g, "")
    .replace(/\\sqrt\{([^{}]+)\}/g, "√($1)")
    .replace(/\\text\{([^{}]+)\}/g, "$1")
    .replace(/[{}]/g, "");
}

export async function renderMarkdown(markdown: string) {
  for (const match of markdown.matchAll(/<iframe\b([^>]*)>/gi)) {
    const attributes = Object.fromEntries(
      [...match[1].matchAll(/([\w-]+)=["']([^"']*)["']/g)].map((attribute) => [attribute[1], attribute[2]]),
    );
    validateIframe({
      src: attributes.src ?? "",
      sandbox: attributes.sandbox ?? "",
      title: attributes.title ?? "",
    });
  }
  const headings: { depth: number; text: string; id: string }[] = [];
  const renderer = new Renderer();
  renderer.heading = ({ tokens, depth, text: sourceText }: Tokens.Heading) => {
    const text = renderer.parser.parseInline(tokens);
    const readableText = readableHeading(sourceText);
    const id = headingId(readableText);
    headings.push({ depth, text: readableText, id });
    return `<h${depth} id="${id}">${text}</h${depth}>`;
  };
  const parser = new Marked(
    markedKatex({ throwOnError: false, nonStandard: true }),
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
    allowIframeRelativeUrls: true
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
