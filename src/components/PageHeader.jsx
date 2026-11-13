import { cn } from "@/lib/utils";

/** Poster-style page header: a big overprinted title on a band of paper or riso blue. */
export default function PageHeader({ title, text, actions, tone = "paper", narrow = false }) {
  const blue = tone === "blue";
  return (
    <header className={cn("grain border-b-2 border-ink", blue && "bg-riso-blue text-white")}>
      <div className={cn("mx-auto flex flex-wrap items-end gap-4 px-4 pb-6 pt-8 md:pb-8 md:pt-12", narrow ? "max-w-2xl" : "max-w-5xl")}>
        <div className="min-w-0 flex-1">
          <h1 className={cn("font-display text-6xl font-bold leading-[0.85] md:text-7xl", blue ? "riso-on-blue" : "riso")}>{title}</h1>
          {text && <p className={cn("mt-3 max-w-xl text-[1.05rem]", blue ? "text-white/80" : "text-muted-foreground")}>{text}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}
