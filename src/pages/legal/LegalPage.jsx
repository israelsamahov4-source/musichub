import { APP_NAME } from "@/lib/config";

export default function LegalPage({ title, updated, children }) {
  return (
    <article className="page-narrow">
      <h1 className="page-title">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{APP_NAME} · עודכן לאחרונה: {updated}</p>
      <div className="mt-6 space-y-4 leading-relaxed [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ms-5 [&_li]:list-disc">{children}</div>
    </article>
  );
}
