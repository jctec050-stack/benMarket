# Migration to Next.js - Specification

## Goal
Migrate the existing vanilla HTML/JS/CSS application to a Next.js application to improve performance, fluidity, and scalability while maintaining the current design and functionality.

## Tech Stack
-   **Framework:** Next.js 14 (App Router)
-   **Language:** JavaScript (ES6+) / JSX
-   **Styling:** Global CSS (migrated from `styles.css`)
-   **Backend/Database:** Supabase (existing)
-   **Icons:** Lucide React (standard for modern React apps)
-   **Utilities:** `jspdf`, `xlsx` (existing)

## Architecture

### Directory Structure
```
/
├── app/
│   ├── layout.js       # Root layout (Metadata, Fonts, Global Providers)
│   ├── globals.css     # Migrated styles.css
│   ├── page.js         # Dashboard (Ingresos)
│   ├── login/          # Login page
│   ├── egresos/        # Egresos page
│   ├── operaciones/    # Operaciones page
│   ├── arqueo/         # Arqueo page
│   ├── resumen/        # Resumen page
│   └── ...
├── components/
│   ├── ui/             # Reusable UI components (Button, Input, Modal, Card)
│   ├── layout/         # Navbar, Sidebar
│   └── business/       # Business specific components (MovementForm, ArqueoTable)
├── lib/
│   ├── supabase.js     # Supabase client configuration
│   ├── db.js           # Database service functions (migrated from supabase.js)
│   ├── utils.js        # Helper functions
│   └── contexts/       # React Contexts (AuthContext, DataContext)
└── public/             # Static assets (images)
```

### State Management
-   **AuthContext:** Handles user authentication state (session, user profile).
-   **DataContext:** Handles global application state (movements, arqueos, settings) and offline sync logic.

### Migration Strategy
1.  **Setup:** Initialize Next.js project and dependencies.
2.  **Assets & Styles:** Move images and CSS.
3.  **Core Logic:** Port `supabase.js` to `lib/db.js` and `lib/supabase.js`.
4.  **Components:** Extract common UI elements (Navbar, Modals) into React components.
5.  **Pages:** Convert HTML pages to Next.js pages, replacing DOM manipulation with React state.

## Key Features to Preserve
-   Authentication (Supabase Auth).
-   Offline capabilities (using `localStorage` fallback in DataContext).
-   CRUD operations for "Movimientos", "Arqueos", "Egresos".
-   Dynamic forms (adding rows to tables).
-   PDF/Excel export.
