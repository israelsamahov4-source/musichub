import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="page flex flex-col items-center py-20 text-center">
      <p className="riso riso-animate text-[8rem] font-black leading-none tracking-tighter" aria-hidden>404</p>
      <h1 className="font-display text-5xl font-bold leading-none text-ink">ההופעה הזו בוטלה</h1>
      <p className="mt-3 text-muted-foreground">העמוד לא נמצא. אולי הקישור שגוי, או שהעמוד הוסר.</p>
      <Button asChild className="mt-6"><Link to="/">לדף הבית</Link></Button>
    </div>
  );
}
