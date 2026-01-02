# Peaceful Journal – AI Coding Notes

- **Stack & entry**: React 19 + Vite 7 + MUI 6. App mounts in [src/main.jsx](src/main.jsx) with `ThemeProvider` and `CssBaseline` using the custom theme from [src/theme.js](src/theme.js).
- **Firebase bootstrap**: [src/firebase.js](src/firebase.js) initializes App/Auth/Realtime DB from `import.meta.env.VITE_*`. Ensure all keys exist or auth init will throw at startup.
- **Auth flow**: [src/App.jsx](src/App.jsx) subscribes to `onAuthStateChanged`, renders nothing while `checkingAuth`, shows [LoginPage](src/pages/LoginPage.jsx) when signed out, and shows a minimal welcome screen with an AppBar + `signOut` button when signed in.
- **Login/Signup page**: [src/pages/LoginPage.jsx](src/pages/LoginPage.jsx) toggles between login and signup, uses `signInWithEmailAndPassword` / `createUserWithEmailAndPassword`, surfaces Firebase error messages verbatim, and calls the optional `onSuccess` callback (currently a no-op in `App`). Password field includes show/hide toggle via `InputAdornment`.
- **Styling conventions**: Centralized MUI theme (light) with primary `#2f6f8f`, secondary `#f9a826`, rounded corners (12px), and button `textTransform: none`. Prefer MUI layout primitives (`Box`, `Stack`, `Container`, `Card`). Typography uses Segoe UI/Helvetica stack.
- **State patterns**: Hooks-only, no global state/store. Auth state lives in `App`; pass callbacks/props for navigation-like flows. Keep side effects inside `useEffect` with cleanups.
- **Environment setup**: Copy `.env.example` → `.env` (not tracked). Required vars: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_DATABASE_URL`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
- **Build/run**: `npm ci`, `npm run dev` for local, `npm run build` for production bundle, `npm run preview` to serve the built app, `npm run lint` for ESLint (React 9 config + hooks + react-refresh plugins).
- **Hosting config**: [firebase.json](firebase.json) rewrites everything to `index.html` and serves `dist`; [vite.config.js](vite.config.js) is default react plugin config.
- **Database rules**: See [database.rules.json](database.rules.json) for Realtime DB permissions; DB is initialized as `db` export though currently unused.
- **CI/CD**: GitHub Actions in [.github/workflows](.github/workflows) run `npm ci && npm run build` with injected `VITE_*` secrets; `firebase-hosting-merge.yml` deploys to the live channel on `main`, `firebase-hosting-pull-request.yml` creates preview channels for PRs (same-repo only). Service account secret: `FIREBASE_SERVICE_ACCOUNT_BARRETOEXE_PEACE_JOURNAL`.
- **Deployment manual**: `firebase deploy --only hosting` after `npm run build` (requires local Firebase CLI auth and matching project).
- **Error handling**: Errors from Firebase Auth are shown directly in the login form; adapt messaging upstream if user-facing polish is needed.
- **Extending UI**: Add new screens under `src/pages/` and route via conditional logic in `App` (no router yet). Reuse the theme palette and spacing; prefer `Container` and `Card` for auth-like flows.
- **Auth guard pattern**: If you add data features, assume components may render briefly with `user === null`; either early-return or gate on `hasSession` from `App`.
- **Internationalization**: Copy uses Spanish labels; keep new UI strings consistent or extract constants if expanding locales.
- **Known gaps**: No tests, routing, or DB usage yet; components directory is empty. Keep code lean and prefer simple prop drilling over new state managers unless complexity increases.
