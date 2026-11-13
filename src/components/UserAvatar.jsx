import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initials, safeUrl } from "@/lib/utils";

const SIZES = { xs: "h-7 w-7 text-[10px]", sm: "h-9 w-9 text-xs", md: "h-11 w-11 text-sm", lg: "h-16 w-16 text-lg", xl: "h-24 w-24 text-2xl" };

export default function UserAvatar({ profile, size = "sm", className }) {
  const name = profile?.full_name || profile?.username || "";
  return (
    <Avatar className={cn(SIZES[size], "ring-1 ring-border", className)}>
      {safeUrl(profile?.avatar_url) && <AvatarImage src={safeUrl(profile.avatar_url)} alt="" />}
      <AvatarFallback className="bg-secondary font-semibold text-secondary-foreground">{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
