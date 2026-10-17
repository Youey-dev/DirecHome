/**
 * "Agents welcome": the seller's own offer to pay a buyer's agent commission to the agent's
 * brokerage. OwnersMarket is not part of it and receives nothing.
 */
import { formatCAD } from './commissionCalc';

export type AgentCommissionType = 'percent' | 'fixed' | 'negotiable';

export interface AgentOffer {
  agentsWelcome?: boolean;
  agentCommissionType?: AgentCommissionType;
  agentCommissionValue?: number;
}

export const AGENT_PERCENT_RANGE = { min: 0.25, max: 5 };
export const AGENT_FIXED_RANGE = { min: 500, max: 100000 };

/** "2.5% of the sale price", "$10,000" or "an amount to be negotiated". */
export function describeAgentCommission(o: AgentOffer): string {
  if (!o.agentsWelcome) return '';
  if (o.agentCommissionType === 'percent' && o.agentCommissionValue) {
    return `${Number(o.agentCommissionValue.toFixed(2))}% of the sale price`;
  }
  if (o.agentCommissionType === 'fixed' && o.agentCommissionValue) return formatCAD(o.agentCommissionValue);
  return 'an amount to be negotiated';
}

/** Returns an error message, or null when the offer is valid (or not made). */
export function validateAgentOffer(o: AgentOffer): string | null {
  if (!o.agentsWelcome) return null;
  const v = Number(o.agentCommissionValue);
  if (o.agentCommissionType === 'percent' && !(v >= AGENT_PERCENT_RANGE.min && v <= AGENT_PERCENT_RANGE.max)) {
    return `Enter a buyer's agent commission between ${AGENT_PERCENT_RANGE.min}% and ${AGENT_PERCENT_RANGE.max}%, or choose "To be negotiated".`;
  }
  if (o.agentCommissionType === 'fixed' && !(v >= AGENT_FIXED_RANGE.min && v <= AGENT_FIXED_RANGE.max)) {
    return `Enter a buyer's agent commission between ${formatCAD(AGENT_FIXED_RANGE.min)} and ${formatCAD(AGENT_FIXED_RANGE.max)}, or choose "To be negotiated".`;
  }
  return null;
}

/** The database columns for an offer (cleared when agents aren't welcome). */
export function agentOfferColumns(o: AgentOffer) {
  if (!o.agentsWelcome) return { agents_welcome: false, agent_commission_type: null, agent_commission_value: null };
  const type = o.agentCommissionType ?? 'negotiable';
  return {
    agents_welcome: true,
    agent_commission_type: type,
    agent_commission_value: type === 'negotiable' ? null : Number(o.agentCommissionValue),
  };
}

export const AGENT_OFFER_NOTICE =
  "This is the seller's own offer. Any buyer's agent commission is agreed in writing between the seller and the agent's brokerage, ideally before the agent books a showing, and is paid to the brokerage at closing as set out in that agreement. OwnersMarket is not part of the agreement and receives nothing from it.";
