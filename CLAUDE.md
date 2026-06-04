# CLAUDE.md - Deep Dive Planner (MyOxygen)

## Project Overview

Club management application for **Team Oxygen**, an eco-friendly diving and freediving association based in the Martigues-Marseille region of France. Built with React + TypeScript + Supabase. All UI text is in French.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite (port 8080)
- **Routing:** React Router v7
- **UI:** Tailwind CSS 3, shadcn/ui (Radix primitives), Lucide icons
- **State/Data:** TanStack React Query, React Hook Form + Zod validation
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions via Deno)
- **Maps:** Leaflet
- **Charts:** Recharts
- **PDF:** jsPDF + html2canvas
- **Deployment:** Vercel

## Commands

```bash
npm run dev        # Start dev server (port 8080)
npm run build      # Production build (output: dist/)
npm run build:dev  # Development mode build
npm run lint       # ESLint check
npm run preview    # Preview production build
```

There is no test suite configured in this project.

## Project Structure

```
src/
  components/       # React components organized by feature
    admin/          # Admin management
    carpool/        # Ride-sharing coordination
    emergency/      # Emergency SOS modal
    equipment/      # Equipment tracking
    layout/         # Layout and header
    locations/      # Dive site mapping
    outings/        # Outing management (core feature)
    participants/   # Participant display
    pdf/            # PDF report generation (12 page types)
    poss/           # POSS diving safety plan generator
    ui/             # shadcn/ui component library (40+ components)
    weather/        # Marine weather
  contexts/
    AuthContext.tsx  # Supabase auth state provider
  hooks/            # 18 custom React hooks for data fetching
  integrations/
    supabase/
      client.ts     # Supabase client init
      types.ts      # Auto-generated DB types (do not edit manually)
  lib/
    utils.ts        # Tailwind cn() helper
    csvImport.ts    # CSV member import
  pages/            # 18 page-level route components
  App.tsx           # Root: providers + router setup
  main.tsx          # React entry point
  index.css         # Tailwind config + CSS custom properties

supabase/
  config.toml       # Local Supabase dev config
  functions/        # 6 Deno edge functions (email, notifications, coordinates)
  migrations/       # 40+ SQL migration files

public/             # Static assets, PWA manifest, favicons
```

## Architecture Patterns

- **Authentication:** Supabase Auth with email/password, managed via `AuthContext`
- **Data fetching:** Custom hooks wrapping Supabase queries + React Query for caching. Query keys follow hierarchical naming: `["outings"]`, `["equipment-catalog"]`, etc.
- **Component hierarchy:** Pages -> Feature components -> shadcn/ui primitives
- **Forms:** React Hook Form + Zod schemas for validation
- **Mutations:** React Query `useMutation` wrapping Supabase insert/update/delete
- **Edge Functions:** Deno-based serverless functions for email (Brevo SMTP) and secure data access

## Key Conventions

- **Language:** All user-facing text is in French
- **Components:** Functional components with hooks, PascalCase filenames (`OutingCard.tsx`)
- **Hooks:** camelCase filenames prefixed with `use` (`useOutings.ts`)
- **Styling:** Tailwind utilities + marine-themed CSS custom properties (ocean blues, foam white, cyan accents). Dark mode via `dark` class and `next-themes`.
- **TypeScript:** Strict mode is OFF (`tsconfig.app.json`). ESLint rules for unused vars/params are disabled.
- **Supabase types:** Auto-generated in `src/integrations/supabase/types.ts` -- regenerate via Supabase CLI, do not edit by hand.
- **No test framework:** There are no automated tests. Validate changes by running `npm run build` and `npm run lint`.

## Database

Core tables: `outings`, `reservations`, `profiles`, `club_members_directory`, `equipment_catalog`, `equipment_inventory`, `equipment_history`, `boats`, `carpools`, `carpool_passengers`, `locations`.

Key enums: `equipment_status`, `user_role`, `booking_status`.

Full schema is defined across `supabase/migrations/` and summarized in `migration_complete.sql`.

## Environment Variables

```
VITE_SUPABASE_PROJECT_ID    # Supabase project ID
VITE_SUPABASE_PUBLISHABLE_KEY  # Public anon key
VITE_SUPABASE_URL           # Supabase API URL
```

## Gotchas

- Project was scaffolded with **Lovable AI** -- `lovable-tagger` Vite plugin is present and should remain.
- The `types.ts` file is auto-generated and nearly 1000 lines. Never edit it manually.
- Edge functions use Deno imports (URL-based), not npm.
- DÃ©ploiement via **Vercel** (pas Netlify) â€” chaque merge sur `main` dÃ©clenche un dÃ©ploiement automatique.

## Git Workflow — RÈGLES STRICTES (app en production)

⚠️ L'application est en production. Ne jamais pousser directement sur main.

### Process obligatoire pour tout changement

1. **Créer une branche** avec un nom explicite :
   - ix/description-de-ce-qui-est-corrige
   - eat/description-de-la-nouvelle-fonctionnalite
   - chore/description-de-la-tache-technique

2. **Committer sur la branche** (jamais sur main directement)

3. **Créer une PR** vers main avec une description claire de ce qui change et pourquoi

4. **C'est le propriétaire du projet qui merge** — Claude ne merge jamais lui-même sur main

### Commandes type
```bash
git checkout -b fix/mon-correctif
git add <fichiers>
git commit -m "fix: description courte du correctif"
git push origin fix/mon-correctif
# Puis créer la PR sur GitHub
```

### Déploiement
- Chaque merge sur main déclenche un déploiement automatique sur **Vercel**
- Tester sur la preview Vercel de la PR avant de merger si possible
