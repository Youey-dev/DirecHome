import React from 'react';
import { ArrowRight, BookOpen, Clock, ShieldCheck } from 'lucide-react';
import { ARTICLES } from '../content/articles';
import type { Article } from '../content/articleTypes';
import { NavLink } from '../components/NavLink';

type Nav = (tab: string, id?: string) => void;

export const articleBySlug = (slug: string): Article | undefined => ARTICLES.find((a) => a.slug === slug);

/** Guides grouped for the /guides page and the "More guides" list. */
export const GUIDE_GROUPS: { title: string; slugs: string[] }[] = [
  {
    title: 'Start here',
    slugs: ['should-i-sell-my-house-myself', 'selling-your-home', 'paperwork-to-sell-your-house-privately', 'how-to-list-your-house-for-sale-by-owner'],
  },
  {
    title: 'Selling step by step',
    slugs: [
      'how-to-research-your-asking-price',
      'what-a-real-estate-lawyer-does-when-you-sell',
      'selling-privately-when-buyer-has-an-agent',
      'how-to-show-your-home-safely',
      'selling-privately-vs-discount-brokerage-vs-flat-fee-mls',
    ],
  },
  {
    title: 'Selling in your province',
    slugs: [
      'selling-without-a-realtor-alberta',
      'selling-without-a-realtor-saskatchewan',
      'selling-without-a-realtor-ontario',
      'selling-without-a-realtor-new-brunswick',
      'selling-without-a-realtor-nova-scotia',
      'selling-without-a-realtor-pei',
      'selling-without-a-realtor-newfoundland-and-labrador',
    ],
  },
];

/** The tab and id that open a guide in the app (the Canada-wide seller guide keeps its own tab name). */
export const guideLink = (slug: string): { to: string; id?: string } => (slug === 'selling-your-home' ? { to: 'guide-selling' } : { to: 'article', id: slug });

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
        <p className="text-sm font-bold text-emerald-700">{article.eyebrow}</p>
        <h1 className="font-display font-bold text-[40px] sm:text-[54px] leading-[0.98] mt-2">{article.h1}</h1>
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
            <h2 className="font-display font-bold text-[30px] leading-none flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-emerald-700" aria-hidden="true" /> More seller guides
            </h2>
            <GuideList slugs={more} onNavigate={onNavigate} />
            <NavLink to="guides" onNavigate={onNavigate} className="self-start inline-flex items-center gap-2 font-semibold text-emerald-800 underline underline-offset-2">
              All seller guides <ArrowRight className="w-4 h-4" aria-hidden="true" />
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
export const GuidesIndexPage: React.FC<{ onNavigate: Nav }> = ({ onNavigate }) => (
  <div className="text-slate-900 max-w-[980px] mx-auto px-4 sm:px-6 py-10 sm:py-14 flex flex-col gap-10">
    <div className="flex flex-col gap-4">
      <p className="text-sm font-bold text-emerald-700">Seller guides · Canada, outside Québec</p>
      <h1 className="font-display font-bold text-[42px] sm:text-[58px] leading-[0.95]">Guides to selling your home yourself</h1>
      <p className="text-lg text-slate-700 leading-relaxed max-w-[44em]">
        Free, plain-English guides to selling your home without a realtor in Canada: deciding if it’s right for you, the paperwork, pricing
        research, viewings, buyers’ agents and what’s different in your province. Every fact links to an official source.
      </p>
    </div>
    {GUIDE_GROUPS.map((g) => (
      <section key={g.title} className="flex flex-col gap-4">
        <h2 className="font-display font-bold text-[30px] leading-none">{g.title}</h2>
        <GuideList slugs={g.slugs} onNavigate={onNavigate} />
        {g.title === 'Selling in your province' && (
          <p className="text-[15px] text-slate-600">
            Selling in British Columbia? Read the{' '}
            <NavLink to="guide-bc" onNavigate={onNavigate} className="font-semibold text-emerald-800 underline underline-offset-2">
              BC guide
            </NavLink>
            . For Manitoba and the territories, see the{' '}
            <NavLink to="regions" onNavigate={onNavigate} className="font-semibold text-emerald-800 underline underline-offset-2">
              province pages
            </NavLink>
            .
          </p>
        )}
      </section>
    ))}
    <section className="flex flex-col gap-3">
      <h2 className="font-display font-bold text-[30px] leading-none">Buying a home</h2>
      <p className="text-[16px] text-slate-700">
        <NavLink to="guide-buying" onNavigate={onNavigate} className="font-semibold text-emerald-800 underline underline-offset-2">
          How to buy a house for sale by owner in Canada
        </NavLink>
      </p>
    </section>
    <div className="rounded-[14px] bg-emerald-950 text-white p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
      <div>
        <p className="font-display font-bold text-[28px] leading-none">Ready to sell?</p>
        <p className="text-emerald-50/90 mt-2">List your home for $24.99 a month, with no commission. Buyers message you directly.</p>
      </div>
      <button
        onClick={() => onNavigate('wizard')}
        className="px-6 py-3.5 bg-[#F2C14E] hover:bg-[#e8b43a] text-slate-900 font-semibold rounded-md cursor-pointer min-h-[48px] shrink-0"
      >
        List your home
      </button>
    </div>
  </div>
);
