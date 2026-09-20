import { resolve } from "node:path";
import { loadPublication } from "./load-publication";

export const publicationPromise = loadPublication(resolve("content/generated"));

export const LAYER_LABELS: Readonly<Record<string, string>> = {
  "00-foundations": "基础 · Foundations",
  "10-middleware": "中间件 · Middleware",
  "20-perception": "感知 · Perception",
  "30-localization": "定位 · Localization",
  "40-navigation": "导航 · Navigation",
  "50-control": "控制 · Control",
  "60-learning": "学习 · Learning",
  "70-system": "系统 · System",
  "80-agent": "Agent"
};
