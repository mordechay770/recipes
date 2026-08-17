# מתכונים כשרים — Recipes

## על הפרויקט
פלטפורמת מתכונים כשרים לקהילה יהודית באלמטי, קזחסטן.
שפה: רוסית. סטטוס: **דמו עם backend אמיתי** (2026-08-17)

## 🌐 Deploy
| | |
|---|---|
| **GitHub** | `github.com/mordechay770/recipes` |
| **Vercel URL** | `https://recipes-ivory-xi.vercel.app` |
| **פקודת deploy** | `cd recipes && vercel --prod` |
| **Backend** | Supabase (Postgres + Auth + RLS) |

> לחיבור אוטומטי: Vercel → Settings → Git → Connect `mordechay770/recipes`
> הוראות הקמה מלאות: **`SETUP.md`**

## מבנה תיקיות
```
recipes/
├── index.html          ← דף ראשי (מתכונים מ-Supabase + טופס שליחה)
├── admin.html          ← עורך מתכונים (Supabase Auth) + מודרציה של הצעות
├── config.js           ← SUPABASE_CONFIG: url + anonKey  ⚠️ למלא ידנית
├── vercel.json         ← headers (noindex ל-admin, security headers)
├── SETUP.md            ← מדריך הקמת Supabase + Vercel (ברוסית)
├── js/
│   ├── db.js           ← שכבת גישה לנתונים (Supabase | demo)
│   └── demo-data.js    ← נתוני דמו כשאין Supabase
└── supabase/
    └── schema.sql      ← טבלאות + RLS + seed (הרצה חד-פעמית ב-SQL Editor)
```

## שני מצבי הרצה
| מצב | מתי | היכן הנתונים |
|---|---|---|
| **supabase** | `config.js` מלא | Postgres, משותף לכולם |
| **demo** | `config.js` ריק | localStorage של הדפדפן |
| **degraded** | יש מפתחות אך ה-CDN של supabase-js נחסם | דמו + באנר אזהרה |

ה-API של `window.DB` זהה בשני המצבים, כך שהדפים לא יודעים מה מתחת.

## מודל הרשאות (RLS)
- **אורח** — קורא רק מתכונים `status='published'` + `stores`; יכול רק להוסיף
  שורה ל-`submissions` עם `status='pending'`.
- **admin** (מחובר דרך Supabase Auth) — גישה מלאה.
- ⚠️ ב-`config.js` נכנס **anon key בלבד**. לעולם לא `service_role`.
- בדמו: סיסמה מקומית `recipes2026` (לא אבטחה — רק חסימת עין).

## סכמת נתונים
- `recipes` — slug ייחודי, emoji, `ingredients` jsonb `[{name,qty,key}]`,
  `steps` jsonb `["…"]`, `status` draft/published, `featured`.
- `stores` — `categories text[]` עם מפתחות ינגרדיאנטים (`flour`,`eggs`…);
  כפתור "Где купить?" מסנן לפיהם.
- `submissions` — הצעות מהקוראים; ה-admin מאשר → נפתח טיוטת מתכון מוכנה.

## ניווט
- `index.html` → קישור "← Кухня" חוזר ל-`src-sigma-ecru-25.vercel.app`
- `index.html?r=<slug>` → פותח מתכון ספציפי (deep link)
- `admin.html` → "👁 Смотреть сайт" פותח `index.html`
- דף ראשי של kitchen-orders מפנה לכאן כרטיס "📖 Рецепты"

## כיוונים עתידיים
- [ ] עמוד מתכון בודד (`recipe.html`) לטובת SEO אמיתי
- [ ] SEO: meta tags דינמיים, structured data (Recipe schema)
- [ ] העלאת תמונות (Supabase Storage) במקום emoji
- [ ] ניהול חנויות מתוך ה-admin (כרגע רק ב-SQL)
- [ ] התראה ל-admin על הצעה חדשה (Supabase Function / Make.com)
- [ ] מאגר מלא של חנויות כשרות באלמטי

## כללים
- כל שינוי מבני (URLs, קבצים, deploy) → עדכן CLAUDE.md זה
- כל שינוי תוכן → commit עם תיאור ברור
- כל טקסט שמגיע מהמשתמש נכנס ל-DOM דרך `esc()` — לא לשבור את זה
