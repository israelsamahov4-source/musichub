import { lazy, Suspense } from "react";

// The sheet-music library is big, so it loads only on pages that actually show or write sheet music.
const ScoreViewInner = lazy(() => import("./ScoreView"));
const ScoreEditorInner = lazy(() => import("./ScoreEditor"));

export function ScoreView(props) {
  return (
    <Suspense fallback={<div className="h-32 animate-pulse rounded-xl bg-muted" aria-hidden />}>
      <ScoreViewInner {...props} />
    </Suspense>
  );
}

/** Same props as ScoreEditor; renders nothing (and loads nothing) while closed. */
export function ScoreEditorDialog(props) {
  if (!props.open) return null;
  return (
    <Suspense fallback={null}>
      <ScoreEditorInner {...props} />
    </Suspense>
  );
}
