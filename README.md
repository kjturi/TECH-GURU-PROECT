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
- **Firebase Authentication** (Google Sign-In) gating the Asset Requests
  approval pages
- **Google Forms + Apps Script** as the external request intake, writing
  straight to Firestore (see "Asset Request & Approval Workflow" below)

## Project layout

```
src/
  firebase.js               Firebase app + Firestore + Auth init (reads Vite env vars)
  hooks/useAssets.js         Live Firestore subscription + add/delete/seed helpers
  hooks/useAssetRequests.js  Live "assetRequests" subscription + approve/reject
  hooks/useAuth.js           Google Sign-In state
  hooks/useIsApprover.js     Checks the signed-in user against "approvers"
  data/sampleAssets.js       Seed data merged from the two original HTML pages
  components/                Sidebar, Layout, Topbar, DataState, AuthGate
  pages/                     Dashboard, Assets, Categories, Suppliers, Reports,
                              Approvals, ApprovalDetail
appsscript/Code.gs        Apps Script bound to the Google Form (copy/paste in)
firebase.json             Firebase CLI config (Firestore rules + Hosting)
firestore.rules           Firestore security rules
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

## Asset Request & Approval Workflow

This implements the Google Forms Request → Apps Script Workflow → Google SSO
Verification → Firestore Inventory → Firebase Web App pipeline, on the free
**Spark** plan (no Cloud Functions or Secret Manager, since those require the
paid Blaze plan). Instead, Apps Script writes to Firestore directly using a
Google Cloud service account and the Firestore REST API.

```
Google Form  --(onFormSubmit trigger)-->  Apps Script (appsscript/Code.gs)
     |                                          |
     | reads answers                            | writes doc, sends email
     v                                          v
requester's browser                    Firestore "assetRequests" (status: pending)
                                                 |
                                    Gmail link:  | https://<project>.web.app/approvals/<id>
                                                 v
                              Approvals / ApprovalDetail page (React app)
                                   - Google Sign-In (Firebase Auth)
                                   - checks "approvers/{email}" exists
                                   - Approve -> decrements matching assets.quantity
                                   - Reject  -> status: rejected
```

### 1. Create the Google Form

Create a Form with these questions (exact titles matter — they're mapped in
`appsscript/Code.gs`'s `FIELD_MAP`):

- **Your name** (short answer)
- **Your email** (short answer, "Response validation" → email)
- **Asset needed** (short answer — should match an existing `assets.name` in
  Firestore for the quantity to auto-decrement on approval)
- **Category** (short answer, optional)
- **Quantity** (short answer, "Response validation" → number)
- **Notes / justification** (paragraph, optional)

Open the Form's **Responses** tab → the green Sheets icon → **Create
spreadsheet** to link a response Sheet (Apps Script binds to this).

### 2. Create a service account for Apps Script

1. [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts) →
   select your Firebase project → **Create service account** (e.g.
   `apps-script-writer`).
2. Grant it the **Cloud Datastore User** role (`roles/datastore.user`) —
   this is the narrowest built-in role that can write to Firestore.
3. Open the new account → **Keys** → **Add key** → **Create new key** → JSON.
   A JSON file downloads — keep it out of version control.

### 3. Add the Apps Script

1. In the Form (or its response Sheet), **Extensions → Apps Script**.
2. Delete the placeholder code and paste in the contents of
   [`appsscript/Code.gs`](appsscript/Code.gs).
3. **Project Settings** (gear icon) → **Script Properties** → add:

   | Property | Value |
   |---|---|
   | `FIREBASE_PROJECT_ID` | `technology-graduates-2026` |
   | `SERVICE_ACCOUNT_EMAIL` | the downloaded key's `client_email` |
   | `SERVICE_ACCOUNT_PRIVATE_KEY` | the key's `private_key` (paste as-is, including the `\n`s) |
   | `APPROVAL_BASE_URL` | `https://technology-graduates-2026.web.app/approvals` |
   | `APPROVER_NOTIFY_EMAIL` | the email/group that should receive new-request notifications |

4. If your Form's question titles differ from the list in step 1, edit
   `FIELD_MAP` at the top of the script to match.
5. **Triggers** (clock icon) → **Add Trigger** → Function: `onFormSubmit_`,
   Event source: `From form`, Event type: `On form submit` → **Save**. The
   first save prompts you to authorize the script's permissions.
6. Test it: submit the Form once, then check **Executions** (left sidebar)
   for errors, and confirm a new document appeared in Firestore under
   `assetRequests`.

### 4. Enable Google Sign-In and add approvers

1. [Firebase Console](https://console.firebase.google.com/project/technology-graduates-2026/authentication/providers) →
   **Authentication** → **Sign-in method** → enable **Google**.
2. **Firestore Database** → **Data** → start collection `approvers` → add a
   document whose **Document ID** is your own email address (no fields
   needed) → repeat for each person allowed to approve/reject requests.
   Client writes to this collection are blocked by `firestore.rules` on
   purpose, so it's managed by hand in the console (or `firebase
   firestore:...` CLI commands) rather than from the app.
3. Visit `https://technology-graduates-2026.web.app/approvals`, sign in with
   Google, and you should see any test requests with working Approve/Reject
   buttons.

### Notes and limitations

- **Inventory linking is name-based**: on approval, the app looks for an
  `assets` document whose `name` exactly matches the request's `assetName`
  and decrements its `quantity`. If nothing matches, the request is still
  approved but flagged `inventoryLinked: false` in Firestore — there's no
  fuzzy matching or a dropdown tying the Form to the live catalog yet.
- **No reject → retry loop**: a rejected request just sits with
  `status: rejected`; nothing currently notifies the requester or lets them
  resubmit. Add a Gmail notification in `notifyApprover_`-style code if you
  want that.
- **The service account bypasses Firestore rules**, the same way the Admin
  SDK does — it's scoped by its IAM role (`Cloud Datastore User`), not by
  `firestore.rules`. Keep its JSON key private and don't broaden its role.
- **`dataconnect/`, `functions/`, and `invsync/`** in this repo are unrelated
  Firebase Studio scaffolding, not wired into this workflow.

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
