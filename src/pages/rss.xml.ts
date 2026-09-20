import rss from "@astrojs/rss";
import { publicationPromise } from "../lib/site";
export async function GET(context: { site?: URL }) {
  const publication = await publicationPromise;
  return rss({ title: "个人技术博客", description: "机器人、AI 与软件系统的结构化技术笔记。", site: context.site ?? new URL("http://localhost:4321"), items: publication.articles.map((article) => ({ title: article.title, description: article.summary, pubDate: new Date(`${article.publishedAt}T00:00:00Z`), link: `/articles/${article.slug}/` })) });
}
