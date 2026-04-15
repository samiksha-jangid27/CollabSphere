// ABOUTME: Multi-select niche picker as sharp-cornered Editorial Noir pills, max 5 selections.
// ABOUTME: Selected pills invert to cream fill with ink text, no icons, no checkmarks.

"use client";

interface NicheSelectorProps {
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
}

const ALL_NICHES = [
  "fashion",
  "beauty",
  "travel",
  "food",
  "fitness",
  "gaming",
  "tech",
  "finance",
  "education",
  "lifestyle",
  "music",
  "art",
  "photography",
  "comedy",
  "parenting",
  "sports",
  "business",
];

export function NicheSelector({ value, onChange, max = 5 }: NicheSelectorProps) {
  const selected = new Set(value);
  const atCap = selected.size >= max;

  function toggle(niche: string) {
    if (selected.has(niche)) {
      onChange(value.filter((n) => n !== niche));
      return;
    }
    if (atCap) return;
    onChange([...value, niche]);
  }

  return (
    <div>
      <ul className="flex flex-wrap gap-3" role="list">
        {ALL_NICHES.map((niche) => {
          const isSelected = selected.has(niche);
          const isDisabled = !isSelected && atCap;

          const style: React.CSSProperties = {
            padding: "6px 12px",
            border: "1px solid",
            borderColor: isSelected ? "var(--paper)" : "var(--line)",
            background: isSelected ? "var(--paper)" : "transparent",
            color: isSelected ? "var(--ink-0)" : "var(--paper)",
            letterSpacing: "0.08em",
            cursor: isDisabled ? "not-allowed" : "pointer",
            opacity: isDisabled ? 0.4 : 1,
            transition: "border-color 150ms linear, color 150ms linear, background-color 150ms linear",
          };

          return (
            <li key={niche}>
              <button
                type="button"
                onClick={() => toggle(niche)}
                disabled={isDisabled}
                aria-pressed={isSelected}
                className="type-eyebrow inline-block"
                style={style}
                onMouseEnter={(e) => {
                  if (isSelected || isDisabled) return;
                  e.currentTarget.style.borderColor = "var(--paper)";
                }}
                onMouseLeave={(e) => {
                  if (isSelected || isDisabled) return;
                  e.currentTarget.style.borderColor = "var(--line)";
                }}
              >
                {niche}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 type-body-s text-paper-muted">
        {selected.size} of {max} selected.
      </p>
    </div>
  );
}
