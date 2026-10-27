# StudyLeem — Static site + Firebase backend

Frontend: static HTML/CSS/JS (hosted on Vercel, or Firebase Hosting).
Backend: **Firebase** project `studyleem0786` — Firestore (database) + Authentication (admin login). No servers, no env vars.

```
firebase-client.js   Firebase SDK client (exposes DB, Auth, Messages to all pages)
firestore.rules      Security rules (public read of materials, admin-only writes)
firebase.json        Optional: deploys rules (and Firebase Hosting)
pro.css              UI layer on top of styles.css
```

## One-time Firebase setup (≈5 minutes, in the console)

1. **Firestore:** console.firebase.google.com → project *studyleem0786* → **Build → Firestore Database → Create database** (production mode, any region).
2. **Rules:** Firestore → **Rules** tab → paste the contents of `firestore.rules` → **Publish**.
3. **Auth:** **Build → Authentication → Get started → Sign-in method → Email/Password → Enable**.
4. **Admin user:** Authentication → **Users → Add user** (your email + strong password). Copy that user's **UID**.
5. **Authorize admin:** Firestore → **Start collection** `admins` → Document ID = the UID → add any field (e.g. `role: "admin"`) → Save.
6. **Authorized domains:** Authentication → Settings → **Authorized domains** → add your Vercel domain (e.g. `studyleem.vercel.app`) and any custom domain.

## Deploy

- **Vercel (current host):** push this folder to your GitHub repo → Vercel redeploys. No build settings, no environment variables. You can delete old Neon/`DATABASE_URL`/`ADMIN_*`/`AUTH_SECRET` variables.
- **CLI alternative:** `npm i -g firebase-tools && firebase login && firebase deploy --only firestore:rules` (add `,hosting` to also host on Firebase).

## Moving your data
Open `/admin-secure-panel-sl786` → **Stats → Backup & Import**.
- Before redeploying, open your current site's `/api/materials` in the browser, save the page as `materials.json`, then use **Import JSON** here. Document IDs are kept, so existing links keep working.
- Or use **Import from old Firebase** (project `studyleem786`) if it still exists.

## Notes
- Public reads are cached 5 min in the browser to stay inside the Firestore free quota; admin mode bypasses the cache.
- Contact form is validated by the rules (size/format) and has a honeypot + 30 s client throttle.
- LeemAI (`/leemai`) still uses its own backend at `leemai-production.up.railway.app` (not part of this project).
