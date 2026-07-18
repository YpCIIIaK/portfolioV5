# Личный кабинет (Workspace)

GitHub-логин + приватные **заметки / календарь / задачи**, встроенные в IDE-портфолио.
Открывается из боковой панели **Extensions** (иконка с кубиками).

- **Гость** видит вкладки в демо-режиме (read-only, примеры данных).
- **Владелец** (твой GitHub id) после входа получает полный CRUD, данные хранятся в Supabase.
- Без настроенных переменных окружения сайт работает как раньше — фича просто остаётся в демо-режиме.

## Как это устроено

| Слой | Файлы |
| --- | --- |
| Сессия (подписанная HMAC-cookie) | [src/lib/auth.ts](../src/lib/auth.ts) |
| GitHub OAuth | [src/app/api/auth/](../src/app/api/auth/) (`login`, `callback`, `logout`, `me`) |
| Доступ к БД (PostgREST) | [src/lib/supabase.ts](../src/lib/supabase.ts) |
| CRUD, только владелец | [src/app/api/workspace/[kind]/route.ts](../src/app/api/workspace/%5Bkind%5D/route.ts) |
| UI-панели | [src/components/workspace/](../src/components/workspace/) |
| Виртуальные «файлы»-вкладки | `WORKSPACE_FILES` в [src/lib/files.ts](../src/lib/files.ts) |

Безопасность: cookie `HttpOnly` + подпись HMAC-SHA256 (`AUTH_SECRET`); владельцем считается **только** тот, чей GitHub id равен `OWNER_GITHUB_ID`. Любой другой валидный вход GitHub = гость. Service-role-ключ Supabase используется исключительно на сервере.

## Настройка (≈5 минут)

1. **GitHub OAuth App** — https://github.com/settings/developers → *New OAuth App*
   - Homepage URL: `http://localhost:3000` (и отдельное приложение/URL для прод-домена)
   - Authorization callback URL: `http://localhost:3000/api/auth/callback`
   - Скопируй **Client ID** и сгенерируй **Client secret** → в `.env`.
2. **Свой GitHub id** — открой https://api.github.com/users/YpCIIIaK, возьми число из поля `id` → `OWNER_GITHUB_ID`.
3. **AUTH_SECRET** — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
4. **Supabase** — создай проект, выполни [docs/workspace-schema.sql](./workspace-schema.sql) в SQL-редакторе, затем
   *Project Settings → API*: `Project URL` → `SUPABASE_URL`, `service_role` ключ → `SUPABASE_SERVICE_ROLE_KEY`.
5. Заполни значения в `.env` (шаблон — в `.env.example`) и перезапусти `npm run dev`.

На Vercel добавь те же переменные в *Settings → Environment Variables* и заведи отдельный
GitHub OAuth App с прод-callback `https://твой-домен/api/auth/callback`.

## Почта (IMAP, опционально)

Вкладка **Почта** и виджет на Главной читают входящие по IMAP (только чтение).
Без OAuth — нужен **пароль приложения** (app password), не основной пароль аккаунта.

1. Заведи пароль приложения у своего провайдера:
   - **Яндекс** — Настройки → Безопасность → Пароли приложений → «Почта (IMAP)», `imap.yandex.ru:993`
   - **Gmail** — включи 2FA → https://myaccount.google.com/apppasswords, `imap.gmail.com:993`
   - **Mail.ru** — Настройки → Пароли для внешних приложений, `imap.mail.ru:993`
2. Впиши в `.env`: `MAIL_IMAP_HOST`, `MAIL_IMAP_PORT`, `MAIL_USER`, `MAIL_PASSWORD`.

Без этих переменных вкладка показывает демо-письма. Доступ — только владелец
(`GET /api/mail/messages` за `requireOwner()`); пароль живёт лишь на сервере.

## Notion (OAuth, опционально)

Вкладка **Notion** ищет и читает страницы, тянет задачи из выбранной базы (они
попадают в общий список задач и в сводку ассистента) и создаёт страницы/заметки.

1. **Публичная интеграция** — https://www.notion.so/my-integrations → *New integration*,
   тип **Public**. В настройках OAuth укажи Redirect URI
   `https://твой-домен/api/notion/callback` (локально `http://localhost:3000/api/notion/callback`).
2. Скопируй **OAuth client id / secret** → `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET` в `.env`.
   Нужен настроенный Supabase (токен владельца хранится в таблице `ws_integrations`).
3. Запусти [docs/workspace-schema.sql](./workspace-schema.sql) заново — он создаст
   таблицу `ws_integrations` (безопасно для существующих БД).
4. Открой вкладку **Notion** → **Подключить Notion** → выбери рабочее пространство и
   страницы, к которым дать доступ. В самом Notion страницу/базу тоже нужно
   поделить с интеграцией (⋯ → **Connections**), иначе она их не увидит.
5. Во вкладке **Задачи · базы** отметь базу как источник задач — её строки
   появятся в общем списке задач.

Токен неистекающий, лежит только на сервере (service-role Supabase). Кнопка
**Отключить** удаляет строку `ws_integrations` и забывает токен. Доступ ко всем
`/api/notion/*` — только владелец (`requireOwner()`).

## Диаграммы (блок-схемы)

Вкладка **Диаграммы** — собственный движок блочных досок (в духе boardmix/Miro),
без внешних зависимостей, рендер на SVG. Доски хранятся в Supabase (`ws_diagrams`),
только у владельца; гости видят демо-доску в read-only.

- **Блоки и связи:** двойной клик по холсту — новый блок; тяни за кружок на
  выделенном блоке к другому — стрелка-связь. Двойной клик по блоку — правка текста.
- **Холст:** колесо — зум (к курсору), перетаскивание пустого места — панорама,
  привязка блоков к сетке. Кнопка «вписать» центрирует доску.
- **Стили:** формы (прямоугольник, скруглённый, ромб, эллипс), палитра заливки/обводки,
  пунктир и стрелка для связей.
- **История и экспорт:** undo/redo (Ctrl+Z / Ctrl+Shift+Z), Delete — удалить
  выделенное, автосохранение в БД, экспорт в **SVG** и **PNG**.

Модель и геометрия — [src/lib/diagram.ts](../src/lib/diagram.ts), редактор —
[src/components/workspace/DiagramPanel.tsx](../src/components/workspace/DiagramPanel.tsx).
Требует того же Supabase; запусти заново [docs/workspace-schema.sql](./workspace-schema.sql),
чтобы создать таблицу `ws_diagrams`.

## Проверка

- `GET /api/auth/me` → `{ "user": null, "configured": true }` после настройки OAuth.
- Войди через GitHub → если id совпал с `OWNER_GITHUB_ID`, в панели Workspace появится «Владелец · полный доступ».
- Создай заметку/задачу/событие → строки появятся в таблицах `ws_*` в Supabase.
