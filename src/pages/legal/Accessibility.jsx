// Israeli Equal Rights for Persons with Disabilities regulations (2013) require an accessibility statement.
// Fill in LEGAL in src/lib/config.js before launch.
import LegalPage from "./LegalPage";
import { APP_NAME, LEGAL, SUPPORT_EMAIL } from "@/lib/config";

export default function Accessibility() {
  return (
    <LegalPage title="הצהרת נגישות" updated={LEGAL.updated}>
      <p>אנחנו ב-{APP_NAME} רוצים שהשירות יהיה נגיש לכל המשתמשים, כולל אנשים עם מוגבלות. אנחנו פועלים להתאים את האתר להנחיות WCAG 2.1 ברמה AA ולתקן הישראלי 5568.</p>
      <h2>מה עשינו</h2>
      <ul>
        <li>ניווט במקלדת, קישור "דילוג לתוכן" ומיקוד גלוי.</li>
        <li>תוויות לשדות הטפסים ולכפתורים שמכילים רק אייקון.</li>
        <li>תמיכה בקוראי מסך, כיווניות עברית (RTL), הגדרת שפה וכותרת לכל עמוד.</li>
        <li>ניגודיות צבעים לפי התקן לטקסט, לשדות ולמתגים, וכיבוד הגדרת "הפחתת תנועה" של מערכת ההפעלה.</li>
        <li>התאמה למסכי טלפון, טאבלט ומחשב.</li>
      </ul>
      <h2>מגבלות ידועות</h2>
      <ul>
        <li>תכנים שמשתמשים מעלים (סרטונים, קבצי שמע ותמונות) עשויים להיות ללא כתוביות או טקסט חלופי. אנחנו מעודדים את המשתמשים להוסיף תיאורים.</li>
        <li>חלק מהכפתורים המשניים קטנים מ-44 פיקסלים. אנחנו ממשיכים לשפר.</li>
      </ul>
      <h2>רכז/ת נגישות</h2>
      <p>נתקלתם בבעיה? נשמח לשמוע ולתקן: {LEGAL.accessibilityCoordinator}, {SUPPORT_EMAIL}, {LEGAL.phone}. הבדיקה האחרונה של האתר בוצעה ב{LEGAL.accessibilityAuditDate}.</p>
    </LegalPage>
  );
}
