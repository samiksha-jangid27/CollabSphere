// ABOUTME: Editorial Noir location autocomplete — debounced Nominatim search with dropdown selection.
// ABOUTME: Emits GeoJSON Point + city/state/country through onChange. Single field, no manual coords.

"use client";

import { useEffect, useRef, useState } from "react";
import { geocodeService, type GeocodeResult } from "@/services/geocodeService";
import type { GeoLocation } from "@/types/profile";

interface LocationSearchProps {
  value?: GeoLocation;
  onChange: (next: GeoLocation | undefined) => void;
}

type DropdownState =
  | { kind: "hidden" }
  | { kind: "loading" }
  | { kind: "results"; items: GeocodeResult[] }
  | { kind: "empty" }
  | { kind: "error" };

function formatInitial(value?: GeoLocation): string {
  if (!value) return "";
  return [value.city, value.state, value.country].filter(Boolean).join(", ");
}

export function LocationSearch({ value, onChange }: LocationSearchProps) {
  const [inputText, setInputText] = useState(formatInitial(value));
  const [dropdown, setDropdown] = useState<DropdownState>({ kind: "hidden" });
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [focused, setFocused] = useState(false);
  const [hasSelection, setHasSelection] = useState(Boolean(value));

  const containerRef = useRef<HTMLDivElement>(null);
  const requestToken = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (hasSelection) return;
    if (inputText.trim().length < 2) {
      setDropdown({ kind: "hidden" });
      return;
    }

    const token = ++requestToken.current;
    setDropdown({ kind: "loading" });

    debounceTimer.current = setTimeout(() => {
      geocodeService
        .search(inputText.trim())
        .then((items) => {
          if (token !== requestToken.current) return;
          if (items.length === 0) setDropdown({ kind: "empty" });
          else setDropdown({ kind: "results", items });
        })
        .catch(() => {
          if (token !== requestToken.current) return;
          setDropdown({ kind: "error" });
        });
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [inputText, hasSelection]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectResult(result: GeocodeResult) {
    const next: GeoLocation = {
      type: "Point",
      coordinates: [result.lng, result.lat],
      city: result.city,
      state: result.state,
      country: result.country,
    };
    setInputText(result.displayName);
    setHasSelection(true);
    setIsOpen(false);
    setActiveIndex(-1);
    setDropdown({ kind: "hidden" });
    onChange(next);
  }

  function clearSelection() {
    setInputText("");
    setHasSelection(false);
    setIsOpen(false);
    setActiveIndex(-1);
    setDropdown({ kind: "hidden" });
    onChange(undefined);
  }

  function handleInputChange(next: string) {
    setInputText(next);
    if (hasSelection) {
      setHasSelection(false);
      onChange(undefined);
    }
    setIsOpen(true);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (dropdown.kind !== "results") {
      if (e.key === "Escape") setIsOpen(false);
      return;
    }
    const items = dropdown.items;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = activeIndex >= 0 ? items[activeIndex] : items[0];
      if (pick) selectResult(pick);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  const showDropdown = isOpen && focused && dropdown.kind !== "hidden";

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={inputText}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            setFocused(true);
            setIsOpen(true);
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Search for a city"
          className="type-body-l text-paper block w-full bg-transparent py-2 pr-8 outline-none placeholder:text-paper-muted"
          style={{
            borderBottom: `1px solid ${focused ? "var(--amber)" : "var(--line)"}`,
            transition: "border-color 150ms linear",
          }}
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls="location-search-listbox"
        />
        {hasSelection && (
          <button
            type="button"
            onClick={clearSelection}
            aria-label="Clear location"
            className="type-eyebrow text-paper-muted hover:text-paper"
            style={{
              position: "absolute",
              right: 0,
              top: "50%",
              transform: "translateY(-50%)",
              padding: "4px 6px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              transition: "color 150ms linear",
            }}
          >
            ×
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          id="location-search-listbox"
          role="listbox"
          className="absolute left-0 right-0 z-50"
          style={{
            top: "calc(100% + 4px)",
            background: "var(--ink-1)",
            border: "1px solid var(--line)",
          }}
        >
          {dropdown.kind === "loading" && (
            <div className="type-body-s text-paper-muted" style={{ padding: "10px 14px" }}>
              Searching
            </div>
          )}
          {dropdown.kind === "empty" && (
            <div className="type-body-s text-paper-muted" style={{ padding: "10px 14px" }}>
              No matches
            </div>
          )}
          {dropdown.kind === "error" && (
            <div className="type-body-s text-paper-muted" style={{ padding: "10px 14px" }}>
              Search unavailable
            </div>
          )}
          {dropdown.kind === "results" &&
            dropdown.items.map((item, idx) => {
              const active = idx === activeIndex;
              return (
                <button
                  key={`${item.displayName}-${idx}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectResult(item);
                  }}
                  className="type-body-m text-paper block w-full text-left"
                  style={{
                    padding: "10px 14px",
                    background: active ? "var(--ink-2)" : "transparent",
                    borderLeft: `2px solid ${active ? "var(--amber)" : "transparent"}`,
                    cursor: "pointer",
                    transition: "background 120ms linear, border-color 120ms linear",
                  }}
                >
                  {item.displayName}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
