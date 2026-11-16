import React, { useId, useMemo, useRef, useState } from 'react';
import { Building2, Hash, Home, MapPin, X } from 'lucide-react';
import { suggestPlaces, type PlaceSuggestion, type SearchableListing } from '../lib/placeSearch';

const ICONS = {
  province: MapPin,
  city: Building2,
  neighbourhood: Home,
  postal: Hash,
} as const;

/**
 * The home search box with suggestions as you type (cities, provinces by name or "BC"/"ON",
 * neighbourhoods and postal areas, with how many homes are for sale in each). Arrow keys, Enter
 * and Escape work as people expect.
 */
export const SearchBox: React.FC<{
  value: string;
  onChange: (v: string) => void;
  /** Enter or the Search button, with nothing picked */
  onSubmit: (v: string) => void;
  /** A suggestion was picked */
  onPick: (s: PlaceSuggestion) => void;
  listings: SearchableListing[];
  size?: 'large' | 'normal';
  placeholder?: string;
}> = ({ value, onChange, onSubmit, onPick, listings, size = 'normal', placeholder = 'City, province or postal code' }) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const suggestions = useMemo(() => suggestPlaces(value, listings), [value, listings]);
  const showList = open && suggestions.length > 0;
  const large = size === 'large';

  const pick = (s: PlaceSuggestion) => {
    setOpen(false);
    setActive(-1);
    onPick(s);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && suggestions.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp' && suggestions.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (showList && active >= 0) pick(suggestions[active]);
      else {
        setOpen(false);
        onSubmit(value);
      }
    }
  };

  return (
    <form
      role="search"
      aria-label="Search homes"
      onSubmit={(e) => {
        e.preventDefault();
        setOpen(false);
        onSubmit(value);
      }}
      className={`relative w-full flex items-center bg-white border-[1.5px] border-slate-900 focus-within:ring-2 focus-within:ring-emerald-700 focus-within:ring-offset-2 ${
        large ? 'max-w-[640px] gap-2 p-1.5 sm:p-2 rounded-2xl' : 'max-w-[560px] gap-1.5 p-[5px] rounded-[14px]'
      }`}
    >
      <label className="relative flex-1 min-w-0 flex">
        <span className="sr-only">City, province or postal code</span>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          className={`om-bare flex-1 min-w-0 border-0 bg-transparent text-slate-900 placeholder:text-slate-600 focus:outline-none focus-visible:outline-none ${
            large ? 'h-[52px] px-3 sm:px-3.5 pr-10 text-[17px] sm:text-[19px]' : 'h-11 pl-3 pr-10 text-[17px]'
          }`}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setActive(-1);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className={`absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-600 hover:text-slate-900 cursor-pointer ${
              large ? 'w-11 h-[52px]' : 'w-11 h-11'
            }`}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </label>
      <button
        type="submit"
        className={`flex-none bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer ${
          large ? 'h-[52px] px-5 sm:px-7 rounded-[10px] text-[17px]' : 'h-11 px-5 rounded-[9px] text-[16px]'
        }`}
      >
        Search
      </button>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Suggestions"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 text-left overflow-hidden"
        >
          {suggestions.map((s, i) => {
            const Icon = ICONS[s.kind];
            return (
              <li
                key={`${s.kind}-${s.label}-${s.detail}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
                onMouseEnter={() => setActive(i)}
                className={`flex items-center gap-3 px-4 min-h-[48px] cursor-pointer ${i === active ? 'bg-slate-100' : ''}`}
              >
                <Icon className="w-4 h-4 text-slate-500 flex-none" aria-hidden="true" />
                <span className="flex-1 min-w-0 truncate">
                  <span className="text-[16px] font-semibold text-slate-900">{s.label}</span>
                  <span className="text-[14px] text-slate-500"> · {s.detail}</span>
                </span>
                <span className={`flex-none text-[13px] tabular-nums ${s.count ? 'text-emerald-800 font-semibold' : 'text-slate-400'}`}>
                  {s.count ? `${s.count} ${s.count === 1 ? 'home' : 'homes'}` : 'No homes yet'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </form>
  );
};
