# Référence développeur — Deep Dive Planner

Application de gestion de club pour **Team Oxygen** (association de plongée et d'apnée, région Martigues-Marseille).

---

## Table des matières

1. [Stack & architecture](#1-stack--architecture)
2. [Variables d'environnement](#2-variables-denvironnement)
3. [Commandes](#3-commandes)
4. [Conventions de code](#4-conventions-de-code)
5. [Base de données](#5-base-de-données)
6. [Edge Functions Supabase](#6-edge-functions-supabase)
7. [Hooks React](#7-hooks-react)
8. [Power BI / DWH](#8-power-bi--dwh)

---

## 1. Stack & architecture

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
| Déploiement | Vercel — auto-deploy sur merge `main` |

```
src/
  components/     # Composants par feature
  contexts/       # AuthContext (Supabase auth state)
  hooks/          # 20 hooks custom → section 7
  integrations/supabase/
    client.ts     # Init client Supabase
    types.ts      # Types auto-générés (ne pas éditer)
  pages/          # 18 pages-routes
  App.tsx         # Providers + router

supabase/
  functions/      # 7 Edge Functions Deno → section 6
  migrations/     # 40+ migrations SQL

powerbi/
  database_schema.md   # Schéma DWH détaillé
  mesures_dax.md       # 10 mesures Power BI
```

---

## 2. Variables d'environnement

```env
# Frontend (.env)
VITE_SUPABASE_URL=https://hyoudezyqbivfthcgpma.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<clé anon publique>
VITE_SUPABASE_PROJECT_ID=hyoudezyqbivfthcgpma
```

Secrètes Supabase (Edge Functions, non exposées au frontend) :

| Clé | Usage |
|-----|-------|
| `BREVO_SMTP_KEY` | Clé API Brevo pour envoi d'emails |
| `CRON_SECRET` | Secret pour déclencher `send-reminders` via cron |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injecté par Supabase (bypass RLS) |
| `SUPABASE_ANON_KEY` | Auto-injecté par Supabase |
| `SUPABASE_URL` | Auto-injecté par Supabase |

---

## 3. Commandes

```bash
npm run dev        # Serveur de développement (port 8080)
npm run build      # Build production (dist/)
npm run lint       # ESLint
npm run preview    # Preview du build prod
```

Pas de suite de tests automatisés — valider via `npm run build` + `npm run lint`.

---

## 4. Conventions de code

| Sujet | Convention |
|-------|------------|
| Langue UI | Français |
| Composants | PascalCase (`OutingCard.tsx`) |
| Hooks | camelCase préfixé `use` (`useOutings.ts`) |
| Styling | Tailwind utilities + CSS custom properties marine |
| TypeScript | Strict mode OFF — ESLint vars/params inutilisés désactivé |
| Enum `booking_status` | `'confirmé'` / `'en_attente'` / `'annulé'` (français) |
| `types.ts` | Auto-généré par Supabase CLI — ne jamais éditer manuellement |
| Mutations | React Query `useMutation` + `invalidateQueries` + toast |

---

## 5. Base de données

**Projet Supabase :** `hyoudezyqbivfthcgpma`

### Tables principales

| Table | Description |
|-------|-------------|
| `profiles` | Utilisateurs (liés auth Supabase) |
| `outings` | Sorties club |
| `reservations` | Inscriptions membres aux sorties |
| `club_members_directory` | Annuaire membres (indépendant des comptes app) |
| `membership_yearly_status` | Statut adhésion par membre par saison |
| `equipment_catalog` | Catalogue matériel |
| `equipment_inventory` | Inventaire avec propriétaire |
| `equipment_history` | Historique mouvements matériel |
| `boats` | Flotte de bateaux |
| `locations` | Sites de plongée |
| `site_waypoints` | Points GPS d'un site |
| `carpools` | Covoiturages proposés |
| `carpool_passengers` | Passagers de covoiturage |
| `polls` / `votes` | Sondages et réponses |
| `apnea_levels` | Référentiel niveaux apnée (AIDA, FSGT...) |
| `user_roles` | Rôles app par utilisateur |
| `outing_co_instructors` | Co-instructeurs par sortie |
| `historical_outing_participants` | Participants sorties historiques |

### RLS et rôles

- **`authenticated`** : accès standard via JWT utilisateur
- **`service_role`** : bypass RLS (Edge Functions, triggers SECURITY DEFINER)
- **`powerbi_reader`** : rôle lecture seule sur toutes les tables (Power BI via pg connector)

### Triggers DWH

Synchronisation vers les tables `dim_*` / `fait_*` via triggers `SECURITY DEFINER` :

| Table source | Trigger |
|---|---|
| `profiles` | `trg_dwh_profiles` |
| `club_members_directory` | `trg_dwh_cmd` |
| `membership_yearly_status` | `trg_dwh_membership`, `trg_dwh_mys`, `trg_dwh_mys_membre` |
| `outings` | `trg_dwh_outings_participation` |
| `reservations` | `trg_dwh_reservations` |
| `historical_outing_participants` | `trg_dwh_hist_participants` |
| `outing_co_instructors` | `trg_dwh_co_instructeurs` |
| `locations` | `trg_dwh_locations` |
| `site_waypoints` | `trg_dwh_waypoints` |
| `polls` | `trg_dwh_polls`, `trg_dwh_options_sondage_polls` |
| `votes` | `trg_dwh_votes`, `trg_dwh_options_sondage_votes` |
| `equipment_inventory` | `trg_dwh_equipment_inventory` |
| `equipment_history` | `trg_dwh_equipment_history` |
| `carpools` | `trg_dwh_carpools` |
| `carpool_passengers` | `trg_dwh_carpool_passengers` |
| `user_roles` | `trg_dwh_user_roles` |

> Schéma complet des colonnes → [`powerbi/database_schema.md`](../powerbi/database_schema.md)

### RPC functions

| Fonction | Usage | SECURITY |
|----------|-------|----------|
| `get_trombinoscope_members()` | Liste membres pour trombinoscope et sélection encadrant | DEFINER |
| `is_current_user_encadrant()` | Vérifie si l'user courant est encadrant | DEFINER |

---

## 6. Edge Functions Supabase

Base URL : `https://hyoudezyqbivfthcgpma.supabase.co/functions/v1/`  
Runtime : Deno  
Expéditeur email : `email@karimsaari.com` (domaine `karimsaari.com` vérifié Brevo)

---

### `send-reservation-confirmation`

Email de confirmation après inscription, mise en attente ou annulation d'une réservation.

**Auth :** JWT utilisateur | **verify_jwt :** true

```json
POST /send-reservation-confirmation
{ "outingId": "uuid", "type": "registration" | "cancellation" | "waitlist" }
```

| `type` | Sujet email |
|--------|-------------|
| `registration` | `✅ Inscription confirmée : <titre>` |
| `waitlist` | `⏳ Liste d'attente : <titre>` |
| `cancellation` | `❌ Désinscription : <titre>` |

**Appelé depuis :** `useCreateReservation()`, `useCancelReservation()` dans `useOutings.ts`

---

### `send-outing-notification`

Notifie tous les inscrits (confirmés + attente) d'une annulation ou d'un rappel J-1. Passe toutes les réservations en `annulé` si `type = cancellation`.

**Auth :** JWT admin ou organisateur | **verify_jwt :** true

```json
POST /send-outing-notification
{ "outingId": "uuid", "type": "cancellation" | "reminder", "reason": "..." }
// { "success": true, "notified": 12, "total": 12, "results": [...] }
```

---

### `send-reminders`

Cron : envoie les rappels J-1 aux inscrits des sorties dans la fenêtre `[now+24h, now+26h]` avec `reminder_sent = false`. Update `reminder_sent = true` après envoi.

**Auth :** `CRON_SECRET`, service role, ou JWT admin | **verify_jwt :** false

```bash
curl -X POST .../send-reminders -H "Authorization: Bearer $CRON_SECRET"
# { "success": true, "outingsProcessed": 2, "totalNotified": 18 }
```

> ⚠️ Déclencher via cron externe (GitHub Actions ou pg_cron) toutes les heures.

---

### `send-test-email`

Envoi de test Brevo sans auth. Utile pour vérifier la configuration.

**Auth :** aucune | **verify_jwt :** false

```json
POST /send-test-email
{ "to": "email@example.com" }
// { "success": true, "messageId": "..." }
```

---

### `get-outing-participants`

Retourne `confirmed` + `waitlist` d'une sortie via service role (bypass RLS). Injecte l'organisateur en tête de `confirmed` s'il n'a pas de réservation explicite.

**Auth :** JWT utilisateur | **verify_jwt :** true

```json
POST /get-outing-participants
{ "outingId": "uuid" }
// { "organizerId": "uuid", "confirmed": [...], "waitlist": [...] }
```

**Appelé depuis :** `OutingView.tsx`, `OutingDetail.tsx`

---

### `extract-coordinates`

Extrait les coordonnées GPS depuis une URL Google Maps (suit les redirections, teste 4 patterns regex). Met à jour `locations.latitude` et `locations.longitude`.

**Auth :** JWT utilisateur | **verify_jwt :** true

```json
POST /extract-coordinates
{ "mapsUrl": "https://maps.app.goo.gl/...", "locationId": "uuid" }
// { "success": true, "lat": 43.296, "lng": 5.381 }
```

**Patterns gérés :** `@lat,lng` • `!3dlat!4dlng` • `?ll=lat,lng` • `?q=lat,lng`  
**Appelé depuis :** `useLocations.ts`

---

### `delete-user`

Suppression en cascade d'un membre : données liées puis compte auth. Tolère un compte auth déjà absent (profils orphelins).

**Auth :** JWT admin | **verify_jwt :** true

```json
POST /delete-user
{ "userId": "uuid" }
// { "success": true }
```

Ordre : `reservations` → `outings` → `equipment_inventory` → `equipment_history` → `user_roles` → `profiles` → `auth.users`

---

## 7. Hooks React

Tous dans `src/hooks/`. Pattern : `useQuery` / `useMutation` + `invalidateQueries` + toast.

### Hooks utilitaires

| Hook | Retourne | Description |
|------|----------|-------------|
| `useIsMobile()` | `boolean` | Viewport < 768px |
| `useToast()` | `{ toast, dismiss, toasts }` | Notifications toast |
| `useUserRole()` | `{ isAdmin, isOrganizer, isMember, loading }` | Rôle app de l'user connecté via `user_roles` |
| `useIsCurrentUserEncadrant()` | `boolean` | Via RPC `is_current_user_encadrant()` (bypass RLS) |

---

### `useApneaLevels`

```ts
useApneaLevels()          // ApneaLevel[] ordonnés par fédération + code
useCreateApneaLevel()     // mutate({ code, name, federation, is_instructor, ... })
useUpdateApneaLevel()     // mutate({ id, ...changes })
useDeleteApneaLevel()     // mutate(id)
```

**Tables :** `apnea_levels`

---

### `useBoats`

```ts
useBoats()        // Boat[] triés par nom
useCreateBoat()   // mutate({ name, capacity, ... })
useUpdateBoat()   // mutate({ id, ...changes })
useDeleteBoat()   // mutate(id)
```

**Tables :** `boats`

---

### `useCarpoolCounts`

```ts
useCarpoolCounts(outingIds: string[])
// Map<outingId, { carpool_count: number, available_seats: number }>
// available_seats = SUM(available_seats) - COUNT(passengers)
```

**Tables :** `carpools`, `carpool_passengers`

---

### `useCarpools`

```ts
useCarpools(outingId)           // Carpool[] avec conducteur + passagers
useUserCarpool(outingId)        // Carpool | null — l'user est conducteur
useUserCarpoolBooking(outingId) // Carpool | null — l'user est passager
useCreateCarpool()              // mutate({ outingId, meetingPoint, available_seats, ... })
useUpdateCarpool()              // mutate({ carpoolId, ...changes })
useDeleteCarpool()              // mutate(carpoolId)
useBookCarpool()                // mutate({ carpoolId, userId })
useCancelCarpoolBooking()       // mutate({ carpoolId, userId })
```

**Tables :** `carpools`, `carpool_passengers`, `profiles`

---

### `useClubMembersDirectory`

```ts
useClubMembersDirectory()
// { members: ClubMember[], registeredEmails: string[], isEmailRegistered(email) }
useCreateClubMember()    // mutate(memberData)
useUpsertClubMembers()   // mutate(members[]) — import CSV
useDeleteClubMember()    // mutate(id)
```

**Tables :** `club_members_directory`, `profiles`

---

### `useCreateHistoricalOuting`

```ts
useCreateHistoricalOuting()
// mutate({ title, date, location, organizer_member_id, participant_member_ids: string[] })
// → { outingId, participantsCount }
// Auto : is_archived = true
```

**Tables :** `outings`, `historical_outing_participants`

---

### `useEquipment`

```ts
// Catalogue
useEquipmentCatalog()          // EquipmentCatalogItem[]
useCreateCatalogItem()         // mutate({ name, description, estimated_value })
useUpdateCatalogItem()         // mutate({ id, ...changes })
useDeleteCatalogItem()         // mutate(id)

// Inventaire
useMyEquipmentInventory()      // items de l'user connecté
useGlobalEquipmentInventory()  // tous les items avec propriétaire
useAssignEquipment()           // mutate({ catalog_id, owner_id, status })
useTransferEquipment()         // mutate({ inventory_id, to_user_id })
useDecommissionEquipment()     // mutate(inventory_id)

// Historique
useEquipmentHistory(inventory_id?) // filtre optionnel par item

// Encadrants (attribution)
useEncadrants()      // profils uniquement
useAllEncadrants()   // profils + annuaire, filtré saison courante
```

**Tables :** `equipment_catalog`, `equipment_inventory`, `equipment_history`, `profiles`, `club_members_directory`, `membership_yearly_status`

---

### `useLocations`

```ts
useLocations()         // Location[] triées par nom
useCreateLocation()    // mutate({ name, address, maps_url, type }) → appelle extract-coordinates
useUpdateLocation()    // mutate({ id, ...changes })
useDeleteLocation()    // mutate(id)
```

**Tables :** `locations`  
**Edge function :** `extract-coordinates` si `maps_url` fourni

---

### `useMembersForEncadrant`

```ts
useMembersForEncadrant()
// MemberForSelection[] — { id, first_name, last_name, email }
// Via RPC get_trombinoscope_members()
```

---

### `useMembershipYearlyStatus`

```ts
useMembershipYearlyStatus(seasonYear: number) // MembershipYearlyStatus[]
useUpsertMembershipStatus()       // mutate(statusData)
useBatchUpsertMemberships()       // mutate(statuses[])
useDeleteMembershipStatus()       // mutate(id)

// Helpers exportés
getCurrentSeasonYear()  // ex: 2026 (oct 2025 → sept 2026)
getSeasonLabel(2026)    // "2025-2026"
getAvailableSeasons()   // [2026, 2025, ...]
```

**Tables :** `membership_yearly_status`

---

### `useOutings` _(hook central)_

```ts
// Queries
useOutings(typeFilter?)       // Outing[] avec organizer, lieu, bateau, co-instruct., réservations
useOuting(outingId)           // Outing | null détaillée
useMyReservations()           // mes inscriptions avec détails sortie
useCoInstructedOutings()      // sorties où je suis co-instructeur

// Mutations sortie
useCreateOuting()             // mutate({ title, date_time, location, outing_type, max_participants, ... })
useUpdateOuting()             // mutate({ outingId, ...changes })
useArchiveOuting()            // mutate(outingId)
useLockPOSS()                 // mutate(outingId)
useUnlockPOSS()               // mutate(outingId)

// Co-instructeurs
useAddCoInstructor()          // mutate({ outingId, userId })
useRemoveCoInstructor()       // mutate({ outingId, userId })

// Réservations
useCreateReservation()        // mutate({ outingId }) → appelle send-reservation-confirmation
useCancelReservation()        // mutate({ reservationId, outingId }) → appelle send-reservation-confirmation
useMarkPresent()              // mutate({ reservationId, isPresent: boolean })
```

**Tables :** `outings`, `reservations`, `profiles`, `locations`, `boats`, `outing_co_instructors`, `apnea_levels`

---

### `usePDFReportData`

```ts
usePDFReportData(year: number)
// PDFReportData {
//   bureau, encadrants, stats, demographics,
//   topParticipants, topEncadrants, topLocations, equipment
// }
```

**Tables :** `profiles`, `club_members_directory`, `membership_yearly_status`, `outings`, `historical_outing_participants`, `reservations`, `locations`, `equipment_inventory`, `equipment_catalog`

---

### `usePOSSGenerator`

```ts
const { generate } = usePOSSGenerator({ outing, organizerName })
await generate() // → télécharge le PDF POSS (plan sécurité FSGT)
```

**Tables :** `site_waypoints`, `profiles`, `club_members_directory`, `membership_yearly_status`

---

### `useProfileDirectory`

```ts
useProfileDirectory(userEmail)  // ProfileDirectoryData | null (avec niveau_apnee + is_encadrant saison)
useUpdateProfileDirectory()     // mutate({ email, ...changes })
```

**Tables :** `club_members_directory`, `membership_yearly_status`

---

### `useTrombinoscope`

```ts
const { bureau, encadrants, membres, total } = useTrombinoscope()
// bureau : tri par hiérarchie (Président > VP > Trésorier > Secrétaire...)
// encadrants : tri par niveau technique décroissant
// membres : tri par nom
// Via RPC get_trombinoscope_members()
```

---

### `useWaypoints`

```ts
useWaypoints(siteId?)     // Waypoint[] triés par type
useCreateWaypoint()       // mutate({ site_id, name, latitude, longitude, point_type })
useDeleteWaypoint()       // mutate(id)

// Helpers
getWaypointLabel(type)    // ex: "Parking", "Mise à l'eau"
getWaypointColor(type)    // hex couleur Leaflet
getWaypointIcon(type)     // SVG string
```

**Tables :** `site_waypoints`  
**Types :** `parking` • `water_entry` • `water_exit` • `meeting_point` • `dive_zone` • `toilets`

---

## 8. Power BI / DWH

Connexion via **PostgreSQL connector** (Import mode) — rôle `powerbi_reader`.

### Tables DWH

| Table | Alimentée par |
|-------|---------------|
| `dim_membre` | `profiles` + `club_members_directory` + `membership_yearly_status` |
| `dim_site` | `locations` |
| `dim_sondage` | `polls` |
| `dim_options_sondage` | `polls` + `votes` |
| `dim_equipement` | `equipment_inventory` + `equipment_catalog` |
| `dim_saison` | statique |
| `dim_role` | `user_roles` |
| `dim_waypoint` | `site_waypoints` |
| `dim_compte` | `profiles` |
| `calendrier` | statique (table de dates enrichie) |
| `fait_adhesion` | `membership_yearly_status` |
| `fait_participation` | `reservations` + `outings` |
| `fait_participation_historique` | `historical_outing_participants` |
| `fait_vote` | `votes` |
| `fait_covoiturage` | `carpools` |
| `fait_passager_covoiturage` | `carpool_passengers` |
| `fait_mouvement_equipement` | `equipment_history` |
| `fait_co_instructeur` | `outing_co_instructors` |

### Pièges DAX connus

| Problème | Solution |
|----------|----------|
| `dim_saison[est_saison_courante]` incohérent | Utiliser `MAXX(ALL(fait_adhesion), saison_id)` |
| `dim_membre[est_encadrant_saison_courante]` peu fiable | Utiliser `fait_adhesion[is_encadrant]` par saison |
| Relations `fait_adhesion/fait_vote → calendrier` inactives | Utiliser `USERELATIONSHIP()` |
| `fait_vote[options_choisies]` contient des UUIDs | Utiliser `fait_vote[option_label]` (calculé par trigger) |

> Détail complet → [`powerbi/database_schema.md`](../powerbi/database_schema.md) et [`powerbi/mesures_dax.md`](../powerbi/mesures_dax.md)

---

*Dernière mise à jour : 2026-06-06*
