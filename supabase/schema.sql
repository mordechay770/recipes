-- ============================================================
--  Кошерные рецепты — Supabase schema
--  Запустить целиком в Supabase → SQL Editor → New query → Run
--  Скрипт идемпотентный: можно выполнять повторно.
-- ============================================================

-- ---------- 1. TABLES ----------

create table if not exists public.recipes (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  title         text not null,
  emoji         text default '🍽',
  description   text default '',
  category      text default 'Выпечка',
  kosher        text default 'Пареве',      -- Пареве / Мясное / Молочное
  occasion      text default '',
  time_minutes  integer default 60,
  servings      integer default 4,
  yield_text    text default '',
  ingredients   jsonb not null default '[]'::jsonb,  -- [{name, qty, key}]
  steps         jsonb not null default '[]'::jsonb,  -- ["Шаг 1", "Шаг 2"]
  status        text not null default 'draft' check (status in ('draft','published')),
  featured      boolean not null default false,
  author        text default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.stores (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text default '',
  badge       text default 'Магазин',
  is_kosher   boolean not null default false,
  categories  text[] not null default '{}',   -- ключи ингредиентов: flour, yeast, eggs...
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.submissions (
  id          uuid primary key default gen_random_uuid(),
  name        text default '',
  contact     text default '',
  title       text not null,
  body        text default '',
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at  timestamptz not null default now()
);

create index if not exists recipes_status_idx     on public.recipes (status);
create index if not exists recipes_slug_idx       on public.recipes (slug);
create index if not exists submissions_status_idx on public.submissions (status, created_at desc);

-- ---------- 2. updated_at trigger ----------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists recipes_touch_updated_at on public.recipes;
create trigger recipes_touch_updated_at
  before update on public.recipes
  for each row execute function public.touch_updated_at();

-- ---------- 3. ROW LEVEL SECURITY ----------
-- Модель доступа:
--   anon  (обычный посетитель сайта) — читает опубликованные рецепты и магазины,
--                                      может отправить рецепт в submissions.
--   authenticated (админ, вошёл через Supabase Auth) — полный доступ.

alter table public.recipes     enable row level security;
alter table public.stores      enable row level security;
alter table public.submissions enable row level security;

-- recipes ---------------------------------------------------
drop policy if exists "recipes public read published" on public.recipes;
create policy "recipes public read published"
  on public.recipes for select
  to anon
  using (status = 'published');

drop policy if exists "recipes admin all" on public.recipes;
create policy "recipes admin all"
  on public.recipes for all
  to authenticated
  using (true) with check (true);

-- stores ----------------------------------------------------
drop policy if exists "stores public read" on public.stores;
create policy "stores public read"
  on public.stores for select
  to anon, authenticated
  using (true);

drop policy if exists "stores admin write" on public.stores;
create policy "stores admin write"
  on public.stores for all
  to authenticated
  using (true) with check (true);

-- submissions -----------------------------------------------
-- Посетитель может ТОЛЬКО вставить заявку (и только со статусом pending),
-- читать чужие заявки он не может.
drop policy if exists "submissions public insert" on public.submissions;
create policy "submissions public insert"
  on public.submissions for insert
  to anon
  with check (status = 'pending');

drop policy if exists "submissions admin all" on public.submissions;
create policy "submissions admin all"
  on public.submissions for all
  to authenticated
  using (true) with check (true);

-- ---------- 4. SEED DATA ----------

insert into public.stores (name, address, badge, is_kosher, categories, sort_order) values
  ('Магазин «Мизрахи»',    'ул. Назарбаева, 44',    'Кошер',        true,  '{flour,yeast,sugar,eggs,oil,sesame,spice,other}', 1),
  ('Green Mall',           'пр. Достык, 111',       'Супермаркет',  false, '{flour,yeast,sugar,oil,other}',                   2),
  ('Magnum',               'ул. Байтурсынова, 141', 'Супермаркет',  false, '{flour,sugar,oil,other}',                         3),
  ('Small',                'пр. Аль-Фараби, 77',    'Супермаркет',  false, '{oil,other}',                                     4),
  ('Рынок Зелёный базар',  'ул. Зенкова, 59',       'Рынок',        false, '{eggs,sesame,spice,other}',                       5)
on conflict do nothing;

insert into public.recipes
  (slug, title, emoji, description, category, kosher, occasion,
   time_minutes, servings, yield_text, ingredients, steps, status, featured, author)
values
  (
    'challah',
    'Пышная Хала',
    '🍞',
    'Мягкая, воздушная хала с золотистой корочкой. По этому рецепту пекли наши бабушки — простые ингредиенты, немного терпения и много любви.',
    'Выпечка', 'Пареве', 'Шаббат',
    180, 12, '2 халы',
    '[
      {"name":"Мука пшеничная (в/с)","qty":"700 г","key":"flour"},
      {"name":"Дрожжи сухие","qty":"10 г","key":"yeast"},
      {"name":"Сахар","qty":"60 г","key":"sugar"},
      {"name":"Соль","qty":"10 г","key":""},
      {"name":"Яйца","qty":"3 шт","key":"eggs"},
      {"name":"Масло растительное","qty":"80 мл","key":"oil"},
      {"name":"Вода тёплая","qty":"280 мл","key":""},
      {"name":"Кунжут (для посыпки)","qty":"2 ст.л.","key":"sesame"}
    ]'::jsonb,
    '[
      "Опара. Растворите дрожжи и 1 ч.л. сахара в тёплой воде. Оставьте на 10 минут до появления пены.",
      "Тесто. Смешайте муку, соль, сахар. Добавьте опару, 2 яйца и масло. Вымешивайте 10 минут до гладкости.",
      "Подъём. Накройте тесто плёнкой. Оставьте в тёплом месте на 1.5–2 часа — объём должен удвоиться.",
      "Плетение. Разделите тесто на 6 равных частей. Сплетите по 3 жгута в косу. Выложите на противень.",
      "Расстойка. Накройте полотенцем, оставьте ещё на 40 минут. Смажьте взбитым яйцом, посыпьте кунжутом.",
      "Выпечка. Духовка 180°С, 25–30 минут до золотистой корочки. Готово, когда постукивание по дну звучит глухо."
    ]'::jsonb,
    'published', true, 'Кухня общины'
  ),
  (
    'latkes',
    'Хрустящие латкес',
    '🥞',
    'Картофельные оладьи на Хануку — хрустящие снаружи, мягкие внутри.',
    'Выпечка', 'Пареве', 'Ханука',
    45, 6, '18 оладий',
    '[
      {"name":"Картофель","qty":"1 кг","key":"other"},
      {"name":"Лук репчатый","qty":"1 шт","key":"other"},
      {"name":"Яйца","qty":"2 шт","key":"eggs"},
      {"name":"Мука","qty":"3 ст.л.","key":"flour"},
      {"name":"Соль, перец","qty":"по вкусу","key":"spice"},
      {"name":"Масло растительное","qty":"для жарки","key":"oil"}
    ]'::jsonb,
    '[
      "Натрите картофель и лук на крупной тёрке.",
      "Отожмите лишнюю жидкость через марлю — чем суше масса, тем хрустящее латкес.",
      "Добавьте яйца, муку, соль и перец. Перемешайте.",
      "Жарьте на хорошо разогретом масле по 3–4 минуты с каждой стороны до золотистого цвета.",
      "Выложите на бумажное полотенце, подавайте горячими."
    ]'::jsonb,
    'draft', false, 'Кухня общины'
  )
on conflict (slug) do nothing;

-- ============================================================
--  ГОТОВО.
--  Далее: Authentication → Users → Add user  (email + пароль)
--  Этот пользователь и будет админом в admin.html
-- ============================================================
