import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/usePageTitle";

/** Page title row: a clear heading, one line of context, and the page's main actions. */
export default function PageHeader({ title, text, actions, narrow = false }) {
  usePageTitle(typeof title === "string" ? title : null);
  return (
    <header className={cn("mx-auto flex flex-col gap-4 px-4 pt-6 sm:flex-row sm:items-end md:pt-10", narrow ? "max-w-2xl" : "max-w-5xl")}>
      <div className="min-w-0 sm:flex-1">
        <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight md:text-[2rem]">{title}</h1>
        {text && <p className="mt-1.5 max-w-xl text-[15px] text-muted-foreground">{text}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
