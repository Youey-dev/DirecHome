import { PRERENDER_PATHS, render } from '../src/prerender/entry';
import { PROVINCE_PAGES, citySlug, countCities } from '../netlify/edge-functions/lib/regions.ts';
import { PROVINCE_HUBS } from '../src/data/provinceHubs';
import { ARTICLES } from '../src/content/articles';

export function runPrerenderTests() {
  console.log('🧪 Testing pre-built page HTML for search engines...');
  const fail = (m: string) => { throw new Error(m); };
  for (const path of ['/', '/how-it-works', '/calculator', '/guides/selling-your-home', '/guides/buying-a-home', '/guides/selling-without-a-realtor-bc', '/about', '/for-sale-by-owner', ...PROVINCE_PAGES.map((p) => `/for-sale-by-owner/${p.slug}`), '/guides', ...ARTICLES.map((a) => a.path)]) {
    if (!PRERENDER_PATHS.includes(path)) fail(`${path} should be pre-built`);
    const html = render(path) ?? '';
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    if ((html.match(/<h1[\s>]/g) ?? []).length !== 1) fail(`${path} should have exactly one main heading`);
    if (text.length < 1500) fail(`${path} has too little text for search engines (${text.length} characters)`);
    if (!html.includes('href="/browse"')) fail(`${path} should link to the homes for sale`);
  }
  if (!(render('/about') ?? '').includes('mailto:hello@ownersmarket.ca')) fail('The about page should show the contact email');
  // Province pages: one per province and territory, never Québec, each with its own facts and sources
  if (PROVINCE_PAGES.length !== 12 || PROVINCE_PAGES.some((p) => p.code === 'QC')) fail('There should be 12 province pages and none for Québec');
  if (PROVINCE_HUBS.length !== PROVINCE_PAGES.length) fail('Every province page needs its facts in provinceHubs.ts');
  const leads = new Set(PROVINCE_HUBS.map((h) => h.lead));
  if (leads.size !== PROVINCE_HUBS.length) fail('Each province page should open differently');
  for (const h of PROVINCE_HUBS) {
    if (!h.sources.length || h.sources.some((s) => !s.url.startsWith('https://'))) fail(`${h.page.name} needs official https sources`);
    if (h.page.title.length > 75) fail(`${h.page.name} title is too long`);
    if (h.page.description.length > 165) fail(`${h.page.name} description is too long (${h.page.description.length})`);
    const html = render(`/for-sale-by-owner/${h.page.slug}`) ?? '';
    if (/verified/i.test(html)) fail(`${h.page.name} page must not say "verified"`);
    if (/finder.?s fee/i.test(html)) fail(`${h.page.name} page must say buyer's agent commission, not finder's fee`);
  }
  if (citySlug("St. John's") !== 'st-johns' || citySlug('Grand Forks') !== 'grand-forks' || citySlug('Montréal') !== 'montreal') fail('City addresses are wrong');
  const counted = countCities([{ city: 'Grand Forks' }, { city: 'grand forks ' }, { city: 'Kelowna' }]);
  if (counted[0].slug !== 'grand-forks' || counted[0].count !== 2) fail('Cities should be counted case-insensitively');
  if (render('/dashboard') !== null) fail('Private pages must never be pre-built');
  console.log('✅ Pre-built pages: one heading each, full text and links, no private pages\n');
}
