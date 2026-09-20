import type { APIRoute } from "astro";
import { publicationPromise } from "../../lib/site";
export const GET: APIRoute = async () => {
  const publication = await publicationPromise;
  return new Response(JSON.stringify(publication.index), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300" } });
};
