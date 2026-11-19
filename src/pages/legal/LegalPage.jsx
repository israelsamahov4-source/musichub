import { usePageTitle } from "@/lib/usePageTitle";
import { isFilled } from "@/lib/config";
import { LANG } from "@/lib/i18n";

export default function LegalPage({ title, updated, children }) {
  usePageTitle(title);
  return (
    <article className="page-narrow" lang="he" dir="rtl">
      {LANG === "en" && <p lang="en" dir="ltr" className="mb-6 rounded-xl bg-secondary px-4 py-3 text-sm text-secondary-foreground">This page is available in Hebrew only. The Hebrew version is the binding one.</p>}
      <h1 className="page-title">{title}</h1>
      {isFilled(updated) && <p className="mt-1 text-sm text-muted-foreground">עודכן לאחרונה: {updated}</p>}
      <div className="mt-6 space-y-4 leading-relaxed [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ms-5 [&_li]:list-disc">{children}</div>
    </article>
  );
}
