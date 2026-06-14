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
- **PDF pages:** Any change to a component in `src/components/pdf/pages/` MUST be visually verified with the `verify-pdf` skill (`node .claude/skills/verify-pdf/render-pdf-page.mjs <Component>`) — html2canvas renders flex alignment differently from the browser, so `npm run build` alone is not enough.

## Database

Supabase project ID: `hyoudezyqbivfthcgpma`. Full schema lives across `supabase/migrations/` (summarized in `migration_complete.sql`); the front-end source of truth for shapes is the auto-generated `src/integrations/supabase/types.ts`.

### Modèle de données (schéma `public`)

Tables et colonnes telles qu'exposées dans `types.ts`. `id` = `uuid` PK (défaut `gen_random_uuid()`) sauf indication. `→` = clé étrangère.

**`apnea_levels`** — référentiel des niveaux d'apnée
- `code`, `name`, `prerogatives?`, `is_instructor` (bool), `federation?`, `federation_full_name?`, `created_at`

**`boats`** — bateaux du club
- `name`, `capacity` (int), `home_port?`, `oxygen_location?`, `pilot_name?`, `pilot_phone?`, `registration_number?`, `created_at`, `updated_at`

**`carpools`** — covoiturages d'une sortie
- `outing_id` → `outings`, `driver_id`, `available_seats` (int), `departure_time`, `meeting_point`, `maps_link?`, `notes?`, `created_at`, `updated_at`

**`carpool_passengers`** — passagers d'un covoiturage
- `carpool_id` → `carpools`, `passenger_id`, `created_at`

**`club_members_directory`** — annuaire des membres (données civiles)
- `member_id`, `first_name`, `last_name`, `email`, `phone?`, `address?`, `birth_date?`, `gender?`, `joined_at?`, `emergency_contact_name?`, `emergency_contact_phone?`, `notes?`, `created_at`, `updated_at`

**`equipment_catalog`** — catalogue de matériel (modèles)
- `name`, `description?`, `estimated_value?` (num), `photo_url?`, `created_at`, `updated_at`

**`equipment_inventory`** — exemplaires physiques
- `catalog_id` → `equipment_catalog`, `owner_id` → `profiles`, `unique_code`, `status` (enum `equipment_status`), `acquired_at`, `notes?`, `photo_url?`, `created_at`, `updated_at`

**`equipment_history`** — historique des mouvements de matériel
- `inventory_id` → `equipment_inventory`, `action_type`, `created_by` → `profiles`, `from_user_id?` → `profiles`, `to_user_id?` → `profiles`, `old_status?`/`new_status?` (enum `equipment_status`), `notes?`, `created_at`

**`historical_outing_participants`** — participations historiques (import)
- `outing_id` → `outings`, `member_id` → `club_members_directory`, `created_at`

**`locations`** — sites de plongée / lieux
- `name`, `type?`, `address?`, `latitude?`, `longitude?`, `max_depth?` (num), `maps_url?`, `photo_url?`, `bathymetric_map_url?`, `satellite_map_url?`, `comments?`, `created_at?`, `updated_at?`

**`membership_yearly_status`** — statut adhésion par saison
- `member_id` → `club_members_directory`, `season_year` (int), `apnea_level?`, `board_role?`, `license_number?`, `is_encadrant` (bool), `payment_status` (bool), `medical_certificate_ok` (bool), `fsgt_insurance_ok` (bool), `buddies_charter_signed` (bool), `created_at`, `updated_at`

**`outings`** — sorties (fonctionnalité cœur)
- `title`, `date_time` (timestamp, **pas** `outing_date`), `end_date?`, `outing_type` (enum), `location` (texte), `location_id?` → `locations`, `boat_id?` → `boats`, `organizer_id?` → `profiles`, `organizer_member_id?` → `club_members_directory`, `max_participants` (int), `dive_mode?`, `description?`, `session_report?`, `photos?` (text[]), `water_entry_time?`, `water_exit_time?`, `reminder_sent?` (bool), `is_archived` (bool), `is_deleted` (bool — soft-delete), `is_poss_locked` (bool), `is_staff_only` (bool), `created_at?`, `updated_at?`
- Suppression logique : `UPDATE outings SET is_deleted = true WHERE id = ...` (`is_deleted` est un **boolean**, pas `1`).

**`profiles`** — comptes utilisateurs (lié à Supabase Auth, `id` = auth user id)
- `email`, `first_name`, `last_name`, `member_code?`, `member_status?` (enum `member_status`), `apnea_level?`, `specialty?`, `phone?`, `avatar_url?`, `created_at?`, `updated_at?`

**`reservations`** — inscriptions à une sortie
- `outing_id` → `outings`, `user_id` → `profiles`, `status?` (enum `booking_status`), `is_present?` (bool), `carpool_option?` (enum `carpool_option`), `carpool_seats?` (int), `cancelled_at?`, `created_at?`

**`site_waypoints`** — points GPS d'un site
- `site_id` → `locations`, `name`, `point_type` (enum `waypoint_type`), `latitude` (num), `longitude` (num), `created_at`

**`user_roles`** — rôles applicatifs (séparé de `profiles` pour la sécurité RLS)
- `user_id`, `role` (enum `app_role`)

### Enums

- `app_role`: `admin` | `organizer` | `member`
- `booking_status`: `confirmé` | `annulé` | `en_attente`
- `carpool_option`: `none` | `driver` | `passenger`
- `equipment_status`: `disponible` | `prêté` | `perdu` | `cassé` | `rebuté`
- `member_status`: `Membre` | `Encadrant`
- `outing_type`: `Fosse` | `Mer` | `Piscine` | `Étang` | `Dépollution`
- `waypoint_type`: `parking` | `water_entry` | `water_exit` | `meeting_point` | `dive_zone` | `toilet`

### Fonctions SQL (RPC)

- `can_view_member_details(_member_email)` → bool
- `get_club_stats(p_year?)` → json
- `get_outing_confirmed_count(outing_uuid)` → int
- `get_outing_participants(outing_uuid)` → set (avatar_url, first_name, id, last_name, member_status)
- `get_trombinoscope_members()` → set (apnea_level, avatar_url, board_role, email, first_name, id, is_encadrant, last_name)
- `has_role(_role, _user_id)` → bool
- `is_current_user_encadrant()` → bool · `is_encadrant_or_admin(_user_id)` → bool · `is_staff(_user_id)` → bool

### Notes / écarts

- Les rôles vivent dans `user_roles` (enum `app_role`), **pas** dans `profiles`. L'ancien `user_status`/`user_role` mentionné historiquement n'existe pas ; l'enum réel est `app_role`.
- Tables référencées par les triggers DWH mais **absentes de `types.ts`** (existent côté DB, pas exposées au front) : `polls`, `votes`, `outing_co_instructors`. À régénérer via Supabase CLI si besoin de typage.
- `types.ts` est auto-généré : ne jamais l'éditer à la main, régénérer via la CLI Supabase.

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

4. **Claude merge directement** après avoir créé la PR — pas besoin d'intervention manuelle

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

## Triggers DWH (datawarehouse externe)

Des triggers synchronisent certaines tables vers un DWH PowerBI. Leurs fonctions sont parfois **cassées** (colonnes manquantes). Si un INSERT/UPDATE échoue avec une erreur `column "xxx" of relation "dim_yyy" does not exist`, désactiver le trigger le temps de l'opération :

```sql
ALTER TABLE <table> DISABLE TRIGGER <trigger>;
-- opération ici
ALTER TABLE <table> ENABLE TRIGGER <trigger>;
```

### Triggers DWH — liste complète

| Table source | Trigger(s) DWH |
|--------------|----------------|
| `carpool_passengers` | `trg_dwh_carpool_passengers` |
| `carpools` | `trg_dwh_carpools` |
| `club_members_directory` | `trg_dwh_cmd` |
| `equipment_history` | `trg_dwh_equipment_history` |
| `equipment_inventory` | `trg_dwh_equipment_inventory` |
| `historical_outing_participants` | `trg_dwh_hist_participants` |
| `locations` | `trg_dwh_locations` |
| `membership_yearly_status` | `trg_dwh_membership`, `trg_dwh_mys`, `trg_dwh_mys_membre` |
| `outing_co_instructors` | `trg_dwh_co_instructeurs` |
| `outings` | `trg_dwh_outings_participation` |
| `polls` | `trg_dwh_options_sondage_polls`, `trg_dwh_polls` |
| `profiles` | `trg_dwh_profiles` |
| `reservations` | `trg_dwh_reservations` |
| `site_waypoints` | `trg_dwh_waypoints` |
| `user_roles` | `trg_dwh_user_roles` |
| `votes` | `trg_dwh_options_sondage_votes`, `trg_dwh_votes` |
