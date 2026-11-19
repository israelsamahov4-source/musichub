import { Children, cloneElement, isValidElement } from "react";
import { Label } from "@/components/ui/label";

/**
 * A label, the control, and a hint or an error under it.
 * With an `id`, the control is linked to its hint/error (aria-describedby) and marked invalid on error,
 * so screen readers read the problem when the field gets focus.
 */
export default function Field({ id, label, hint, error, children }) {
  const hintId = id && hint && !error ? `${id}-hint` : undefined;
  const errorId = id && error ? `${id}-error` : undefined;
  const describedBy = errorId || hintId;
  const only = Children.count(children) === 1 && isValidElement(children) ? children : null;
  const control = id && only
    ? cloneElement(only, {
      "aria-invalid": error ? true : undefined,
      "aria-describedby": [only.props["aria-describedby"], describedBy].filter(Boolean).join(" ") || undefined,
    })
    : children;
  return (
    <div className="space-y-1.5">
      {label && <Label htmlFor={id}>{label}</Label>}
      {control}
      {hint && !error && <p id={hintId} className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p id={errorId} className="text-xs font-medium text-destructive" role="alert">{error}</p>}
    </div>
  );
}
