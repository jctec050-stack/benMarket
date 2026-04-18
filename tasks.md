# Migration Tasks

- [x] **Phase 1: Setup & Initialization**
    - [x] Create `legacy_backup` folder and move current files (excluding `node_modules` and `.git` if any).
    - [x] Initialize Next.js project in root (`npx create-next-app@latest .`).
    - [x] Install dependencies: `@supabase/supabase-js`, `jspdf`, `jspdf-autotable`, `xlsx`, `lucide-react`, `clsx`, `tailwind-merge` (optional but good for utils).
    - [x] Configure `jsconfig.json` for absolute imports (`@/*`).

- [x] **Phase 2: Core Infrastructure**
    - [x] Create `lib/supabase.js` client.
    - [x] Migrate `src/js/supabase.js` logic to `lib/db.js` (Service layer).
    - [x] Create `lib/utils.js` (formatting, helpers).
    - [x] Create `context/AuthContext.js` for user session management.
    - [x] Create `context/DataContext.js` for data fetching and offline sync.

- [x] **Phase 3: UI & Styling**
    - [x] Migrate `src/css/styles.css` to `app/globals.css`.
    - [x] Create `components/layout/Navbar.js`.
    - [x] Create `app/layout.js` wrapping children with Providers and Navbar.
    - [x] Create `components/ui/Modal.js`.
    - [x] Create `components/ui/Button.js` and `Input.js` (optional, can use HTML tags first).

- [x] **Phase 4: Page Migration**
    - [x] **Login Page:** Create `app/login/page.js`.
    - [x] **Dashboard (Ingresos):** Create `app/page.js`.
        - [x] Migrate "Movimientos Generales" form.
        - [x] Migrate "Historial de Ingresos".
    - [x] **Egresos:** Create `app/egresos/page.js`.
    - [x] **Operaciones:** Create `app/operaciones/page.js`.
    - [x] **Arqueo:** Create `app/arqueo/page.js`.
    - [x] **Resumen:** Create `app/resumen/page.js`.

- [x] **Phase 5: Features & Polish**
    - [x] Implement PDF Export logic in React (`lib/pdfExport.js` + Arqueo).
    - [x] Implement Excel Export logic (`lib/excelExport.js` + Resumen).
    - [x] Verify Offline Sync mechanism (`lib/db.js` `syncOfflineData` + `DataContext` hooks).
    - [x] Final UI cleanup and responsiveness check.
