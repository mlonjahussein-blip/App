import React, { useState, useRef, useEffect } from 'react';
import { CountryCodeItem, searchCountries } from '../lib/countriesData.ts';
import { Search, ChevronDown, Check, X } from 'lucide-react';

interface CountryCodeSelectorProps {
  selectedCountry: CountryCodeItem;
  onSelectCountry: (country: CountryCodeItem) => void;
  disabled?: boolean;
}

export const CountryCodeSelector: React.FC<CountryCodeSelectorProps> = ({
  selectedCountry,
  onSelectCountry,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter countries in real-time as user types
  const filteredCountries = searchCountries(searchQuery);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleSelect = (country: CountryCodeItem) => {
    onSelectCountry(country);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative w-36 sm:w-40 shrink-0" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-neutral-950 border border-neutral-800 hover:border-neutral-700 focus:border-emerald-500 rounded-xl px-3 py-3 text-white text-xs font-bold flex items-center justify-between gap-1.5 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
        title="Select Country & Dial Code"
      >
        <span className="flex items-center gap-1.5 overflow-hidden">
          <span className="text-base leading-none shrink-0">{selectedCountry.flag}</span>
          <span className="text-emerald-400 font-mono tracking-tight font-black shrink-0">
            {selectedCountry.dialCode}
          </span>
          <span className="text-neutral-400 text-[10px] truncate hidden xs:inline">
            ({selectedCountry.code})
          </span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-neutral-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-emerald-400' : ''
          }`}
        />
      </button>

      {/* Floating Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 max-w-[90vw] bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in flex flex-col max-h-80">
          {/* Search Header */}
          <div className="p-2.5 bg-neutral-950/90 border-b border-neutral-800 sticky top-0 z-10 backdrop-blur-md">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                  } else if (e.key === 'Enter' && filteredCountries.length > 0) {
                    e.preventDefault();
                    handleSelect(filteredCountries[0]);
                  }
                }}
                placeholder="Search code or country (e.g. +255, 1, TZ, Nigeria)..."
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-emerald-500 rounded-xl pl-8.5 pr-8 py-2 text-xs text-white placeholder:text-neutral-500 outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white p-0.5 rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between px-1 pt-1.5 text-[10px] text-neutral-500 font-medium">
              <span>{filteredCountries.length} countries found</span>
              <span>Press Enter to select top match</span>
            </div>
          </div>

          {/* Scrollable Countries List */}
          <div className="overflow-y-auto flex-1 divide-y divide-neutral-800/40 p-1">
            {filteredCountries.length === 0 ? (
              <div className="p-4 text-center text-xs text-neutral-400 space-y-1">
                <p className="font-semibold text-neutral-300">No country found</p>
                <p className="text-[11px] text-neutral-500">
                  Try typing the country name (e.g. "Tanzania") or code (e.g. "+255", "254").
                </p>
              </div>
            ) : (
              filteredCountries.map((c) => {
                const isSelected = c.code === selectedCountry.code && c.dialCode === selectedCountry.dialCode;
                return (
                  <button
                    key={`${c.code}-${c.dialCode}`}
                    type="button"
                    onClick={() => handleSelect(c)}
                    className={`w-full px-3 py-2 text-left rounded-xl flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer group ${
                      isSelected
                        ? 'bg-emerald-500/15 text-white font-bold'
                        : 'hover:bg-neutral-800 text-neutral-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg leading-none shrink-0">{c.flag}</span>
                      <span className="font-mono text-emerald-400 font-bold shrink-0 text-xs">
                        {c.dialCode}
                      </span>
                      <span className="truncate font-medium group-hover:text-white">
                        {c.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800/80 text-neutral-400 font-bold border border-neutral-700/50">
                        {c.code}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
