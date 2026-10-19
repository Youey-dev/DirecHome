import { PRERENDER_PATHS, render } from '../src/prerender/entry';

export function runPrerenderTests() {
  console.log('🧪 Testing pre-built page HTML for search engines...');
  const fail = (m: string) => { throw new Error(m); };
  for (const path of ['/', '/how-it-works', '/calculator', '/guides/selling-your-home', '/guides/buying-a-home', '/guides/selling-without-a-realtor-bc', '/about']) {
    if (!PRERENDER_PATHS.includes(path)) fail(`${path} should be pre-built`);
    const html = render(path) ?? '';
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    if ((html.match(/<h1[\s>]/g) ?? []).length !== 1) fail(`${path} should have exactly one main heading`);
    if (text.length < 1500) fail(`${path} has too little text for search engines (${text.length} characters)`);
    if (!html.includes('href="/browse"')) fail(`${path} should link to the homes for sale`);
  }
  if (!(render('/about') ?? '').includes('mailto:hello@ownersmarket.ca')) fail('The about page should show the contact email');
  if (render('/dashboard') !== null) fail('Private pages must never be pre-built');
  console.log('✅ Pre-built pages: one heading each, full text and links, no private pages\n');
}
