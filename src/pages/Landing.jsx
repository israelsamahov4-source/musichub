import { Link } from "react-router-dom";
import { ArrowLeft, GraduationCap, Handshake, MessageCircle, Music, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { APP_NAME } from "@/lib/config";

const PILLARS = [
  { icon: Handshake, title: "מוצאים שותפים", text: "מחפשים מתופף ללהקה, זמרת לסינגל או מפיק לאלבום? פותחים פרויקט, מגדירים את מי מחפשים, ומנהלים יחד את המשימות." },
  { icon: GraduationCap, title: "לומדים ממוזיקאים", text: "קורסים קצרים וממוקדים של מוזיקאים פעילים: נגינה, הפקה, מיקס וכתיבה. לומדים בקצב שלכם ועוקבים אחרי ההתקדמות." },
  { icon: UserRound, title: "בונים נוכחות מקצועית", text: "פרופיל שמרכז את הכלים, הז'אנרים, הקישורים והפרויקטים שלכם, כדי שהאנשים הנכונים ימצאו אתכם." },
];

const STEPS = [
  { icon: UserRound, title: "יוצרים פרופיל", text: "שתי דקות: כלי נגינה, ז'אנרים ומה אתם מחפשים." },
  { icon: Search, title: "מגלים מוזיקאים", text: "מסננים לפי כלי, ז'אנר, תפקיד ואזור." },
  { icon: MessageCircle, title: "מדברים ויוצרים", text: "שולחים הודעה, מצטרפים לפרויקט ומתחילים לעבוד." },
];

export default function Landing() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-b from-secondary via-background to-background">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Music className="h-3.5 w-3.5 text-primary" aria-hidden />הרשת החברתית למוזיקאים
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              המקום שבו מוזיקאים <span className="text-primary">נפגשים, לומדים ויוצרים</span> ביחד
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              {APP_NAME} מחברת בין מוזיקאים מתחילים למקצוענים: מוצאים שותפים לפרויקטים, לומדים מקורסים של מוזיקאים אחרים, ובונים פרופיל מקצועי.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/signup">הצטרפות חינם<ArrowLeft /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/collabs">לפרויקטים פתוחים</Link></Button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">ללא כרטיס אשראי. הרשת, ההודעות והפרויקטים חינמיים.</p>
          </div>
          <div className="relative hidden md:block" aria-hidden>
            <div className="absolute -inset-6 rounded-3xl bg-primary/10 blur-2xl" />
            <Card className="relative space-y-3 p-5 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-indigo-300" />
                <div><div className="h-3 w-28 rounded bg-foreground/80" /><div className="mt-1.5 h-2.5 w-20 rounded bg-muted-foreground/40" /></div>
                <span className="ms-auto rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">מחפש/ת שותפים</span>
              </div>
              <p className="text-sm">סיימתי דמו לשיר חדש בסגנון אינדי-פופ. מחפשת בסיסט/ית ומתופף/ת להקלטה באולפן בתל אביב 🎸🥁</p>
              <div className="flex h-12 items-end gap-1 rounded-lg bg-muted p-2">
                {[40, 70, 55, 90, 60, 80, 45, 75, 50, 85, 65, 40, 70, 55, 90, 60, 35, 75].map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm bg-primary/70" style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="flex gap-2 text-xs">
                <span className="chip">אינדי</span><span className="chip">פופ</span><span className="chip border-primary/30 text-primary">מחפשים: בס</span>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold">כל מה שמוזיקאי צריך, במקום אחד</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">רוב הפלטפורמות מתמקדות בהפצה או בשיתוף קבצים. אנחנו משלבים קהילה, עבודה משותפת ולמידה.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PILLARS.map((p) => (
            <Card key={p.title} className="p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary text-primary"><p.icon className="h-5 w-5" aria-hidden /></div>
              <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold">איך זה עובד</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">{i + 1}</div>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <Card className="flex flex-col items-center gap-4 bg-primary p-10 text-center text-primary-foreground">
          <h2 className="text-3xl font-bold">הפרויקט הבא שלכם מתחיל כאן</h2>
          <p className="max-w-xl text-primary-foreground/85">הצטרפו לקהילה, הציגו את המוזיקה שלכם ומצאו את האנשים שתרצו ליצור איתם.</p>
          <Button asChild size="lg" variant="secondary"><Link to="/signup">יצירת חשבון חינם</Link></Button>
        </Card>
      </section>
    </div>
  );
}
