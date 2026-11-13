import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import UserAvatar from "@/components/UserAvatar";
import FollowButton from "@/components/FollowButton";
import { supabase, unwrap } from "@/lib/supabase";
import { fetchFollowingIds } from "@/api/posts";
import { useAuth } from "@/auth/AuthProvider";
import { label } from "@/lib/config";

/** Musicians who share a genre or instrument with me and whom I don't follow yet. */
export default function SuggestedMusicians() {
  const { user, profile } = useAuth();
  const { data = [] } = useQuery({
    queryKey: ["suggestions", user?.id],
    enabled: Boolean(profile),
    queryFn: async () => {
      const following = await fetchFollowingIds(user.id);
      const exclude = [user.id, ...following];
      let q = supabase.from("profiles").select("id, username, full_name, avatar_url, instruments, genres, location")
        .eq("onboarding_completed", true).not("id", "in", `(${exclude.join(",")})`).limit(5);
      const interests = [...(profile.genres || [])];
      if (interests.length) q = q.overlaps("genres", interests);
      let rows = unwrap(await q.order("created_at", { ascending: false }));
      if (rows.length < 3) {
        rows = unwrap(await supabase.from("profiles").select("id, username, full_name, avatar_url, instruments, genres, location")
          .eq("onboarding_completed", true).not("id", "in", `(${exclude.join(",")})`).order("created_at", { ascending: false }).limit(5));
      }
      return rows;
    },
  });
  if (!data.length) return null;
  return (
    <Card className="p-4">
      <h2 className="mb-3 font-semibold">מוזיקאים שכדאי להכיר</h2>
      <ul className="space-y-3">
        {data.map((p) => (
          <li key={p.id} className="flex items-center gap-2">
            <Link to={`/u/${p.username}`}><UserAvatar profile={p} /></Link>
            <div className="min-w-0 flex-1">
              <Link to={`/u/${p.username}`} className="block truncate text-sm font-semibold hover:underline">{p.full_name || p.username}</Link>
              <p className="truncate text-xs text-muted-foreground">{p.instruments.slice(0, 2).map((i) => label("instruments", i)).join(", ") || p.location}</p>
            </div>
            <FollowButton profileId={p.id} />
          </li>
        ))}
      </ul>
      <Link to="/discover" className="mt-3 block text-sm text-primary hover:underline">לכל המוזיקאים</Link>
    </Card>
  );
}
