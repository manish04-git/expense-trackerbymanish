# Expense Tracker (React + Firebase Spark)

A personal finance web app and installable PWA: accounts, transactions, budgets, categories, reports,
recurring transactions, savings goals, subscriptions, calendar and rule-based insights.

**Stack:** React 18 + Vite (JavaScript) · Tailwind CSS v4 · React Router · Redux Toolkit · React Hook Form + Zod ·
Recharts · Sonner · date-fns · Firebase Auth / Firestore / Hosting / App Check (optional Analytics).
**Cost target:** Firebase **Spark (free)** plan. No Cloud Functions, no Storage, no SMS auth, no paid APIs.

> ⚠️ This project was generated without network access, so `npm install` / `npm run build` / the emulator
> tests have **not** been run by the author. Every file was syntax-checked and all internal imports were
> verified, but expect to fix a small issue or two on first run. Start with `npm run dev`, then
> `npm test`, then `npm run test:rules`.

---

## 1. Prerequisites

* Node.js 20.19+ (or 22+) and npm
* A Google account (Firebase console)
* Java 11+ (only needed for the Firestore emulator used by `npm run test:rules`)

## 2. Firebase setup (all free-tier)

1. https://console.firebase.google.com → **Add project** (Spark plan is the default; do **not** upgrade).
   You can skip Google Analytics.
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable.**
   (Do not enable Phone: SMS can cost money.)
3. **Build → Firestore Database → Create database** → *Production mode* → pick a region close to you
   (e.g. `asia-south1` Mumbai). The region cannot be changed later.
4. **Project settings → Your apps → Web (`</>`)** → register an app → copy the config values.
5. (Optional, recommended) **Build → App Check → Apps → Web → reCAPTCHA v3** → register a site key.
   Do **not** click *Enforce* until you have verified the app works with App Check enabled.
6. Do **not** enable Cloud Storage (it needs the paid Blaze plan for new projects). This app does not use it.

## 3. Configure & run

```bash
npm install
cp .env.example .env.local        # then fill in the VITE_FIREBASE_* values
# edit .firebaserc and replace your-firebase-project-id with your project id
npm run dev                       # http://localhost:5173
```

The Firebase web config is **not a secret**; protection comes from Authentication, Security Rules and
App Check. `.env.local` is git-ignored only for per-environment convenience.

## 4. Deploy rules, indexes and hosting

```bash
npx firebase login
npm run deploy:rules              # firestore.rules + firestore.indexes.json
npm run deploy                    # build + hosting + rules/indexes
```

Indexes take a few minutes to build. If a screen shows *"needs a Firestore index"*, the index is still
building (or not deployed yet). In the Firebase console → Authentication → Settings → **Authorized domains**,
add your own domain if you use one (the `*.web.app` / `*.firebaseapp.com` domains are pre-authorised).

## 5. Tests

```bash
npm test                # unit tests: currency, calculations (income/expense/refund/transfer, balances, budgets), dates
npm run test:rules      # starts the Auth + Firestore EMULATORS and runs the security-rules and auth tests
npm run emulators       # run the emulators manually (UI at http://localhost:4000)
```

To use the emulators with the app itself, set `VITE_USE_EMULATORS=true` in `.env.local` – no production data
is touched.

## 6. Spark plan: what to know

| Item | Free (Spark) allowance (verify on firebase.google.com/pricing) | How the app stays inside it |
|---|---|---|
| Firestore reads / writes / deletes | 50k / 20k / 20k per day, 1 GiB stored | Persistent local cache, one shared listener for "last month + this month", paginated lists, range-limited queries, no "fetch everything" except explicit export/backup/recalculate actions |
| Authentication (email/password) | Free | – |
| Hosting | 10 GB storage, ~360 MB/day transfer | Small bundles, code-split routes |
| Cloud Functions / Storage / SMS | **Not available / paid** | Not used |

When a free quota is exhausted Firebase **stops serving** that product until the quota resets (you are not
billed on Spark). The app shows a friendly message for `resource-exhausted` errors.

## 7. Important limitations (read these)

1. **Recurring transactions run when you open the app.** Without Cloud Functions nothing can run while the
   app is closed. On open, every due occurrence is created (catch-up) using deterministic ids inside Firestore
   transactions, so an occurrence can never be created twice – even from two tabs.
2. **Balances are maintained by the client**, atomically (Firestore transactions) together with each
   transaction. Security Rules validate the *shape and ownership* of data but cannot verify that a balance
   equals the sum of transactions (that needs server code). Only the signed-in owner can change their own data.
   *Settings → Recalculate balances* rebuilds every balance from opening balance + all transactions.
3. **Writes need a connection.** Reads work offline from Firestore's persistent cache and the PWA caches the
   app shell, but creating/editing needs to be online (money logic uses Firestore transactions).
4. **Currency setting changes display only.** Amounts are integer minor units and are *not* converted when you
   switch between INR/USD/EUR/GBP.
5. **Reminders and alerts are in-app** (bell icon) and are created when the app is open. There is no push/e-mail.
6. **Language:** only English is implemented; the setting is in place for future translations.
7. **Legal pages are templates.** Have them reviewed before a public launch.
8. **Account deletion** removes data client-side (document by document) and then the auth user; for very large
   accounts this can take a while.

## 8. Accounting rules

* Money is stored as **integer minor units** (paise for INR). No floating-point math on money.
* `income` +account · `expense` −account · `refund` +account **and reduces expenses** (never counted as income) ·
  `transfer` −source +destination (never income/expense; net worth unchanged).
* Credit cards keep a **negative** balance (= outstanding). A purchase is an expense when made; the repayment
  is a transfer from your bank account, so nothing is counted twice.
* Savings-goal contributions are tracked on the goal only – they are **not** expenses.
* Dates are stored as a timezone-neutral `dateKey` (`yyyy-MM-dd`) plus a Firestore `Timestamp`.
* Duplicate prevention: every "Add transaction" form gets one id when it opens; a retried save is a no-op.

## 9. Firestore data model

```
users/{uid}                          profile (uid, email, displayName, timestamps)
users/{uid}/accounts/{id}            name, type, openingBalance, balance, color, archived
users/{uid}/transactions/{id}        type, amount, categoryId, accountId, toAccountId, paymentMethod, date, dateKey, description, notes, recurringId?
users/{uid}/categories/{id}          name, type, icon, color, isDefault
users/{uid}/budgets/{id}             name, kind(overall|category), categoryId?, period(weekly|monthly|custom), amount, startDate?, endDate?
users/{uid}/recurringTransactions/{id}  title, type, amount, categoryId, accountId, frequency, startDate, endDate?, runCount, active, lastRunAt
users/{uid}/savingsGoals/{id}        name, targetAmount, currentAmount, targetDate?, completed, history[≤100]
users/{uid}/subscriptions/{id}       name, amount, billingCycle, nextPaymentDate, categoryId, reminderDays, active
users/{uid}/notifications/{id}       kind, title, message, read   (deterministic ids ⇒ no duplicate alerts)
users/{uid}/settings/preferences     currency, language, theme, dateFormat, fyStartMonth, defaultAccountId, notifications
```

Every document carries `userId`; `userId` and `createdAt` are immutable; timestamps use `serverTimestamp()`.

## 10. Project structure

```
src/
  app/store.js               Redux store
  components/                common (Button, Field, Modal, Card, Feedback…), layout, charts, dashboard, transactions
  constants/                 enums, default categories, icons, navigation
  features/                  business logic per domain (accounts, categories, recurring, savings, settings services)
  hooks/                     data sync, range queries, formatters, alerts, install prompt…
  layouts/                   AppLayout (sidebar/topbar/bottom nav), AuthLayout
  pages/                     route components (lazy-loaded)
  routes/                    route table + auth guards
  services/firebase/         firebase.config, auth.service, firestore.service, transactions.service
  store/slices/              ui, auth, settings, data
  utils/                     currency, date, calculations, insights, validators, csv, errors, theme
firestore.rules · firestore.indexes.json · firebase.json · tests/rules/*
```

## 11. Security checklist

* Strict, validated Firestore rules (no `allow … if true`); nothing readable without sign-in; per-user isolation.
* Enable **App Check** (reCAPTCHA v3) and enforce it for Firestore after verifying; add `localhost` debug tokens for development.
* CSV export neutralises spreadsheet-formula injection.
* Hosting sends `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`. Consider adding a
  Content-Security-Policy once you know all the origins you use (Firebase, Google Fonts).
* Password reset uses Firebase's emailed link; changing the password and deleting the account require re-authentication.

## 12. PWA

* Manifest + icons + auto-updating service worker (`vite-plugin-pwa`), custom **Install app** buttons, offline banner.
* The cached app shell opens offline; Firestore's persistent cache supplies data you have already loaded.
* Test with `npm run build && npm run preview`, then Chrome DevTools → Application → Manifest / Service Workers / "Offline".
