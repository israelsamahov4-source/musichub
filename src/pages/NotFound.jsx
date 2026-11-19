import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/lib/usePageTitle";

export default function NotFound() {
  usePageTitle("העמוד לא נמצא");
  return (
    <div className="page flex flex-col items-center py-24 text-center">
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-primary"><Compass className="h-7 w-7" aria-hidden /></span>
      <p className="tabular text-sm font-semibold text-primary">404</p>
      <h1 className="mt-1 text-[1.75rem] font-bold tracking-tight">ההופעה הזו בוטלה</h1>
      <p className="mt-2 max-w-sm text-muted-foreground">העמוד לא נמצא. אולי הקישור שגוי, או שהעמוד הוסר.</p>
      <Button asChild className="mt-6"><Link to="/">לדף הבית</Link></Button>
    </div>
  );
}
