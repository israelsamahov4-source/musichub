import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initials, safeUrl } from "@/lib/utils";

const SIZES = { xs: "h-7 w-7 text-[10px]", sm: "h-10 w-10 text-xs", md: "h-12 w-12 text-sm", lg: "h-16 w-16 text-lg", xl: "h-28 w-28 text-3xl", "2xl": "h-32 w-32 text-4xl" };
// People without a photo get a soft tint of one brand colour, always the same one for the same person.
const INKS = ["bg-[#E5E9FB] text-riso-blue", "bg-[#FFE3EB] text-[#B01E4C]", "bg-[#FFF2C2] text-[#6E5200]"];
const indexFor = (key = "") => [...key].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % INKS.length;
const inkFor = (key = "") => INKS[indexFor(key)];
/** The brand colour that goes with a person (matches their avatar tint), for covers and accents. */
export const brandFor = (key = "") => ["#2F45C2", "#4357D0", "#24369E"][indexFor(key)];

export default function UserAvatar({ profile, size = "sm", className }) {
  const name = profile?.full_name || profile?.username || "";
  return (
    <Avatar className={cn(SIZES[size], className)}>
      {safeUrl(profile?.avatar_url) && <AvatarImage src={safeUrl(profile.avatar_url)} alt="" className="object-cover" />}
      <AvatarFallback className={cn("font-sans font-bold", inkFor(profile?.id || name))}>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
