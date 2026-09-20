import { resolve } from "node:path";
import { loadPublication } from "../src/lib/load-publication";

const publication = await loadPublication(resolve("content/generated"));
process.stdout.write(`Validated ${publication.articles.length} published article(s).\n`);
