import type { APIRoute } from "astro";
import { publicationPromise } from "../lib/site";
export const GET: APIRoute = async () => {
  const publication = await publicationPromise;
  const lines = publication.articles.flatMap((article) => article.aliases.map((alias) => `/articles/${alias}/ /articles/${article.slug}/ 301`));
  return new Response(`${lines.join("\n")}\n`, { headers: { "content-type": "text/plain" } });
};
