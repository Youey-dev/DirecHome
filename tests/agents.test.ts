import { agentOfferColumns, describeAgentCommission, validateAgentOffer } from '../src/lib/agentCommission';

export function runAgentTests() {
  console.log('🧪 Testing "Agents welcome" commission offers...');
  const fail = (m: string) => { throw new Error(m); };
  if (validateAgentOffer({ agentsWelcome: false }) !== null) fail('No offer needs no checks');
  if (validateAgentOffer({ agentsWelcome: true, agentCommissionType: 'negotiable' }) !== null) fail('Negotiable needs no amount');
  if (!validateAgentOffer({ agentsWelcome: true, agentCommissionType: 'percent', agentCommissionValue: 9 })) fail('9% should be rejected');
  if (!validateAgentOffer({ agentsWelcome: true, agentCommissionType: 'fixed', agentCommissionValue: 50 })) fail('$50 should be rejected');
  if (describeAgentCommission({ agentsWelcome: true, agentCommissionType: 'percent', agentCommissionValue: 2.5 }) !== '2.5% of the sale price') fail('Percent wording');
  if (describeAgentCommission({ agentsWelcome: true, agentCommissionType: 'negotiable' }) !== 'an amount to be negotiated') fail('Negotiable wording');
  const off = agentOfferColumns({ agentsWelcome: false, agentCommissionType: 'percent', agentCommissionValue: 2 });
  if (off.agents_welcome || off.agent_commission_type !== null || off.agent_commission_value !== null) fail('Turning it off must clear the offer');
  const neg = agentOfferColumns({ agentsWelcome: true, agentCommissionType: 'negotiable', agentCommissionValue: 3 });
  if (neg.agent_commission_value !== null) fail('Negotiable stores no amount (matches the database rule)');
  console.log('✅ Agents welcome: valid offers only, clear wording, matches the database rule\n');
}
