# Peaceful Journal

App mínima con React 19 + Vite 7 + MUI 6 y autenticación Firebase Email/Password. Tras iniciar sesión solo muestra una pantalla de bienvenida con barra superior y botón de salir.

## Requisitos
- Node 20+
- Proyecto Firebase con Auth (Email/Password) y Realtime Database habilitados

## Configuración
1) Copia las variables:
```
cp .env.example .env
```
Completa las claves `VITE_*` con los valores de tu proyecto Firebase.

2) Instala dependencias:
```
npm ci
```

3) Ejecuta en local:
```
npm run dev
```

## Arquitectura
- `src/main.jsx`: monta `<App/>` con `ThemeProvider` y `CssBaseline`.
- `src/firebase.js`: inicializa Firebase App y Auth leyendo `import.meta.env.VITE_*`.
- `src/App.jsx`: escucha el estado de Auth y muestra:
  - Si no hay sesión: `LoginPage` (registro/login).
  - Si hay sesión: AppBar con botón “Salir” y un mensaje de bienvenida con el email del usuario.
- `src/pages/LoginPage.jsx`: formulario de login/registro Email/Password.

## Autenticación
- Email/Password via `firebase/auth`.
- Botón de logout cierra sesión.

## Deploy Firebase Hosting
1) Build:
```
npm run build
```
2) `firebase.json` ya apunta a `dist` y rewrite a `index.html`.
3) Despliegue manual:
```
firebase deploy --only hosting
```

## CI/CD (GitHub Actions)
- Workflows `.github/workflows/firebase-hosting-merge.yml` y `.github/workflows/firebase-hosting-pull-request.yml` ejecutan `npm ci && npm run build` con variables `VITE_*` desde secrets y despliegan con `FirebaseExtended/action-hosting-deploy@v0`.

## Notas
- Las claves `VITE_*` se exponen en cliente; protege datos sensibles con reglas de DB.
