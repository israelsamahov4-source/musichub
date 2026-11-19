import { Loader2 } from "lucide-react";
import { tr } from "@/lib/i18n";

export default function PageLoader({ label = tr("טוען…") }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
      <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}
