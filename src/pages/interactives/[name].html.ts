import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { APIRoute } from "astro";
import { publicationPromise } from "../../lib/site";
export async function getStaticPaths() {
  const publication = await publicationPromise;
  return publication.manifest.files.filter((file) => file.kind === "interactive").map((file) => ({ params: { name: file.path.split("/").at(-1)?.replace(/\.html$/, "") }, props: { path: file.path } }));
}
export const GET: APIRoute = async ({ props }) => new Response(await readFile(resolve("content/generated", String(props.path))), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'none'; script-src 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'" } });
