// ABOUTME: Niche and platform filter dropdowns; calls onFilter on every change, Clear resets both.
// ABOUTME: Editorial Noir: --ink-1 background, 0-radius selects, --line border, --paper-dim labels.

'use client';

import { useState } from 'react';

const NICHES = [
  'fashion',
  'tech',
  'lifestyle',
  'fitness',
  'travel',
  'food',
  'entertainment',
  'business',
  'education',
  'other',
] as const;

const PLATFORMS = [
  'instagram',
  'tiktok',
  'youtube',
  'twitter',
  'linkedin',
] as const;

interface FilterPanelProps {
  onFilter: (filters: { niche?: string; platform?: string }) => void;
}

const selectStyle: React.CSSProperties = {
  background: 'var(--ink-1)',
  border: '1px solid var(--line)',
  borderRadius: 0,
  color: 'var(--paper)',
  padding: '10px 36px 10px 14px',
  fontSize: 13,
  fontFamily: 'var(--font-body)',
  letterSpacing: '0.04em',
  appearance: 'none',
  WebkitAppearance: 'none',
  cursor: 'pointer',
  outline: 'none',
  flex: '1 1 0',
  minWidth: 0,
  transition: 'border-color 0.15s',
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2352525B' stroke-width='1.5' stroke-linecap='square'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 14px center',
};

export function FilterPanel({ onFilter }: FilterPanelProps) {
  const [niche, setNiche] = useState('');
  const [platform, setPlatform] = useState('');

  function handleNiche(value: string) {
    setNiche(value);
    onFilter({ niche: value || undefined, platform: platform || undefined });
  }

  function handlePlatform(value: string) {
    setPlatform(value);
    onFilter({ niche: niche || undefined, platform: value || undefined });
  }

  function handleClear() {
    setNiche('');
    setPlatform('');
    onFilter({});
  }

  const hasFilters = niche !== '' || platform !== '';

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ position: 'relative', flex: '1 1 160px', minWidth: 0 }}>
        <label
          htmlFor="filter-niche"
          style={{
            position: 'absolute',
            top: -18,
            left: 0,
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--paper-muted)',
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            pointerEvents: 'none',
          }}
        >
          Niche
        </label>
        <select
          id="filter-niche"
          value={niche}
          onChange={(e) => handleNiche(e.target.value)}
          style={selectStyle}
          onFocus={(e) => { (e.target as HTMLSelectElement).style.borderColor = 'var(--amber)'; }}
          onBlur={(e) => { (e.target as HTMLSelectElement).style.borderColor = 'var(--line)'; }}
        >
          <option value="">All niches</option>
          {NICHES.map((n) => (
            <option key={n} value={n}>
              {n.charAt(0).toUpperCase() + n.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div style={{ position: 'relative', flex: '1 1 160px', minWidth: 0 }}>
        <label
          htmlFor="filter-platform"
          style={{
            position: 'absolute',
            top: -18,
            left: 0,
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--paper-muted)',
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            pointerEvents: 'none',
          }}
        >
          Platform
        </label>
        <select
          id="filter-platform"
          value={platform}
          onChange={(e) => handlePlatform(e.target.value)}
          style={selectStyle}
          onFocus={(e) => { (e.target as HTMLSelectElement).style.borderColor = 'var(--amber)'; }}
          onBlur={(e) => { (e.target as HTMLSelectElement).style.borderColor = 'var(--line)'; }}
        >
          <option value="">All platforms</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={handleClear}
          style={{
            background: 'transparent',
            border: '1px solid var(--line)',
            borderRadius: 2,
            color: 'var(--paper-dim)',
            padding: '10px 16px',
            fontSize: 12,
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.borderColor = 'var(--line-strong)';
            (e.target as HTMLButtonElement).style.color = 'var(--paper)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.borderColor = 'var(--line)';
            (e.target as HTMLButtonElement).style.color = 'var(--paper-dim)';
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}
