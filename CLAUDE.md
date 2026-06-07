# מתכונים כשרים — Recipes

## על הפרויקט
פלטפורמת מתכונים כשרים לקהילה יהודית באלמטי, קזחסטן.
שפה: רוסית. סטטוס: **קונספט / דמו** (2026-06-07)

## 🌐 Deploy
| | |
|---|---|
| **GitHub** | `github.com/mordechay770/recipes` |
| **Vercel URL** | `https://recipes-ivory-xi.vercel.app` |
| **פקודת deploy** | `cd recipes && vercel --prod` |

> לחיבור אוטומטי: Vercel → Settings → Git → Connect `mordechay770/recipes`

## מבנה תיקיות
```
recipes/
├── index.html   ← דף ראשי (מתכונים + טופס שליחה)
└── admin.html   ← עורך מתכונים (סיסמה: recipes2026)
```

## ניווט
- `index.html` → קישור "← Кухня" חוזר ל-`src-sigma-ecru-25.vercel.app`
- `admin.html` → קישור "👁 Смотреть сайт" פותח `index.html`
- דף ראשי של kitchen-orders מפנה לכאן כרטיס "📖 Рецепты"

## תוכן קיים
- מתכון חלה (מלא — ингредиенты + שלבים + "איפה לקנות")
- חנות: מודל "Где купить?" — נתונים ב-JS (STORES object ב-index.html)
- Admin: עורך מתכונים עם login + שדות + ינגרדיאנטים דינמיים

## כיוונים עתידיים
- [ ] חיבור Airtable כ-backend למתכונים
- [ ] טופס שליחה → Make.com webhook → אישור admin
- [ ] עמוד מתכון בודד (recipe.html)
- [ ] SEO: meta tags, structured data (Recipe schema)
- [ ] רשימת חנויות כשרות באלמטי (מאגר מלא)

## כללים
- כל שינוי מבני (URLs, קבצים, deploy) → עדכן CLAUDE.md זה
- כל שינוי תוכן → commit עם תיאור ברור
