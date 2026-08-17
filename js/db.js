/* ============================================================
   DB — единый слой доступа к данным для index.html и admin.html
   ------------------------------------------------------------
   Два режима работы:

   • SUPABASE — если config.js заполнен (url + anonKey).
     Чтение/запись идут в Postgres, права разграничены RLS,
     вход админа — через Supabase Auth (email + пароль).

   • DEMO — если config.js пустой.
     Данные берутся из js/demo-data.js и сохраняются в localStorage
     браузера, вход админа — по локальному паролю. Ничего не уходит
     на сервер: это витрина, а не рабочая база.

   API одинаков в обоих режимах, поэтому страницам всё равно,
   что под капотом.
   ============================================================ */
(function () {
  'use strict';

  // ---------- конфигурация ----------
  var cfg = window.SUPABASE_CONFIG || {};
  // Локальное переопределение для тестов: в консоли браузера
  // localStorage.setItem('sb_override', JSON.stringify({url:'…', anonKey:'…'}))
  try {
    var override = JSON.parse(localStorage.getItem('sb_override') || 'null');
    if (override && override.url && override.anonKey) cfg = override;
  } catch (e) { /* игнорируем битый JSON */ }

  var isConfigured = !!(cfg.url && cfg.anonKey && cfg.url.indexOf('http') === 0);
  var client = null;
  // true — ключи прописаны, но библиотека supabase-js не загрузилась (CDN недоступен).
  // Тогда показываем демо-данные, но честно предупреждаем: это не рабочая база.
  var degraded = false;

  if (isConfigured) {
    if (window.supabase && window.supabase.createClient) {
      client = window.supabase.createClient(cfg.url, cfg.anonKey);
    } else {
      console.error('[DB] supabase-js не загрузился (CDN недоступен) — работаем на демо-данных');
      isConfigured = false;
      degraded = true;
    }
  }

  // ---------- демо-хранилище (localStorage) ----------
  var LS_KEY = 'kosher_recipes_demo_v1';
  var DEMO_PWD = 'recipes2026';

  function demoRead() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* перезасеем ниже */ }
    var seed = {
      recipes: JSON.parse(JSON.stringify(window.DEMO_DATA.recipes)),
      submissions: JSON.parse(JSON.stringify(window.DEMO_DATA.submissions)),
    };
    demoWrite(seed);
    return seed;
  }

  function demoWrite(state) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[DB] не удалось записать в localStorage', e);
    }
  }

  function demoId(prefix) {
    return prefix + '-' + Math.random().toString(36).slice(2, 10);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  // ---------- утилиты ----------
  function slugify(text) {
    var map = {
      а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',
      н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',
      ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
    };
    var out = String(text || '').toLowerCase().split('').map(function (ch) {
      return Object.prototype.hasOwnProperty.call(map, ch) ? map[ch] : ch;
    }).join('');
    out = out.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return out || 'recipe-' + Math.random().toString(36).slice(2, 7);
  }

  // Supabase отдаёт jsonb уже разобранным, но demo/ручной ввод может дать строку.
  function asArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        var parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) { return []; }
    }
    return [];
  }

  function normalizeRecipe(row) {
    if (!row) return null;
    var r = Object.assign({}, row);
    r.ingredients = asArray(r.ingredients);
    r.steps = asArray(r.steps);
    r.emoji = r.emoji || '🍽';
    return r;
  }

  function fail(error, what) {
    var message = (error && (error.message || error.error_description)) || 'Неизвестная ошибка';
    console.error('[DB] ' + what + ':', error);
    throw new Error(message);
  }

  // ============================================================
  //  ПУБЛИЧНЫЙ API
  // ============================================================
  var DB = {
    mode: isConfigured ? 'supabase' : (degraded ? 'degraded' : 'demo'),
    isDemo: !isConfigured,
    isDegraded: degraded,
    client: client,
    slugify: slugify,

    // ---------- рецепты ----------

    /** Опубликованные рецепты — то, что видит посетитель. */
    listPublished: function () {
      if (DB.isDemo) {
        return Promise.resolve(
          demoRead().recipes
            .filter(function (r) { return r.status === 'published'; })
            .map(normalizeRecipe)
        );
      }
      return client
        .from('recipes')
        .select('*')
        .eq('status', 'published')
        .order('featured', { ascending: false })
        .order('created_at', { ascending: true })
        .then(function (res) {
          if (res.error) fail(res.error, 'listPublished');
          return (res.data || []).map(normalizeRecipe);
        });
    },

    /** Все рецепты, включая черновики — только для админа. */
    listAll: function () {
      if (DB.isDemo) {
        return Promise.resolve(demoRead().recipes.map(normalizeRecipe));
      }
      return client
        .from('recipes')
        .select('*')
        .order('status', { ascending: true })
        .order('created_at', { ascending: true })
        .then(function (res) {
          if (res.error) fail(res.error, 'listAll');
          return (res.data || []).map(normalizeRecipe);
        });
    },

    /**
     * Создаёт или обновляет рецепт.
     * @param {object} recipe — если есть id, будет UPDATE, иначе INSERT.
     */
    saveRecipe: function (recipe) {
      var payload = {
        slug: recipe.slug || slugify(recipe.title),
        title: recipe.title,
        emoji: recipe.emoji || '🍽',
        description: recipe.description || '',
        category: recipe.category || '',
        kosher: recipe.kosher || 'Пареве',
        occasion: recipe.occasion || '',
        time_minutes: Number(recipe.time_minutes) || 0,
        servings: Number(recipe.servings) || 0,
        yield_text: recipe.yield_text || '',
        ingredients: asArray(recipe.ingredients),
        steps: asArray(recipe.steps),
        status: recipe.status === 'published' ? 'published' : 'draft',
        featured: !!recipe.featured,
        author: recipe.author || '',
      };

      if (DB.isDemo) {
        var state = demoRead();
        var existing = recipe.id
          ? state.recipes.filter(function (r) { return r.id === recipe.id; })[0]
          : null;
        if (existing) {
          Object.assign(existing, payload, { updated_at: nowIso() });
        } else {
          existing = Object.assign({ id: demoId('rec'), created_at: nowIso(), updated_at: nowIso() }, payload);
          state.recipes.push(existing);
        }
        demoWrite(state);
        return Promise.resolve(normalizeRecipe(existing));
      }

      var query = recipe.id
        ? client.from('recipes').update(payload).eq('id', recipe.id).select().single()
        : client.from('recipes').insert(payload).select().single();

      return query.then(function (res) {
        if (res.error) fail(res.error, 'saveRecipe');
        return normalizeRecipe(res.data);
      });
    },

    deleteRecipe: function (id) {
      if (DB.isDemo) {
        var state = demoRead();
        state.recipes = state.recipes.filter(function (r) { return r.id !== id; });
        demoWrite(state);
        return Promise.resolve(true);
      }
      return client.from('recipes').delete().eq('id', id).then(function (res) {
        if (res.error) fail(res.error, 'deleteRecipe');
        return true;
      });
    },

    // ---------- магазины ----------

    listStores: function () {
      if (DB.isDemo) {
        return Promise.resolve(window.DEMO_DATA.stores.slice());
      }
      return client
        .from('stores')
        .select('*')
        .order('sort_order', { ascending: true })
        .then(function (res) {
          if (res.error) fail(res.error, 'listStores');
          return res.data || [];
        });
    },

    // ---------- заявки от читателей ----------

    /** Вызывается формой на index.html. Статус всегда pending — так требует RLS. */
    createSubmission: function (data) {
      var payload = {
        name: (data.name || '').trim(),
        contact: (data.contact || '').trim(),
        title: (data.title || '').trim(),
        body: (data.body || '').trim(),
        status: 'pending',
      };

      if (DB.isDemo) {
        var state = demoRead();
        state.submissions.unshift(Object.assign({ id: demoId('sub'), created_at: nowIso() }, payload));
        demoWrite(state);
        return Promise.resolve(true);
      }

      return client.from('submissions').insert(payload).then(function (res) {
        if (res.error) fail(res.error, 'createSubmission');
        return true;
      });
    },

    listSubmissions: function () {
      if (DB.isDemo) {
        return Promise.resolve(demoRead().submissions.slice());
      }
      return client
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false })
        .then(function (res) {
          if (res.error) fail(res.error, 'listSubmissions');
          return res.data || [];
        });
    },

    updateSubmissionStatus: function (id, status) {
      if (DB.isDemo) {
        var state = demoRead();
        state.submissions.forEach(function (s) { if (s.id === id) s.status = status; });
        demoWrite(state);
        return Promise.resolve(true);
      }
      return client.from('submissions').update({ status: status }).eq('id', id).then(function (res) {
        if (res.error) fail(res.error, 'updateSubmissionStatus');
        return true;
      });
    },

    // ---------- авторизация админа ----------
    auth: {
      /**
       * В режиме Supabase: email + пароль пользователя из Authentication → Users.
       * В демо-режиме: email игнорируется, пароль — локальный DEMO_PWD.
       */
      signIn: function (email, password) {
        if (DB.isDemo) {
          if (password === DEMO_PWD) {
            try { sessionStorage.setItem('demo_admin', '1'); } catch (e) { /* приватный режим */ }
            return Promise.resolve({ email: 'demo@local' });
          }
          return Promise.reject(new Error('Неверный пароль'));
        }
        return client.auth.signInWithPassword({ email: email, password: password }).then(function (res) {
          if (res.error) fail(res.error, 'signIn');
          return res.data.user;
        });
      },

      signOut: function () {
        if (DB.isDemo) {
          try { sessionStorage.removeItem('demo_admin'); } catch (e) { /* noop */ }
          return Promise.resolve(true);
        }
        return client.auth.signOut().then(function () { return true; });
      },

      /** Возвращает пользователя или null. Используется при загрузке страницы. */
      currentUser: function () {
        if (DB.isDemo) {
          var ok = false;
          try { ok = sessionStorage.getItem('demo_admin') === '1'; } catch (e) { /* noop */ }
          return Promise.resolve(ok ? { email: 'demo@local' } : null);
        }
        return client.auth.getSession().then(function (res) {
          return (res.data && res.data.session && res.data.session.user) || null;
        });
      },
    },
  };

  window.DB = DB;
})();
