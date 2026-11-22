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

> **Par défaut : aller jusqu'à la prod.** Toute demande de modification de l'utilisateur sous-entend systématiquement d'aller jusqu'au bout du process ci-dessous (branche → commit → push → PR → merge sur main → déploiement Vercel), sans redemander de confirmation. Ne s'arrêter avant la fin que si l'utilisateur le précise explicitement.

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

## Rapport AG PowerPoint — trame de référence

Trame validée par le club (fichier `Rapport_AG_TeamOxygen_2026.pptx`, fourni par l'utilisateur ; **non versionné** : il contient noms et photos de membres, le dépôt est public). Le PowerPoint est généré côté navigateur par `src/components/pdf/buildPptx.ts` (pptxgenjs) depuis l'onglet Admin « Rapport AG ». Toute évolution doit rester fidèle à cette trame.

**Format** : 16:9 (13,333 x 7,5 in), police Calibri, titre de diapo 26 pt. Slides en éléments natifs (textes, tableaux, formes, graphiques éditables), jamais des images.

**Gabarit (6 mises en page)** : `Page de titre` (placeholders 0 titre, 1 sous-titre ; logo centré 4,6 x 2,8 in en y 0,9), `Titre seul`, `Vide`, `Titre et contenu`, `Deux colonnes`, `Section`. Sur les mises en page à titre : placeholder 100 = petit intitulé en MAJUSCULES au-dessus (y 0,2), placeholder 101 = titre (y 0,48), filet orange sous le titre (y 1,05), numéro de diapo en bas à droite (x 12,13 / y 7,1). Master : logo en haut à droite (x 11,73 / y 0,12, 1,0 x 0,64), pied « Team Oxygen · Assemblée Générale <année> » (x 0,6 / y 7,1), bandeau bas marine + accent orange (y 7,42). Contenu utile entre y 1,5 et 7,0.

**Thème** : marine `0A3A49`, orange `F08814`, cyan `0891B2`, vert `059669`, vert clair `65A30D`, brun `C2410C`, gris `64748B`, fond clair `F8FAFC`.

**Ordre des 16 diapos** (intitulé / titre) :
1. Page de titre : « Rapport d'Activité & Statistiques <année> », « Assemblée Générale », « Document généré le … »
2. ASSEMBLÉE GÉNÉRALE / Sommaire (13 entrées numérotées, 2 colonnes)
3. GOUVERNANCE / Le Bureau : « N membres · composition au <date> », cartes avatar + nom + rôle
4. ÉQUIPE TECHNIQUE / Nos Encadrants : « N encadrants · composition au <date> », avatar, prénom, nom, niveau, rôle
5. CHIFFRES CLÉS / Bilan Global : 3 KPI (adhérents saison, sorties, plongées cumulées) + encart moyenne par sortie et note « sorties comptabilisées depuis la mise en service de l'application »
6. ADHÉRENTS / Démographie : 3 graphiques (âges, parité, niveaux d'apnée)
7. ADHÉRENTS / Parité & Nouveaux Adhérents : 3 KPI (adhérents, nouveaux, renouvellements) + graphique parité H/F ; nouveau = `joined_at` >= 1er septembre de la saison
8. ADHÉRENTS / Niveaux des adhérents : graphique + tableau (Inactif, Castagnole, Crabe, Méduse, Poulpe, Dauphin, Requin)
9. PARTICIPATION / Les Mordus de l'Apnée : tableau top 15
10. ENCADREMENT / Implication du Staff : tableau + total des sorties encadrées
11. SITES DE PLONGÉE / Top 10 des Sites : 10 cartes photo + rang + nombre de sorties
12. SITES DE PLONGÉE / Carte des Spots : liste GPS + carte schématique
13. MATÉRIEL / Parc Matériel & Valorisation : valeur totale + graphique top 15
14. ALBUM PHOTO / Souvenirs : 6 photos (titre, date, lieu)
15. ALBUM PHOTO / Souvenirs (suite) : 6 photos
16. CONTACT / Restons Connectés : réseaux, localisations, liens cliquables

**Règles de données** (identiques au PDF) : adhérents, bureau, encadrants et parité = saison en cours ; sorties, niveaux, top plongeurs, sites = année civile ; sorties = toutes les sorties passées non supprimées (même nombre que « Liste des sorties » de l'app).

**Alignement** : `buildPptx.ts` reproduit la trame (6 mises en page, logo en haut à droite, barre du bas, pied, thème, couverture en placeholders). Seul écart connu : pptxgenjs ajoute une mise en page `DEFAULT` inutilisée. Les mises en page `Titre et contenu`, `Deux colonnes` et `Section` sont définies mais aucune diapo générée ne les utilise encore.

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
