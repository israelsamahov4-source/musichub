import LogoMark from "@/components/LogoMark";
import { cn } from "@/lib/utils";

/** The logo: the equaliser mark plus the name "Jamly" ("ly" in brand blue). */
export default function Wordmark({ className, markClassName = "h-8 w-8" }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark className={markClassName} />
      <span className="ltr text-[1.25rem] font-extrabold tracking-tight text-foreground">Jam<span className="text-primary">ly</span></span>
    </span>
  );
}
