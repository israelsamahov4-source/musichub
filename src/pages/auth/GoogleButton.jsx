import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { GOOGLE_AUTH_ENABLED } from "@/lib/config";
import { errorMessage } from "@/lib/utils";
import { safeNext } from "@/auth/guards";

export default function GoogleButton() {
  if (!GOOGLE_AUTH_ENABLED) return null;
  const go = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${safeNext()}` },
    });
    if (error) toast.error(errorMessage(error));
  };
  return (
    <>
      <Button type="button" variant="outline" className="w-full" onClick={go}>
        <svg viewBox="0 0 24 24" aria-hidden><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z"/></svg>
        המשך עם Google
      </Button>
      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />או<div className="h-px flex-1 bg-border" /></div>
    </>
  );
}
