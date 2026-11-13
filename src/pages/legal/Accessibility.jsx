// TEMPLATE: Israeli Equal Rights for Persons with Disabilities regulations (2013) require an
// accessibility statement. Fill in the coordinator details and audit date before launch.
import LegalPage from "./LegalPage";
import { APP_NAME, SUPPORT_EMAIL } from "@/lib/config";

export default function Accessibility() {
  return (
    <LegalPage title="הצהרת נגישות" updated="[תאריך]">
      <p>אנחנו ב-{APP_NAME} רואים חשיבות בכך שהשירות יהיה נגיש לכל המשתמשים, כולל אנשים עם מוגבלות. האתר נבנה בהתאם להנחיות WCAG 2.1 ברמה AA ולתקן הישראלי 5568.</p>
      <h2>מה עשינו</h2>
      <ul>
        <li>ניווט מלא במקלדת, כולל קישור "דילוג לתוכן" ומיקוד גלוי.</li>
        <li>תוויות לכל שדות הטפסים ולכפתורים שמכילים רק אייקון.</li>
        <li>תמיכה בקוראי מסך, כיווניות עברית (RTL) והגדרת שפה.</li>
        <li>ניגודיות צבעים מספקת, וכיבוד הגדרת "הפחתת תנועה" של מערכת ההפעלה.</li>
        <li>התאמה למסכים בכל הגדלים ולהגדלת טקסט.</li>
      </ul>
      <h2>מגבלות ידועות</h2>
      <p>תכנים שמשתמשים מעלים (סרטונים, קבצי שמע ותמונות) עשויים להיות ללא כתוביות או טקסט חלופי. אנחנו מעודדים את המשתמשים להוסיף תיאורים.</p>
      <h2>רכז/ת נגישות</h2>
      <p>נתקלתם בבעיה? נשמח לשמוע ולתקן: [שם רכז/ת הנגישות], {SUPPORT_EMAIL}, [טלפון]. הבדיקה האחרונה של האתר בוצעה ב-[תאריך].</p>
    </LegalPage>
  );
}
