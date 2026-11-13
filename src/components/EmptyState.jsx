/** Empty screens read like a blank gig flyer: a dashed ink frame, a sticker, a poster headline. */
export default function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink/25 bg-card px-6 py-12 text-center">
      {Icon && (
        <div className="mb-4 flex h-14 w-14 rotate-[-6deg] items-center justify-center rounded-2xl border-2 border-ink bg-riso-yellow text-ink shadow-[3px_3px_0_0_#FF4F81]">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
      )}
      <h3 className="riso font-display text-4xl font-bold leading-none">{title}</h3>
      {text && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
