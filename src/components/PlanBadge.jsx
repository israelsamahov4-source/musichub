import { Crown, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PlanBadge({ tier, className }) {
  if (!tier || tier === "free") return null;
  const premium = tier === "premium";
  const Icon = premium ? Crown : Star;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        premium ? "bg-ink text-riso-yellow" : "bg-[#FFF2C2] text-[#6E5200]",
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {premium ? "Premium" : "Pro"}
    </span>
  );
}
