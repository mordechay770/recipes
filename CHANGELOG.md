# CHANGELOG — recipes

## 2026-08-17 — Supabase כ-backend

### בוצע
- `supabase/schema.sql` — טבלאות `recipes` / `stores` / `submissions`,
  טריגר `updated_at`, מדיניות RLS מלאה ו-seed (חלה, לאטקס, 5 חנויות)
- `js/db.js` — שכבת גישה אחידה לנתונים: מצב **supabase** מול מצב **demo**
  (localStorage), כולל זיהוי מצב **degraded** כשה-CDN של supabase-js נחסם
- `js/demo-data.js` — נתוני דמו כדי שהאתר יעבוד לפני חיבור הבסיס
- `config.js` — מקום ל-`url` + `anonKey` (עם override דרך localStorage לבדיקות)
- `index.html` — נכתב מחדש: המתכונים נטענים מהבסיס, גריד "כל המתכונים",
  deep link `?r=<slug>`, מודל "Где купить?" מהטבלה `stores`,
  טופס שליחה שכותב אמיתית ל-`submissions`. כל תוכן משתמש עובר `esc()`
- `admin.html` — CRUD אמיתי: יצירה/עריכה/פרסום/הסרה/מחיקה, עורך ינגרדיאנטים,
  התחברות דרך Supabase Auth (email+סיסמה), ומודרציה של הצעות מקוראים
  (אישור → נפתחת טיוטת מתכון ממולאת)
- `vercel.json` — security headers + `noindex` ל-`admin.html`
- `SETUP.md` — מדריך הקמה ברוסית: Supabase, משתמש admin, מפתחות, Vercel

### נבדק
Chromium headless על שני הדפים: טעינת מתכונים, מודל חנויות, שליחת הצעה,
login שגוי/תקין, פרסום טיוטה, אישור הצעה, יצירת מתכון חדש + slug אוטומטי,
deep link, escaping של HTML זדוני, ואפס גלישה אופקית במובייל.

### פתוח לשיחה הבאה
- למלא `config.js` אחרי יצירת פרויקט Supabase (ראה `SETUP.md`)
- עמוד מתכון בודד (`recipe.html`) + Recipe schema ל-SEO
- תמונות דרך Supabase Storage
- ניהול חנויות מתוך ה-admin

---

## 2026-06-07 — קונספט ראשוני

### בוצע
- `index.html` — דף מתכונים: מתכון חלה מלא + modal "Где купить?" + טופס שליחה
- `admin.html` — עורך מתכונים עם login, שדות דינמיים, ניהול ינגרדיאנטים
- GitHub: `mordechay770/recipes`
- Vercel: `recipes-ivory-xi.vercel.app`
- ניווט דו-כיווני עם kitchen-orders landing page
- CLAUDE.md עם כל המידע המבני
