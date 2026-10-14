/**
 * Commission and Cash-back Calculation Utilities for BC Real Estate
 * 
 * EXAMPLE commission rate used for estimates (not a standard or required rate):
 * - 7% on the first $100,000 of purchase price
 * - 2.5% on the remaining balance over $100,000
 * - Applicable 5% GST on real estate brokerage services
 * 
 * Note: Commissions in Canada are not set by law and are negotiable.
 * Figures are realistic estimates for illustrative comparison only.
 */

/** DirectHome charges no commission; the listing fee is a flat monthly amount per active listing. */
export const LISTING_FEE_CAD_PER_MONTH = 25;

export interface CommissionBreakdown {
  price: number;
  traditionalTotalCommission: number; // incl GST
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
  cashbackValue: number = 10000
): CommissionBreakdown {
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
      assumptions: 'Estimate using an example commission rate (7% on first $100k + 2.5% on balance + 5% GST). Commissions are negotiable.'
    };
  }

  // Tiered calculation: 7% on 1st $100k, 2.5% on remainder
  const firstTier = Math.min(price, 100000);
  const remainingTier = Math.max(0, price - 100000);

  const baseCommission = (firstTier * 0.07) + (remainingTier * 0.025);
  const gst = baseCommission * 0.05;
  const totalCommissionWithGst = Math.round(baseCommission + gst);

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
    assumptions: 'Estimate using an example commission rate (7% on first $100k + 2.5% on balance + 5% GST). Commissions are negotiable and vary by brokerage.'
  };
}

export function formatCAD(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0
  }).format(amount);
}
