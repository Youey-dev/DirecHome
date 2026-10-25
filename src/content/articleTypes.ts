/** A seller guide written in Markdown (src/content/articles/*.md) and turned into HTML by scripts/build-articles.mjs. */
export interface Article {
  slug: string;
  /** e.g. /guides/should-i-sell-my-house-myself */
  path: string;
  title: string;
  description: string;
  h1: string;
  eyebrow: string;
  readingTime: string;
  /** "October 24, 2026" */
  lastChecked: string;
  /** ISO dates for structured data */
  modified: string;
  published: string;
  html: string;
}
