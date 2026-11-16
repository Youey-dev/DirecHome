import React from 'react';
import { BookOpen, Clock, ShieldCheck } from 'lucide-react';
import { ARTICLES } from '../content/articles';
import type { Article } from '../content/articleTypes';
import { NavLink } from '../components/NavLink';

type Nav = (tab: string, id?: string) => void;

export const articleBySlug = (slug: string): Article | undefined => ARTICLES.find((a) => a.slug === slug);

/** Guides grouped by topic for the /guides page (with jump links) and the "More guides" list. */
export const GUIDE_GROUPS: { id: string; title: string; intro: string; slugs: string[] }[] = [
  {
    id: 'start',
    title: 'Start here',
    intro: 'New to selling privately? Read these first.',
    slugs: ['should-i-sell-my-house-myself', 'selling-your-home', 'paperwork-to-sell-your-house-privately', 'how-to-list-your-house-for-sale-by-owner'],
  },
  {
    id: 'compare',
    title: 'Compare your options',
    intro: 'Every way to sell, side by side, including when another option suits you better.',
    slugs: ['ways-to-sell-your-home-privately-in-canada', 'selling-privately-vs-discount-brokerage-vs-flat-fee-mls'],
  },
  {
    id: 'costs',
    title: 'Costs and taxes',
    intro: 'What selling really costs, with worked examples you can check.',
    slugs: ['how-to-avoid-paying-realtor-commission', 'cost-to-sell-a-house-in-bc', 'cost-to-sell-a-house-in-ontario', 'cost-to-sell-a-house-in-alberta'],
  },
  {
    id: 'provinces',
    title: 'Province guides',
    intro: 'The rules, forms and taxes where your home is.',
    slugs: [
      'selling-without-a-realtor-bc',
      'selling-without-a-realtor-alberta',
      'selling-without-a-realtor-saskatchewan',
      'selling-without-a-realtor-ontario',
      'selling-without-a-realtor-nova-scotia',
      'selling-without-a-realtor-new-brunswick',
      'selling-without-a-realtor-pei',
      'selling-without-a-realtor-newfoundland-and-labrador',
    ],
  },
  {
    id: 'steps',
    title: 'Step by step',
    intro: 'One stage of the sale at a time.',
    slugs: [
      'how-to-research-your-asking-price',
      'getting-your-home-ready-to-sell',
      'how-to-show-your-home-safely',
      'what-a-real-estate-lawyer-does-when-you-sell',
      'selling-privately-when-buyer-has-an-agent',
      'how-long-does-it-take-to-sell-a-house-privately',
    ],
  },
  {
    id: 'situations',
    title: 'Special situations',
    intro: 'When your sale isn’t the usual kind.',
    slugs: [
      'selling-a-condo-privately',
      'selling-an-acreage-or-rural-home-privately',
      'selling-a-house-with-tenants',
      'selling-a-house-with-a-mortgage',
      'selling-an-inherited-house',
      'selling-your-house-during-separation-or-divorce',
      'selling-a-vacant-house',
      'selling-a-house-as-is',
    ],
  },
];

/** Province tile labels ("selling-without-a-realtor-bc" → "British Columbia") */
const PROVINCE_LABEL: Record<string, string> = {
  'selling-without-a-realtor-bc': 'British Columbia',
  'selling-without-a-realtor-alberta': 'Alberta',
  'selling-without-a-realtor-saskatchewan': 'Saskatchewan',
  'selling-without-a-realtor-ontario': 'Ontario',
  'selling-without-a-realtor-nova-scotia': 'Nova Scotia',
  'selling-without-a-realtor-new-brunswick': 'New Brunswick',
  'selling-without-a-realtor-pei': 'Prince Edward Island',
  'selling-without-a-realtor-newfoundland-and-labrador': 'Newfoundland and Labrador',
};

/** Guides first published in the last 14 days get a "New" tag. */
const isNew = (a: Article, now = Date.now()) => now - Date.parse(a.published) < 14 * 86_400_000;

/** The tab and id that open a guide in the app (the Canada-wide and BC guides keep their own tab names). */
const OWN_TABS: Record<string, string> = { 'selling-your-home': 'guide-selling', 'selling-without-a-realtor-bc': 'guide-bc' };
export const guideLink = (slug: string): { to: string; id?: string } => (OWN_TABS[slug] ? { to: OWN_TABS[slug] } : { to: 'article', id: slug });

const shortTitle = (a: Article) => a.title.replace(/ · OwnersMarket$/, '');

/**
 * Links inside the article HTML are plain <a href="/...">. Clicking one switches page inside the
 * app (no reload): the address changes and App picks it up from the popstate event.
 */
function useInternalLinks(onNavigate: Nav) {
  return (e: React.MouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest('a');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const href = a.getAttribute('href') ?? '';
    if (!href.startsWith('/') || href.startsWith('//') || a.target === '_blank') return;
    e.preventDefault();
    if (href === '/sell') return onNavigate('wizard');
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0 });
  };
}

const GuideList: React.FC<{ slugs: string[]; onNavigate: Nav }> = ({ slugs, onNavigate }) => (
  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
    {slugs
      .map(articleBySlug)
      .filter((a): a is Article => !!a)
      .map((a) => {
        const link = guideLink(a.slug);
        return (
          <li key={a.slug}>
            <NavLink
              to={link.to}
              listingId={link.id}
              onNavigate={onNavigate}
              className="group block h-full bg-white rounded-[10px] border border-slate-200 hover:border-emerald-600 p-4"
            >
              <span className="block font-bold text-[17px] text-slate-900 group-hover:text-emerald-800 leading-snug">{a.h1}</span>
              <span className="block mt-1 text-[14px] text-slate-600 leading-relaxed">{a.description}</span>
            </NavLink>
          </li>
        );
      })}
  </ul>
);

// ---------------------------------------------------------------------------
// One guide
// ---------------------------------------------------------------------------
export const ArticlePage: React.FC<{ slug: string; onNavigate: Nav }> = ({ slug, onNavigate }) => {
  const article = articleBySlug(slug);
  const onClick = useInternalLinks(onNavigate);
  if (!article) return null;
  const group = GUIDE_GROUPS.find((g) => g.slugs.includes(slug));
  const more = (group?.slugs ?? []).filter((s) => s !== slug).slice(0, 4);

  return (
    <div className="text-slate-900">
      <article className="max-w-[780px] mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-12">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-600 mb-5">
          <NavLink to="guides" onNavigate={onNavigate} className="hover:underline underline-offset-2">
            Seller guides
          </NavLink>{' '}
          / <span className="text-slate-900">{shortTitle(article)}</span>
        </nav>
        <p className="text-[15px] text-slate-600">{article.eyebrow}</p>
        <h1 className="font-semibold text-[32px] sm:text-[43px] leading-[1.05] mt-2">{article.h1}</h1>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-4 h-4" aria-hidden="true" /> {article.readingTime}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" /> Facts checked {article.lastChecked}
          </span>
        </div>

        <div className="om-article mt-8" onClick={onClick} dangerouslySetInnerHTML={{ __html: article.html }} />

        <p className="mt-10 pt-5 border-t border-slate-200 text-sm text-slate-500 leading-relaxed">
          General information only, not legal, tax or financial advice. Rules and rates change; your lawyer (or notary, in BC) will confirm what
          applies to your sale. OwnersMarket is an advertising platform, not a real estate brokerage.
        </p>
      </article>

      {more.length > 0 && (
        <section className="bg-slate-50 border-t border-slate-200">
          <div className="max-w-[980px] mx-auto px-4 sm:px-6 py-10 flex flex-col gap-5">
            <h2 className="font-semibold text-[24px] leading-[1.1] flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-emerald-700" aria-hidden="true" /> More seller guides
            </h2>
            <GuideList slugs={more} onNavigate={onNavigate} />
            <NavLink to="guides" onNavigate={onNavigate} className="self-start inline-flex items-center gap-2 font-semibold text-emerald-800 underline underline-offset-2">
              All seller guides
            </NavLink>
          </div>
        </section>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// All guides: /guides
// ---------------------------------------------------------------------------
const NewTag = () => (
  <span className="ml-2 align-[2px] inline-block text-[11px] font-bold tracking-wide text-emerald-800 border border-emerald-700 rounded-full px-[7px] py-px">
    NEW
  </span>
);

const GuideRows: React.FC<{ slugs: string[]; onNavigate: Nav }> = ({ slugs, onNavigate }) => (
  <ul>
    {slugs
      .map(articleBySlug)
      .filter((a): a is Article => !!a)
      .map((a) => {
        const link = guideLink(a.slug);
        return (
          <li key={a.slug} className="border-t border-hairline">
            <NavLink to={link.to} listingId={link.id} onNavigate={onNavigate} className="group block py-3.5">
              <span className="block text-[17px] font-semibold leading-snug text-slate-900 group-hover:text-emerald-800">
                {a.h1}
                {isNew(a) && <NewTag />}
              </span>
              <span className="block mt-1 text-[14px] text-slate-600 leading-relaxed">{a.description}</span>
            </NavLink>
          </li>
        );
      })}
  </ul>
);

const GroupSection: React.FC<{ g: (typeof GUIDE_GROUPS)[number]; onNavigate: Nav; children?: React.ReactNode }> = ({ g, onNavigate, children }) => (
  <section id={g.id} className="scroll-mt-20 flex flex-col gap-2">
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="font-semibold text-[26px] leading-[1.1] tracking-[-0.02em]">{g.title}</h2>
      <span className="text-[14px] text-slate-600 tabular-nums">
        {g.slugs.length} {g.slugs.length === 1 ? 'guide' : 'guides'}
      </span>
    </div>
    <p className="text-[15px] text-slate-600 mb-1">{g.intro}</p>
    {children ?? <GuideRows slugs={g.slugs} onNavigate={onNavigate} />}
  </section>
);

export const GuidesIndexPage: React.FC<{ onNavigate: Nav }> = ({ onNavigate }) => {
  const byId = (id: string) => GUIDE_GROUPS.find((g) => g.id === id)!;
  const chips = [...GUIDE_GROUPS.map((g) => ({ id: g.id, title: g.title })), { id: 'buying', title: 'Buying privately' }];
  const link = 'font-semibold text-emerald-800 underline underline-offset-2';
  return (
    <div className="text-slate-900 max-w-[1100px] mx-auto px-4 sm:px-6 py-10 sm:py-14 flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <p className="text-[15px] text-slate-600">Guides · Canada, outside Québec</p>
        <h1 className="font-semibold text-[36px] sm:text-[52px] leading-[1.05] tracking-[-0.035em]">Guides to selling and buying privately</h1>
        <p className="text-lg text-slate-600 leading-relaxed max-w-[44em]">
          Plain-English answers for Canadians selling or buying a home without a realtor. Every guide starts with the short answer, shows when
          it was last checked, and links to official sources.
        </p>
      </div>

      {/* Jump to a topic */}
      <nav aria-label="Guide topics" className="sticky top-0 z-10 bg-white py-2.5 border-b border-hairline -mx-4 px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-2 overflow-x-auto sm:flex-wrap pb-0.5">
          {chips.map((c) => (
            <li key={c.id} className="shrink-0">
              <a href={`#${c.id}`} className="om-chip">
                {c.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-x-12 gap-y-10">
        <div className="flex flex-col gap-10">
          <GroupSection g={byId('start')} onNavigate={onNavigate} />
          <GroupSection g={byId('compare')} onNavigate={onNavigate} />
          <GroupSection g={byId('costs')} onNavigate={onNavigate}>
            <GuideRows slugs={byId('costs').slugs} onNavigate={onNavigate} />
            <p className="border-t border-hairline pt-3.5 text-[15px] text-slate-700">
              Try your own numbers in the{' '}
              <NavLink to="calculator" onNavigate={onNavigate} className={link}>
                savings estimator
              </NavLink>
              .
            </p>
          </GroupSection>
          <GroupSection g={byId('steps')} onNavigate={onNavigate} />
        </div>
        <div className="flex flex-col gap-10">
          <GroupSection g={byId('provinces')} onNavigate={onNavigate}>
            <ul className="grid grid-cols-2 gap-2">
              {byId('provinces').slugs.map((slug) => {
                const l = guideLink(slug);
                return (
                  <li key={slug}>
                    <NavLink
                      to={l.to}
                      listingId={l.id}
                      onNavigate={onNavigate}
                      className="block h-full px-3.5 py-3 rounded-xl border-[1.5px] border-hairline hover:border-emerald-700 font-semibold text-[15px] text-slate-900"
                    >
                      {PROVINCE_LABEL[slug]}
                    </NavLink>
                  </li>
                );
              })}
              <li className="px-3.5 py-3 rounded-xl border-[1.5px] border-dashed border-hairline text-[14px] text-slate-600">
                Manitoba and the territories:{' '}
                <NavLink to="regions" onNavigate={onNavigate} className={link}>
                  province pages
                </NavLink>
              </li>
            </ul>
          </GroupSection>
          <GroupSection g={byId('situations')} onNavigate={onNavigate} />
          <section id="buying" className="scroll-mt-20 flex flex-col gap-2">
            <h2 className="font-semibold text-[26px] leading-[1.1] tracking-[-0.02em]">Buying privately</h2>
            <p className="text-[15px] text-slate-600 mb-1">For buyers dealing directly with an owner.</p>
            <ul>
              <li className="border-t border-hairline">
                <NavLink to="guide-buying" onNavigate={onNavigate} className="group block py-3.5">
                  <span className="block text-[17px] font-semibold leading-snug text-slate-900 group-hover:text-emerald-800">
                    How to buy a house for sale by owner in Canada
                  </span>
                  <span className="block mt-1 text-[14px] text-slate-600 leading-relaxed">
                    Eight steps, from getting pre-approved to getting the keys.
                  </span>
                </NavLink>
              </li>
            </ul>
          </section>
        </div>
      </div>

      <div className="rounded-2xl bg-mist text-slate-900 p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <p className="font-semibold text-[22px] leading-[1.1]">Ready to sell?</p>
          <p className="text-slate-600 mt-2">List your home for $24.99 a month, with no commission. Buyers message you directly.</p>
        </div>
        <button onClick={() => onNavigate('wizard')} className="om-btn om-btn-dark shrink-0">
          List your home
        </button>
      </div>
    </div>
  );
};
