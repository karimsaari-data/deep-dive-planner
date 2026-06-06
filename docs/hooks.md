# Hooks React — Deep Dive Planner

20 hooks custom dans `src/hooks/`. Tous wrappent des requêtes Supabase + React Query.

**Pattern général :**
- Queries : `useQuery` avec clé hiérarchique (`["outings"]`, `["equipment-catalog"]`...)
- Mutations : `useMutation` + `invalidateQueries` + toast de succès/erreur
- Auth : accès au user via `useAuth()` (contexte Supabase)

---

## Hooks utilitaires

### `use-mobile`

Détecte si la largeur viewport est < 768px.

```ts
const isMobile = useIsMobile() // boolean
```

---

### `use-toast`

Gestion des notifications toast. Utilisé via `toast()` de `sonner` dans la majorité des composants.

```ts
const { toast, dismiss, toasts } = useToast()
toast({ title: "Succès", description: "..." })
```

---

## Hooks de données

### `useApneaLevels`

CRUD sur les niveaux d'apnée (table `apnea_levels`).

```ts
const { data: levels } = useApneaLevels()
const createLevel = useCreateApneaLevel()   // mutate({ code, name, ... })
const updateLevel = useUpdateApneaLevel()   // mutate({ id, ...changes })
const deleteLevel = useDeleteApneaLevel()   // mutate(id)
```

**Tables :** `apnea_levels`  
**Tri :** par federation, puis code

---

### `useBoats`

CRUD sur la flotte de bateaux (table `boats`).

```ts
const { data: boats } = useBoats()
const createBoat = useCreateBoat()   // mutate({ name, capacity, ... })
const updateBoat = useUpdateBoat()   // mutate({ id, ...changes })
const deleteBoat = useDeleteBoat()   // mutate(id)
```

**Tables :** `boats`  
**Tri :** par nom

---

### `useCarpoolCounts`

Agrège les compteurs de covoiturage pour une liste de sorties.

```ts
const counts = useCarpoolCounts(outingIds: string[])
// Map<outingId, { carpool_count: number, available_seats: number }>
```

**Tables :** `carpools`, `carpool_passengers`  
**Logique :** `available_seats = SUM(available_seats) - COUNT(passengers)`

---

### `useCarpools`

Gestion complète des covoiturages d'une sortie.

```ts
// Queries
const { data: carpools } = useCarpools(outingId)          // tous les covoiturages
const { data: myCarpool } = useUserCarpool(outingId)       // covoiturage dont l'user est conducteur
const { data: booking } = useUserCarpoolBooking(outingId)  // covoiturage dont l'user est passager

// Mutations
const create = useCreateCarpool()     // mutate({ outingId, meetingPoint, ... })
const update = useUpdateCarpool()     // mutate({ carpoolId, ...changes })
const remove = useDeleteCarpool()     // mutate(carpoolId)
const book = useBookCarpool()         // mutate({ carpoolId, userId })
const cancel = useCancelCarpoolBooking() // mutate({ carpoolId, userId })
```

**Tables :** `carpools`, `carpool_passengers`, `profiles`

---

### `useClubMembersDirectory`

Gestion de l'annuaire des membres du club (distinct des comptes app).

```ts
const { data: { members, registeredEmails, isEmailRegistered } } = useClubMembersDirectory()
const create = useCreateClubMember()    // mutate(memberData)
const upsert = useUpsertClubMembers()   // mutate(members[]) — import CSV
const remove = useDeleteClubMember()    // mutate(id)
```

**Tables :** `club_members_directory`, `profiles`  
**`isEmailRegistered(email)`** : retourne `true` si l'email a un compte app

---

### `useCreateHistoricalOuting`

Création de sorties historiques (avant le lancement de l'app) avec leurs participants.

```ts
const createHistorical = useCreateHistoricalOuting()
createHistorical.mutate({
  title, date, location, organizer_member_id,
  participant_member_ids: string[]
})
// returns { outingId, participantsCount }
```

**Tables :** `outings`, `historical_outing_participants`  
**Auto :** archive la sortie (`is_archived = true`) et la marque complète

---

### `useEquipment`

Gestion complète du matériel (catalogue + inventaire + historique + transferts).

```ts
// Catalogue
const { data } = useEquipmentCatalog()
const create = useCreateCatalogItem()    // mutate({ name, description, estimated_value })
const update = useUpdateCatalogItem()    // mutate({ id, ...changes })
const remove = useDeleteCatalogItem()    // mutate(id)

// Inventaire
const { data } = useMyEquipmentInventory()      // matériel de l'user connecté
const { data } = useGlobalEquipmentInventory()  // tout le matériel avec propriétaire
const assign = useAssignEquipment()   // mutate({ catalog_id, owner_id, status })
const transfer = useTransferEquipment()  // mutate({ inventory_id, to_user_id })
const decommission = useDecommissionEquipment() // mutate(inventory_id)

// Historique
const { data } = useEquipmentHistory(inventory_id?)  // optionnel : filtré par item

// Encadrants (pour attribution matériel)
const { data } = useEncadrants()       // profils uniquement
const { data } = useAllEncadrants()    // profils + annuaire, saison courante
```

**Tables :** `equipment_catalog`, `equipment_inventory`, `equipment_history`, `profiles`, `club_members_directory`, `membership_yearly_status`

---

### `useIsCurrentUserEncadrant`

Vérifie si l'utilisateur connecté est encadrant via RPC (bypass RLS).

```ts
const isEncadrant = useIsCurrentUserEncadrant() // boolean
```

**RPC :** `is_current_user_encadrant()` (SECURITY DEFINER)

---

### `useLocations`

CRUD sur les lieux de plongée. La création/modification déclenche l'extraction GPS automatique.

```ts
const { data: locations } = useLocations()
const create = useCreateLocation()  // mutate({ name, address, maps_url, type })
const update = useUpdateLocation()  // mutate({ id, ...changes })
const remove = useDeleteLocation()  // mutate(id)
```

**Tables :** `locations`  
**Edge function appelée :** `extract-coordinates` si `maps_url` fourni

---

### `useMembersForEncadrant`

Liste des membres disponibles pour la création de sorties historiques (usage encadrant).

```ts
const { data: members } = useMembersForEncadrant()
// [{ id, first_name, last_name, email }]
```

**RPC :** `get_trombinoscope_members()`

---

### `useMembershipYearlyStatus`

Gestion des statuts d'adhésion par saison (cotisation, certificat, niveau apnée...).

```ts
const { data: statuses } = useMembershipYearlyStatus(seasonYear: number)
const upsert = useUpsertMembershipStatus()       // mutate(statusData)
const batchUpsert = useBatchUpsertMemberships()  // mutate(statuses[])
const remove = useDeleteMembershipStatus()       // mutate(id)

// Helpers
import { getCurrentSeasonYear, getSeasonLabel, getAvailableSeasons } from './useMembershipYearlyStatus'
getCurrentSeasonYear() // 2026
getSeasonLabel(2026)   // "2025-2026"
getAvailableSeasons()  // [2026, 2025, 2024, ...]
```

**Tables :** `membership_yearly_status`  
**Saison courante :** `getCurrentSeasonYear()` = année d'octobre à septembre

---

### `useOutings`

Hook central — gestion complète des sorties (création, modification, réservation, archivage, POSS).

```ts
// Queries
const { data: outings } = useOutings(typeFilter?: string)  // avec organizer, lieu, bateau, co-instruct., réservations
const { data: outing } = useOuting(outingId)               // sortie unique détaillée
const { data: myRes } = useMyReservations()                // mes inscriptions avec détails sortie
const { data: coOut } = useCoInstructedOutings()           // sorties où je suis co-instructeur

// Mutations sortie
const create = useCreateOuting()      // mutate({ title, date_time, location, outing_type, ... })
const update = useUpdateOuting()      // mutate({ outingId, ...changes })
const archive = useArchiveOuting()    // mutate(outingId)
const lockPOSS = useLockPOSS()        // mutate(outingId)
const unlockPOSS = useUnlockPOSS()   // mutate(outingId)

// Co-instructeurs
const addCo = useAddCoInstructor()     // mutate({ outingId, userId })
const removeCo = useRemoveCoInstructor() // mutate({ outingId, userId })

// Réservations
const reserve = useCreateReservation()   // mutate({ outingId }) → appelle send-reservation-confirmation
const cancel = useCancelReservation()    // mutate({ reservationId, outingId }) → appelle send-reservation-confirmation
const markPresent = useMarkPresent()     // mutate({ reservationId, isPresent })
```

**Tables :** `outings`, `reservations`, `profiles`, `locations`, `boats`, `outing_co_instructors`, `apnea_levels`

---

### `usePDFReportData`

Agrège toutes les statistiques annuelles pour la génération du rapport PDF (12 pages).

```ts
const { data } = usePDFReportData(year: number)
// PDFReportData {
//   bureau: Member[],
//   encadrants: Member[],
//   stats: { totalMembers, totalOutings, totalParticipations, ... },
//   demographics: { ageDistribution, genderDistribution, ... },
//   topParticipants: Member[],
//   topEncadrants: Member[],
//   topLocations: Location[],
//   equipment: InventoryItem[]
// }
```

**Tables :** `profiles`, `club_members_directory`, `membership_yearly_status`, `outings`, `historical_outing_participants`, `reservations`, `locations`, `equipment_inventory`, `equipment_catalog`

---

### `usePOSSGenerator`

Génère le PDF du Plan de Sécurité de Sortie (POSS) réglementaire FSGT.

```ts
const { generate } = usePOSSGenerator({ outing, organizerName })
await generate() // → télécharge le PDF
```

**Tables :** `site_waypoints`, `profiles`, `club_members_directory`, `membership_yearly_status`

---

### `useProfileDirectory`

Profil annuaire de l'utilisateur connecté, enrichi avec le statut d'adhésion de la saison courante.

```ts
const { data: profile } = useProfileDirectory(userEmail)
// ProfileDirectoryData | null
// Inclut : niveau_apnee_saison_courante, is_encadrant_saison_courante

const update = useUpdateProfileDirectory()
update.mutate({ email, ...changes })
```

**Tables :** `club_members_directory`, `membership_yearly_status`

---

### `useTrombinoscope`

Fetch et catégorise les membres pour la page Trombinoscope.

```ts
const { bureau, encadrants, membres, total } = useTrombinoscope()
```

**Catégories :**
- `bureau` — trié par hiérarchie de rôle (Président → VP → Trésorier → Secrétaire...)
- `encadrants` — triés par niveau technique décroissant
- `membres` — triés par nom

**RPC :** `get_trombinoscope_members()`

---

### `useUserRole`

Rôle(s) de l'utilisateur connecté dans l'application.

```ts
const { roles, isAdmin, isOrganizer, isMember, loading } = useUserRole()
```

**Tables :** `user_roles`  
**Rôles possibles :** `admin`, `organizer` (encadrant), `member`

> ℹ️ Tous les encadrants ont le rôle `organizer`. Les admins ont `admin` (et peuvent aussi être encadrants).

---

### `useWaypoints`

Gestion des waypoints d'un site de plongée (parking, mise à l'eau, zone plongée...).

```ts
const { data: waypoints } = useWaypoints(siteId?: string)
const create = useCreateWaypoint()  // mutate({ site_id, name, lat, lng, point_type })
const remove = useDeleteWaypoint()  // mutate(id)

// Helpers
import { getWaypointLabel, getWaypointColor, getWaypointIcon } from './useWaypoints'
getWaypointLabel('parking')   // "Parking"
getWaypointColor('water_entry') // "#0EA5E9"
getWaypointIcon('dive_zone')    // SVG string
```

**Tables :** `site_waypoints`  
**Types de points :** `parking`, `water_entry`, `water_exit`, `meeting_point`, `dive_zone`, `toilets`
