# Блог — навчальний проект

Простий блог-додаток, розроблений як навчальний проект для вивчення тестування програмного забезпечення.

## Технології

| Компонент         | Технологія                          |
|-------------------|-------------------------------------|
| Мова              | JavaScript (Node.js v18+)           |
| Фреймворк         | Express.js 4.x                      |
| СУБД              | SQLite (через `better-sqlite3`)     |
| Шаблонізатор      | EJS                                 |
| Аутентифікація    | bcryptjs + express-session          |
| Сесії             | connect-sqlite3                     |
| Завантаження файлів | Multer                            |
| Email             | Nodemailer                          |
| Валідація         | express-validator                   |

## Функціонал

- **Реєстрація та аутентифікація** — реєстрація, вхід, вихід
- **Скидання паролю** — через email-посилання з TTL токеном
- **Зміна паролю** — для авторизованих користувачів
- **Записи (Posts)** — створення, перегляд, редагування, видалення
- **Обкладинка** — завантаження зображення до запису
- **Коментарі** — додавання та видалення коментарів
- **Профіль** — перегляд та редагування профілю з аватаркою
- **Пошук** — пошук записів по заголовку та змісту
- **Пагінація** — постачання по 6 записів на сторінку

## Структура проекту

```
blog-app/
├── src/
│   ├── app.js                  # Точка входу, налаштування Express
│   ├── database.js             # Ініціалізація SQLite та схема БД
│   ├── middleware/
│   │   └── auth.js             # Middleware аутентифікації
│   ├── routes/
│   │   ├── auth.js             # Маршрути: register, login, logout, reset
│   │   ├── posts.js            # Маршрути: CRUD постів та коментарів
│   │   └── profile.js          # Маршрути: профіль користувача
│   ├── views/
│   │   ├── partials/           # header.ejs, footer.ejs
│   │   ├── auth/               # register, login, forgot/reset password
│   │   ├── posts/              # index, show, new, edit
│   │   ├── profile/            # show, edit
│   │   ├── 404.ejs
│   │   └── 500.ejs
│   └── public/
│       ├── css/style.css       # Стилі
│       ├── js/main.js          # Клієнтський JavaScript
│       └── uploads/            # Завантажені зображення (у .gitignore)
├── data/                       # SQLite БД (у .gitignore)
├── .env.example                # Приклад конфігурації
├── .gitignore
├── package.json
└── README.md
```

## Запуск локально

### 1. Клонування репозиторію

```bash
git clone https://github.com/YOUR_USERNAME/blog-app.git
cd blog-app
```

### 2. Встановлення залежностей

```bash
npm install
```

### 3. Налаштування змінних середовища

```bash
cp .env.example .env
# Відредагуйте .env, встановіть SESSION_SECRET та SMTP-налаштування
```

### 4. Запуск додатку

```bash
node src/app.js
# або для розробки:
npm run dev
```

Відкрийте браузер: **http://localhost:3000**

## Схема БД

```sql
users (id, username, email, password, bio, avatar, reset_token, reset_token_expires, created_at)
posts (id, title, slug, content, excerpt, cover_image, user_id, created_at, updated_at)
comments (id, content, user_id, post_id, created_at)
```

## Скидання паролю

Для роботи скидання паролю через email потрібно вказати SMTP-налаштування у `.env`.  
Для тестування можна безкоштовно отримати тестові SMTP-дані на [https://ethereal.email](https://ethereal.email).

> **Без SMTP:** посилання для скидання паролю виводиться у консолі сервера — це зручно для локального тестування.

## Ліцензія

MIT
