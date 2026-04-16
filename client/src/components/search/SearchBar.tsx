// ABOUTME: City search input with 300ms debounced autocomplete dropdown from /search/cities.
// ABOUTME: Editorial Noir: --ink-2 field, --amber focus ring, 0-radius, amber Search button.

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { searchService, type CityResult } from '@/services/searchService';

interface SearchBarProps {
  onSearch: (city: string) => void;
  isLoading?: boolean;
}

export function SearchBar({ onSearch, isLoading = false }: SearchBarProps) {
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<CityResult[]>([]);
  const [open, setOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setFetching(true);
    try {
      const results = await searchService.getCities(q);
      setSuggestions(results);
      setOpen(results.length > 0);
    } catch {
      setSuggestions([]);
      setOpen(false);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchSuggestions(value), 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, fetchSuggestions]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  function selectSuggestion(city: CityResult) {
    const label = city.city;
    setValue(label);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      const s = suggestions[activeIndex];
      if (s) selectSuggestion(s);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOpen(false);
    onSearch(value.trim());
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="flex gap-0">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => { setValue(e.target.value); setActiveIndex(-1); }}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
            placeholder="City"
            autoComplete="off"
            aria-label="Search by city"
            aria-expanded={open}
            aria-autocomplete="list"
            role="combobox"
            style={{
              background: 'var(--ink-2)',
              border: '1px solid var(--line)',
              borderRight: 'none',
              borderRadius: 0,
              color: 'var(--paper)',
              padding: '14px 16px',
              width: '100%',
              fontSize: 15,
              fontFamily: 'var(--font-body)',
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocusCapture={(e) => {
              (e.target as HTMLInputElement).style.borderColor = 'var(--amber)';
            }}
            onBlurCapture={(e) => {
              (e.target as HTMLInputElement).style.borderColor = 'var(--line)';
            }}
          />
          {fetching && (
            <div
              aria-hidden
              style={{
                position: 'absolute',
                right: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 14,
                height: 14,
                border: '1.5px solid var(--paper-muted)',
                borderTopColor: 'var(--amber)',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }}
            />
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            background: 'var(--amber)',
            color: 'var(--ink-0)',
            border: 'none',
            borderRadius: 2,
            padding: '14px 28px',
            fontSize: 13,
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: isLoading ? 'wait' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            transition: 'opacity 0.15s',
            flexShrink: 0,
          }}
          aria-label="Search creators"
        >
          {isLoading ? 'Searching' : 'Search'}
        </button>
      </form>

      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--ink-1)',
            border: '1px solid var(--line)',
            borderTop: 'none',
            borderRadius: 0,
            margin: 0,
            padding: 0,
            listStyle: 'none',
            zIndex: 50,
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.city}-${s.state}-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={() => selectSuggestion(s)}
              onMouseEnter={() => setActiveIndex(i)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                borderBottom: i < suggestions.length - 1 ? '1px solid var(--line-subtle)' : 'none',
                background: i === activeIndex ? 'var(--ink-2)' : 'transparent',
                transition: 'background 0.1s',
              }}
            >
              <span style={{ color: 'var(--paper)', fontSize: 14 }}>{s.city}</span>
              {(s.state || s.country) && (
                <span style={{ color: 'var(--paper-muted)', fontSize: 12, marginLeft: 8 }}>
                  {[s.state, s.country].filter(Boolean).join(', ')}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <style>{`@keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }`}</style>
    </div>
  );
}
