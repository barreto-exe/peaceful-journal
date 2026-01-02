# Peaceful Journal

App de journaling web (React 19 + Vite 7 + MUI 6) con Firebase Realtime Database y autenticación Email/Password.

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
- `src/firebase.js`: inicializa Firebase App, Auth y Database leyendo `import.meta.env.VITE_*`.
- `src/App.jsx`: controla sesión de Firebase Auth, gestión de espacio/ID (persistido en `localStorage`), tabs de navegación y suscripciones en tiempo real con `onValue` a `entries` y `groups`.
- Componentes clave:
  - `LoginPage`: login/registro con Email/Password.
  - `SpaceSelector`: unirse/crear ID corto de espacio (6 chars A-Z,2-9) y persistirlo.
  - `EntryList`: CRUD de entradas con edición inline, chips de estado, switches `ready/done`, scroll en listas largas.
  - `BatchEntryPanel`: alta masiva por líneas.
  - `GroupsManager`: crea/renombra/borra grupos y administra membresías con checkboxes.
  - `Dashboard`: resumen vivo, toggles de estado diario.

## Modelo de datos (Realtime Database)
```
root/{SPACE_ID}/
  entries/{entryId}: {
    title, content, date, mood, ready, done, createdAt
  }
  groups/{groupId}: {
    name, memberIds: []
  }
```
Suscripciones en tiempo real con `onValue` sobre `entries` y `groups`. Escrituras con `push`, `set`, `update`, `remove`.

## Autenticación
- Email/Password via `firebase/auth`.
- Botón de logout limpia el espacio y cierra sesión.

## Reglas de DB (dev ejemplo)
`database.rules.json` contiene reglas abiertas para desarrollo. Endurece antes de producción (usa auth y validaciones más estrictas).

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
- Workflow `.github/workflows/deploy.yml` se ejecuta en `push` a `main`.
- Usa `npm ci` + `npm run build` con `VITE_*` desde GitHub Secrets.
- Deploy con `FirebaseExtended/action-hosting-deploy@v0` usando `FIREBASE_SERVICE_ACCOUNT` y `VITE_FIREBASE_PROJECT_ID`.

## Notas
- Las claves `VITE_*` se exponen en cliente; protege datos sensibles con reglas de DB.
- El ID de espacio se guarda en `localStorage`; "Salir" limpia y regresa a bienvenida.
