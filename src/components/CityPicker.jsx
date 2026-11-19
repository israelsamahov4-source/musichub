import { useId, useRef, useState } from "react";
import { MapPin, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { canonicalCity, suggestPlaces } from "@/lib/cities";
import { cn } from "@/lib/utils";
import { tr } from "@/lib/i18n";

/**
 * A text box that suggests cities as you type (an accessible combobox).
 * Picking a suggestion, or typing a known name or nickname ("תא"), stores the city's one spelling.
 * Other text is kept as typed. With `regions`, whole regions are offered too (for search filters).
 * Extra props (id, aria-*) reach the input, so <Field> can link its label and errors.
 */
export default function CityPicker({ value, onChange, regions = false, placeholder = tr("התחילו להקליד עיר"), className, ...inputProps }) {
  const listId = useId();
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const options = open ? suggestPlaces(value, { regions }) : [];
  const shown = options.length > 0 && !(options.length === 1 && options[0].name === value);

  const pick = (name) => { onChange(name); setOpen(false); setActive(-1); };
  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, options.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && shown && active >= 0) { e.preventDefault(); pick(options[active].name); }
    else if (e.key === "Escape" && shown) { e.preventDefault(); setOpen(false); }
  };

  return (
    <div className={cn("relative", className)}>
      <MapPin className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        {...inputProps}
        ref={inputRef}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={shown}
        aria-controls={listId}
        aria-activedescendant={shown && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={value}
        maxLength={100}
        placeholder={placeholder}
        className={cn("ps-9", value && "pe-10")}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onBlur={() => { setOpen(false); const c = canonicalCity(value); if (c && c !== value) onChange(c); }}
        onKeyDown={onKeyDown}
      />
      {value && (
        <button type="button" aria-label={tr("ניקוי העיר")} onClick={() => { onChange(""); inputRef.current?.focus(); }}
          className="absolute end-0 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
      <ul id={listId} role="listbox" hidden={!shown}
        className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-64 overflow-auto rounded-xl border bg-popover p-1.5 shadow-pop">
        {shown && options.map((o, i) => (
          <li key={o.name} id={`${listId}-${i}`} role="option" aria-selected={i === active}
            onMouseDown={(e) => e.preventDefault()} onClick={() => pick(o.name)}
            className={cn("flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-md px-3 text-sm", i === active ? "bg-accent" : "hover:bg-accent")}>
            <span className={cn(!o.region && "font-semibold")}>{o.region ? o.name : tr("כל {0}", o.name)}</span>
            <span className="text-xs text-muted-foreground">{o.region || tr("אזור")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
