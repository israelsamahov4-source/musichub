import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="page flex flex-col items-center py-24 text-center">
      <p className="text-6xl font-extrabold text-primary">404</p>
      <h1 className="mt-3 text-xl font-bold">העמוד לא נמצא</h1>
      <p className="mt-1 text-muted-foreground">אולי הקישור שגוי, או שהעמוד הוסר.</p>
      <Button asChild className="mt-6"><Link to="/">לדף הבית</Link></Button>
    </div>
  );
}
