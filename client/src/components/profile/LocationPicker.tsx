// ABOUTME: Swiss-style location input set — city, state, country, and "lat, lng" coordinate field.
// ABOUTME: Bottom-rule only inputs, parses coordinates on blur, silently keeps last valid value.

"use client";

import { useState } from "react";
import type { GeoLocation } from "@/types/profile";

interface LocationPickerProps {
  value?: GeoLocation;
  onChange: (next: GeoLocation | undefined) => void;
}

function formatCoords(coords: [number, number] | null | undefined): string {
  if (!coords) return "";
  const [lng, lat] = coords;
  if (typeof lng !== "number" || typeof lat !== "number") return "";
  if (Number.isNaN(lng) || Number.isNaN(lat)) return "";
  return `${lat}, ${lng}`;
}

function parseCoords(raw: string): [number, number] | null {
  const parts = raw.split(",").map((p) => p.trim());
  if (parts.length !== 2) return null;
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90) return null;
  if (lng < -180 || lng > 180) return null;
  return [lng, lat];
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [city, setCity] = useState(value?.city ?? "");
  const [state, setState] = useState(value?.state ?? "");
  const [country, setCountry] = useState(value?.country ?? "");
  const initialCoords: [number, number] | null = value?.coordinates ?? null;
  const [coords, setCoords] = useState<[number, number] | null>(initialCoords);
  const [coordsInput, setCoordsInput] = useState(formatCoords(initialCoords));

  function emit(next: {
    city: string;
    state: string;
    country: string;
    coords: [number, number] | null;
  }) {
    if (!next.coords) {
      onChange(undefined);
      return;
    }

    const [lng, lat] = next.coords;
    const coordsValid =
      typeof lng === "number" &&
      typeof lat === "number" &&
      Number.isFinite(lng) &&
      Number.isFinite(lat) &&
      lng >= -180 &&
      lng <= 180 &&
      lat >= -90 &&
      lat <= 90;

    if (!coordsValid) {
      onChange(undefined);
      return;
    }

    const geo: GeoLocation = {
      type: "Point",
      coordinates: [lng, lat],
      city: next.city.trim() || undefined,
      state: next.state.trim() || undefined,
      country: next.country.trim() || undefined,
    };
    onChange(geo);
  }

  function handleCoordsBlur() {
    if (coordsInput.trim() === "") {
      setCoords(null);
      emit({ city, state, country, coords: null });
      return;
    }
    const parsed = parseCoords(coordsInput);
    if (parsed) {
      setCoords(parsed);
      setCoordsInput(`${parsed[1]}, ${parsed[0]}`);
      emit({ city, state, country, coords: parsed });
    } else {
      setCoordsInput(formatCoords(coords));
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
      <Field
        label="City"
        value={city}
        onChange={setCity}
        onBlur={() => emit({ city, state, country, coords })}
        placeholder="mumbai"
      />
      <Field
        label="State"
        value={state}
        onChange={setState}
        onBlur={() => emit({ city, state, country, coords })}
        placeholder="maharashtra"
      />
      <Field
        label="Country"
        value={country}
        onChange={setCountry}
        onBlur={() => emit({ city, state, country, coords })}
        placeholder="india"
      />
      <Field
        label="Coordinates"
        value={coordsInput}
        onChange={setCoordsInput}
        onBlur={handleCoordsBlur}
        placeholder="19.076, 72.877"
        hint="lat, lng, required for location"
      />
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  onBlur: () => void;
  placeholder?: string;
  hint?: string;
}

function Field({ label, value, onChange, onBlur, placeholder, hint }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <label className="block">
      <span className="type-label text-paper-dim block uppercase">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur();
        }}
        placeholder={placeholder}
        className="type-body-l text-paper block w-full bg-transparent py-2 outline-none placeholder:text-paper-muted"
        style={{
          borderBottom: `1px solid ${focused ? "var(--amber)" : "var(--line)"}`,
          transition: "border-color 150ms linear",
        }}
      />
      {hint && (
        <span className="type-body-s text-paper-muted mt-2 block">{hint}</span>
      )}
    </label>
  );
}
