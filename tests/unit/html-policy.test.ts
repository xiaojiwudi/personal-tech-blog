import { describe, expect, it } from "vitest";
import { validateInteractiveHtml, validateIframe } from "../../src/lib/html-policy";

describe("interactive HTML policy", () => {
  it("allows inline scripts and the pinned GSAP dependency", () => {
    expect(() => validateInteractiveHtml('<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script><script>void 0</script>')).not.toThrow();
  });

  it("rejects an unapproved remote dependency", () => {
    expect(() => validateInteractiveHtml('<script src="https://evil.example/a.js"></script>')).toThrow(/external/i);
  });

  it("requires a sandboxed local iframe", () => {
    expect(() => validateIframe({ src: "/interactives/demo.html", sandbox: "allow-scripts", title: "Demo" })).not.toThrow();
    expect(() => validateIframe({ src: "https://example.com", sandbox: "allow-scripts allow-same-origin", title: "Bad" })).toThrow();
  });

  it("rejects forms and top-window access", () => {
    expect(() => validateInteractiveHtml("<form></form>")).toThrow(/forbidden/i);
    expect(() => validateInteractiveHtml("<script>window.top.location='/'</script>")).toThrow(/forbidden/i);
  });
});
