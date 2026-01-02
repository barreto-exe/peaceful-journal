# Peaceful Journal

Diario personal con React 19 + Vite 7 + MUI 6 y Firebase (Auth + Realtime Database). Incluye entradas por día con editor enriquecido, gestión de perfil/idioma y vista “Acerca de”.

## Requisitos
- Node 20+
- Proyecto Firebase con Auth (Email/Password) y Realtime Database habilitados

## Configuración rápida
1) Copia variables de entorno y complétalas con tu proyecto Firebase:
  ```
  cp .env.example .env
  ```
2) Instala dependencias:
  ```
  npm ci
  ```
3) Ejecuta en local:
  ```
  npm run dev
  ```

## Funcionalidades
- Autenticación email/contraseña con Firebase.
- Página de diario: calendario por día, creación/edición/eliminación de entradas, editor enriquecido y confirmaciones de descarte/eliminación.
- Perfil: actualizar nombre, idioma de la interfaz (es/en), email y contraseña con reautenticación.
- Navegación superior con avatar iniciales y menú Perfil, Acerca de y Logout.
- Página Acerca de con resumen de uso, privacidad y requisitos de entorno.
- Internacionalización con i18next; preferencia de idioma persistida en `localStorage`.

## Arquitectura rápida
- [src/main.jsx](src/main.jsx): monta `<App/>` con `ThemeProvider` y `CssBaseline` usando el tema de [src/theme.js](src/theme.js).
- [src/firebase.js](src/firebase.js): inicializa Firebase App/Auth/DB leyendo `import.meta.env.VITE_*`.
- [src/i18n.js](src/i18n.js): recursos es/en y persistencia de idioma.
- [src/App.jsx](src/App.jsx): gestiona sesión y navega entre Diario, Perfil y Acerca de.
- Páginas: [src/pages/LoginPage.jsx](src/pages/LoginPage.jsx), [src/pages/JournalPage.jsx](src/pages/JournalPage.jsx), [src/pages/ProfilePage.jsx](src/pages/ProfilePage.jsx), [src/pages/AboutPage.jsx](src/pages/AboutPage.jsx).
- Componentes clave: [TopNavBar](src/components/TopNavBar.jsx), [RichTextEditor](src/components/RichTextEditor.jsx), [TwoStepConfirmDialog](src/components/TwoStepConfirmDialog.jsx).
- Datos: [src/data/journalDb.js](src/data/journalDb.js) suscribe/guarda entradas y perfil.

## Scripts útiles
- `npm run dev`: arranque en local.
- `npm run build`: bundle de producción.
- `npm run preview`: sirve el build.
- `npm run lint`: linting con la config React 9 + hooks.

## Deploy Firebase Hosting
1) Build: `npm run build`
2) `firebase.json` ya mapea `dist` y rewrite a `index.html`.
3) Desplegar manualmente: `firebase deploy --only hosting` (requiere `firebase login` y proyecto configurado).

## CI/CD
- Workflows en `.github/workflows` ejecutan `npm ci && npm run build` y despliegan a canales de Firebase Hosting usando secrets `VITE_*` y `FIREBASE_SERVICE_ACCOUNT_BARRETOEXE_PEACE_JOURNAL`.

## Notas de datos
- Las claves `VITE_*` quedan expuestas en cliente; protege datos sensibles ajustando las reglas de Realtime Database.
