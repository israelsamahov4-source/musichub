import { Globe } from "lucide-react";
import { LANG, setLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Switches between Hebrew and English. Each option is written in its own language. */
export default function LanguageSwitch({ className }) {
  const other = LANG === "en" ? "he" : "en";
  return (
    <button type="button" onClick={() => setLang(other)} lang={other}
      className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", className)}>
      <Globe className="h-4 w-4" aria-hidden />{other === "en" ? "English" : "עברית"}
    </button>
  );
}
