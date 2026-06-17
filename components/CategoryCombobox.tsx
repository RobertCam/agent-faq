'use client';

import { useMemo, useState } from 'react';
import { GOOGLE_PRIMARY_CATEGORIES } from '@/lib/google-categories';

interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function CategoryCombobox({ value, onChange, disabled }: CategoryComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isKnown = GOOGLE_PRIMARY_CATEGORIES.includes(value as (typeof GOOGLE_PRIMARY_CATEGORIES)[number]);
  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    const list = q
      ? GOOGLE_PRIMARY_CATEGORIES.filter((c) => c.toLowerCase().includes(q))
      : GOOGLE_PRIMARY_CATEGORIES;
    return list.slice(0, 40);
  }, [value]);

  return (
    <div>
      <div className="flex gap-2">
        <input
          id="category"
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search or select a Google primary category..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          disabled={disabled}
          autoComplete="off"
          list="category-suggestions"
        />
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          disabled={disabled}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {isOpen ? 'Hide' : 'Browse'}
        </button>
      </div>
      <datalist id="category-suggestions">
        {GOOGLE_PRIMARY_CATEGORIES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      {isOpen && suggestions.length > 0 && (
        <ul className="mt-2 border border-gray-200 rounded-lg divide-y max-h-56 overflow-y-auto bg-white shadow-sm">
          {suggestions.map((c) => (
            <li key={c}>
              <button
                type="button"
                onClick={() => {
                  onChange(c);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50"
                disabled={disabled}
              >
                {c}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-xs">
        <span className="text-gray-500">Category in use: </span>
        <span className={`font-medium ${isKnown ? 'text-green-700' : 'text-amber-700'}`}>
          {value || '(none)'}
        </span>
        {!isKnown && value && (
          <span className="text-amber-600 ml-1">— pick from suggestions for best results</span>
        )}
      </p>
    </div>
  );
}
