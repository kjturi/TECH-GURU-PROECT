# Inventory Dashboard (React 19 + Firebase)

A React 19 rebuild of the original static HTML prototype (`dashboard.html`,
`asset.html`), backed by Firebase Firestore for live data instead of
hardcoded table rows. The legacy HTML files are kept in the repo root for
reference and are no longer used by the app.

## Stack

- **React 19** + **Vite** for the build/dev server
- **react-router-dom v7** for the Dashboard / Assets / Categories / Suppliers
  / Reports pages, matching the original sidebar navigation
- **Firebase Firestore** for the `assets` collection (real-time sync via
  `onSnapshot`), with a small Firebase CLI setup for security rules and
  hosting

## Project layout

```
src/
  firebase.js          Firebase app + Firestore init (reads Vite env vars)
  hooks/useAssets.js    Live Firestore subscription + add/delete/seed helpers
  data/sampleAssets.js  Seed data merged from the two original HTML pages
  components/           Sidebar, Layout, Topbar, DataState (loading/error/empty)
  pages/                Dashboard, Assets, Categories, Suppliers, Reports
firebase.json           Firebase CLI config (Firestore rules + Hosting)
firestore.rules         Firestore security rules (open for dev, see notes below)
```

## 1. Install dependencies

```bash
npm install
```

## 2. Set up a Firebase project

1. Go to the [Firebase console](https://console.firebase.google.com/) and
   create a project (or reuse one).
2. Add a **Web app** to the project (</> icon) to get your config values.
3. Enable **Firestore Database** (Build → Firestore Database → Create
   database). Start in test mode for local development.
4. Copy `.env.example` to `.env` and fill in the values from step 2:

   ```bash
   cp .env.example .env
   ```

   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_FIREBASE_MEASUREMENT_ID=...
   ```

   `.env` is git-ignored — never commit real keys.

## 3. Run the app

```bash
npm run dev
```

Open the printed local URL. If Firestore is empty, every page shows a
**"Seed sample data"** button that writes the original prototype's rows
(merged into one schema: name, category, quantity, condition, location,
supplier) into the `assets` collection. After that, the Dashboard, Assets,
Categories, Suppliers, and Reports pages all read from and stay in sync with
that same live collection. The Assets page also has a small form to add new
assets and a **Delete** action per row, both writing straight to Firestore.

## 4. (Optional) Firebase CLI for rules & hosting

```bash
npm install -g firebase-tools
firebase login
cp .firebaserc.example .firebaserc   # then edit in your project id
firebase deploy --only firestore:rules
npm run build
firebase deploy --only hosting
```

**Security note:** `firestore.rules` currently allows open read/write since
the app has no authentication yet. That's fine for local development, but
before deploying anywhere public, add Firebase Authentication and tighten the
rule to `allow read, write: if request.auth != null;` (or per-user rules).

## Notes on the migration from the static prototype

- The original `dashboard.html` and `asset.html` used two different table
  schemas (dashboard: Asset/Category/Stock/Supplier; assets page:
  Name/Category/Quantity/Condition/Location). These were unified into one
  `assets` document shape so both views — and the new Categories/Suppliers/
  Reports pages — can share one Firestore collection.
- The per-table `keyup` search filter from the original inline `<script>`
  tags was reimplemented as React state (`useState` + `.filter()`) per page.
- "Low stock" uses the same threshold (< 10 units) implied by the original
  dashboard's sample numbers; adjust `LOW_STOCK_THRESHOLD` in
  `src/data/sampleAssets.js` if needed.
