import { execFileSync } from 'node:child_process';
import { ARTICLES } from '../src/content/articles';
import { TAB_PATHS } from '../src/lib/routes';
import { PROVINCE_PAGES } from '../netlify/edge-functions/lib/regions.ts';

export function runArticleTests() {
  console.log('🧪 Testing seller guides (Markdown articles)...');
  const fail = (m: string) => { throw new Error(m); };

  // The committed HTML must match the Markdown
  try {
    execFileSync('node', ['scripts/build-articles.mjs', '--check'], { stdio: 'pipe' });
  } catch {
    fail('src/content/articles.ts is out of date: run `npm run articles`');
  }

  const known = new Set<string>([
    ...Object.values(TAB_PATHS),
    ...ARTICLES.map((a) => a.path),
    ...PROVINCE_PAGES.map((p) => `/for-sale-by-owner/${p.slug}`),
  ]);
  for (const a of ARTICLES) {
    if (a.title.length > 60) fail(`${a.slug}: title is ${a.title.length} characters (60 max)`);
    if (!a.title.endsWith(' · OwnersMarket')) fail(`${a.slug}: title should end with " · OwnersMarket"`);
    if (a.description.length > 160) fail(`${a.slug}: description is ${a.description.length} characters (160 max)`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.modified)) fail(`${a.slug}: bad last-checked date`);
    if (!a.html.includes('id="sources"')) fail(`${a.slug}: needs a Sources section`);
    if (/Image suggestions|Notes for the|Eyebrow|Button:|Second link:/.test(a.html)) fail(`${a.slug}: internal notes leaked into the page`);
    if (/\]\(|\*\*|^#+ /m.test(a.html.replace(/<[^>]+>/g, ''))) fail(`${a.slug}: Markdown left unconverted in the page`);
    if (/<h1[\s>]/.test(a.html)) fail(`${a.slug}: the page draws the H1; the body must not have one`);
    // Every link to our own site must go to a real page
    for (const [, href] of a.html.matchAll(/href="(\/[^"#?]*)/g)) {
      if (!known.has(href.replace(/\/$/, '') || '/')) fail(`${a.slug}: broken link ${href}`);
    }
    // Wording rules (marketing-context.md)
    const text = a.html.replace(/<[^>]+>/g, ' ');
    if (/\bverified\b/i.test(text)) fail(`${a.slug}: don't say "verified"`);
    for (const m of text.matchAll(/finder(?:&#39;|')s fee/gi)) {
      const before = text.slice(Math.max(0, (m.index ?? 0) - 40), m.index);
      if (!/not\s*(&quot;|")?\s*$/i.test(before)) fail(`${a.slug}: "finder's fee" may only appear as "not finder's fee"`);
    }
    if (/qu[eé]bec/i.test(a.path)) fail('No Québec guides');
    if (/keep (100%|the whole commission|all of the commission)/i.test(text)) fail(`${a.slug}: savings need the buyer's-agent caveat, never "keep 100%"`);
  }
  if (ARTICLES.some((a) => a.path === '/guides/selling-without-a-realtor-manitoba')) fail('The Manitoba guide is on hold');
  console.log(`✅ ${ARTICLES.length} seller guides: up to date, titles fit, links work, wording rules\n`);
}
