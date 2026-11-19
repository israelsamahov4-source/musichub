/** A calm, finished-looking empty screen: soft icon, short heading, one next step. */
/** `plain` drops the card frame, for use inside another card or panel. */
export default function EmptyState({ icon: Icon, title, text, action, plain = false }) {
  return (
    <div className={plain ? "flex flex-col items-center justify-center px-6 py-12 text-center" : "flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-card px-6 py-14 text-center shadow-card"}>
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
      )}
      <h2 className="text-lg font-bold">{title}</h2>
      {text && <p className="mt-1.5 max-w-sm text-balance text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
