import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Toggleable chips for picking several options (accessible as checkboxes).
 * Pass `popular` (a list of values) to show only those, plus anything already picked, behind a "more" chip.
 */
export default function TagPicker({ options, value = [], onChange, max, label, popular }) {
  const [expanded, setExpanded] = useState(false);
  const toggle = (v) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else if (!max || value.length < max) onChange([...value, v]);
  };
  const shown = !popular || expanded ? options : options.filter((o) => popular.includes(o.value) || value.includes(o.value));
  const hidden = options.length - shown.length;
  const full = Boolean(max) && value.length >= max;
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {shown.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            role="checkbox"
            aria-checked={on}
            aria-disabled={!on && full}
            onClick={() => toggle(o.value)}
            className={cn(
              "inline-flex min-h-9 items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors",
              on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent",
              !on && full && "opacity-50",
            )}
          >
            {on && <Check className="h-3.5 w-3.5" aria-hidden />}
            {o.label}
          </button>
        );
      })}
      {hidden > 0 && (
        <button type="button" onClick={() => setExpanded(true)}
          className="inline-flex min-h-9 items-center gap-1 rounded-full border border-dashed border-ink/40 px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Plus className="h-3.5 w-3.5" aria-hidden />עוד {hidden}
        </button>
      )}
    </div>
  );
}
