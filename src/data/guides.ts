/**
 * Step-by-step guides for sellers and buyers, for every province and territory except Quebec
 * (OwnersMarket isn't open in Quebec yet).
 *
 * Written for the user profiles in the "OwnersMarket user profiles and user stories" doc:
 * the seller guide for "Sandra" (prepared DIY seller), the buyer guide for "Jordan" (phone-first buyer).
 *
 * Legal guardrails (from the Canada-wide legal review): general information only. Never tell
 * people what price to ask or offer, never give them contract wording, and send every legal
 * decision to their own lawyer (or notary, where the province allows). OwnersMarket does not
 * verify ownership, hold deposits or handle offers.
 *
 * Province notes: only add one when the rule is checked against an official source and really
 * differs from the general text. Facts checked October 14, 2026 against the pages linked in
 * each step. Review this file at least once a year.
 */

export type GuideBlock =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'province'; label: string; text: string }
  | { kind: 'lawyer'; text: string }
  | { kind: 'warning'; text: string };

export interface GuideLink {
  label: string;
  url: string;
}

export interface GuideStep {
  id: string;
  title: string;
  summary: string;
  blocks: GuideBlock[];
  links?: GuideLink[];
}

export interface Guide {
  tab: 'guide-selling' | 'guide-buying';
  eyebrow: string;
  title: string;
  lead: string;
  readTime: string;
  steps: GuideStep[];
  checklistTitle: string;
  checklist: string[];
  cta: { title: string; text: string; button: string; tab: string };
  otherGuide: { label: string; tab: string };
}

export const GUIDES_LAST_UPDATED = 'October 14, 2026';

const LAWYER_LINKS: GuideLink[] = [
  { label: 'Find your province’s law society (Federation of Law Societies of Canada)', url: 'https://flsc.ca/about-us/' },
];

const RESCISSION_LINK: GuideLink = {
  label: 'BC home buyer rescission period (BC Financial Services Authority)',
  url: 'https://www.bcfsa.ca/public-resources/real-estate/home-buyer-rescission-period',
};

// ---------------------------------------------------------------------------
// Selling your home yourself
// ---------------------------------------------------------------------------
export const SELLER_GUIDE: Guide = {
  tab: 'guide-selling',
  eyebrow: 'Seller guide · Canada, outside Québec',
  title: 'How to sell your home yourself in Canada',
  lead:
    'Nine steps from "should I?" to handing over the keys. You do the selling: photos, viewings and talking to buyers. Your lawyer handles the legal side, as with any home sale in Canada. The steps are the same in every province and territory; where a rule differs, we say so.',
  readTime: 'About a 12-minute read',
  steps: [
    {
      id: 'right-for-you',
      title: 'Decide if selling yourself is right for you',
      summary: 'Selling privately works best when the home is ready and you can be there for viewings.',
      blocks: [
        { kind: 'p', text: 'Selling without an agent means you keep the commission, and you also take on the jobs an agent would do. It tends to go well when:' },
        {
          kind: 'list',
          items: [
            'Your home is move-in ready, with no big repairs to explain. Good photos do most of the selling.',
            'You can open the door for viewings on evenings or weekends.',
            'You have a real estate lawyer, or are happy to hire one.',
            'You are comfortable answering buyers’ questions and talking about price directly.',
          ],
        },
        {
          kind: 'p',
          text: 'If you want someone to set your price, negotiate for you or handle the paperwork, a full-service agent is the better fit. OwnersMarket is an advertising site: we show your home to buyers, but we don’t value homes, negotiate, handle offers or hold deposits.',
        },
      ],
    },
    {
      id: 'lawyer',
      title: 'Hire your lawyer before you list',
      summary: 'Line them up first, so you are ready the day an offer arrives.',
      blocks: [
        { kind: 'p', text: 'In a private sale, your real estate lawyer is the person who protects you. They usually:' },
        {
          kind: 'list',
          items: [
            'review or prepare the agreement of purchase and sale, and explain each term before you sign',
            'hold the buyer’s deposit in their trust account',
            'pay off your mortgage from the sale money',
            'work out the adjustments for property taxes, condo fees and utilities',
            'transfer the title to the buyer through your province’s land registry on closing day',
          ],
        },
        { kind: 'p', text: 'Ask for a fixed-fee quote, and ask whether they have handled private sales without agents.' },
        {
          kind: 'province',
          label: 'British Columbia',
          text: 'A notary public can also handle your sale instead of a lawyer.',
        },
        {
          kind: 'lawyer',
          text: 'Questions to ask at your first call: What documents should I gather? What should I disclose about the home? Will you prepare the agreement, or review one the buyer’s lawyer sends?',
        },
      ],
      links: LAWYER_LINKS,
    },
    {
      id: 'price',
      title: 'Research your asking price',
      summary: 'Use public information to see what similar homes near you are worth.',
      blocks: [
        { kind: 'p', text: 'Pricing is your decision. These are the places most sellers start:' },
        {
          kind: 'list',
          items: [
            'Your latest property assessment from your city or provincial assessment office. It is a useful reference, but it is usually based on an earlier date, so the market may have moved since.',
            'Recent sales of similar homes nearby: same type, size, age and condition.',
            'Similar homes listed for sale right now. These are your competition.',
            'A paid appraisal from a certified appraiser, if you want an independent professional opinion.',
          ],
        },
        {
          kind: 'p',
          text: 'Be honest with yourself about condition and location. A home priced close to the market usually gets more viewing requests in its first few weeks.',
        },
      ],
    },
    {
      id: 'documents',
      title: 'Gather your documents and decide what to disclose',
      summary: 'Have the paperwork ready before buyers start asking for it.',
      blocks: [
        { kind: 'p', text: 'Buyers and their lawyers will ask for some or all of these:' },
        {
          kind: 'list',
          items: [
            'your latest property tax bill',
            'your mortgage details, so your lawyer can get a payout statement from the lender',
            'typical utility and heating costs for a year',
            'permits and records for renovations, and receipts for major work (roof, furnace, windows)',
            'a survey or real property report, if you have one',
            'for a condo: the bylaws, recent meeting minutes, financial statements, reserve fund study and the condo corporation’s certificate for buyers',
          ],
        },
        {
          kind: 'p',
          text: 'In most provinces, sellers must disclose known hidden defects that make a home dangerous or unfit to live in, such as a leaking basement, structural damage or an old underground oil tank. Some provinces use standard disclosure forms. Hiding a known problem can lead to a lawsuit after the sale.',
        },
        {
          kind: 'province',
          label: 'British Columbia',
          text: 'Condo (strata) sellers provide an information certificate called a Form B, and the reserve study is called a depreciation report. BC also has a home flipping tax on profits from homes owned for less than 2 years (730 days).',
        },
        {
          kind: 'province',
          label: 'Ontario',
          text: 'Condo buyers usually make their offer conditional on reviewing the condo’s status certificate.',
        },
        {
          kind: 'p',
          text: 'Across Canada, if you have owned the home for less than a year (365 days), the federal flipping rule may tax your profit as business income. Talk to an accountant before you list.',
        },
        {
          kind: 'lawyer',
          text: 'Ask your lawyer what you need to disclose about your home, and whether to use a disclosure statement.',
        },
      ],
      links: [
        {
          label: 'What counts as a material latent defect, a BC example (BC Financial Services Authority)',
          url: 'https://www.bcfsa.ca/public-resources/real-estate/selling-home/material-latent-defects',
        },
        { label: 'BC home flipping tax (Government of BC)', url: 'https://www2.gov.bc.ca/gov/content/taxes/income-taxes/bc-home-flipping-tax' },
      ],
    },
    {
      id: 'photos',
      title: 'Get the home ready and take great photos',
      summary: 'Photos are the first viewing. Make them bright, honest and complete.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Clean, clear the counters and put away personal items and clutter.',
            'Fix the small things buyers notice: burnt-out bulbs, dripping taps, sticking doors.',
            'Shoot in daylight with the lights on and blinds open. Hold your phone level and take photos sideways (landscape).',
            'Start with the front of the home, then every main room, the kitchen, bathrooms, yard and parking. 10 to 25 photos is plenty.',
            'Measure rooms or check your measurements. Square footage and room sizes must be accurate.',
          ],
        },
        {
          kind: 'p',
          text: 'Describe the home honestly. Mention what is updated and what is original. Buyers trust a listing that doesn’t oversell, and an honest listing protects you later.',
        },
      ],
    },
    {
      id: 'list',
      title: 'List your home on OwnersMarket',
      summary: 'About 15 minutes, a quick review, and buyers can find you.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Add your photos, price and the basics: rooms, size, taxes and condo fees if any.',
            'Every listing is reviewed for spam, scams and inappropriate content before it goes live.',
            'Your exact address stays private until you confirm a viewing.',
            'You pay a flat $24.99 a month per active listing. No commission, and you can cancel any time.',
          ],
        },
        {
          kind: 'p',
          text: 'Decide now what you will do if a buyer comes with their own agent. That agent may ask you to pay their commission. You can say yes, negotiate an amount, or say no. Whatever you decide, agree it in writing before the viewing, and keep in mind that it reduces what you save.',
        },
      ],
    },
    {
      id: 'viewings',
      title: 'Run safe viewings',
      summary: 'You choose who comes in and when.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Accept viewing requests through OwnersMarket, so you have the buyer’s name and messages on record.',
            'Have another adult at home with you, and show one group at a time.',
            'Put away valuables, keys, medication, mail and documents with your personal details.',
            'Walk the buyer through the home rather than letting them wander alone.',
            'Answer questions about the home honestly. For questions about the agreement or the law, say "my lawyer can answer that".',
          ],
        },
        {
          kind: 'warning',
          text: 'Watch for scams: a "buyer" who won’t view the home, sends more money than agreed and asks for a refund, or asks for your banking or ID details. Never share these. Money only ever moves through the lawyers’ trust accounts.',
        },
      ],
    },
    {
      id: 'offers',
      title: 'When an offer comes in, your lawyer takes over',
      summary: 'Get legal advice on every offer before you sign it.',
      blocks: [
        {
          kind: 'p',
          text: 'An offer is a written agreement of purchase and sale (called a contract of purchase and sale in some provinces). It usually sets out the price, the deposit, the buyer’s conditions (such as financing, a home inspection and reviewing condo documents), and the closing and possession dates.',
        },
        {
          kind: 'list',
          items: [
            'Send every offer to your lawyer before you respond.',
            'You can accept it, make a counter-offer, or decline it.',
            'The deposit is paid into a lawyer’s trust account, as the agreement says. Never take a deposit yourself.',
          ],
        },
        {
          kind: 'province',
          label: 'British Columbia',
          text: 'Conditions are called "subjects", and closing is called "completion". After you accept an offer, the buyer has 3 business days to cancel (the home buyer rescission period). If they cancel, they pay you a fee of 0.25% of the price. It applies to private sales too, and neither side can waive it.',
        },
      ],
      links: [RESCISSION_LINK],
    },
    {
      id: 'closing',
      title: 'Conditions removed, closing and keys',
      summary: 'Once the conditions are removed, the sale is firm and the lawyers finish it.',
      blocks: [
        {
          kind: 'list',
          items: [
            'The buyer removes (or waives) their conditions in writing by the dates in the agreement. After that, the sale is firm.',
            'Mark your listing as sold and cancel your OwnersMarket plan.',
            'Your lawyer pays out your mortgage, handles the adjustments and transfers the title on closing day.',
            'Hand over the keys on possession day, as the agreement says. Leave the home clean and the included items in place.',
            'Cancel your home insurance and utilities from the possession date, and forward your mail.',
          ],
        },
        {
          kind: 'p',
          text: 'At tax time, report the sale on your tax return. In Canada, the sale of your principal residence has to be reported, even when no tax is owed. An accountant can help.',
        },
      ],
      links: [
        {
          label: 'Reporting the sale of your principal residence (Canada Revenue Agency)',
          url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/personal-income/line-12700-capital-gains/principal-residence-other-real-estate.html',
        },
      ],
    },
  ],
  checklistTitle: 'Seller checklist',
  checklist: [
    'My home is move-in ready and I can be there for viewings',
    'I have hired a real estate lawyer',
    'I have researched prices of similar homes nearby',
    'I have gathered my property tax bill, mortgage details and records of work done',
    'I know what I need to disclose about my home',
    'My photos are bright, level and cover every main room',
    'I have decided what I will do if a buyer brings an agent',
    'I know to send every offer to my lawyer before signing',
  ],
  cta: {
    title: 'Ready when your home is',
    text: 'Add your photos and the basics in about 15 minutes. Your listing is reviewed before it goes live.',
    button: 'List your home',
    tab: 'wizard',
  },
  otherGuide: { label: 'Buying instead? Read the buyer guide', tab: 'guide-buying' },
};

// ---------------------------------------------------------------------------
// Buying a home sold by owner
// ---------------------------------------------------------------------------
export const BUYER_GUIDE: Guide = {
  tab: 'guide-buying',
  eyebrow: 'Buyer guide · Canada, outside Québec',
  title: 'How to buy a home sold by owner in Canada',
  lead:
    'Eight steps from pre-approval to moving in. You deal with the owner directly for viewings and questions. Your own lawyer protects you on the agreement, the deposit and the title. The steps are the same in every province and territory; where a rule differs, we say so.',
  readTime: 'About a 10-minute read',
  steps: [
    {
      id: 'budget',
      title: 'Get pre-approved and set your budget',
      summary: 'Know what you can spend, including closing costs, before you start viewing.',
      blocks: [
        {
          kind: 'p',
          text: 'Talk to a bank or mortgage broker about pre-approval. Then budget for the costs on top of your down payment:',
        },
        {
          kind: 'list',
          items: [
            'land transfer tax or registration fees, paid when the home is registered in your name (they vary a lot by province)',
            'legal fees',
            'a home inspection',
            'home insurance from closing day',
            'adjustments for property taxes or condo fees the seller has prepaid',
            'moving costs',
          ],
        },
        {
          kind: 'p',
          text: 'Most provinces charge a land transfer tax, and some give first-time buyers a rebate. Alberta and Saskatchewan charge land title registration fees instead. Your lawyer can tell you the amount for your home.',
        },
        {
          kind: 'p',
          text: 'First-time buyers can also use the federal First Home Savings Account and the Home Buyers’ Plan to save or withdraw money tax-free for a down payment.',
        },
        {
          kind: 'p',
          text: 'Some sellers offer cash back at closing. If you are offered one, tell your mortgage lender before you sign. Lenders may treat it as lowering the price, which can change your mortgage.',
        },
      ],
      links: [
        { label: 'Costs of buying a home (Financial Consumer Agency of Canada)', url: 'https://www.canada.ca/en/financial-consumer-agency/services/buying-home.html' },
        { label: 'First Home Savings Account (Canada Revenue Agency)', url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/first-home-savings-account.html' },
        {
          label: 'Home Buyers’ Plan (Canada Revenue Agency)',
          url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/what-home-buyers-plan/participate-home-buyers-plan.html',
        },
      ],
    },
    {
      id: 'lawyer',
      title: 'Choose your lawyer early',
      summary: 'Have someone ready to review an offer the same day you find the right home.',
      blocks: [
        {
          kind: 'p',
          text: 'In a private sale there is no agent writing your offer, so your real estate lawyer matters even more. They prepare or review your offer, hold your deposit in trust, search the title, arrange your mortgage paperwork and register the home in your name. Ask for a fixed-fee quote and whether they have worked on private sales.',
        },
        {
          kind: 'province',
          label: 'British Columbia',
          text: 'A notary public can also handle your purchase instead of a lawyer.',
        },
      ],
      links: LAWYER_LINKS,
    },
    {
      id: 'find',
      title: 'Find homes and request viewings',
      summary: 'Message the owner directly and pick a time that suits you both.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Browse homes and save the ones you like.',
            'Use "Request a viewing" on the listing and suggest a few times.',
            'The owner shares the exact address once they confirm your viewing.',
            'Ask questions by message before you go, so you have the answers in writing.',
          ],
        },
        {
          kind: 'p',
          text: 'You can still use your own agent if you want one. Ask the seller up front whether they will pay your agent’s commission. Many private sellers won’t, so you may need to pay it yourself.',
        },
      ],
    },
    {
      id: 'view',
      title: 'View the home and ask the right questions',
      summary: 'A viewing is your chance to spot problems before you make an offer.',
      blocks: [
        { kind: 'p', text: 'Bring someone with you, take notes and ask:' },
        {
          kind: 'list',
          items: [
            'How old are the roof, furnace, hot water tank and windows?',
            'What renovations were done, and were permits pulled?',
            'Any known problems: leaks, pests, mould, an old oil tank?',
            'What do utilities and heating cost in a year?',
            'What is included in the sale (appliances, window coverings, sheds)?',
            'For a condo: what are the monthly fees, and are any special assessments or big repairs planned?',
          ],
        },
      ],
    },
    {
      id: 'check',
      title: 'Check before you commit',
      summary: 'Confirm who owns the home and what condition it is in.',
      blocks: [
        {
          kind: 'warning',
          text: 'OwnersMarket reviews listings for spam and scams, but does not verify who owns a home. Confirm the owner yourself, or ask your lawyer to, before you sign anything or pay any money.',
        },
        {
          kind: 'list',
          items: [
            'Title search: check that the seller’s name is on the title and see any mortgages or charges registered against it. Every province and territory has a land titles or land registry office; your lawyer can order the search for you.',
            'Home inspection: hire a qualified home inspector, and ask about their training and insurance. An inspection is visual only, so it won’t find everything.',
            'Zoning and permits: check with the city if you plan to renovate or add a suite.',
            'Condos: read the bylaws, recent minutes, financial statements and reserve fund study, and make your offer conditional on reviewing them.',
          ],
        },
        {
          kind: 'province',
          label: 'British Columbia and Alberta',
          text: 'Home inspectors must be licensed. You can check a licence with Consumer Protection BC or the Government of Alberta.',
        },
      ],
      links: [
        { label: 'Check a BC home inspector’s licence (Consumer Protection BC)', url: 'https://www.consumerprotectionbc.ca/home-inspector-search/' },
        { label: 'Hiring a home inspector in Alberta (Government of Alberta)', url: 'https://www.alberta.ca/hiring-home-inspector' },
      ],
    },
    {
      id: 'offer',
      title: 'Make an offer through your lawyer',
      summary: 'Put it in writing, with the conditions you need.',
      blocks: [
        {
          kind: 'p',
          text: 'Your offer is a written agreement of purchase and sale. It usually includes the price, the deposit, your conditions (such as financing, a home inspection and condo documents), and the closing and possession dates. Your lawyer prepares or reviews it with you before you sign.',
        },
        {
          kind: 'province',
          label: 'British Columbia',
          text: 'Conditions are called "subjects". After the seller accepts, you have 3 business days to cancel (the home buyer rescission period), for a fee of 0.25% of the price paid to the seller. It doesn’t replace subjects: it gives you no time for an inspection or financing.',
        },
      ],
      links: [RESCISSION_LINK],
    },
    {
      id: 'deposit',
      title: 'Pay your deposit safely',
      summary: 'Deposits go into a lawyer’s trust account, never to a person.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Pay the deposit only into the trust account named in your agreement.',
            'Never e-Transfer or wire money to the seller or anyone else directly.',
            'Before sending money, phone your lawyer’s office on a number you found yourself to confirm the account details. Fraudsters send fake payment instructions by email.',
          ],
        },
        {
          kind: 'warning',
          text: 'Walk away from anyone who asks for a deposit before you have seen the home, pressures you to pay quickly, or wants money sent outside a trust account.',
        },
      ],
    },
    {
      id: 'closing',
      title: 'Remove conditions, close and move in',
      summary: 'Firm up the deal, and your lawyer finishes it.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Remove (or waive) your conditions in writing before the deadlines in your agreement, only once you are satisfied.',
            'Arrange home insurance starting on closing day. Your lender will ask for proof.',
            'Your lawyer receives your mortgage funds, pays any land transfer tax and registers the home in your name.',
            'Pick up the keys on possession day, as set out in the agreement.',
          ],
        },
      ],
    },
  ],
  checklistTitle: 'Buyer checklist',
  checklist: [
    'I have a mortgage pre-approval and a budget that includes closing costs',
    'I have chosen a real estate lawyer',
    'I have viewed the home and asked my questions',
    'The seller’s name is on the title',
    'I have booked a home inspector',
    'My offer goes through my lawyer, with the conditions I need',
    'My deposit goes only into a lawyer’s trust account',
  ],
  cta: {
    title: 'Find a home sold by its owner',
    text: 'Browse homes, save your favourites and request viewings directly with the owner.',
    button: 'Browse homes',
    tab: 'browse',
  },
  otherGuide: { label: 'Selling instead? Read the seller guide', tab: 'guide-selling' },
};
