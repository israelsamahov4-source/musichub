import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/EmptyState";

/** Shown when loading failed (network, server), so a failure is never mistaken for "nothing here". */
export default function LoadError({ onRetry }) {
  return (
    <EmptyState icon={WifiOff} title="משהו לא נטען" text="בדקו את החיבור לאינטרנט ונסו שוב."
      action={onRetry && <Button onClick={() => onRetry()}>לנסות שוב</Button>} />
  );
}
