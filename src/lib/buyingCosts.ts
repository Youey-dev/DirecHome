/**
 * What a home would cost a buyer: the monthly payment and the cash needed on closing day.
 * Estimates only, shown with a note to check with a lender and a lawyer or notary.
 *
 * Rules (checked November 2026):
 * - Mortgage: Canadian fixed-rate mortgages compound twice a year.
 * - Minimum down payment: 5% of the first $500,000 and 10% of the rest, up to $1.5M; 20% from $1.5M
 *   (mortgage insurance isn't available at $1.5M and over).
 * - CMHC insurance (under 20% down), as % of the loan: 4.00% (5–9.99% down), 3.10% (10–14.99%),
 *   2.80% (15–19.99%), plus 0.20% for a 30-year amortization. Added to the mortgage. Ontario (8%),
 *   Quebec (9%) and Saskatchewan (6%) charge sales tax on it, paid in cash at closing.
 * - Transfer taxes and fees per province, below.
 */

export interface Bracket {
  upTo: number; // Infinity for the last
  rate: number; // 0.01 = 1%
}

/** Tax on `price` from marginal brackets. */
export function bracketTax(price: number, brackets: Bracket[]): number {
  let tax = 0;
  let from = 0;
  for (const b of brackets) {
    if (price <= from) break;
    const top = Math.min(price, b.upTo);
    tax += (top - from) * b.rate;
    from = b.upTo;
  }
  return Math.round(tax);
}

const BC: Bracket[] = [
  { upTo: 200_000, rate: 0.01 },
  { upTo: 2_000_000, rate: 0.02 },
  { upTo: 3_000_000, rate: 0.03 },
  { upTo: Infinity, rate: 0.05 }, // 3% + the further 2% on residential over $3M
];
const ON: Bracket[] = [
  { upTo: 55_000, rate: 0.005 },
  { upTo: 250_000, rate: 0.01 },
  { upTo: 400_000, rate: 0.015 },
  { upTo: 2_000_000, rate: 0.02 },
  { upTo: Infinity, rate: 0.025 },
];
// City of Toronto MLTT, from April 1, 2026
const TORONTO: Bracket[] = [
  { upTo: 55_000, rate: 0.005 },
  { upTo: 250_000, rate: 0.01 },
  { upTo: 400_000, rate: 0.015 },
  { upTo: 2_000_000, rate: 0.02 },
  { upTo: 3_000_000, rate: 0.025 },
  { upTo: 4_000_000, rate: 0.044 },
  { upTo: 5_000_000, rate: 0.0545 },
  { upTo: 10_000_000, rate: 0.065 },
  { upTo: 20_000_000, rate: 0.0755 },
  { upTo: Infinity, rate: 0.086 },
];
const MB: Bracket[] = [
  { upTo: 30_000, rate: 0 },
  { upTo: 90_000, rate: 0.005 },
  { upTo: 150_000, rate: 0.01 },
  { upTo: 200_000, rate: 0.015 },
  { upTo: Infinity, rate: 0.02 },
];
// Quebec "welcome tax", 2026 thresholds (indexed each year). Some cities charge more above $500,000.
const QC: Bracket[] = [
  { upTo: 62_900, rate: 0.005 },
  { upTo: 315_000, rate: 0.01 },
  { upTo: Infinity, rate: 0.015 },
];

const TORONTO_RE = /\b(toronto|north york|scarborough|etobicoke|east york)\b/i;

export interface CostLine {
  label: string;
  amount: number; // negative for a credit
  note?: string;
}

/** The province's land transfer tax or registration fees, with any first-time buyer relief. */
export function transferCosts(
  province: string,
  city: string,
  price: number,
  mortgage: number,
  firstTime: boolean,
): CostLine[] {
  const p = Math.max(0, price);
  switch (province) {
    case 'BC': {
      const tax = bracketTax(p, BC);
      const lines: CostLine[] = [{ label: 'BC property transfer tax', amount: tax }];
      if (firstTime && p <= 860_000) {
        // Exempt on the first $500,000 for homes up to $835,000, phased out to $860,000
        const full = bracketTax(Math.min(p, 500_000), BC);
        const exempt = p <= 835_000 ? full : Math.round((full * (860_000 - p)) / 25_000);
        if (exempt > 0) lines.push({ label: 'First-time buyer exemption', amount: -exempt });
      }
      return lines;
    }
    case 'ON': {
      const lines: CostLine[] = [{ label: 'Ontario land transfer tax', amount: bracketTax(p, ON) }];
      if (firstTime) lines.push({ label: 'First-time buyer refund', amount: -Math.min(4_000, bracketTax(p, ON)) });
      if (TORONTO_RE.test(city)) {
        const mltt = bracketTax(p, TORONTO);
        lines.push({ label: 'Toronto land transfer tax', amount: mltt });
        if (firstTime) lines.push({ label: 'Toronto first-time buyer rebate', amount: -Math.min(4_475, mltt) });
      }
      return lines;
    }
    case 'QC':
      return [{ label: 'Quebec transfer duties (welcome tax)', amount: bracketTax(p, QC), note: 'Montreal and some cities charge more above $500,000.' }];
    case 'MB':
      return [{ label: 'Manitoba land transfer tax', amount: bracketTax(p, MB) + 133, note: 'Includes the $133 registration fee.' }];
    case 'NB':
      return [{ label: 'New Brunswick transfer tax (1%)', amount: Math.round(p * 0.01), note: 'On the price or the assessed value, whichever is higher.' }];
    case 'NS':
      return [{ label: 'Deed transfer tax (up to 1.5%)', amount: Math.round(p * 0.015), note: 'Set by each municipality: 1.5% in Halifax, lower in some towns.' }];
    case 'PE':
      return firstTime || p < 30_000
        ? [{ label: 'PEI transfer tax', amount: 0, note: 'First-time buyers who qualify pay none.' }]
        : [{ label: 'PEI transfer tax (1%)', amount: Math.round(p * 0.01) }];
    case 'AB': {
      const fee = (v: number) => 50 + 5 * Math.ceil(v / 5_000);
      return [{ label: 'Alberta land title and mortgage fees', amount: fee(p) + (mortgage > 0 ? fee(mortgage) : 0), note: 'Alberta has no land transfer tax.' }];
    }
    case 'SK': {
      const title = p <= 500 ? 0 : p <= 6_300 ? 25 : Math.round(p * 0.004);
      const mort =
        mortgage <= 0 ? 0 : mortgage < 250_000 ? 200 : mortgage <= 500_000 ? 275 : mortgage <= 750_000 ? 525 : mortgage <= 1_000_000 ? 775 : 1_000;
      return [{ label: 'Saskatchewan title and mortgage fees', amount: title + mort, note: 'Saskatchewan has no land transfer tax.' }];
    }
    case 'NL':
      return [{ label: 'Registration of deed fee', amount: p <= 500 ? 100 : Math.round(100 + 0.4 * Math.ceil((p - 500) / 100)) }];
    case 'NT':
      return [{ label: 'Land title fees', amount: Math.max(100, p <= 1_000_000 ? 2 * Math.ceil(p / 1_000) : 2_000 + 1.5 * Math.ceil((p - 1_000_000) / 1_000)) }];
    case 'NU':
      return [{ label: 'Land title fees', amount: Math.round(60 + 1.5 * Math.ceil(p / 1_000)) }];
    case 'YT':
      return [{ label: 'Land title fees (about)', amount: 500, note: 'Yukon has no land transfer tax; title fees are a few hundred dollars.' }];
    default:
      return [];
  }
}

/** The smallest down payment allowed in Canada for this price. */
export function minimumDownPayment(price: number): number {
  if (price >= 1_500_000) return Math.ceil(price * 0.2);
  if (price <= 500_000) return Math.ceil(price * 0.05);
  return Math.ceil(25_000 + (price - 500_000) * 0.1);
}

/** CMHC premium as a share of the loan (0 when 20% or more is put down). */
export function insuranceRate(price: number, down: number, years: number): number {
  if (price <= 0 || price >= 1_500_000) return 0;
  const pct = down / price;
  if (pct >= 0.2) return 0;
  const base = pct >= 0.15 ? 0.028 : pct >= 0.1 ? 0.031 : 0.04;
  return base + (years > 25 ? 0.002 : 0);
}

/** Sales tax on the CMHC premium, by province. */
const PREMIUM_TAX: Record<string, number> = { ON: 0.08, QC: 0.09, SK: 0.06 };

/** Monthly payment with twice-a-year compounding (the Canadian standard for fixed rates). */
export function monthlyPayment(loan: number, annualRate: number, years: number): number {
  if (loan <= 0) return 0;
  const n = years * 12;
  if (annualRate <= 0) return loan / n;
  const r = Math.pow(1 + annualRate / 2, 2 / 12) - 1;
  return (loan * r) / (1 - Math.pow(1 + r, -n));
}

export interface CostInput {
  price: number;
  down: number;
  ratePct: number; // 4.5 = 4.5%
  years: number;
  propertyTaxYear: number;
  strataMonth: number;
  province: string;
  city: string;
  firstTime: boolean;
}

export interface CostResult {
  minDown: number;
  downTooLow: boolean;
  /** $1.5M and over need 20% down */
  premium: number;
  premiumTax: number;
  loan: number;
  mortgageMonth: number;
  taxMonth: number;
  strataMonth: number;
  totalMonth: number;
  closing: CostLine[];
  cashToClose: number;
}

/** Typical costs every buyer pays besides tax: legal, inspection, title insurance and adjustments. */
export const TYPICAL_COSTS: CostLine[] = [
  { label: 'Lawyer or notary (typical)', amount: 1_500 },
  { label: 'Home inspection (typical)', amount: 600 },
  { label: 'Title insurance and adjustments (typical)', amount: 700 },
];

export function buyingCosts(i: CostInput): CostResult {
  const price = Math.max(0, i.price || 0);
  const down = Math.min(price, Math.max(0, i.down || 0));
  const minDown = minimumDownPayment(price);
  const rate = insuranceRate(price, down, i.years);
  const base = Math.max(0, price - down);
  const premium = Math.round(base * rate);
  const premiumTax = Math.round(premium * (PREMIUM_TAX[i.province] ?? 0));
  const loan = base + premium;
  const mortgageMonth = monthlyPayment(loan, (i.ratePct || 0) / 100, i.years || 25);
  const taxMonth = (i.propertyTaxYear || 0) / 12;
  const strataMonth = i.strataMonth || 0;

  const closing: CostLine[] = [
    { label: 'Down payment', amount: down },
    ...transferCosts(i.province, i.city, price, loan, i.firstTime),
    ...(premiumTax > 0 ? [{ label: 'Sales tax on mortgage insurance', amount: premiumTax }] : []),
    ...TYPICAL_COSTS,
  ];
  return {
    minDown,
    downTooLow: down < minDown,
    premium,
    premiumTax,
    loan,
    mortgageMonth,
    taxMonth,
    strataMonth,
    totalMonth: mortgageMonth + taxMonth + strataMonth,
    closing,
    cashToClose: closing.reduce((s, l) => s + l.amount, 0),
  };
}
