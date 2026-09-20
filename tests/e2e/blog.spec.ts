import { expect, test } from "@playwright/test";

test("reader can browse from a layer to an article", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("个人技术博客");
  await page.getByRole("link", { name: /Agent/ }).first().click();
  await expect(page).toHaveURL(/\/layers\/80-agent\//);
  await page.getByRole("link", { name: "AI 编程 Agent 架构深度解析" }).click();
  await expect(page).toHaveURL(/\/articles\/ai-agent-architecture\//);
  await expect(page.locator("article h1")).toHaveText("AI 编程 Agent 架构深度解析");
});

test("articles index exposes only public metadata", async ({ request }) => {
  const response = await request.get("/data/articles.json");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.schemaVersion).toBe(1);
  expect(body.articles).toHaveLength(5);
  expect(JSON.stringify(body)).not.toContain("markdown");
});

test("search page exposes the Pagefind mount point", async ({ page }) => {
  await page.goto("/search/");
  await expect(page.getByRole("heading", { name: "搜索" })).toBeVisible();
  await expect(page.locator("#search")).toBeVisible();
});

test("interactive tutorials stay inside sandboxed frames", async ({ page }) => {
  await page.goto("/articles/transformer/");
  const frame = page.locator('iframe[sandbox="allow-scripts"]');
  await expect(frame).toHaveCount(3);
  await expect(frame.first()).toHaveAttribute("loading", "lazy");
  await expect(frame.first()).toHaveAttribute("src", /^\/interactives\/[a-f0-9]+\.html$/);
  await expect(
    frame.first().contentFrame().getByText("你是一个 token", { exact: true }),
  ).toBeVisible();
});

test("math is rendered as visible KaTeX", async ({ page }) => {
  await page.goto("/articles/transformer/");
  const firstFormula = page.locator(".katex").first();
  await expect(firstFormula.locator(".katex-html")).toBeVisible();
  await expect(firstFormula).not.toContainText("$$");
});

test("private notes are not routable", async ({ request }) => {
  const response = await request.get("/articles/cnn/");
  expect(response.status()).toBe(404);
});
