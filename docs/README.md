# Documentation développeur — Deep Dive Planner

Application de gestion de club pour **Team Oxygen** (association de plongée et d'apnée).

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + TypeScript + Vite (port 8080) |
| Routing | React Router v7 |
| UI | Tailwind CSS 3 + shadcn/ui (Radix) + Lucide icons |
| Data | TanStack React Query + React Hook Form + Zod |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions Deno) |
| Maps | Leaflet |
| Charts | Recharts |
| PDF | jsPDF + html2canvas |
| Déploiement | Vercel (auto-deploy sur merge `main`) |

## Structure

```
src/
  components/     # Composants React organisés par feature
  contexts/       # AuthContext (Supabase auth state)
  hooks/          # 20 hooks de data fetching → docs/hooks.md
  integrations/supabase/
    client.ts     # Initialisation client Supabase
    types.ts      # Types auto-générés (ne pas éditer)
  pages/          # 18 pages-routes
  App.tsx         # Providers + router

supabase/
  functions/      # 6 Edge Functions Deno → docs/edge-functions.md
  migrations/     # 40+ migrations SQL

powerbi/
  database_schema.md       # Schéma complet des tables DWH
  mesures_dax.md           # 10 mesures DAX documentées
  model_backup_*.tmdl      # Backup modèle Power BI
```

## Index documentation

- **[Edge Functions](./edge-functions.md)** — 6 fonctions serverless Deno
- **[Hooks React](./hooks.md)** — 20 hooks de data fetching
- **[Schéma base de données](../powerbi/database_schema.md)** — Tables sources + DWH + triggers
- **[Mesures DAX](../powerbi/mesures_dax.md)** — 10 mesures Power BI

## Variables d'environnement

```env
VITE_SUPABASE_URL              # URL API Supabase
VITE_SUPABASE_PUBLISHABLE_KEY  # Clé anon publique
VITE_SUPABASE_PROJECT_ID       # ID projet (hyoudezyqbivfthcgpma)
```

Secrètes (Supabase Edge Functions uniquement) :
```
BREVO_SMTP_KEY          # Clé API Brevo pour envoi d'emails
CRON_SECRET             # Secret pour déclencher send-reminders via cron
SUPABASE_SERVICE_ROLE_KEY  # Auto-injectée par Supabase
```

## Commandes

```bash
npm run dev        # Serveur dev port 8080
npm run build      # Build prod (dist/)
npm run lint       # ESLint
npm run preview    # Preview build prod
```

## Conventions

- **Langue UI :** Français
- **Composants :** PascalCase (`OutingCard.tsx`)
- **Hooks :** camelCase préfixé `use` (`useOutings.ts`)
- **Enum booking_status (PostgreSQL) :** `'confirmé'` / `'en_attente'` / `'annulé'`
- **TypeScript :** strict mode OFF — ESLint désactivé sur vars/params inutilisés
- **Pas de tests automatisés** — valider via `npm run build` + `npm run lint`
