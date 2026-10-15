import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, ExternalLink, MapPin, Scale } from 'lucide-react';
import type { Guide, GuideBlock } from '../data/guides';
import { GUIDES_LAST_UPDATED } from '../data/guides';

interface GuidePageProps {
  guide: Guide;
  onNavigate: (tab: string) => void;
}

const Block: React.FC<{ block: GuideBlock }> = ({ block }) => {
  switch (block.kind) {
    case 'p':
      return <p className="text-[17px] leading-relaxed text-slate-700">{block.text}</p>;
    case 'list':
      return (
        <ul className="space-y-2.5">
          {block.items.map((item) => (
            <li key={item} className="flex gap-3 text-[17px] leading-relaxed text-slate-700">
              <span aria-hidden="true" className="mt-[11px] w-1.5 h-1.5 rounded-full bg-emerald-700 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case 'bc':
      return (
        <div className="rounded-lg bg-fern px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
            <MapPin className="w-4 h-4" aria-hidden="true" />
            <span>In British Columbia</span>
          </div>
          <p className="mt-1.5 text-base leading-relaxed text-slate-900">{block.text}</p>
        </div>
      );
    case 'lawyer':
      return (
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Scale className="w-4 h-4 text-emerald-700" aria-hidden="true" />
            <span>Ask your lawyer or notary</span>
          </div>
          <p className="mt-1.5 text-base leading-relaxed text-slate-700">{block.text}</p>
        </div>
      );
    case 'warning':
      return (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4" aria-hidden="true" />
            <span>Stay safe</span>
          </div>
          <p className="mt-1.5 text-base leading-relaxed text-amber-950">{block.text}</p>
        </div>
      );
  }
};

export const GuidePage: React.FC<GuidePageProps> = ({ guide, onNavigate }) => {
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const jumpTo = (id: string) => {
    document.getElementById(`step-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div>
      {/* Title */}
      <section className="bg-mist border-b border-slate-200">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-10 flex flex-col gap-4">
          <span className="text-sm font-bold text-emerald-700">{guide.eyebrow}</span>
          <h1 className="font-display font-bold text-[46px] sm:text-[64px] leading-[0.95] text-slate-900 max-w-[14em]">
            {guide.title}
          </h1>
          <p className="text-[18px] sm:text-[19px] leading-relaxed text-slate-700 max-w-[38em]">{guide.lead}</p>
          <p className="text-sm text-slate-600">
            {guide.readTime} · Last updated {GUIDES_LAST_UPDATED}
          </p>
          <p className="text-sm leading-relaxed text-slate-600 max-w-[46em] border-t border-slate-200 pt-4 mt-1">
            General information to help you understand the process, not legal, tax or real estate advice. Rules change, so
            check the official sources linked in each step and ask your own lawyer or notary about your situation.
            OwnersMarket is an advertising service, not a real estate brokerage.
          </p>
        </div>
      </section>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-12 sm:py-16 flex flex-col lg:flex-row gap-10 lg:gap-14">
        {/* Steps index */}
        <nav aria-label="Steps in this guide" className="lg:w-[280px] shrink-0">
          <div className="lg:sticky lg:top-24 flex flex-col gap-1">
            <span className="text-sm font-bold text-slate-900 mb-2">The steps</span>
            <ol className="flex flex-col gap-1">
              {guide.steps.map((step, i) => (
                <li key={step.id}>
                  <button
                    onClick={() => jumpTo(step.id)}
                    className="w-full text-left flex gap-3 items-start py-1.5 text-[15px] leading-snug text-slate-700 hover:text-emerald-700 cursor-pointer min-h-[36px]"
                  >
                    <span className="font-display font-bold text-emerald-700 w-5 shrink-0">{i + 1}</span>
                    <span>{step.title}</span>
                  </button>
                </li>
              ))}
              <li>
                <button
                  onClick={() => jumpTo('checklist')}
                  className="w-full text-left flex gap-3 items-start py-1.5 text-[15px] leading-snug text-slate-700 hover:text-emerald-700 cursor-pointer min-h-[36px]"
                >
                  <span className="font-display font-bold text-emerald-700 w-5 shrink-0" aria-hidden="true">✓</span>
                  <span>{guide.checklistTitle}</span>
                </button>
              </li>
            </ol>
            <button
              onClick={() => onNavigate(guide.otherGuide.tab)}
              className="mt-4 self-start text-sm font-semibold text-emerald-700 hover:text-slate-900 underline underline-offset-4 cursor-pointer min-h-[44px]"
            >
              {guide.otherGuide.label}
            </button>
          </div>
        </nav>

        {/* Steps */}
        <div className="flex-1 min-w-0 max-w-[760px] flex flex-col gap-14">
          {guide.steps.map((step, i) => (
            <section key={step.id} id={`step-${step.id}`} className="scroll-mt-24 flex flex-col gap-5">
              <div className="flex gap-4 items-start">
                <span className="w-11 h-11 rounded-full bg-sign text-slate-900 font-display font-bold text-[24px] flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div className="flex flex-col gap-1.5 pt-0.5">
                  <h2 className="font-display font-bold text-[32px] sm:text-[36px] leading-none text-slate-900">
                    {step.title}
                  </h2>
                  <p className="text-[17px] font-semibold text-slate-900">{step.summary}</p>
                </div>
              </div>
              <div className="flex flex-col gap-4 sm:pl-15">
                {step.blocks.map((block, j) => (
                  <Block key={j} block={block} />
                ))}
                {step.links && step.links.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-bold text-slate-900">Official sources</span>
                    <ul className="flex flex-col gap-1">
                      {step.links.map((link) => (
                        <li key={link.url}>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-start gap-1.5 text-[15px] text-emerald-700 hover:text-slate-900 underline underline-offset-4"
                          >
                            <span>{link.label}</span>
                            <ExternalLink className="w-3.5 h-3.5 mt-1 shrink-0" aria-hidden="true" />
                            <span className="sr-only">(opens in a new tab)</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          ))}

          {/* Checklist */}
          <section id="step-checklist" className="scroll-mt-24 rounded-[10px] border-2 border-emerald-700 p-6 sm:p-8 flex flex-col gap-4">
            <h2 className="font-display font-bold text-[32px] sm:text-[36px] leading-none text-slate-900">
              {guide.checklistTitle}
            </h2>
            <p className="text-base text-slate-600">Tick these off as you go.</p>
            <ul className="flex flex-col gap-2">
              {guide.checklist.map((item, i) => (
                <li key={item}>
                  <label className="flex gap-3 items-start cursor-pointer min-h-[44px] py-1.5">
                    <input
                      type="checkbox"
                      checked={!!checked[i]}
                      onChange={(e) => setChecked((c) => ({ ...c, [i]: e.target.checked }))}
                      className="mt-1 w-5 h-5 accent-emerald-700 shrink-0"
                    />
                    <span className={`text-[17px] leading-relaxed ${checked[i] ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                      {item}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          {/* Call to action */}
          <section className="rounded-[10px] bg-slate-900 text-white p-7 sm:p-9 flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex-1 flex flex-col gap-2">
              <h2 className="font-display font-bold text-[34px] leading-none">{guide.cta.title}</h2>
              <p className="text-base text-slate-300 leading-relaxed">{guide.cta.text}</p>
            </div>
            <button
              onClick={() => onNavigate(guide.cta.tab)}
              className="self-start sm:self-auto inline-flex items-center gap-2 px-6 py-3.5 bg-sign hover:bg-amber-300 text-slate-900 font-semibold text-base rounded-md cursor-pointer min-h-[48px]"
            >
              {guide.cta.button}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};
