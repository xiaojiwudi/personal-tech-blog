const PINNED_GSAP = "https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js";

export interface IframePolicyInput {
  readonly src: string;
  readonly sandbox: string;
  readonly title: string;
}

export function validateInteractiveHtml(html: string): void {
  const externalReferences = [...html.matchAll(/<(?:script|link|iframe)[^>]+(?:src|href)=["'](https?:\/\/[^"']+)["']/gi)]
    .map((match) => match[1]);
  const forbidden = externalReferences.find((url) => url !== PINNED_GSAP);
  if (forbidden) throw new Error(`External dependency is not allowed: ${forbidden}`);
  if (/<base\b/i.test(html) || /<form\b/i.test(html) || /window\.top|parent\./i.test(html)) {
    throw new Error("Interactive HTML contains a forbidden navigation or form capability");
  }
}

export function validateIframe(input: IframePolicyInput): void {
  if (!/^\/interactives\/[a-z0-9][a-z0-9.-]*\.html$/.test(input.src)) throw new Error("Iframe src must be a local interactive endpoint");
  if (input.sandbox.trim() !== "allow-scripts") throw new Error("Iframe sandbox must contain only allow-scripts");
  if (!input.title.trim()) throw new Error("Iframe title is required");
}
