import { Link } from "react-router-dom";
import { Music } from "lucide-react";
import { Card } from "@/components/ui/card";
import { APP_NAME } from "@/lib/config";

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-secondary to-background px-4 py-10">
      <Link to="/" className="mb-6 flex items-center gap-2" aria-label={`${APP_NAME} — דף הבית`}>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Music className="h-5 w-5" aria-hidden /></div>
        <span className="text-xl font-bold">{APP_NAME}</span>
      </Link>
      <Card className="w-full max-w-md p-6 sm:p-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </Card>
      {footer && <div className="mt-4 text-sm text-muted-foreground">{footer}</div>}
    </div>
  );
}
