import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/EmptyState";
import { tr } from "@/lib/i18n";

/** Shown when loading failed (network, server), so a failure is never mistaken for "nothing here". */
export default function LoadError({ onRetry }) {
  return (
    <EmptyState icon={WifiOff} title={tr("משהו לא נטען")} text={tr("בדקו את החיבור לאינטרנט ונסו שוב.")}
      action={onRetry && <Button onClick={() => onRetry()}>{tr("לנסות שוב")}</Button>} />
  );
}
