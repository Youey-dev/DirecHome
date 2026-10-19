/**
 * Province and territory pages: "For sale by owner in [province]".
 *
 * Each page carries facts that really differ by province (who closes the sale, transfer tax
 * or registration fees, what sellers prepare), each one checked against an official source,
 * linked on the page. General information only: never price advice, never contract wording,
 * and always "ask your lawyer" for the decision itself (legal guardrails in marketing-context).
 *
 * Facts checked October 18, 2026. Rates change: review this file at least once a year and
 * whenever a provincial budget changes a transfer tax.
 */
import { PROVINCE_PAGES, ProvincePage } from '../../netlify/edge-functions/lib/regions.ts';

export const PROVINCE_FACTS_CHECKED = 'October 18, 2026';

export interface HubLink {
  label: string;
  url: string;
}

export interface ProvinceHub {
  page: ProvincePage;
  /** One or two sentences that open the page. */
  lead: string;
  /** Who handles the legal side of the sale. */
  closing: string;
  taxTitle: string;
  /** Short paragraphs about transfer tax or registration fees. */
  tax: string[];
  /** Brackets or fee lines, shown as a list when present. */
  taxLines?: string[];
  /** Things a seller in this province should get ready. */
  prepare: string[];
  /** Other province-specific points worth knowing. */
  goodToKnow: string[];
  /** Where property assessments come from (for your own research). */
  assessment?: string;
  sources: HubLink[];
  /** A deeper guide for this province, when there is one. */
  guideTab?: string;
}

const hub = (code: string, rest: Omit<ProvinceHub, 'page'>): ProvinceHub => {
  const page = PROVINCE_PAGES.find((p) => p.code === code);
  if (!page) throw new Error(`No province page for ${code}`);
  return { page, ...rest };
};

const LAWYER_ONLY =
  'A real estate lawyer handles the legal side for each of you: checking the title, preparing the transfer, holding and paying out the money, and registering the new owner. The buyer and seller each have their own. Hire yours before you list, so offers can go straight to them.';

export const PROVINCE_HUBS: ProvinceHub[] = [
  hub('BC', {
    lead:
      'Selling your home yourself in British Columbia means you show the home and talk to buyers; a lawyer or notary handles the paperwork and the money. BC has a few rules no other province has, like the 3-day buyer rescission period.',
    closing:
      'In BC a lawyer or a notary public can handle your sale. They check the title, prepare the transfer documents, pay out your mortgage and register the new owner at the Land Title Office. The buyer hires their own.',
    taxTitle: 'Property transfer tax (paid by the buyer)',
    tax: [
      'The buyer pays BC’s property transfer tax when the sale is registered, based on the home’s fair market value. As a seller, it matters because buyers budget for it.',
      'First-time buyers can be exempt: no tax on homes worth up to $500,000, a reduced amount up to $835,000, phasing out completely at $860,000 (for sales registered since April 1, 2024).',
    ],
    taxLines: [
      '1% on the first $200,000',
      '2% from $200,000 to $2,000,000',
      '3% from $2,000,000 to $3,000,000',
      'A further 2% on the part of a home’s value above $3,000,000',
    ],
    prepare: [
      'Strata (condo) homes: the strata’s information certificate (Form B), the depreciation report, recent minutes and bylaws.',
      'A list of known defects. In BC you must tell buyers about known hidden problems that make the home dangerous or unfit to live in (material latent defects).',
      'Your BC Assessment value and your property tax notice, for your own research.',
    ],
    goodToKnow: [
      'After you accept an offer, the buyer has 3 business days to cancel (the home buyer rescission period). If they cancel, they pay you 0.25% of the price. It applies to private sales too, and can’t be waived.',
      'Conditions are called “subjects”, and closing is called “completion”.',
      'If you’ve owned the home for less than 2 years (730 days), the BC home flipping tax may apply to your profit.',
      'Home inspectors in BC must be licensed; buyers can check a licence with Consumer Protection BC.',
    ],
    assessment: 'BC Assessment values every property each year; anyone can look up a home’s assessed value at bcassessment.ca.',
    sources: [
      { label: 'Property transfer tax (Government of BC)', url: 'https://www2.gov.bc.ca/gov/content/taxes/property-taxes/property-transfer-tax' },
      {
        label: 'First-time home buyers’ exemption amounts (Government of BC)',
        url: 'https://www2.gov.bc.ca/gov/content/taxes/property-taxes/property-transfer-tax/exemptions/first-time-home-buyers/current-amount',
      },
      { label: 'Home buyer rescission period (BC Financial Services Authority)', url: 'https://www.bcfsa.ca/public-resources/real-estate/home-buyer-rescission-period' },
      { label: 'Material latent defects (BC Financial Services Authority)', url: 'https://www.bcfsa.ca/public-resources/real-estate/selling-home/material-latent-defects' },
      { label: 'BC home flipping tax (Government of BC)', url: 'https://www2.gov.bc.ca/gov/content/taxes/income-taxes/bc-home-flipping-tax' },
      { label: 'Look up an assessed value (BC Assessment)', url: 'https://www.bcassessment.ca/' },
    ],
    guideTab: 'guide-bc',
  }),

  hub('AB', {
    lead:
      'Alberta is one of the simplest provinces to sell in privately: there’s no land transfer tax, and a lawyer handles the legal side. The one thing to sort out early is your Real Property Report.',
    closing: LAWYER_ONLY,
    taxTitle: 'No land transfer tax: Land Titles fees instead',
    tax: [
      'Alberta has no land transfer tax. The buyer pays a Land Titles registration fee for the transfer, and for their mortgage if they have one.',
      'For example, on a $400,000 home the transfer fee is $50 + $400 = $450.',
    ],
    taxLines: [
      'Transfer of land: $50, plus $5 for every $5,000 of the property’s value',
      'Mortgage: $50, plus $5 for every $5,000 of the amount borrowed',
    ],
    prepare: [
      'A current Real Property Report (RPR): a survey by an Alberta Land Surveyor showing your buildings and where they sit on the lot. Most standard Alberta purchase contracts expect the seller to provide one. If you’ve added a deck, garage or fence since your last one, it needs updating.',
      'Your municipality’s compliance stamp (certificate of compliance) on the RPR. It can take a few weeks, so order it before you list.',
      'Condo homes: the condo corporation’s documents (bylaws, budget, reserve fund study, recent minutes).',
    ],
    goodToKnow: [
      'If the RPR or compliance check turns up a problem, such as a shed over the property line, the seller usually has to fix it before closing.',
      'Home inspectors in Alberta must be licensed.',
    ],
    assessment: 'Each Alberta municipality assesses the homes in it every year; many cities, including Calgary and Edmonton, let you look up assessments online.',
    sources: [
      { label: 'Land Titles fee schedule (Government of Alberta)', url: 'https://alberta.ca/system/files/sartr-land-titles-and-surveys-common-documents-fee-schedule.pdf' },
      { label: 'Real Property Reports (Real Estate Council of Alberta)', url: 'https://www.reca.ca/wp-content/uploads/PDF/Real-Property-Reports.pdf' },
      { label: 'Hiring a home inspector (Government of Alberta)', url: 'https://www.alberta.ca/hiring-home-inspector' },
    ],
  }),

  hub('SK', {
    lead:
      'Saskatchewan has no land transfer tax, and the land titles system is run by Information Services Corporation (ISC). Your lawyer deals with ISC; you deal with the buyers.',
    closing: LAWYER_ONLY,
    taxTitle: 'No land transfer tax: ISC title fees instead',
    tax: [
      'Saskatchewan has no land transfer tax. The buyer pays ISC a fee to transfer the title into their name: 0.4% of the property’s value since July 29, 2023, which is about $400 for every $100,000.',
      'Registering the buyer’s mortgage is a separate, flat fee based on the amount borrowed.',
    ],
    prepare: [
      'Your property tax notice and assessment, and recent utility costs: buyers ask about them.',
      'Condo homes: the condo corporation’s bylaws, budget, reserve fund study and recent minutes.',
      'A list of known defects. Across Canada, hiding a known hidden problem can lead to a lawsuit after the sale.',
    ],
    goodToKnow: [
      'Many Saskatchewan homes are on acreages or rural land. Wells, septic systems and access roads are common questions from buyers, and their lenders.',
    ],
    assessment:
      'The Saskatchewan Assessment Management Agency (SAMA) assesses most of the province; some cities, including Regina and Saskatoon, do their own.',
    sources: [
      { label: 'Land titles (Information Services Corporation)', url: 'https://www.isc.ca/' },
      { label: 'Saskatchewan Assessment Management Agency (SAMA)', url: 'https://www.sama.sk.ca/' },
    ],
  }),

  hub('MB', {
    lead:
      'In Manitoba, the buyer pays a land transfer tax and your lawyer handles the transfer through the Land Titles Office. Here’s what a private sale involves.',
    closing: LAWYER_ONLY,
    taxTitle: 'Land transfer tax (paid by the buyer)',
    tax: [
      'The buyer pays Manitoba’s land transfer tax when the transfer is registered, based on the property’s fair market value, plus a registration fee.',
    ],
    taxLines: [
      'Nothing on the first $30,000',
      '0.5% from $30,000 to $90,000',
      '1% from $90,000 to $150,000',
      '1.5% from $150,000 to $200,000',
      '2% on the amount above $200,000',
    ],
    prepare: [
      'Your property tax statement and assessment notice.',
      'Condo homes: the condo corporation’s declaration, bylaws, budget, reserve fund study and recent minutes.',
      'A list of known defects. Across Canada, hiding a known hidden problem can lead to a lawsuit after the sale.',
    ],
    goodToKnow: ['Manitoba’s land titles registry is operated by Teranet Manitoba on behalf of the province; your lawyer files the documents there.'],
    assessment: 'The City of Winnipeg assesses Winnipeg homes; the province assesses homes in the rest of Manitoba.',
    sources: [{ label: 'Land transfer tax (Government of Manitoba)', url: 'https://www.gov.mb.ca/finance/other/print%2Clandtransfertax.html' }],
  }),

  hub('ON', {
    lead:
      'Ontario is Canada’s biggest home market and it allows private sales like everywhere else: you sell, and your lawyer closes. Buyers in Ontario pay a provincial land transfer tax, and in Toronto a second, municipal one.',
    closing:
      'In Ontario a real estate lawyer handles the closing for each side: title search, transfer, paying out your mortgage and registering the sale electronically. The buyer hires their own.',
    taxTitle: 'Land transfer tax (paid by the buyer)',
    tax: [
      'The buyer pays Ontario’s land transfer tax on the price when the sale is registered. These are the rates for a home with one or two single-family residences:',
      'First-time buyers can get a refund of up to $4,000. In Toronto, buyers also pay the City’s municipal land transfer tax on top of the provincial one.',
    ],
    taxLines: [
      '0.5% on the first $55,000',
      '1% from $55,000 to $250,000',
      '1.5% from $250,000 to $400,000',
      '2% from $400,000 to $2,000,000',
      '2.5% on the amount above $2,000,000',
    ],
    prepare: [
      'Condo homes: buyers usually make their offer conditional on reviewing the condo’s status certificate. Ask the property manager how long it takes and what it costs.',
      'Your MPAC property assessment and property tax bill.',
      'A list of known defects. Across Canada, hiding a known hidden problem can lead to a lawsuit after the sale.',
      'Rental equipment you’ll leave behind, such as a water heater or furnace: buyers will ask, and the contract has to say who takes it over.',
    ],
    goodToKnow: [
      'Ontario’s land registry is electronic, so your lawyer registers the sale online on closing day.',
    ],
    assessment: 'The Municipal Property Assessment Corporation (MPAC) assesses every property in Ontario.',
    sources: [
      { label: 'Calculating land transfer tax (Government of Ontario)', url: 'https://www.ontario.ca/document/land-transfer-tax/calculating-land-transfer-tax' },
      {
        label: 'Land transfer tax refunds for first-time homebuyers (Government of Ontario)',
        url: 'https://www.ontario.ca/document/land-transfer-tax/land-transfer-tax-refunds-first-time-homebuyers',
      },
      {
        label: 'Municipal land transfer tax (City of Toronto)',
        url: 'https://www.toronto.ca/services-payments/property-taxes-utilities/municipal-land-transfer-tax-mltt/municipal-land-transfer-tax-mltt-information',
      },
      { label: 'Property assessments (MPAC)', url: 'https://www.mpac.ca/' },
    ],
  }),

  hub('NB', {
    lead:
      'In New Brunswick, the buyer pays a 1% real property transfer tax and your lawyer handles the rest of the legal side. Your assessed value matters more here than in most provinces.',
    closing: LAWYER_ONLY,
    taxTitle: 'Real property transfer tax (paid by the buyer)',
    tax: [
      'The buyer pays 1% of the purchase price or the property’s assessed value, whichever is higher, when the deed is registered.',
      'So on a home assessed at $300,000 that sells for $350,000, the tax is $3,500. If it sold for $280,000, the tax would still be $3,000, based on the assessment.',
    ],
    prepare: [
      'Your property assessment and tax notice from Service New Brunswick.',
      'Condo homes: the condo corporation’s declaration, bylaws, budget and reserve fund study.',
      'A list of known defects. Across Canada, hiding a known hidden problem can lead to a lawsuit after the sale.',
    ],
    goodToKnow: ['Service New Brunswick runs both property assessment and land registration in the province.'],
    assessment: 'Service New Brunswick assesses every property in the province.',
    sources: [{ label: 'Real Property Transfer Tax Act (Government of New Brunswick)', url: 'https://laws.gnb.ca/en/ShowPdf/cs/R-2.1.pdf' }],
  }),

  hub('NS', {
    lead:
      'In Nova Scotia, the transfer tax on a home sale is set by each municipality, and buyers who don’t live in the province can owe a much larger provincial tax. Here’s how a private sale works.',
    closing: LAWYER_ONLY,
    taxTitle: 'Deed transfer tax (paid by the buyer)',
    tax: [
      'Each municipality sets its own deed transfer tax rate, charged as a percentage of the sale price. The Land Registry collects it for the municipality when the deed is registered. The province publishes the current rate for every municipality.',
      'Buyers who aren’t Nova Scotia residents also pay a provincial non-resident deed transfer tax of 10% of their share, on the higher of the price or the assessed value, for homes with up to three units (for agreements signed after March 31, 2025). There are exemptions, including for people who move to Nova Scotia within 12 months of buying.',
    ],
    prepare: [
      'Your property assessment notice from PVSC and your tax bill.',
      'Condo homes: the condo corporation’s declaration, bylaws, budget and reserve fund study.',
      'A list of known defects. Across Canada, hiding a known hidden problem can lead to a lawsuit after the sale.',
    ],
    goodToKnow: [
      'If your buyer lives outside Nova Scotia, the non-resident tax can add thousands to their costs. Their lawyer will know whether an exemption applies.',
    ],
    assessment: 'Property Valuation Services Corporation (PVSC) assesses every property in Nova Scotia.',
    sources: [
      { label: 'Municipal deed transfer and property tax (Government of Nova Scotia)', url: 'https://www.novascotia.ca/municipal-deed-transfer-and-property-tax' },
      { label: 'Non-resident provincial deed transfer tax (Government of Nova Scotia)', url: 'https://www.novascotia.ca/non-resident-provincial-deed-transfer-tax' },
      { label: 'Property assessments (PVSC)', url: 'https://www.pvsc.ca/' },
    ],
  }),

  hub('PE', {
    lead:
      'On Prince Edward Island, the buyer pays a 1% real property transfer tax, first-time buyers can be exempt, and larger properties bought by non-residents need provincial approval.',
    closing: LAWYER_ONLY,
    taxTitle: 'Real property transfer tax (paid by the buyer)',
    tax: [
      'The buyer pays 1% of the purchase price or the assessed value, whichever is higher, when the deed is registered.',
      'First-time home buyers can be exempt if they meet the province’s conditions, such as being a Canadian citizen or permanent resident and having lived on PEI for at least six months.',
    ],
    prepare: [
      'Your property assessment and tax notice.',
      'Your survey or plan, especially for waterfront or rural land.',
      'A list of known defects. Across Canada, hiding a known hidden problem can lead to a lawsuit after the sale.',
    ],
    goodToKnow: [
      'Under PEI’s Lands Protection Act, a buyer who isn’t a PEI resident needs approval to own more than 5 acres in total, or more than 165 feet of shore frontage. The Island Regulatory and Appeals Commission (IRAC) reviews these applications. If your property is large or on the water, mention it in your listing so buyers can plan for it.',
    ],
    assessment: 'The provincial government assesses every property on PEI.',
    sources: [
      { label: 'Real property transfer tax rate (Government of PEI)', url: 'https://www.princeedwardisland.ca/en/information/finance/real-property-transfer-tax-rate' },
      {
        label: 'First-time home buyers exemption (Government of PEI)',
        url: 'https://www.princeedwardisland.ca/en/information/finance/real-property-transfer-tax-first-time-home-buyers-exemption',
      },
      { label: 'Lands Protection Act: frequently asked questions (IRAC)', url: 'https://irac.pe.ca/lands/land/frequently-asked-questions/' },
    ],
  }),

  hub('NL', {
    lead:
      'Newfoundland and Labrador has no land transfer tax. Instead, the buyer pays a fee to register the deed, and your lawyer searches the history of past deeds to confirm the title.',
    closing: LAWYER_ONLY,
    taxTitle: 'No land transfer tax: Registry of Deeds fees instead',
    tax: [
      'The buyer pays a fee to register the deed at the Registry of Deeds, and another to register their mortgage. Each is $100, plus 40 cents for every $100 of value above $500, roughly 0.4%.',
    ],
    prepare: [
      'Your deed, survey and any old documents you have about the property: a deeds registry relies on the history of past transfers.',
      'Your property tax bill and assessment.',
      'A list of known defects. Across Canada, hiding a known hidden problem can lead to a lawsuit after the sale.',
    ],
    goodToKnow: [
      'The province uses a registry of deeds, not a land titles system, so title searches can take longer. Hire your lawyer early.',
    ],
    assessment: 'The Municipal Assessment Agency assesses most of the province; the City of St. John’s does its own.',
    sources: [{ label: 'Registry of Deeds fee schedule (Government of Newfoundland and Labrador)', url: 'https://www.gov.nl.ca/gs/files/forms-files-fees-deed.pdf' }],
  }),

  hub('YT', {
    lead:
      'Yukon has no land transfer tax. The buyer pays the Land Titles Office a fee to transfer the title, and a lawyer handles the legal side for each of you.',
    closing: LAWYER_ONLY,
    taxTitle: 'No land transfer tax: Land Titles fees instead',
    tax: [
      'The buyer pays a transfer fee based on the declared value, plus an assurance fund fee of $20 for the first $10,000 of value and $10 for each additional $10,000 since the last transfer.',
    ],
    taxLines: ['Under $100,000: $50', '$100,000 to under $500,000: $150', '$500,000 to under $3,000,000: $350'],
    prepare: [
      'Your certificate of title, survey and property tax notice.',
      'Details about water, sewer or septic, heating fuel and road access: common questions outside Whitehorse.',
      'A list of known defects. Across Canada, hiding a known hidden problem can lead to a lawsuit after the sale.',
    ],
    goodToKnow: ['Some homes sit on leased land rather than land the owner holds outright. Your lawyer will confirm exactly what you’re selling.'],
    sources: [{ label: 'Land Titles fees (Government of Yukon)', url: 'https://yukon.ca/en/find-out-land-titles-fees' }],
  }),

  hub('NT', {
    lead:
      'In the Northwest Territories, the Land Titles Office registers privately owned land, and the buyer pays registration fees rather than a land transfer tax.',
    closing: LAWYER_ONLY,
    taxTitle: 'No land transfer tax: Land Titles fees instead',
    tax: [
      'The buyer pays the Land Titles Office a transfer fee based on the land’s value, and a fee based on the amount of their mortgage. The current amounts are in the office’s published fee schedule.',
    ],
    prepare: [
      'Your certificate of title, or your lease if the home sits on leased land.',
      'Details about water delivery or service, sewage, heating fuel and access: buyers and lenders ask.',
      'A list of known defects. Across Canada, hiding a known hidden problem can lead to a lawsuit after the sale.',
    ],
    goodToKnow: [
      'The Land Titles Office only registers privately owned, surveyed land. Many homes in the territory are on leased land, which is transferred differently. Your lawyer will confirm what you hold.',
    ],
    sources: [{ label: 'Land Titles Office (Government of the Northwest Territories)', url: 'https://www.justice.gov.nt.ca/en/land-titles/' }],
  }),

  hub('NU', {
    lead:
      'Private home sales in Nunavut are less common, and many homes sit on leased land. Here’s what to check before you list.',
    closing: LAWYER_ONLY,
    taxTitle: 'No land transfer tax: Land Titles fees instead',
    tax: ['The buyer pays the Nunavut Land Titles Office fees to register the transfer and their mortgage. Your lawyer will confirm the current amounts.'],
    prepare: [
      'Your certificate of title, or your land lease and any approvals needed to assign it.',
      'Details about water and sewage service, heating fuel and maintenance history: buyers and lenders ask.',
      'A list of known defects. Across Canada, hiding a known hidden problem can lead to a lawsuit after the sale.',
    ],
    goodToKnow: [
      'Many homes in Nunavut are on land leased from the municipality rather than owned outright. Selling usually means transferring that lease, which can need the landlord’s consent. Start with your lawyer.',
    ],
    sources: [{ label: 'Land Titles Office (Nunavut Legal Registries)', url: 'https://www.nunavutlegalregistries.ca/lt_index_en.shtml' }],
  }),
];

export const hubByCode = (code: string) => PROVINCE_HUBS.find((h) => h.page.code === code);
export const hubBySlug = (slug: string) => PROVINCE_HUBS.find((h) => h.page.slug === slug);
