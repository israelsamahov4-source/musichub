# MusicHub: הרשת החברתית למוזיקאים

## מצב נוכחי (13.11.2026)

- **האתר:** https://musichub-wheat.vercel.app (Vercel, מתעדכן אוטומטית מכל דחיפה ל-`main`)
- **מסד הנתונים:** פרויקט Supabase בשם `musichub` (מזהה `jrhzkarxjqbcqokfowbv`, אזור אירופה). שלוש המיגרציות הורצו.
- **פונקציות שרת:** `delete-account` פעילה. היא נפרסה מהעורך בדשבורד (`supabase/functions/delete-account/standalone.ts`), ובדיקת JWT כבויה כי הפונקציה מאמתת את המשתמש בעצמה.
- **חשבון מייסד:** `israelsamahov4` הוא מנהל ומורה.
- **עוד לא הוגדר:** שרת מיילים (SMTP) ותבניות מייל בעברית, דומיין, תשלומים, התחברות עם Google, וגיבויים (בתוכנית Pro של Supabase).


גרסה ראשונה לשוק (MVP). האתר נבנה מחדש על התשתית שלכם, בלי תלות ב-Base44:

- **אתר:** React + Vite + Tailwind, בעברית ומימין לשמאל, מותאם לנייד.
- **מסד נתונים, התחברות, קבצים והודעות בזמן אמת:** [Supabase](https://supabase.com).
- **אחסון האתר:** [Vercel](https://vercel.com).
- **תשלומים (כבויים כברירת מחדל):** Stripe, דרך פונקציות שרת של Supabase.

## מה יש בגרסה הזו

| אזור | מה אפשר לעשות |
|---|---|
| הרשמה והתחברות | אימייל וסיסמה עם אישור במייל, Google (אופציונלי), איפוס סיסמה, תהליך היכרות בשלושה שלבים |
| פרופיל | תמונה, כלים, תפקידים, רמה, ז'אנרים, מה מחפשים, קישורים, עוקבים, פוסטים ופרויקטים |
| פיד | פוסטים עם טקסט, תמונה, קובץ שמע או וידאו מ-YouTube/Vimeo, לייקים, תגובות, וסימון "מחפש/ת שותפים" |
| גילוי מוזיקאים | חיפוש וסינון לפי כלי, תפקיד, ז'אנר, מיקום ומה מחפשים |
| הודעות | שיחות פרטיות בזמן אמת עם מונה הודעות שלא נקראו |
| פרויקטים משותפים | פתיחת פרויקט, בקשות הצטרפות והזמנות, אישור חברים, לוח משימות |
| קורסים | קטלוג, הרשמה, שיעורי וידאו, מעקב התקדמות, עורך קורסים למורים, קורסי Pro |
| בטיחות | חסימת משתמשים, דיווח על תוכן, מגבלות קצב נגד ספאם, מחיקת חשבון |
| משפטי | טיוטות של תנאי שימוש, מדיניות פרטיות והצהרת נגישות (צריך להשלים ולהעביר לעורך דין) |

## אבטחה: מה מוגן ואיך

כל טבלה במסד הנתונים מוגנת בכללי **Row Level Security**. המשמעות היא שהשרת עצמו בודק כל בקשה, גם אם מישהו עוקף את האתר ושולח בקשות ישירות.

- הודעות פרטיות גלויות רק למשתתפי השיחה.
- אף משתמש לא יכול לשנות לעצמו את המנוי, ולא להפוך את עצמו למנהל או למורה. רק השרת (אחרי תשלום) יכול לשנות את זה.
- אי אפשר לפרסם, לעשות לייק, לעקוב או לשלוח הודעה בשם מישהו אחר.
- התראות נוצרות רק בשרת, כך שאי אפשר להציף משתמשים בהתראות מזויפות.
- קבצים נשמרים בתיקייה של המשתמש שהעלה אותם, ורק הוא יכול לשנות או למחוק אותם. יש גם הגבלת סוג קובץ וגודל.
- קישורים מסוג `javascript:` נחסמים בשרת ובאתר (הגנה מפני XSS).
- וידאו של שיעור נעול לא נשלח למי שלא נרשם לקורס.
- מגבלות קצב: למשל עד 20 פוסטים בשעה, 30 הודעות בדקה, ו-30 שיחות חדשות ביום.
- התשלומים מאומתים בחתימה של Stripe. בקשה מזויפת נדחית.
- כותרות אבטחה באתר (CSP, HSTS, חסימת הטמעה בתוך iframe) מוגדרות בקובץ `vercel.json`.

יש **78 בדיקות אבטחה אוטומטיות** שמנסות לבצע את ההתקפות האלה ומוודאות שהן נכשלות (`supabase/tests/rls.test.mjs`).

---

## הקמה מאפס, צעד אחר צעד (בערך שעה)

### 1. Supabase: מסד הנתונים

1. נרשמים ב-supabase.com ופותחים **New project**. כדאי לבחור אזור **Frankfurt (eu-central-1)**, הכי קרוב לישראל. את סיסמת מסד הנתונים שומרים במקום בטוח.
2. נכנסים ל-**SQL Editor**. מעתיקים את כל התוכן של `supabase/migrations/20261113000001_init.sql`, מדביקים ולוחצים **Run**. אחר כך עושים אותו דבר עם `20261113000002_limits_and_search.sql`.
3. ב-**Project Settings → API** מעתיקים את `Project URL` ואת המפתח `anon public`. שניהם נכנסים לקובץ ההגדרות של האתר (שלב 3).
   > ⚠️ המפתח `service_role` הוא סודי. לעולם לא שמים אותו באתר או ב-GitHub.

### 2. Supabase: הגדרות התחברות

ב-**Authentication**:

- **URL Configuration:** ב-Site URL שמים את כתובת האתר, למשל `https://musichub.co.il`. ב-Redirect URLs מוסיפים את `https://musichub.co.il/**` ואת `http://localhost:5173/**`.
- **Providers → Email:** משאירים את **Confirm email** דלוק.
- **Policies / Passwords:** אורך מינימלי 8. אם זמין בתוכנית, מפעילים גם **Leaked password protection**.
- **Email Templates:** מדביקים את התבניות בעברית מהתיקייה `supabase/templates/`.
- **SMTP (חובה לפני השקה):** שרת המייל המובנה של Supabase מוגבל לכמות קטנה של מיילים בשעה, ומיועד לבדיקות בלבד. מחברים ספק מייל כמו Resend, Postmark או SendGrid דרך **Authentication → SMTP Settings**, עם דומיין משלכם.
- **התחברות עם Google (אופציונלי):** מפעילים את Google ב-Providers לפי ההוראות של Supabase, ומגדירים באתר `VITE_GOOGLE_AUTH_ENABLED=true`.

### 3. הרצת האתר על המחשב

צריך Node.js בגרסה 20 ומעלה.

```bash
npm install
cp .env.example .env.local      # ממלאים את הכתובת והמפתח משלב 1
npm run dev                     # האתר יעלה ב-http://localhost:5173
```

### 4. העלאה לאוויר עם Vercel

1. מעלים את התיקייה לריפו פרטי ב-GitHub.
2. ב-vercel.com לוחצים **Add New → Project** ובוחרים את הריפו. Vercel מזהה Vite לבד.
3. ב-**Environment Variables** מוסיפים את `VITE_SUPABASE_URL` ואת `VITE_SUPABASE_ANON_KEY`.
4. לוחצים **Deploy**, ואז מחברים דומיין ב-**Settings → Domains**. חשוב לעדכן את הדומיין גם ב-Site URL של Supabase (שלב 2).

### 5. תשלומים (כשתהיו מוכנים)

> **חשוב:** Stripe לא תמכה בעבר בעסקים שרשומים בישראל, ובאוקטובר 2026 פורסם שהיא מתכננת להתרחב לישראל. לפני שמתחילים, בדקו ב-stripe.com/global אם אפשר לפתוח חשבון לעסק ישראלי. אם לא, יש שתי חלופות: לעבוד דרך חברה בחו"ל, או להחליף ספק. כל קוד התשלומים נמצא בתיקייה `supabase/functions`, כך שהחלפה ל-Paddle או לסולק ישראלי (Grow, Cardcom, PayPlus) נוגעת רק בה.

ההמלצה: **להשיק קודם בחינם**, לצבור משתמשים ותוכן, ורק אז להפעיל מנויים. עד אז כפתורי השדרוג מציגים "בקרוב".

כשמפעילים:

1. ב-Stripe יוצרים שני מוצרים, Pro ו-Premium, ולכל אחד מחיר חודשי ומחיר שנתי. סך הכל 4 מזהי מחיר (Price IDs).
2. מתקינים את Supabase CLI ומריצים:
   ```bash
   supabase login
   supabase link --project-ref <מזהה-הפרויקט>
   supabase secrets set SITE_URL=https://musichub.co.il STRIPE_SECRET_KEY=sk_live_... \
     STRIPE_PRICE_PRO_MONTHLY=price_... STRIPE_PRICE_PRO_YEARLY=price_... \
     STRIPE_PRICE_PREMIUM_MONTHLY=price_... STRIPE_PRICE_PREMIUM_YEARLY=price_...
   supabase functions deploy create-checkout
   supabase functions deploy billing-portal
   supabase functions deploy delete-account
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```
3. ב-Stripe נכנסים ל-**Developers → Webhooks → Add endpoint**. בכתובת שמים `https://<project>.supabase.co/functions/v1/stripe-webhook`, ומסמנים את האירועים `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` ו-`invoice.payment_failed`. את ה-Signing secret שומרים: `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`.
4. מפעילים את **Customer portal** בהגדרות של Stripe.
5. ב-Vercel מגדירים `VITE_PAYMENTS_ENABLED=true` ומעלים מחדש.

> הפונקציה `delete-account` (מחיקת חשבון) עובדת גם בלי Stripe, וצריך להעלות אותה כבר בהשקה הראשונה.

---

## ניהול שוטף (ב-SQL Editor)

```sql
-- לאשר משתמש כמורה, כדי שיוכל לפתוח קורסים בלי מנוי Premium
update profiles set is_instructor = true where username = 'שם_משתמש';

-- דיווחים פתוחים לבדיקה
select r.*, p.username as reporter from reports r join profiles p on p.id = r.reporter_id
where status = 'open' order by created_at desc;

-- למחוק פוסט פוגעני
delete from posts where id = '<post-id>';
```

## בדיקות

```bash
npm run lint        # בדיקת קוד
npm run build       # בניית האתר
npm run test:db     # בדיקות האבטחה. דורש PostgreSQL מקומי (פרטים ב-supabase/tests/apply.sh)
```

## מבנה התיקיות

```
src/pages/          עמודי האתר
src/components/     רכיבים משותפים (פוסט, אווטאר, טפסים, תפריט)
src/lib/config.js   שם המותג, רשימות (כלים, ז'אנרים) ומחירים: כאן משנים
supabase/migrations מבנה מסד הנתונים וכללי האבטחה
supabase/functions  פונקציות שרת: תשלומים ומחיקת חשבון
supabase/tests      בדיקות אבטחה
```

## רשימת משימות לפני השקה

- [ ] להחליף את `SUPPORT_EMAIL` בקובץ `src/lib/config.js` בכתובת אמיתית
- [ ] לבדוק שהשם MusicHub פנוי כסימן מסחרי וכדומיין, או להחליף אותו ב-`config.js` וב-`index.html`
- [ ] להשלים את הפרטים בסוגריים מרובעים בתנאי השימוש, במדיניות הפרטיות ובהצהרת הנגישות, ולהעביר לעורך דין
- [ ] לחבר שרת מייל (SMTP) ודומיין
- [ ] להגדיר גיבויים ב-Supabase (גיבוי יומי כלול בתוכנית Pro שלהם)
- [ ] ליצור 5–10 קורסים ופרויקטים לדוגמה עם מוזיקאים שאתם מכירים, כדי שהאתר לא ייראה ריק
- [ ] לעבור על כל התהליכים בנייד ובמחשב עם 3–5 משתמשים אמיתיים
