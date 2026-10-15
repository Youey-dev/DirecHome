/**
 * Step-by-step guides for sellers and buyers in British Columbia.
 *
 * Written for the user profiles in the "OwnersMarket user profiles and user stories" doc:
 * the seller guide for "Sandra" (prepared DIY seller), the buyer guide for "Jordan" (phone-first buyer).
 *
 * Legal guardrails (from the Canada-wide legal review): general information only. Never tell
 * people what price to ask or offer, never give them contract wording, and send every legal
 * decision to their own lawyer or notary. OwnersMarket does not verify ownership, hold deposits
 * or handle offers.
 *
 * Facts checked October 14, 2026 against the official pages linked in each step.
 * Review this file at least once a year, and whenever a BC rule changes.
 */

export type GuideBlock =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'bc'; text: string }
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
  { label: 'Find a lawyer: Law Society of British Columbia', url: 'https://www.lawsociety.bc.ca/' },
  { label: 'Find a notary: Society of Notaries Public of BC', url: 'https://notaries.bc.ca/' },
];

const RESCISSION_LINK: GuideLink = {
  label: 'Home buyer rescission period (BC Financial Services Authority)',
  url: 'https://www.bcfsa.ca/public-resources/real-estate/home-buyer-rescission-period',
};

const LTSA_LINK: GuideLink = {
  label: 'Search a land title online: myLTSA Explorer (Land Title and Survey Authority)',
  url: 'https://ltsa.ca/online-services/myltsa-explorer',
};

// ---------------------------------------------------------------------------
// Selling your home yourself
// ---------------------------------------------------------------------------
export const SELLER_GUIDE: Guide = {
  tab: 'guide-selling',
  eyebrow: 'Seller guide · British Columbia',
  title: 'How to sell your home yourself in BC',
  lead:
    'Nine steps from "should I?" to handing over the keys. You do the selling: photos, viewings and talking to buyers. Your lawyer or notary handles the legal side, as with any home sale in BC.',
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
            'You have a lawyer or notary, or are happy to hire one.',
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
      title: 'Hire your lawyer or notary before you list',
      summary: 'Line them up first, so you are ready the day an offer arrives.',
      blocks: [
        { kind: 'p', text: 'In a private sale, your lawyer or notary is the person who protects you. They usually:' },
        {
          kind: 'list',
          items: [
            'review or prepare the contract of purchase and sale, and explain each term before you sign',
            'hold the buyer’s deposit in their trust account',
            'pay off your mortgage from the sale money',
            'work out the adjustments for property taxes, strata fees and utilities',
            'register the transfer of title with the Land Title Office on completion day',
          ],
        },
        {
          kind: 'bc',
          text: 'In BC, both lawyers and notaries public can handle a home sale. Ask for a fixed-fee quote, and ask whether they have done private sales without agents.',
        },
        {
          kind: 'lawyer',
          text: 'Questions to ask at your first call: What documents should I gather? What should I disclose about the home? Will you prepare the contract, or review one the buyer’s lawyer sends?',
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
            'Your BC Assessment value. It is a useful reference, but it is a value from July 1 of the year before, so the market may have moved since.',
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
      links: [{ label: 'Look up any property’s assessed value (BC Assessment)', url: 'https://www.bcassessment.ca/' }],
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
            'your latest property tax notice',
            'your mortgage details, so your lawyer can get a payout statement from the lender',
            'typical utility and heating costs for a year',
            'permits and records for renovations, and receipts for major work (roof, furnace, windows)',
            'a survey certificate or site plan, if you have one',
            'for a strata home: bylaws, recent meeting minutes, financial statements, the depreciation report and an information certificate (Form B) from your strata manager',
          ],
        },
        {
          kind: 'bc',
          text: 'Sellers in BC have a legal duty to disclose known material latent defects: hidden problems a reasonable inspection would not find, that make the home dangerous, unfit to live in, or unfit for the buyer’s known purpose. Examples include basement leaks, structural damage and an old underground oil tank. BC has no required disclosure form, but many sellers fill in a voluntary Property Disclosure Statement.',
        },
        {
          kind: 'bc',
          text: 'If you have owned the home for less than 2 years (730 days), BC’s home flipping tax may apply to your profit. Talk to an accountant before you list.',
        },
        {
          kind: 'lawyer',
          text: 'Ask your lawyer or notary what you need to disclose about your home, and whether to use a disclosure statement.',
        },
      ],
      links: [
        {
          label: 'What counts as a material latent defect (BC Financial Services Authority)',
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
            'Add your photos, price and the basics: rooms, size, taxes and strata fees if any.',
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
            'Answer questions about the home honestly. For questions about the contract or the law, say "my lawyer can answer that".',
          ],
        },
        {
          kind: 'warning',
          text: 'Watch for scams: a "buyer" who won’t view the home, sends more money than agreed and asks for a refund, or asks for your banking or ID details. Never share these. Money only ever moves through the lawyers’ or notaries’ trust accounts.',
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
          text: 'An offer is a written contract of purchase and sale. It usually sets out the price, the deposit, the conditions (in BC these are called "subjects", such as financing, inspection and reviewing strata documents), and the completion and possession dates.',
        },
        {
          kind: 'list',
          items: [
            'Send every offer to your lawyer or notary before you respond.',
            'You can accept it, make a counter-offer, or decline it.',
            'The deposit is paid into a lawyer’s or notary’s trust account, as the contract says. Never take a deposit yourself.',
          ],
        },
        {
          kind: 'bc',
          text: 'After you accept an offer, the buyer has 3 business days to cancel (the home buyer rescission period). If they cancel, they pay you a fee of 0.25% of the price. This applies to private sales too, and neither side can waive it.',
        },
      ],
      links: [RESCISSION_LINK],
    },
    {
      id: 'completion',
      title: 'Subjects removed, completion and keys',
      summary: 'Once subjects are removed, the sale is firm and the lawyers finish it.',
      blocks: [
        {
          kind: 'list',
          items: [
            'The buyer removes their subjects in writing by the dates in the contract. After that, the sale is firm.',
            'Mark your listing as sold and cancel your OwnersMarket plan.',
            'Your lawyer or notary pays out your mortgage, handles the adjustments and registers the transfer on completion day.',
            'Hand over the keys on possession day, as the contract says. Leave the home clean and the included items in place.',
            'Cancel your home insurance and utilities from the possession date, and forward your mail.',
          ],
        },
        {
          kind: 'p',
          text: 'At tax time, report the sale on your tax return. In Canada, the sale of your principal residence still has to be reported, even when no tax is owed. An accountant can help.',
        },
      ],
    },
  ],
  checklistTitle: 'Seller checklist',
  checklist: [
    'My home is move-in ready and I can be there for viewings',
    'I have hired a lawyer or notary',
    'I have researched prices of similar homes nearby',
    'I have gathered my property tax notice, mortgage details and records of work done',
    'I know what I need to disclose about my home',
    'My photos are bright, level and cover every main room',
    'I have decided what I will do if a buyer brings an agent',
    'I know to send every offer to my lawyer or notary before signing',
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
  eyebrow: 'Buyer guide · British Columbia',
  title: 'How to buy a home sold by owner in BC',
  lead:
    'Eight steps from pre-approval to moving in. You deal with the owner directly for viewings and questions. Your own lawyer or notary protects you on the contract, the deposit and the title.',
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
            'property transfer tax, paid when the home is registered in your name',
            'legal or notary fees',
            'a home inspection',
            'home insurance from completion day',
            'adjustments for property taxes or strata fees the seller has prepaid',
            'moving costs',
          ],
        },
        {
          kind: 'bc',
          text: 'First-time buyers and buyers of newly built homes may pay less property transfer tax, or none. Check the rules and amounts on the Government of BC website.',
        },
        {
          kind: 'p',
          text: 'Some sellers offer cash back at closing. If you are offered one, tell your mortgage lender before you sign. Lenders may treat it as lowering the price, which can change your mortgage.',
        },
      ],
      links: [
        { label: 'Property transfer tax (Government of BC)', url: 'https://www2.gov.bc.ca/gov/content/taxes/property-taxes/property-transfer-tax' },
        {
          label: 'First-time home buyers’ exemption (Government of BC)',
          url: 'https://www2.gov.bc.ca/gov/content/taxes/property-taxes/property-transfer-tax/exemptions/first-time-home-buyers',
        },
      ],
    },
    {
      id: 'lawyer',
      title: 'Choose your lawyer or notary early',
      summary: 'Have someone ready to review an offer the same day you find the right home.',
      blocks: [
        {
          kind: 'p',
          text: 'In a private sale there is no agent writing your offer, so your lawyer or notary matters even more. They prepare or review your offer, hold your deposit in trust, search the title, arrange your mortgage paperwork and register the home in your name.',
        },
        {
          kind: 'bc',
          text: 'In BC, both lawyers and notaries public can handle a home purchase. Ask for a fixed-fee quote and whether they have worked on private sales.',
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
            'For a strata home: what are the monthly fees, and are any special levies or big repairs planned?',
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
          text: 'OwnersMarket reviews listings for spam and scams, but does not verify who owns a home. Confirm the owner yourself, or ask your lawyer or notary to, before you sign anything or pay any money.',
        },
        {
          kind: 'list',
          items: [
            'Title search: check that the seller’s name is on the title and see any mortgages or charges registered against it. You can order one online from the Land Title and Survey Authority, or your lawyer can.',
            'Home inspection: hire a licensed home inspector. All home inspectors in BC must be licensed by Consumer Protection BC. An inspection is visual only, so it won’t find everything.',
            'Zoning and permits: check with the city if you plan to renovate or add a suite.',
            'Strata homes: read the bylaws, recent minutes, financial statements and depreciation report.',
          ],
        },
      ],
      links: [
        LTSA_LINK,
        { label: 'Check a home inspector’s licence (Consumer Protection BC)', url: 'https://www.consumerprotectionbc.ca/home-inspector-search/' },
      ],
    },
    {
      id: 'offer',
      title: 'Make an offer through your lawyer or notary',
      summary: 'Put it in writing, with the conditions you need.',
      blocks: [
        {
          kind: 'p',
          text: 'Your offer is a written contract of purchase and sale. It usually includes the price, the deposit, your conditions (in BC called "subjects", such as financing, inspection and strata documents), and the completion and possession dates. Your lawyer or notary prepares or reviews it with you.',
        },
        {
          kind: 'bc',
          text: 'After the seller accepts, you have 3 business days to cancel (the home buyer rescission period). Cancelling costs a fee of 0.25% of the price, paid to the seller. It is not a replacement for subjects: it doesn’t give you time for an inspection or financing.',
        },
      ],
      links: [RESCISSION_LINK],
    },
    {
      id: 'deposit',
      title: 'Pay your deposit safely',
      summary: 'Deposits go into a lawyer’s or notary’s trust account, never to a person.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Pay the deposit only into the trust account named in your contract.',
            'Never e-Transfer or wire money to the seller or anyone else directly.',
            'Before sending money, phone your lawyer’s or notary’s office on a number you found yourself to confirm the account details. Fraudsters send fake payment instructions by email.',
          ],
        },
        {
          kind: 'warning',
          text: 'Walk away from anyone who asks for a deposit before you have seen the home, pressures you to pay quickly, or wants money sent outside a trust account.',
        },
      ],
    },
    {
      id: 'completion',
      title: 'Remove subjects, complete and move in',
      summary: 'Firm up the deal, and your lawyer or notary finishes it.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Remove your subjects in writing before the deadlines in your contract, only once you are satisfied.',
            'Arrange home insurance starting on completion day. Your lender will ask for proof.',
            'Your lawyer or notary receives your mortgage funds, pays the property transfer tax and registers the home in your name.',
            'Pick up the keys on possession day, as set out in the contract.',
          ],
        },
      ],
    },
  ],
  checklistTitle: 'Buyer checklist',
  checklist: [
    'I have a mortgage pre-approval and a budget that includes closing costs',
    'I have chosen a lawyer or notary',
    'I have viewed the home and asked my questions',
    'The seller’s name is on the title',
    'I have booked a licensed home inspector',
    'My offer goes through my lawyer or notary, with the subjects I need',
    'My deposit goes only into a lawyer’s or notary’s trust account',
  ],
  cta: {
    title: 'Find a home sold by its owner',
    text: 'Browse homes, save your favourites and request viewings directly with the owner.',
    button: 'Browse homes',
    tab: 'browse',
  },
  otherGuide: { label: 'Selling instead? Read the seller guide', tab: 'guide-selling' },
};
