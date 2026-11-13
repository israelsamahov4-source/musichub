import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase, unwrap } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { errorMessage } from "@/lib/utils";

export default function FollowButton({ profileId, size = "sm" }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["follows", user?.id, profileId];
  const { data: following = false } = useQuery({
    queryKey: key,
    enabled: Boolean(user && profileId),
    queryFn: async () =>
      (unwrap(await supabase.from("follows").select("following_id").eq("follower_id", user.id).eq("following_id", profileId))).length > 0,
  });
  const mutation = useMutation({
    mutationFn: async () => {
      if (following) unwrap(await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profileId));
      else unwrap(await supabase.from("follows").insert({ follower_id: user.id, following_id: profileId }));
    },
    onMutate: () => qc.setQueryData(key, !following),
    onError: (e) => { qc.setQueryData(key, following); toast.error(errorMessage(e)); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["profile-stats", profileId] }),
  });
  if (!user || user.id === profileId) return null;
  return (
    <Button size={size} variant={following ? "outline" : "default"} onClick={() => mutation.mutate()} disabled={mutation.isPending}>
      {following ? <UserCheck className="h-4 w-4" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />}
      {following ? "עוקב/ת" : "מעקב"}
    </Button>
  );
}
