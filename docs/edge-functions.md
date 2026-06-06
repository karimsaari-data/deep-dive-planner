# Edge Functions — Deep Dive Planner

6 fonctions serverless **Deno** déployées sur Supabase.
Toutes appelées via `POST https://hyoudezyqbivfthcgpma.supabase.co/functions/v1/<slug>`.

Expéditeur email : `email@karimsaari.com` (domaine `karimsaari.com` vérifié dans Brevo).

---

## Sommaire

| Fonction | Auth requise | Rôle |
|----------|-------------|------|
| [send-reservation-confirmation](#send-reservation-confirmation) | JWT utilisateur | Email confirmation inscription/annulation |
| [send-outing-notification](#send-outing-notification) | JWT admin/organisateur | Email annulation sortie ou rappel participants |
| [send-reminders](#send-reminders) | CRON ou admin | Rappels J-1 automatiques |
| [send-test-email](#send-test-email) | Aucune | Email de test Brevo |
| [get-outing-participants](#get-outing-participants) | JWT utilisateur | Liste participants d'une sortie |
| [extract-coordinates](#extract-coordinates) | JWT utilisateur | Extraction GPS depuis URL Google Maps |
| [delete-user](#delete-user) | JWT admin | Suppression membre en cascade |

---

## send-reservation-confirmation

Envoie un email de confirmation à l'utilisateur après une inscription, mise en liste d'attente ou annulation sur une sortie.

**Auth :** JWT Bearer (utilisateur connecté)  
**Verify JWT :** `true`

### Requête

```json
POST /functions/v1/send-reservation-confirmation
Authorization: Bearer <jwt>

{
  "outingId": "uuid",
  "type": "registration" | "cancellation" | "waitlist"
}
```

### Réponse

```json
{ "success": true }
```

### Logique

1. Vérifie le JWT → récupère `user.id`
2. Charge le profil (`profiles.email`, `first_name`, `last_name`)
3. Charge la sortie avec lieu et organisateur
4. Génère le HTML selon `type` :
   - `registration` → sujet `✅ Inscription confirmée : <titre>`
   - `waitlist` → sujet `⏳ Liste d'attente : <titre>`
   - `cancellation` → sujet `❌ Désinscription : <titre>`
5. Appelle l'API Brevo (`POST /v3/smtp/email`)

### Appelé depuis

`useOutings.ts` — mutations `useCreateReservation`, `useCancelReservation`

---

## send-outing-notification

Notifie tous les inscrits (confirmés + liste d'attente) d'une annulation de sortie ou d'un rappel J-1. En cas d'annulation, passe toutes les réservations en `annulé`.

**Auth :** JWT Bearer — doit être admin **ou** organisateur de la sortie  
**Verify JWT :** `true`

### Requête

```json
POST /functions/v1/send-outing-notification
Authorization: Bearer <jwt>

{
  "outingId": "uuid",
  "type": "cancellation" | "reminder",
  "reason": "string (optionnel, pour annulation)"
}
```

### Réponse

```json
{
  "success": true,
  "notified": 12,
  "total": 12,
  "results": [
    { "email": "...", "success": true },
    ...
  ]
}
```

### Logique

1. Vérifie JWT + rôle (admin ou `outing.organizer_id === user.id`)
2. Charge toutes les réservations `confirmé` + `en_attente`
3. Envoie un email Brevo à chaque inscrit
4. Si `type === "cancellation"` : update toutes les réservations → `annulé`
5. Si `type === "reminder"` : update `outings.reminder_sent = true`

### Appelé depuis

`src/components/outings/` — bouton annulation sortie et envoi rappels manuels

---

## send-reminders

Fonction cron : envoie les rappels J-1 à tous les inscrits des sorties prévues dans les 24-26 prochaines heures n'ayant pas encore reçu de rappel (`reminder_sent = false`).

**Auth :** Bearer cron secret (`CRON_SECRET`), ou service role key, ou JWT admin  
**Verify JWT :** `false` (authentification custom)

### Requête

```bash
# Via cron
curl -X POST https://hyoudezyqbivfthcgpma.supabase.co/functions/v1/send-reminders \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Réponse

```json
{
  "success": true,
  "outingsProcessed": 2,
  "totalNotified": 18
}
```

### Logique

1. Authentification via `CRON_SECRET`, service role, ou admin JWT
2. Requête `outings` : `reminder_sent = false` ET `date_time` dans `[now+24h, now+26h]`
3. Pour chaque sortie : email à tous les inscrits `confirmé`
4. Update `outings.reminder_sent = true`

> ⚠️ À déclencher via un cron job externe (ex: GitHub Actions, pg_cron) toutes les heures.

---

## send-test-email

Envoie un email de test Brevo vers l'adresse fournie. Permet de vérifier la configuration SMTP sans passer par une réservation.

**Auth :** Aucune  
**Verify JWT :** `false`

### Requête

```json
POST /functions/v1/send-test-email

{ "to": "destinataire@example.com" }
```

### Réponse

```json
{
  "success": true,
  "message": "Email de test envoyé avec succès à ...",
  "messageId": "<brevo-message-id>"
}
```

---

## get-outing-participants

Retourne la liste des participants (confirmés + liste d'attente) d'une sortie via service role (bypass RLS). Garantit que l'organisateur apparaît dans les confirmés même s'il n'a pas de réservation explicite.

**Auth :** JWT Bearer (tout utilisateur connecté)  
**Verify JWT :** `true`

### Requête

```json
POST /functions/v1/get-outing-participants
Authorization: Bearer <jwt>

{ "outingId": "uuid" }
```

### Réponse

```json
{
  "organizerId": "uuid",
  "confirmed": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "status": "confirmé",
      "carpool_option": "driver" | "passenger" | "none",
      "carpool_seats": 0,
      "profile": [{ "first_name": "...", "last_name": "...", "avatar_url": "..." }]
    }
  ],
  "waitlist": [...]
}
```

### Logique

1. Vérifie JWT
2. Charge les réservations (`confirmé` + `en_attente`) avec profils
3. Si `organizer_id` absent des confirmés → l'injecte en tête de liste
4. Retourne `{ organizerId, confirmed, waitlist }`

### Appelé depuis

Composants de vue sortie (`OutingView.tsx`, `OutingDetail.tsx`)

---

## extract-coordinates

Extrait les coordonnées GPS (latitude, longitude) depuis une URL Google Maps en suivant les redirections. Met à jour le lieu dans `locations`.

**Auth :** JWT Bearer  
**Verify JWT :** `true`

### Requête

```json
POST /functions/v1/extract-coordinates
Authorization: Bearer <jwt>

{
  "mapsUrl": "https://maps.app.goo.gl/...",
  "locationId": "uuid"
}
```

### Réponse

```json
{ "success": true, "lat": 43.296, "lng": 5.381 }
```

### Logique

1. Suit les redirections HTTP vers l'URL finale Google Maps
2. Teste 4 patterns regex dans l'URL résolue :
   - `@lat,lng` (le plus courant)
   - `!3dlat!4dlng` (URLs de lieu)
   - `?ll=lat,lng`
   - `?q=lat,lng`
3. Update `locations.latitude` et `locations.longitude`

### Appelé depuis

`useLocations.ts` — mutation `useCreateLocation` / `useUpdateLocation`

---

## delete-user

Supprime un utilisateur en cascade : toutes ses données liées dans `profiles`, `reservations`, `outings`, `equipment_inventory`, `equipment_history`, `user_roles`, puis le compte auth Supabase. Tolère un compte auth déjà absent (profils orphelins).

**Auth :** JWT Bearer — admin uniquement  
**Verify JWT :** `true`

### Requête

```json
POST /functions/v1/delete-user
Authorization: Bearer <jwt>

{ "userId": "uuid" }
```

### Réponse

```json
{ "success": true }
```

### Ordre de suppression

1. `reservations` (user_id)
2. `outings` (organizer_id)
3. `equipment_inventory` (owner_id)
4. `equipment_history` (created_by, from_user_id, to_user_id)
5. `user_roles` (user_id)
6. `profiles` (id)
7. `auth.users` via `auth.admin.deleteUser()` (tolère 404)

### Appelé depuis

`src/components/admin/` — gestion des comptes
