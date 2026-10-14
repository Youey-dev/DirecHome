import React from 'react';
import { Building2, ShieldCheck, FileCheck, Scale } from 'lucide-react';

export const Footer: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm border-t border-slate-800 mt-20">
      {/* Consumer Protection Notice Banner */}
      <div className="bg-slate-950/90 border-b border-slate-800 py-6 px-4 sm:px-6">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start md:items-center gap-3 text-slate-200 font-medium">
            <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/40 shrink-0 mt-0.5 md:mt-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-white block">Important Legal Notice</span>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                This site is an advertising platform. We are not a real estate brokerage and do not provide real estate advice. Sellers and buyers should consult a lawyer or notary before signing any agreement.
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-2 shrink-0">
            <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Privacy under BC PIPA · Contracts by your own lawyer or notary</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Col 1 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-lg">
              <div className="w-7 h-7 rounded-md bg-emerald-700 flex items-center justify-center text-white">
                <Building2 className="w-4 h-4" />
              </div>
              <span>DirectHome BC</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Helping British Columbians sell their own homes with no commission — a flat $25/month per active listing. Sellers may choose to offer buyers a closing cash-back.
            </p>
            <div className="pt-2 text-xs text-slate-400">
              Launch Region: <strong className="text-slate-200">Fraser Valley & Lower Mainland, BC</strong>
            </div>
          </div>

          {/* Col 2 */}
          <div className="space-y-2">
            <div className="text-white font-semibold text-xs tracking-wider uppercase">Marketplace</div>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button onClick={() => onNavigate('browse')} className="hover:text-white transition-colors cursor-pointer">
                  Browse Homes for Sale
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('wizard')} className="hover:text-white transition-colors cursor-pointer">
                  List Your Home
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('calculator')} className="hover:text-white transition-colors cursor-pointer">
                  Commission & Cash-Back Estimator
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('dashboard')} className="hover:text-white transition-colors cursor-pointer">
                  My Dashboard & Messages
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-2">
            <div className="text-white font-semibold text-xs tracking-wider uppercase">Coverage Cities</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Langley · Surrey · Abbotsford · Burnaby · Vancouver · Coquitlam · Chilliwack · Richmond · White Rock · Maple Ridge · Delta · Mission
            </p>
          </div>

          {/* Col 4 */}
          <div className="space-y-2">
            <div className="text-white font-semibold text-xs tracking-wider uppercase">Trust & Safety</div>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li className="flex items-start gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Every listing reviewed before publishing (ownership is not verified)</span>
              </li>
              <li className="flex items-start gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Approximate pin location until private viewing is confirmed</span>
              </li>
              <li className="flex items-start gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Your own lawyer or notary prepares the purchase contract; DirectHome does not provide contracts</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            © {new Date().getFullYear()} DirectHome BC Technologies Inc. All rights reserved. Made in British Columbia.
          </div>
          <div className="flex items-center gap-3 text-slate-400 flex-wrap">
            <button
              onClick={() => onNavigate('terms')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Terms of Use
            </button>
            <span>·</span>
            <button
              onClick={() => onNavigate('privacy')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>·</span>
            <button
              onClick={() => onNavigate('rules')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Community & Listing Rules
            </button>
            <span>·</span>
            <button
              onClick={() => onNavigate('cashback')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              How Cash-Back Works
            </button>
            <span>·</span>
            <button
              onClick={() => onNavigate('notifications')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Email Preferences (CASL)
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
