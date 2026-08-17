# Подключение Supabase и деплой на Vercel

Сайт работает сразу — без базы он в **демо-режиме** (данные из `js/demo-data.js`,
изменения хранятся в localStorage браузера). Чтобы рецепты стали общими для всех,
подключите Supabase по шагам ниже.

---

## 1. Supabase — база данных

### 1.1 Создать проект
1. Зайти на https://supabase.com → **New project**
2. Название: `recipes`, регион ближе к Алматы (например *Central EU* или *Southeast Asia*)
3. Сохранить пароль базы (он пригодится только для прямого доступа к Postgres)

### 1.2 Создать таблицы
1. В проекте: **SQL Editor → New query**
2. Скопировать целиком содержимое [`supabase/schema.sql`](supabase/schema.sql) и нажать **Run**

Скрипт создаёт три таблицы (`recipes`, `stores`, `submissions`), включает
Row Level Security и заливает стартовые данные — халу, латкес и список магазинов.
Скрипт можно запускать повторно, ничего не сломается.

### 1.3 Создать администратора
1. **Authentication → Users → Add user → Create new user**
2. Email + пароль, галочку *Auto Confirm User* — включить
3. Этим email и паролем вы будете входить в `admin.html`

> Регистрацию посторонних лучше закрыть:
> **Authentication → Providers → Email → Allow new users to sign up: Off**

### 1.4 Прописать ключи в сайте
1. **Settings → API**, скопировать:
   - **Project URL** → `https://xxxxxxxx.supabase.co`
   - **anon public** ключ (длинная строка, начинается с `eyJ...`)
2. Вставить их в `config.js`:

```js
window.SUPABASE_CONFIG = {
  url: 'https://xxxxxxxx.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
};
```

3. Закоммитить и запушить.

**Про безопасность.** `anon`-ключ публичный по замыслу — он и должен лежать в браузере.
Доступ ограничивают RLS-политики из `schema.sql`:

| Кто | Что может |
|---|---|
| Гость сайта | читать только **опубликованные** рецепты и магазины; создать заявку в `submissions` |
| Гость сайта | **не может** читать чужие заявки, менять и удалять рецепты |
| Админ (вошёл через Auth) | всё |

⚠️ Никогда не вставляйте в `config.js` ключ **service_role** — он обходит RLS.

---

## 2. Vercel — деплой

Сайт статический, сборка не нужна.

### Вариант A — автодеплой из GitHub (рекомендуется)
1. Vercel → **Add New → Project → Import** репозиторий `mordechay770/recipes`
2. Framework Preset: **Other**, Build Command: пусто, Output Directory: пусто
3. **Deploy**

Дальше каждый `git push` в `main` автоматически обновляет сайт.

### Вариант B — вручную из терминала
```bash
cd recipes
vercel --prod
```

> Переменные окружения Vercel здесь **не используются**: сайт статический,
> без сборки подставить их в HTML некому. Ключи живут в `config.js`.

---

## 3. Проверка

После деплоя:

1. Открыть сайт → в верхней плашке **не должно** быть «Демо-режим».
   Если написано «Демо-режим» — `config.js` не заполнен или ключи неверны.
2. `admin.html` → войти по email администратора → появятся хала и латкес.
3. Отредактировать рецепт, нажать **Сохранить** → обновить главную, проверить изменение.
4. На главной отправить рецепт через форму → он появится в админке в разделе
   **«На проверке»**.

### Локальная проверка без коммита ключей

Открыть сайт, в консоли браузера выполнить:

```js
localStorage.setItem('sb_override', JSON.stringify({ url: 'https://…', anonKey: 'eyJ…' }));
location.reload();
```

Сбросить: `localStorage.removeItem('sb_override')`.

Локальный сервер (открывать через `file://` не стоит — сломается загрузка `js/`):

```bash
cd recipes && python3 -m http.server 8080
# http://localhost:8080
```

---

## 4. Структура данных

### `recipes`
| Поле | Тип | Назначение |
|---|---|---|
| `slug` | text unique | адрес рецепта: `index.html?r=challah` |
| `title`, `emoji`, `description` | text | карточка рецепта |
| `category`, `kosher`, `occasion` | text | чипсы-метки |
| `time_minutes`, `servings`, `yield_text` | | блок статистики |
| `ingredients` | jsonb | `[{name, qty, key}]`, `key` связывает с магазинами |
| `steps` | jsonb | `["Опара. …", "Тесто. …"]` |
| `status` | text | `draft` / `published` |
| `featured` | bool | показывать первым на главной |

### `stores`
`categories` — массив ключей ингредиентов (`flour`, `eggs`, …). Кнопка
«Где купить?» показывает магазины, у которых есть ключ этого ингредиента.

### `submissions`
Заявки с формы на главной. Гость может только вставить строку со статусом
`pending`; читает и меняет их только админ.
