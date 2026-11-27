import React from 'react';
import { ShieldAlert } from 'lucide-react';

/**
 * "Beware of scammers" banner shown in every buyer/owner conversation.
 * Scammers have asked people to move to Teams and then sent links that install software.
 */
export const ScamWarning: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    role="note"
    aria-label="Beware of scammers"
    className={`px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-950 flex items-start gap-2 ${className}`}
  >
    <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
    <div>
      <p className="font-bold">Beware of scammers</p>
      <ul className="mt-0.5 list-disc pl-4 space-y-0.5 leading-snug">
        <li>Keep the conversation here. Never move to Teams, WhatsApp, Telegram or text with someone you haven’t met.</li>
        <li>Never download software or apps someone asks you to install.</li>
        <li>Never send money, a deposit or ID documents by e-transfer, gift card or crypto. Deposits go through a lawyer or notary.</li>
      </ul>
      <p className="mt-1">
        Something feels off? Email{' '}
        <a href="mailto:hello@ownersmarket.ca" className="underline underline-offset-2 font-semibold">
          hello@ownersmarket.ca
        </a>
        .
      </p>
    </div>
  </div>
);
