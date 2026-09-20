import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { APIRoute } from "astro";
import { publicationPromise } from "../../lib/site";
export async function getStaticPaths() {
  const publication = await publicationPromise;
  return publication.manifest.files.filter((file) => file.kind === "media").map((file) => ({ params: { name: file.path.split("/").at(-1) }, props: { path: file.path, mediaType: file.mediaType } }));
}
export const GET: APIRoute = async ({ props }) => new Response(await readFile(resolve("content/generated", String(props.path))), { headers: { "content-type": String(props.mediaType), "cache-control": "public, max-age=31536000, immutable" } });
