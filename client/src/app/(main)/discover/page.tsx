// ABOUTME: Sprint 3 discover page — orchestrates SearchBar, FilterPanel, and ProfileGrid.
// ABOUTME: Discriminated union page state; Editorial Noir layout with Fraunces headline and numbered eyebrow.

'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { SearchBar } from '@/components/search/SearchBar';
import { FilterPanel } from '@/components/search/FilterPanel';
import { ProfileGrid } from '@/components/search/ProfileGrid';
import { useSearch } from '@/hooks/useSearch';
import { staggerContainer, fadeUp } from '@/lib/motion';

type PageState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'error'; message: string };

export default function DiscoverPage() {
  const { results, loading, error, search } = useSearch();
  const [hasSearched, setHasSearched] = useState(false);
  const [city, setCity] = useState('');
  const [filters, setFilters] = useState<{ niche?: string; platform?: string }>({});

  const pageState: PageState = (() => {
    if (loading) return { kind: 'loading' };
    if (error) return { kind: 'error', message: error };
    if (hasSearched) return { kind: 'ready' };
    return { kind: 'idle' };
  })();

  const handleSearch = useCallback(
    (searchCity: string) => {
      setCity(searchCity);
      setHasSearched(true);
      search({ city: searchCity || undefined, ...filters });
    },
    [filters, search]
  );

  const handleFilter = useCallback(
    (newFilters: { niche?: string; platform?: string }) => {
      setFilters(newFilters);
      // Re-run search if already searched
      if (hasSearched) {
        search({ city: city || undefined, ...newFilters });
      }
    },
    [city, hasSearched, search]
  );

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px 96px' }}
    >
      {/* Eyebrow + Headline */}
      <motion.div variants={fadeUp} style={{ marginBottom: 48 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
            color: 'var(--paper-muted)',
            marginBottom: 16,
            display: 'flex',
            gap: 8,
          }}
        >
          <span style={{ color: 'var(--paper-muted)' }}>01 /</span>
          <span style={{ color: 'var(--paper)' }}>Discover</span>
        </div>
        <h1
          className="type-display-m"
          style={{ color: 'var(--paper)', margin: 0 }}
        >
          Find creators
        </h1>
        <p
          style={{
            marginTop: 12,
            fontSize: 15,
            color: 'var(--paper-dim)',
            fontFamily: 'var(--font-body)',
            maxWidth: 480,
          }}
        >
          Search by city, niche, and platform to find the right collaborators.
        </p>
      </motion.div>

      {/* Search controls */}
      <motion.div
        variants={fadeUp}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
          marginBottom: 48,
        }}
      >
        <SearchBar onSearch={handleSearch} isLoading={loading} />

        <div style={{ paddingTop: 20 }}>
          <FilterPanel onFilter={handleFilter} />
        </div>
      </motion.div>

      <hr
        style={{
          border: 'none',
          borderTop: '1px solid var(--line)',
          marginBottom: 32,
        }}
      />

      {/* Results area */}
      {pageState.kind === 'idle' && (
        <motion.div variants={fadeUp}>
          <p
            style={{
              fontSize: 14,
              color: 'var(--paper-muted)',
              fontFamily: 'var(--font-body)',
            }}
          >
            Enter a city and hit Search to discover creators.
          </p>
        </motion.div>
      )}

      {pageState.kind === 'error' && (
        <motion.div
          variants={fadeUp}
          style={{
            padding: '16px 20px',
            border: '1px solid var(--rust)',
            borderRadius: 0,
            color: 'var(--rust)',
            fontSize: 14,
            fontFamily: 'var(--font-body)',
          }}
        >
          {pageState.message}
        </motion.div>
      )}

      {(pageState.kind === 'loading' || pageState.kind === 'ready') && (
        <motion.div variants={fadeUp}>
          {pageState.kind === 'ready' && results.length > 0 && (
            <div
              style={{
                marginBottom: 20,
                fontSize: 12,
                color: 'var(--paper-muted)',
                fontFamily: 'var(--font-body)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              {results.length} {results.length === 1 ? 'creator' : 'creators'} found
            </div>
          )}
          <ProfileGrid profiles={results} isLoading={loading} />
        </motion.div>
      )}
    </motion.div>
  );
}
