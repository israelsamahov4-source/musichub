import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initials, safeUrl } from "@/lib/utils";

const SIZES = { xs: "h-7 w-7 text-[10px]", sm: "h-9 w-9 text-xs", md: "h-11 w-11 text-sm", lg: "h-16 w-16 text-lg", xl: "h-24 w-24 text-3xl" };
// People without a photo get one of the three print inks, always the same one for the same person.
const INKS = ["bg-riso-blue text-white", "bg-riso-pink text-ink", "bg-riso-yellow text-ink"];
const inkFor = (key = "") => INKS[[...key].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % INKS.length];

export default function UserAvatar({ profile, size = "sm", className }) {
  const name = profile?.full_name || profile?.username || "";
  return (
    <Avatar className={cn(SIZES[size], "ring-1 ring-ink/20", className)}>
      {safeUrl(profile?.avatar_url) && <AvatarImage src={safeUrl(profile.avatar_url)} alt="" className="object-cover" />}
      <AvatarFallback className={cn("font-display font-bold tracking-wide", inkFor(profile?.id || name))}>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
