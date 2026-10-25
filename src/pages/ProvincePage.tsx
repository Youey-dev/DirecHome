import React from 'react';
import { ArrowRight, ExternalLink, FileText, Home, Landmark, MapPin, Receipt, Scale } from 'lucide-react';
import { Listing, isListingLive } from '../types/listing';
import { ListingCard } from '../components/ListingCard';
import { NavLink } from '../components/NavLink';
import { PROVINCE_FACTS_CHECKED, PROVINCE_HUBS, ProvinceHub, hubBySlug, provinceGuide } from '../data/provinceHubs';
import { CITY_PAGE_MIN_LISTINGS, countCities, citySlug } from '../../netlify/edge-functions/lib/regions.ts';
import { LISTING_FEE_LABEL } from '../lib/commissionCalc';

type Nav = (tab: string, id?: string) => void;

interface ListingProps {
  listings: Listing[];
  savedIds: string[];
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
  onSelectListing: (id: string) => void;
  onNavigate: Nav;
  /** Pre-built HTML for search engines: the live listings are added by the edge function instead. */
  prerender?: boolean;
}

const liveIn = (listings: Listing[], code: string) => listings.filter((l) => !l.isExample && isListingLive(l) && l.province === code);

const Card: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="bg-white rounded-[10px] border border-slate-200 p-6 flex flex-col gap-3">
    <div className="flex items-center gap-3">
      <span className="w-10 h-10 shrink-0 rounded-lg ring-1 ring-emerald-200 text-emerald-800 flex items-center justify-center">{icon}</span>
      <h3 className="font-bold text-[19px] text-slate-900 leading-snug">{title}</h3>
    </div>
    <div className="text-[16px] text-slate-700 leading-relaxed flex flex-col gap-3">{children}</div>
  </div>
);

const Bullets: React.FC<{ items: string[] }> = ({ items }) => (
  <ul className="space-y-2.5">
    {items.map((item) => (
      <li key={item} className="flex gap-3">
        <span aria-hidden="true" className="mt-[10px] w-1.5 h-1.5 rounded-full bg-emerald-700 shrink-0" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const ListingGrid: React.FC<Pick<ListingProps, 'savedIds' | 'onToggleFavorite' | 'onSelectListing'> & { items: Listing[] }> = ({ items, savedIds, onToggleFavorite, onSelectListing }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    {items.map((l) => (
      <ListingCard key={l.id} listing={l} isFavorited={savedIds.includes(l.id)} onToggleFavorite={onToggleFavorite} onSelect={onSelectListing} />
    ))}
  </div>
);

const CtaButtons: React.FC<{ onNavigate: Nav }> = ({ onNavigate }) => (
  <div className="flex flex-wrap gap-3">
    <button
      onClick={() => onNavigate('wizard')}
      className="px-6 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-md cursor-pointer min-h-[48px]"
    >
      List your home
    </button>
    <NavLink
      to="browse"
      onNavigate={onNavigate}
      className="px-6 py-3.5 border border-slate-300 bg-white hover:border-slate-500 font-semibold rounded-md min-h-[48px] inline-flex items-center"
    >
      Browse all homes
    </NavLink>
  </div>
);

const OtherProvinces: React.FC<{ current?: string; onNavigate: Nav }> = ({ current, onNavigate }) => (
  <nav aria-label="Provinces and territories" className="flex flex-col gap-4">
    <h2 className="font-display font-bold text-[30px] leading-none">{current ? 'Other provinces and territories' : 'Choose your province or territory'}</h2>
    <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
      {PROVINCE_HUBS.filter((h) => h.page.code !== current).map((h) => (
        <li key={h.page.code}>
          <NavLink to="province" listingId={h.page.slug} onNavigate={onNavigate} className="text-emerald-800 font-semibold underline underline-offset-2 hover:text-emerald-950">
            For sale by owner in {h.page.name}
          </NavLink>
        </li>
      ))}
    </ul>
    <p className="text-sm text-slate-600">Québec is coming soon, once our site and terms are available in French.</p>
  </nav>
);

// ---------------------------------------------------------------------------
// One province or territory
// ---------------------------------------------------------------------------
export const ProvincePage: React.FC<ListingProps & { slug: string }> = ({ slug, ...props }) => {
  const hub = hubBySlug(slug);
  if (!hub) return null;
  return <ProvinceHubView hub={hub} {...props} />;
};

const ProvinceHubView: React.FC<ListingProps & { hub: ProvinceHub }> = ({ hub, listings, savedIds, onToggleFavorite, onSelectListing, onNavigate, prerender }) => {
  const { page } = hub;
  const live = prerender ? [] : liveIn(listings, page.code);
  const cities = countCities(live);
  const cityPages = cities.filter((c) => c.count >= CITY_PAGE_MIN_LISTINGS);
  const guide = provinceGuide(hub);

  return (
    <div className="text-slate-900">
      <section className="max-w-[1000px] mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-10 flex flex-col gap-5">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
          <NavLink to="regions" onNavigate={onNavigate} className="hover:underline underline-offset-2">
            For sale by owner
          </NavLink>{' '}
          / <span className="text-slate-900">{page.name}</span>
        </nav>
        <h1 className="font-display font-bold text-[42px] sm:text-[58px] leading-[0.95]">Homes for sale by owner in {page.name}</h1>
        <p className="text-lg text-slate-700 leading-relaxed max-w-[44em]">{hub.lead}</p>
        <p className="text-[16px] text-slate-700 leading-relaxed max-w-[44em]">
          On OwnersMarket you list your home for a flat {LISTING_FEE_LABEL} a month with no commission, and buyers message you directly to book a
          viewing.
        </p>
        <CtaButtons onNavigate={onNavigate} />
        {guide && (
          <NavLink
            to={guide.to}
            listingId={guide.id}
            onNavigate={onNavigate}
            className="self-start inline-flex items-center gap-2 rounded-[10px] bg-fern px-4 py-3 text-[16px] font-semibold text-emerald-900 hover:bg-emerald-100"
          >
            Selling in {page.name}? Read the full guide to selling your house privately <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
          </NavLink>
        )}
      </section>

      {/* Homes for sale */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-12 flex flex-col gap-6">
          <h2 className="font-display font-bold text-[34px] sm:text-[40px] leading-none">Listed by their owners in {page.name}</h2>
          {prerender ? (
            <p className="text-[16px] text-slate-700">
              Every home here is listed by its owner. Message them directly to ask questions or book a viewing.
            </p>
          ) : live.length ? (
            <>
              <ListingGrid items={live} savedIds={savedIds} onToggleFavorite={onToggleFavorite} onSelectListing={onSelectListing} />
              {cityPages.length > 0 && (
                <p className="text-[16px] text-slate-700">
                  By city:{' '}
                  {cityPages.map((c, i) => (
                    <React.Fragment key={c.slug}>
                      {i > 0 && ' · '}
                      <NavLink to="city" listingId={`${page.slug}/${c.slug}`} onNavigate={onNavigate} className="font-semibold text-emerald-800 underline underline-offset-2">
                        {c.city} ({c.count})
                      </NavLink>
                    </React.Fragment>
                  ))}
                </p>
              )}
            </>
          ) : (
            <div className="rounded-[10px] bg-white border border-slate-200 p-6 text-[16px] text-slate-700 leading-relaxed max-w-[44em]">
              There are no homes listed by their owners in {page.name} right now. If you’re selling, yours could be the first one buyers here see.
            </div>
          )}
        </div>
      </section>

      {/* Selling in this province */}
      <section className="max-w-[1100px] mx-auto px-4 sm:px-6 py-14 flex flex-col gap-8">
        <div className="flex flex-col gap-3 max-w-[44em]">
          <h2 className="font-display font-bold text-[34px] sm:text-[40px] leading-none">Selling your home in {page.name}: the basics</h2>
          <p className="text-[17px] text-slate-700 leading-relaxed">
            Selling privately is legal in every province and territory. You take on the jobs an agent would do: photos, the listing, viewings and
            talking to buyers. Here’s what’s specific to {page.name}.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card icon={<Scale className="w-5 h-5" />} title="Who handles the legal side">
            <p>{hub.closing}</p>
          </Card>
          <Card icon={<Receipt className="w-5 h-5" />} title={hub.taxTitle}>
            {hub.tax.slice(0, 1).map((t) => (
              <p key={t}>{t}</p>
            ))}
            {hub.taxLines && <Bullets items={hub.taxLines} />}
            {hub.tax.slice(1).map((t) => (
              <p key={t}>{t}</p>
            ))}
          </Card>
          <Card icon={<FileText className="w-5 h-5" />} title="What to get ready before you list">
            <Bullets items={hub.prepare} />
            <p>
              See the full{' '}
              <NavLink to="article" listingId="paperwork-to-sell-your-house-privately" onNavigate={onNavigate} className="font-semibold text-emerald-800 underline underline-offset-2">
                paperwork checklist
              </NavLink>
              .
            </p>
          </Card>
          <Card icon={<MapPin className="w-5 h-5" />} title={`Good to know in ${page.name}`}>
            <Bullets items={hub.goodToKnow} />
            {hub.assessment && <p>{hub.assessment}</p>}
          </Card>
        </div>
        <div className="rounded-[10px] bg-fern p-5 text-[16px] text-slate-800 leading-relaxed">
          <b>Pricing your home.</b> We don’t give price advice. Most private sellers research recent sales of similar homes nearby, look at their
          assessed value, and some pay for an independent appraisal. Our{' '}
          <NavLink to="article" listingId="how-to-research-your-asking-price" onNavigate={onNavigate} className="font-semibold text-emerald-800 underline underline-offset-2">
            guide to researching your asking price
          </NavLink>{' '}
          walks through how.
        </div>
        {guide && (
          <NavLink
            to={guide.to}
            listingId={guide.id}
            onNavigate={onNavigate}
            className="self-start inline-flex items-center gap-2 font-semibold text-emerald-800 underline underline-offset-2"
          >
            Read the full guide to selling without a realtor in {page.name} <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </NavLink>
        )}
      </section>

      {/* How it works */}
      <section className="bg-emerald-950 text-white">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-14 flex flex-col gap-8">
          <h2 className="font-display font-bold text-[34px] sm:text-[40px] leading-none">How selling on OwnersMarket works</h2>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              ['List your home', `Add photos and details. Each listing is reviewed before it goes live, then it’s ${LISTING_FEE_LABEL} a month, cancel any time.`],
              ['Bring buyers to it', 'Print the free lawn and window signs and the feature sheet. Their QR code takes buyers straight to your listing.'],
              ['Meet buyers directly', 'Buyers message you and request viewings. Your exact address stays private until you confirm a viewing. Offers go to your lawyer.'],
            ].map(([title, text], i) => (
              <li key={title} className="flex flex-col gap-2">
                <span className="font-display font-bold text-[40px] leading-none text-[#F2C14E]">{i + 1}</span>
                <h3 className="font-bold text-[19px]">{title}</h3>
                <p className="text-[16px] text-emerald-50/90 leading-relaxed">{text}</p>
              </li>
            ))}
          </ol>
          <p className="text-[16px] text-emerald-50/90 leading-relaxed max-w-[44em]">
            Curious what you’d save? The{' '}
            <NavLink to="calculator" onNavigate={onNavigate} className="font-semibold text-white underline underline-offset-2">
              commission calculator
            </NavLink>{' '}
            gives an estimate. If your buyer has an agent, you may still pay that agent’s commission; you can say in your listing whether you
            welcome buyers with agents.
          </p>
          <div>
            <button
              onClick={() => onNavigate('wizard')}
              className="px-6 py-3.5 bg-[#F2C14E] hover:bg-[#e8b43a] text-slate-900 font-semibold rounded-md cursor-pointer min-h-[48px]"
            >
              List your home in {page.name}
            </button>
          </div>
        </div>
      </section>

      {/* Sources */}
      <section className="max-w-[1100px] mx-auto px-4 sm:px-6 py-12 flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <h2 className="font-bold text-[20px] flex items-center gap-2">
            <Landmark className="w-5 h-5 text-emerald-700" aria-hidden="true" /> Official sources
          </h2>
          <ul className="space-y-2">
            {hub.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1.5 text-emerald-800 underline underline-offset-2">
                  {s.label} <ExternalLink className="w-3.5 h-3.5 mt-1 shrink-0" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
          <p className="text-sm text-slate-600 leading-relaxed max-w-[50em]">
            Checked {PROVINCE_FACTS_CHECKED}. This is general information, not legal or tax advice, and rates and rules change. Your lawyer will
            confirm what applies to your sale. OwnersMarket is an advertising site, not a real estate brokerage.
          </p>
        </div>
        <OtherProvinces current={page.code} onNavigate={onNavigate} />
      </section>
    </div>
  );
};

// ---------------------------------------------------------------------------
// The list of provinces: /for-sale-by-owner
// ---------------------------------------------------------------------------
export const RegionsPage: React.FC<{ onNavigate: Nav }> = ({ onNavigate }) => (
  <div className="text-slate-900 max-w-[1000px] mx-auto px-4 sm:px-6 py-12 sm:py-16 flex flex-col gap-10">
    <div className="flex flex-col gap-5">
      <h1 className="font-display font-bold text-[42px] sm:text-[58px] leading-[0.95]">For sale by owner across Canada</h1>
      <p className="text-lg text-slate-700 leading-relaxed max-w-[44em]">
        Homes for sale by their owners, and what selling your own home involves in each province and territory: who handles closing, transfer tax
        and fees, and what to get ready before you list.
      </p>
      <CtaButtons onNavigate={onNavigate} />
    </div>
    <section className="flex flex-col gap-4">
      <h2 className="font-display font-bold text-[30px] leading-none">What’s the same everywhere</h2>
      <p className="text-[17px] text-slate-700 leading-relaxed max-w-[44em]">
        Selling your own home is legal in every province and territory. You do the selling: photos, the listing, viewings and talking to buyers.
        Each side hires its own lawyer (or notary, in BC), who handles the contract, the money and the transfer. What changes from province to
        province is mostly the tax or fee the buyer pays to register the sale, and a few documents sellers are expected to have ready.
      </p>
    </section>
    <section className="flex flex-col gap-4">
      <h2 className="font-display font-bold text-[30px] leading-none">Transfer tax and fees, at a glance</h2>
      <ul className="divide-y divide-slate-200 border-y border-slate-200">
        {PROVINCE_HUBS.map((h) => (
          <li key={h.page.code} className="py-3 flex flex-col sm:flex-row sm:items-baseline sm:gap-4">
            <NavLink to="province" listingId={h.page.slug} onNavigate={onNavigate} className="font-semibold text-emerald-800 underline underline-offset-2 sm:w-[16em] shrink-0">
              {h.page.name}
            </NavLink>
            <span className="text-[16px] text-slate-700">{h.taxTitle}</span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-slate-600">Checked {PROVINCE_FACTS_CHECKED}. General information only; your lawyer will confirm what applies to your sale.</p>
    </section>
    <OtherProvinces onNavigate={onNavigate} />
  </div>
);

// ---------------------------------------------------------------------------
// One city: /for-sale-by-owner/{province}/{city}
// ---------------------------------------------------------------------------
export const CityPage: React.FC<ListingProps & { slug: string }> = ({ slug, listings, savedIds, onToggleFavorite, onSelectListing, onNavigate }) => {
  const [provinceSlug, cSlug] = slug.split('/');
  const hub = hubBySlug(provinceSlug);
  if (!hub) return null;
  const live = liveIn(listings, hub.page.code).filter((l) => citySlug(l.city) === cSlug);
  const cityName = live[0]?.city ?? cSlug.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

  return (
    <div className="text-slate-900">
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-12 flex flex-col gap-6">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
          <NavLink to="regions" onNavigate={onNavigate} className="hover:underline underline-offset-2">
            For sale by owner
          </NavLink>{' '}
          /{' '}
          <NavLink to="province" listingId={hub.page.slug} onNavigate={onNavigate} className="hover:underline underline-offset-2">
            {hub.page.name}
          </NavLink>{' '}
          / <span className="text-slate-900">{cityName}</span>
        </nav>
        <h1 className="font-display font-bold text-[42px] sm:text-[58px] leading-[0.95]">
          Homes for sale by owner in {cityName}, {hub.page.code}
        </h1>
        <p className="text-lg text-slate-700 leading-relaxed max-w-[44em]">
          Every home here is listed by its owner. Message them directly to ask questions or book a viewing; your own lawyer handles the purchase.
        </p>
        {live.length ? (
          <ListingGrid items={live} savedIds={savedIds} onToggleFavorite={onToggleFavorite} onSelectListing={onSelectListing} />
        ) : (
          <div className="rounded-[10px] bg-slate-50 border border-slate-200 p-6 text-[16px] text-slate-700 max-w-[44em]">
            There are no homes listed by their owners in {cityName} right now.
          </div>
        )}
        <div className="flex flex-wrap gap-3 items-center">
          <CtaButtons onNavigate={onNavigate} />
          <NavLink to="province" listingId={hub.page.slug} onNavigate={onNavigate} className="inline-flex items-center gap-2 font-semibold text-emerald-800 underline underline-offset-2">
            <Home className="w-4 h-4" aria-hidden="true" /> Selling in {hub.page.name}: what to know
          </NavLink>
        </div>
      </section>
    </div>
  );
};
