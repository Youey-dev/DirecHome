/**
 * Turns the seller guides in src/content/articles/*.md into page HTML.
 *
 * Each article is Markdown with a header block (slug, title, meta_description, h1, reading_time,
 * last_checked...), as delivered by the content creator. This script:
 *   - reads the header,
 *   - drops the parts that aren't for readers ("Image suggestions", "Notes for the founder"),
 *   - renders the rest to HTML (tables, checklists, callout boxes, the call-to-action box),
 * and writes two files that are committed with the site:
 *   - src/content/articles.ts                      (the pages, used by the app and pre-rendering)
 *   - netlify/edge-functions/lib/articles.ts       (titles, descriptions and dates for search engines)
 *
 * Run it after editing any article:   npm run articles
 * The test suite fails if these files are out of date.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'src/content/articles');

/** Display order and grouping on the /guides page. */
const ORDER = [
  'should-i-sell-my-house-myself',
  'selling-your-home',
  'paperwork-to-sell-your-house-privately',
  'how-to-list-your-house-for-sale-by-owner',
  'how-to-research-your-asking-price',
  'what-a-real-estate-lawyer-does-when-you-sell',
  'selling-privately-when-buyer-has-an-agent',
  'how-to-show-your-home-safely',
  'selling-privately-vs-discount-brokerage-vs-flat-fee-mls',
  'selling-without-a-realtor-alberta',
  'selling-without-a-realtor-saskatchewan',
  'selling-without-a-realtor-ontario',
  'selling-without-a-realtor-new-brunswick',
  'selling-without-a-realtor-nova-scotia',
  'selling-without-a-realtor-pei',
  'selling-without-a-realtor-newfoundland-and-labrador',
  // Batch of October 30, 2026: the BC guide, cost pages, then situations, then the rest
  'selling-without-a-realtor-bc',
  'cost-to-sell-a-house-in-bc',
  'cost-to-sell-a-house-in-ontario',
  'cost-to-sell-a-house-in-alberta',
  'selling-a-house-with-a-mortgage',
  'selling-a-house-with-tenants',
  'selling-an-inherited-house',
  'selling-your-house-during-separation-or-divorce',
  'selling-a-house-as-is',
  'selling-a-vacant-house',
  'how-long-does-it-take-to-sell-a-house-privately',
  'getting-your-home-ready-to-sell',
  'selling-a-condo-privately',
  'selling-an-acreage-or-rural-home-privately',
];

/** When each guide first went live. Guides not listed here went live on FIRST_PUBLISHED. */
const BATCH_OCT30 = '2026-10-30';
const PUBLISHED = {
  'selling-your-home': '2026-10-14',
  // The BC guide existed before as a page of its own; only its `modified` date changes
  'selling-without-a-realtor-bc': '2026-10-15',
  ...Object.fromEntries(
    [
      'cost-to-sell-a-house-in-bc',
      'cost-to-sell-a-house-in-ontario',
      'cost-to-sell-a-house-in-alberta',
      'selling-a-house-with-a-mortgage',
      'selling-a-house-with-tenants',
      'selling-an-inherited-house',
      'selling-your-house-during-separation-or-divorce',
      'selling-a-house-as-is',
      'selling-a-vacant-house',
      'how-long-does-it-take-to-sell-a-house-privately',
      'getting-your-home-ready-to-sell',
      'selling-a-condo-privately',
      'selling-an-acreage-or-rural-home-privately',
    ].map((slug) => [slug, BATCH_OCT30]),
  ),
};
const FIRST_PUBLISHED = '2026-10-24';

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
function isoDate(text) {
  const m = String(text).toLowerCase().match(/([a-z]+)\s+(\d{1,2}),\s*(\d{4})/);
  if (!m || !MONTHS.includes(m[1])) throw new Error(`Can't read the date "${text}"`);
  return `${m[3]}-${String(MONTHS.indexOf(m[1]) + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function parseHeader(raw, file) {
  const m = raw.match(/^```\s*\n([\s\S]*?)\n```\s*\n/);
  if (!m) throw new Error(`${file}: missing the header block`);
  const header = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-z0-9_]+):\s*(.*)$/);
    if (kv) header[kv[1]] = kv[2].trim();
  }
  return { header, body: raw.slice(m[0].length) };
}

/** Callout boxes: a quote that starts with a bold label ("Ask your lawyer.", "Warning: ...", "Province note: ..."). */
function calloutKind(label) {
  const l = label.toLowerCase();
  if (l.startsWith('warning') || l.startsWith('safety')) return 'warning';
  if (l.startsWith('a note')) return 'info';
  if (l.startsWith('ask your lawyer') || l.startsWith('ask an accountant') || l.startsWith('ask your lender')) return 'lawyer';
  if (l.includes('note') || l.startsWith('in british columbia') || l.startsWith('in ')) return 'province';
  return 'info';
}

function renderMarkdown(md) {
  let html = marked.parse(md, { gfm: true, breaks: false });
  // Callouts
  html = html.replace(/<blockquote>\s*<p><strong>([^<]+)<\/strong>/g, (_, label) => `<blockquote class="om-callout om-callout-${calloutKind(label)}"><p><strong>${label}</strong>`);
  html = html.replace(/<blockquote>/g, '<blockquote class="om-callout om-callout-info">');
  // Tables scroll sideways on phones
  html = html.replace(/<table>/g, '<div class="om-table"><table>').replace(/<\/table>/g, '</table></div>');
  // Checklists
  html = html.replace(/<ul>\s*<li><input /g, '<ul class="om-checklist">\n<li><input ');
  // Outside links open in a new tab
  html = html.replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener noreferrer"');
  // Section anchors
  html = html.replace(/<h2>(.*?)<\/h2>/g, (_, text) => {
    const id = text.replace(/<[^>]+>/g, '').toLowerCase().replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `<h2 id="${id}">${text}</h2>`;
  });
  return html;
}

/** "## Call to action": one box with a main button and the secondary links. */
function renderCta(md) {
  const lines = md.split('\n').map((line) => {
    const button = line.match(/^Button:\s*\*\*(.+?)\*\*\s*→\s*`([^`]+)`\s*$/);
    // Blank lines around the HTML, so the Markdown on the next line is still converted
    if (button) return `\n<p class="om-cta-actions"><a class="om-cta-button" href="${esc(button[2])}">${esc(button[1])}</a></p>\n`;
    return line.replace(/^Second link:\s*/, '');
  });
  return `<div class="om-cta">${renderMarkdown(lines.join('\n'))}</div>`;
}

const articles = [];
for (const file of readdirSync(SRC).filter((f) => f.endsWith('.md')).sort()) {
  const raw = readFileSync(join(SRC, file), 'utf8');
  const { header, body } = parseHeader(raw, file);
  for (const k of ['slug', 'title', 'meta_description', 'h1', 'reading_time', 'last_checked']) if (!header[k]) throw new Error(`${file}: header is missing ${k}`);
  const path = header.slug.split(/\s+/)[0];
  const slug = path.replace(/^\/guides\//, '');
  if (`${slug}.md` !== file) throw new Error(`${file}: slug ${path} doesn't match the file name`);

  let text = body;
  const eyebrow = (text.match(/^\*\*Eyebrow:\*\*\s*(.+)$/m) ?? [])[1] ?? 'Seller guide';
  text = text.replace(/^\*\*Eyebrow:\*\*.*$/m, '');
  text = text.replace(/^# .+$/m, ''); // the page draws the H1 itself
  // Not for readers
  const cut = text.search(/^## (Image suggestions|Notes for)/m);
  if (cut >= 0) text = text.slice(0, cut);
  text = text.replace(/^---\s*$/gm, '');

  // Render section by section so the call-to-action can get its own box
  const parts = text.split(/^(?=## )/m);
  const html = parts
    .map((part) => (/^## Call to action\s*$/m.test(part.split('\n')[0]) ? renderCta(part.split('\n').slice(1).join('\n')) : renderMarkdown(part)))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  articles.push({
    slug,
    path,
    title: header.title,
    description: header.meta_description,
    h1: header.h1,
    eyebrow,
    readingTime: header.reading_time,
    lastChecked: header.last_checked,
    modified: isoDate(header.last_checked),
    published: PUBLISHED[slug] ?? FIRST_PUBLISHED,
    html,
  });
}

const missing = ORDER.filter((s) => !articles.some((a) => a.slug === s));
const extra = articles.filter((a) => !ORDER.includes(a.slug)).map((a) => a.slug);
if (missing.length || extra.length) throw new Error(`Update ORDER in build-articles.mjs. Missing: ${missing.join(', ')}; not listed: ${extra.join(', ')}`);
articles.sort((a, b) => ORDER.indexOf(a.slug) - ORDER.indexOf(b.slug));

const banner = '// Generated by scripts/build-articles.mjs from src/content/articles/*.md. Do not edit; run `npm run articles`.\n';

// `--check`: fail if the committed files don't match the Markdown (used by the tests)
const CHECK = process.argv.includes('--check');
const out = (file, content) => {
  const full = join(root, file);
  if (CHECK) {
    let current = '';
    try {
      current = readFileSync(full, 'utf8');
    } catch {}
    if (current !== content) {
      console.error(`${file} is out of date. Run: npm run articles`);
      process.exit(1);
    }
  } else writeFileSync(full, content);
};

out(
  'src/content/articles.ts',
  `${banner}import type { Article } from './articleTypes';\n\nexport const ARTICLES: Article[] = ${JSON.stringify(articles, null, 2)};\n`,
);
out(
  'netlify/edge-functions/lib/articles.ts',
  `${banner}// Titles, descriptions and dates of the seller guides, for page titles, the sitemap and structured data.\n\nexport interface ArticleMeta {\n  path: string;\n  title: string;\n  description: string;\n  h1: string;\n  published: string;\n  modified: string;\n}\n\nexport const ARTICLE_META: ArticleMeta[] = ${JSON.stringify(
    articles.map(({ path, title, description, h1, published, modified }) => ({ path, title, description, h1, published, modified })),
    null,
    2,
  )};\n`,
);
console.log(CHECK ? `${articles.length} articles up to date.` : `Built ${articles.length} articles.`);
