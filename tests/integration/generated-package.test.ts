import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadPublication, renderMarkdown } from "../../src/lib/load-publication";

describe("generated content package", () => {
  it("loads the committed fixture package", async () => {
    const publication = await loadPublication(resolve("content/generated"));
    expect(publication.articles.length).toBeGreaterThan(0);
    expect(publication.index.schemaVersion).toBe(1);
  });

  it("renders readable KaTeX instead of leaving TeX delimiters", async () => {
    const rendered = await renderMarkdown("Inline $x^2$ and block:\n\n$$y = x + 1$$");
    expect(rendered.html).toContain('class="katex"');
    expect(rendered.html).not.toContain("$x^2$");
    expect(rendered.html).not.toContain("$$y = x + 1$$");
  });

  it("renders inline math next to Chinese punctuation in headings", async () => {
    const rendered = await renderMarkdown("### 第二步：$QK^T$——点积");
    expect(rendered.html).toContain('<h3 id="第二步-qk-t-点积">');
    expect(rendered.html).toContain('class="katex"');
    expect(rendered.html).not.toContain("$QK^T$");
  });

  it("uses readable math labels in the table of contents", async () => {
    const rendered = await renderMarkdown("### $\\text{Loss}$ 与 $\\sqrt{d_k}$");
    expect(rendered.headings[0].text).toBe("Loss 与 √(d_k)");
  });

  it("preserves a validated local interactive iframe source", async () => {
    const rendered = await renderMarkdown(
      '<iframe src="/interactives/demo.html" title="Demo" sandbox="allow-scripts" loading="lazy"></iframe>',
    );
    expect(rendered.html).toContain('src="/interactives/demo.html"');
  });

  it("rejects an iframe that bypasses the local sandbox policy", async () => {
    await expect(renderMarkdown(
      '<iframe src="https://evil.example/embed" title="Bad" sandbox="allow-scripts allow-same-origin"></iframe>',
    )).rejects.toThrow(/iframe|sandbox/i);
  });

  it.each([
    '<iframe title="Missing source" sandbox="allow-scripts"></iframe>',
    '<iframe src="/interactives/demo.html" title="Missing sandbox"></iframe>',
    '<iframe src="/interactives/demo.html" sandbox="allow-scripts"></iframe>',
  ])("rejects an interactive iframe with a missing required attribute", async (iframe) => {
    await expect(renderMarkdown(iframe)).rejects.toThrow();
  });
});
