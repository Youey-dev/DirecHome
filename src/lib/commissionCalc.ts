/**
 * Commission and cash-back estimates.
 *
 * EXAMPLE commission rate used for estimates (not a standard or required rate):
 * - 7% on the first $100,000 of purchase price
 * - 2.5% on the remaining balance over $100,000
 * - plus the GST or HST that applies to the commission in the seller's province
 *
 * Note: Commissions in Canada are not set by law and are negotiable.
 * Figures are realistic estimates for illustrative comparison only.
 */

/**
 * Sales tax on a real estate commission, by province (Québec is not served).
 * Source: Canada Revenue Agency, GST/HST rates
 * https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate/calculator.html
 * Checked October 30, 2026. Nova Scotia's HST is 14% since April 1, 2025.
 */
export const COMMISSION_TAX: { code: string; name: string; rate: number; label: string }[] = [
  { code: 'BC', name: 'British Columbia', rate: 0.05, label: '5% GST' },
  { code: 'AB', name: 'Alberta', rate: 0.05, label: '5% GST' },
  { code: 'SK', name: 'Saskatchewan', rate: 0.05, label: '5% GST' },
  { code: 'MB', name: 'Manitoba', rate: 0.05, label: '5% GST' },
  { code: 'ON', name: 'Ontario', rate: 0.13, label: '13% HST' },
  { code: 'NB', name: 'New Brunswick', rate: 0.15, label: '15% HST' },
  { code: 'NS', name: 'Nova Scotia', rate: 0.14, label: '14% HST' },
  { code: 'PE', name: 'Prince Edward Island', rate: 0.15, label: '15% HST' },
  { code: 'NL', name: 'Newfoundland and Labrador', rate: 0.15, label: '15% HST' },
  { code: 'YT', name: 'Yukon', rate: 0.05, label: '5% GST' },
  { code: 'NT', name: 'Northwest Territories', rate: 0.05, label: '5% GST' },
  { code: 'NU', name: 'Nunavut', rate: 0.05, label: '5% GST' },
];
export const DEFAULT_TAX_PROVINCE = 'BC';
export const commissionTax = (code: string | null | undefined) =>
  COMMISSION_TAX.find((t) => t.code === code) ?? COMMISSION_TAX.find((t) => t.code === DEFAULT_TAX_PROVINCE)!;

/** OwnersMarket charges no commission; the listing fee is a flat monthly amount per active listing. */
export const LISTING_FEE_CAD_PER_MONTH = 24.99;
/** The listing fee as shown to people, e.g. "$24.99". */
export const LISTING_FEE_LABEL = '$24.99';

export interface CommissionBreakdown {
  price: number;
  traditionalTotalCommission: number; // incl GST or HST
  listingAgentPortion: number; // 50%
  buyerAgentPortion: number; // 50%
  offeredCashback: number;
  netSellerSavingsWithCashback: number;
  netSellerSavingsZeroCashback: number;
  buyerBenefit: number;
  assumptions: string;
}

export function calculateBCCommission(
  price: number,
  offersCashback: boolean = true,
  cashbackType: 'fixed' | 'percentage' = 'fixed',
  cashbackValue: number = 10000,
  /** Province code (e.g. 'ON'): sets the GST or HST added to the commission. Defaults to BC (5% GST). */
  province: string = DEFAULT_TAX_PROVINCE
): CommissionBreakdown {
  const tax = commissionTax(province);
  const assumptions = `Estimate using an example commission rate (7% on first $100k + 2.5% on balance + ${tax.label} on the commission in ${tax.name}). Commissions are negotiable and vary by brokerage.`;
  if (price <= 0) {
    return {
      price: 0,
      traditionalTotalCommission: 0,
      listingAgentPortion: 0,
      buyerAgentPortion: 0,
      offeredCashback: 0,
      netSellerSavingsWithCashback: 0,
      netSellerSavingsZeroCashback: 0,
      buyerBenefit: 0,
      assumptions
    };
  }

  // Tiered calculation: 7% on 1st $100k, 2.5% on remainder
  const firstTier = Math.min(price, 100000);
  const remainingTier = Math.max(0, price - 100000);

  const baseCommission = (firstTier * 0.07) + (remainingTier * 0.025);
  const salesTax = baseCommission * tax.rate;
  const totalCommissionWithGst = Math.round(baseCommission + salesTax);

  const listingSide = Math.round(totalCommissionWithGst * 0.5);
  const buyerSide = totalCommissionWithGst - listingSide;

  // Calculate cash-back
  let offeredCashback = 0;
  if (offersCashback) {
    if (cashbackType === 'percentage') {
      offeredCashback = Math.round((price * (cashbackValue / 100)));
    } else {
      offeredCashback = Math.min(price, Math.max(0, cashbackValue));
    }
  }

  // Seller net savings when selling directly to a buyer without listing agent
  // (Assuming full direct sale saving listing fee + potential cooperating fee)
  const netSavings = Math.max(0, totalCommissionWithGst - offeredCashback);

  return {
    price,
    traditionalTotalCommission: totalCommissionWithGst,
    listingAgentPortion: listingSide,
    buyerAgentPortion: buyerSide,
    offeredCashback,
    netSellerSavingsWithCashback: netSavings,
    netSellerSavingsZeroCashback: totalCommissionWithGst,
    buyerBenefit: offeredCashback,
    assumptions
  };
}

export function formatCAD(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0
  }).format(amount);
}

/** Like formatCAD, but always shows cents (e.g. "$74.97"). Use for listing fees. */
export function formatCADCents(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}
