import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const current = JSON.parse(readFileSync("content/generated/manifest.json", "utf8"));
let previous = { articles: [], files: [] };
try {
  previous = JSON.parse(execFileSync("git", ["show", "origin/main:content/generated/manifest.json"], { encoding: "utf8" }));
} catch {
  // The first sync has no previous manifest.
}
const bySlug = (manifest) => new Map(manifest.articles.map((article) => [article.slug, article.sha256]));
const before = bySlug(previous);
const after = bySlug(current);
const added = [...after.keys()].filter((slug) => !before.has(slug)).sort();
const removed = [...before.keys()].filter((slug) => !after.has(slug)).sort();
const modified = [...after.keys()].filter((slug) => before.has(slug) && before.get(slug) !== after.get(slug)).sort();
const list = (items) => items.length ? items.map((item) => `- \`${item}\``).join("\n") : "- None";
process.stdout.write(`## robot-kb publication sync

Source commit: \`${current.source.commitSha}\`

### Added
${list(added)}

### Modified
${list(modified)}

### Removed
${list(removed)}

### Package
- Articles: ${current.articles.length}
- Registered files: ${current.files.length}

Generated content must be corrected in robot-kb, not edited in this PR.
`);
