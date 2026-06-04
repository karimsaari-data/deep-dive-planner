# Schéma base de données — Deep Dive Planner

Généré le 2026-06-04 depuis Supabase (projet hyoudezyqbivfthcgpma)

## Architecture

Le modèle suit une architecture **DWH (Data Warehouse)** avec :
- **Tables sources** : données brutes de l'application (outings, reservations, votes, etc.)
- **Tables DWH dim_*** : dimensions dénormalisées pour Power BI
- **Tables DWH fait_*** : tables de faits pour Power BI
- **Tables référentiel** : données de référence stables (apnea_levels, etc.)

Les tables DWH sont synchronisées via des **triggers PostgreSQL** depuis les tables sources.

---

## Tables Référentiel

### apnea_levels
Référentiel de tous les niveaux d'apnée reconnus (AIDA, FSGT, FFESSM, PADI, SSI, Molchanovs, Diplômes d'État).
Utilisé pour valider les niveaux des membres et calculer le statut_dossier.

| Colonne | Type | Description |
|---|---|---|
| `id` | uuid | Clé primaire |
| `code` | text | Code court du niveau (ex: "AIDA 2", "FSGT EA2", "BPJEPS") — **clé de jointure avec fait_adhesion.niveau_apnee et dim_options_sondage** |
| `name` | text | Libellé complet |
| `prerogatives` | text | Profondeurs et droits d'encadrement |
| `is_instructor` | boolean | True si niveau encadrant |
| `federation` | text | Fédération (AIDA, FSGT, FFESSM, PADI, SSI, Molchanovs, Diplôme d'État) |
| `federation_full_name` | text | Nom complet de la fédération |
| `profondeur_max_eaa` | integer | Profondeur max en eaux abritées (mètres) |
| `profondeur_max_eao` | integer | Profondeur max en eaux ouvertes (mètres) |
| `max_participants_encadrement` | integer | Nb max de participants encadrables |

---

## Tables Sources (application)

### profiles
Profils utilisateurs connectés à l'application. Lien entre auth Supabase et données membres.

| Colonne | Type | Description |
|---|---|---|
| `id` | uuid | Clé primaire — correspond à l'id auth Supabase |
| `first_name` | text | Prénom |
| `last_name` | text | Nom (à mettre en UPPER pour affichage) |
| `email` | text | Email de connexion |
| `apnea_level` | text | Niveau apnée du profil (texte libre, pas forcément aligné avec apnea_levels.code) |
| `member_status` | text | Statut membre |
| `member_code` | text | Code membre (ex: M0001) |

### membership_yearly_status
**Source principale des adhésions.** Une ligne par membre par saison.
Alimente `fait_adhesion` via trigger `trg_dwh_membership` → `dwh_sync_fait_adhesion()`.

| Colonne | Type | Description |
|---|---|---|
| `id` | uuid | Clé primaire |
| `member_id` | uuid | FK → profiles.id |
| `season_year` | integer | Année de saison (ex: 2026 = saison 2025-2026) |
| `payment_status` | boolean | Cotisation payée → fait_adhesion.cotisation_payee |
| `medical_certificate_ok` | boolean | Certificat médical → fait_adhesion.certificat_medical_ok |
| `buddies_charter_signed` | boolean | Charte signée → fait_adhesion.charte_signee |
| `fsgt_insurance_ok` | boolean | Assurance FSGT → fait_adhesion.assurance_ok |
| `is_encadrant` | boolean | Est encadrant cette saison → fait_adhesion.is_encadrant |
| `board_role` | text | Rôle au bureau (Président, Trésorier...) → fait_adhesion.role_bureau |
| `apnea_level` | text | Niveau apnée saisi — **sensible à la casse** (doit correspondre exactement à apnea_levels.code) |
| `license_number` | text | Numéro de licence FSGT |
| `date_id` | date | Date d'inscription à la saison |

### outings
**Source des sorties club.** Alimente fait_participation et fait_co_instructeur.

| Colonne | Type | Description |
|---|---|---|
| `id` | uuid | Clé primaire — FK dans fait_participation.sortie_id |
| `title` | text | Titre de la sortie |
| `date_time` | timestamptz | Date et heure de départ |
| `date_id` | date | Date seule (FK → calendrier.date_id) |
| `organizer_id` | uuid | FK → profiles.id — **encadrant principal** (NE PAS utiliser organizer_member_id qui est toujours NULL) |
| `organizer_member_id` | uuid | Toujours NULL — ne pas utiliser |
| `outing_type` | USER-DEFINED | Type de sortie (Mer, Piscine...) |
| `location_id` | uuid | FK → locations.id |
| `boat_id` | uuid | FK → boats.id |
| `max_participants` | integer | Capacité maximale |
| `water_entry_time` | time | Heure mise à l'eau |
| `water_exit_time` | time | Heure sortie de l'eau |
| `is_deleted` | boolean | Soft delete |
| `is_archived` | boolean | Archivé |

### reservations
Inscriptions des membres aux sorties. Alimente fait_participation via trigger `trg_dwh_reservations`.

| Colonne | Type | Description |
|---|---|---|
| `id` | uuid | Clé primaire |
| `outing_id` | uuid | FK → outings.id (CASCADE DELETE) |
| `user_id` | uuid | FK → profiles.id |
| `membre_id` | uuid | FK → dim_membre.membre_id (dénormalisé) |
| `status` | USER-DEFINED | Statut (confirmed, waitlist, cancelled...) |

### outing_co_instructors
Co-instructeurs par sortie. Alimente fait_co_instructeur via trigger `trg_dwh_co_instructeurs`.

| Colonne | Type | Description |
|---|---|---|
| `id` | uuid | Clé primaire |
| `outing_id` | uuid | FK → outings.id (CASCADE DELETE) |
| `user_id` | uuid | FK → profiles.id — **NE PAS utiliser instructor_id qui n'existe pas** |

### historical_outing_participants
Participants aux sorties historiques (avant le lancement de l'app). Alimente fait_participation_historique.

| Colonne | Type | Description |
|---|---|---|
| `id` | uuid | Clé primaire |
| `outing_id` | uuid | FK → outings.id (CASCADE DELETE) |
| `member_id` | uuid | FK → profiles.id |

### polls
Sondages créés par les admins. Options stockées en JSONB.

| Colonne | Type | Description |
|---|---|---|
| `id` | uuid | Clé primaire — correspond à dim_sondage.sondage_id et fait_vote.sondage_id |
| `title` | text | Titre du sondage |
| `options` | jsonb | Tableau d'objets [{id: uuid, label: text}] — **les IDs sont les clés dans votes.selected_options** |
| `allow_multiple` | boolean | Choix multiple autorisé |
| `is_active` | boolean | Sondage actif |
| `created_by` | uuid | FK → profiles.id |
| `closes_at` | timestamptz | Date de clôture (NULL = ouvert) |

### votes
Votes des membres. Alimente fait_vote. **Relation 1:1 avec dim_membre** (un vote par membre par sondage).

| Colonne | Type | Description |
|---|---|---|
| `id` | uuid | Clé primaire |
| `poll_id` | uuid | FK → polls.id — correspond à fait_vote.sondage_id |
| `member_id` | uuid | FK → profiles.id |
| `selected_options` | jsonb | Tableau d'IDs d'options choisies — jointure avec polls.options[].id pour obtenir le libellé |

### carpools / carpool_passengers
Covoiturages proposés et passagers. Alimentent fait_covoiturage et fait_passager_covoiturage.

---

## Tables DWH Dimensions (Power BI)

### dim_membre
Dimension principale des membres. **Table centrale du modèle.**

| Colonne | Type | Description |
|---|---|---|
| `membre_id` | uuid | Clé primaire — FK dans toutes les tables de faits |
| `code_membre` | text | Code lisible (M0001, M0002...) |
| `nom_complet` | text | Prénom + NOM |
| `prenom` | text | Prénom |
| `nom` | text | Nom en majuscules |
| `genre` | text | Genre |
| `age` | int | Âge calculé |
| `date_naissance` | date | Date de naissance |
| `date_adhesion` | date | Date de première adhésion au club |
| `anciennete_annees` | int | Nombre d'années d'ancienneté (0 = moins d'1 an — **ne pas utiliser seul pour "nouveau membre"**) |
| `niveau_apnee` | text | Niveau du profil (souvent NULL — utiliser fait_adhesion.niveau_apnee à la place) |
| `niveau_apnee_saison_courante` | text | Niveau saison courante |
| `est_encadrant_saison_courante` | boolean | Encadrant cette saison (**partiellement fiable — préférer fait_adhesion.is_encadrant par saison**) |
| `role_bureau_saison_courante` | text | Rôle au bureau (Président, VP, Trésorier, Secrétaire...) |
| `est_membre_actif` | boolean | Membre actif (a une adhésion valide) |
| `a_compte_app` | boolean | A un compte dans l'application |
| `apnea_level_id` | uuid | FK → apnea_levels.id (**souvent NULL**) |
| `statut_membre` | text | Statut |

### fait_adhesion
Faits des adhésions par membre par saison. **Source de vérité pour les dossiers.**

| Colonne | Type | Description |
|---|---|---|
| `adhesion_id` | uuid | Clé primaire |
| `membre_id` | uuid | FK → dim_membre.membre_id |
| `saison_id` | integer | Année de saison (2026 = saison 2025-2026) — **saison courante = MAX(saison_id)** |
| `date_id` | date | Date d'adhésion |
| `niveau_apnee` | text | Niveau déclaré — **sensible à la casse** pour jointure avec apnea_levels.code |
| `is_encadrant` | boolean | Encadrant cette saison |
| `role_bureau` | text | Rôle au bureau |
| `cotisation_payee` | integer | 0/1 |
| `certificat_medical_ok` | integer | 0/1 |
| `charte_signee` | integer | 0/1 |
| `assurance_ok` | integer | 0/1 |
| `membre_valide` | integer | 0/1 — flag global (**pas toujours fiable, préférer statut_dossier**) |
| `statut_dossier` | text | **Calculé par trigger** : "Complet" / "Niveau non reconnu" / "Admin incomplet" / "Admin incomplet + Niveau non reconnu" |
| `nb_adhesions` | integer | Nombre total d'adhésions du membre |

### fait_participation
Faits des participations aux sorties (saison courante).

| Colonne | Type | Description |
|---|---|---|
| `participation_id` | uuid | Clé primaire |
| `membre_id` | uuid | FK → dim_membre.membre_id |
| `sortie_id` | uuid | FK → outings.id |
| `date_id` | date | FK → calendrier.date_id |
| `encadrant_principal` | text | **Calculé par trigger** : prénom + NOM de l'organisateur (outings.organizer_id → profiles) |
| `titre_sortie` | text | Titre de la sortie |
| `type_sortie` | text | Type (Mer, Piscine...) |
| `site_id` | uuid | FK → dim_site.site_id |
| `bateau_id` | uuid | FK → boats.id |
| `statut_reservation` | text | Statut de la réservation |
| `present` | integer | 0/1 présent |
| `absent` | integer | 0/1 absent |
| `nb_inscriptions` | integer | Toujours 1 par ligne |
| `capacite_max` | integer | Capacité max de la sortie |

### fait_participation_historique
Participations historiques (avant lancement app). Structure identique à fait_participation sans les champs de réservation.

| Colonne | Type | Description |
|---|---|---|
| `participation_id` | uuid | Clé primaire |
| `membre_id` | uuid | FK → dim_membre.membre_id |
| `sortie_id` | uuid | FK → outings.id |
| `date_id` | date | FK → calendrier.date_id |
| `encadrant_principal` | text | **Calculé par trigger** |
| `titre_sortie` | text | Titre |
| `type_sortie` | text | Type |
| `site_id` | uuid | FK → dim_site.site_id |

### fait_vote
Votes des membres aux sondages. **Relation 1:1 avec dim_membre** (un vote par membre par sondage).

| Colonne | Type | Description |
|---|---|---|
| `vote_id` | uuid | Clé primaire |
| `membre_id` | uuid | FK → dim_membre.membre_id |
| `sondage_id` | uuid | FK → dim_sondage.sondage_id |
| `date_id` | date | Date du vote |
| `options_choisies` | text | JSON array des IDs d'options choisies (ex: ["uuid1"]) |
| `option_label` | text | **Calculé par trigger** : libellé(s) des options choisies en clair, séparés par " \| " si multiple |
| `nb_votes` | integer | Toujours 1 |

### dim_options_sondage
**Table de synthèse des votes par option.** Créée le 2026-06-04. Pour visuels agrégés (camembert, barres).
⚠️ Ne pas croiser avec dim_membre — pas de lien direct.

| Colonne | Type | Description |
|---|---|---|
| `sondage_id` | text | FK → dim_sondage.sondage_id |
| `option_id` | text | ID de l'option (UUID depuis polls.options[].id) |
| `option_label` | text | Libellé de l'option en clair |
| `nb_votes` | integer | Nombre de membres ayant choisi cette option |

### dim_sondage
Dimension des sondages.

| Colonne | Type | Description |
|---|---|---|
| `sondage_id` | text | Clé primaire |
| `titre` | text | Titre du sondage |
| `options_disponibles` | text | Options disponibles |
| `choix_multiple` | boolean | Choix multiple autorisé |
| `est_actif` | boolean | Sondage actif |
| `cree_par` | text | Créateur |
| `date_creation` | date | Date de création |
| `date_cloture` | date | Date de clôture (NULL = ouvert) |

### dim_role
Membres ayant un rôle dans l'application (admin/bureau). **Contient les 10 encadrants + membres du bureau.**
⚠️ Mélange encadrants et bureau — utiliser avec fait_adhesion.is_encadrant pour distinguer.

| Colonne | Type | Description |
|---|---|---|
| `role_id` | uuid | Clé primaire |
| `membre_id` | uuid | FK → dim_membre.membre_id (peut être NULL pour 1 ligne orpheline) |
| `user_id` | uuid | FK → profiles.id |
| `email` | text | Email |
| `role_app` | text | Rôle dans l'app (toujours "admin" actuellement) |

### dim_saison
Référentiel des saisons. **Attention : est_saison_courante pointe sur saison_id=2025 (2025-2026) mais les données de fait_adhesion utilisent saison_id=2026.**

| Colonne | Type | Description |
|---|---|---|
| `saison_id` | integer | Clé primaire — année de début (ex: 2025 = saison 2025-2026) |
| `libelle` | text | Libellé (ex: "2025-2026") |
| `date_debut` | date | 1er septembre de l'année de début |
| `date_fin` | date | 31 août de l'année suivante |
| `est_saison_courante` | boolean | ⚠️ Incohérence connue : pointe sur 2025 mais fait_adhesion.saison_id=2026 pour la saison courante. **Utiliser MAXX(ALL(fait_adhesion), saison_id) pour la saison courante en DAX.** |

### calendrier
Table calendrier enrichie avec 45 colonnes temporelles. Date de référence pour toutes les tables de faits.

| Colonne | Type | Description |
|---|---|---|
| `date_id` | date | Clé primaire |
| `saison_id` | integer | FK → dim_saison.saison_id |
| `annee` | integer | Année |
| `mois` | integer | Mois (1-12) |
| `semaine_iso` | integer | Semaine ISO |
| `est_weekend` | boolean | Week-end |
| `est_aujourd_hui` | boolean | Aujourd'hui |
| `jour_relatif` | integer | Jours par rapport à aujourd'hui |
| ... | ... | 37 autres colonnes temporelles |

### dim_equipement / fait_mouvement_equipement
Inventaire et mouvements des équipements du club.

| Colonne clé | Description |
|---|---|
| `dim_equipement.inventory_id` | Clé primaire — FK dans fait_mouvement_equipement.equipement_id |
| `dim_equipement.valeur_estimee` | Valeur en euros |
| `dim_equipement.statut` | Statut actuel (disponible, prêté, perdu...) |
| `fait_mouvement_equipement.nb_prets` | Nombre de prêts |
| `fait_mouvement_equipement.nb_retours` | Nombre de retours |
| `fait_mouvement_equipement.nb_pertes` | Nombre de pertes |

---

## Notes importantes pour Power BI / DAX

1. **Saison courante en DAX** : utiliser `MAXX(ALL('public fait_adhesion'), 'public fait_adhesion'[saison_id])` — NE PAS utiliser `dim_saison[est_saison_courante]` (incohérence connue)
2. **Nb Encadrants** : utiliser `fait_adhesion[is_encadrant] = TRUE()` filtré sur saison courante — NE PAS utiliser `dim_membre[est_encadrant_saison_courante]` (partiellement fiable)
3. **Nouveaux membres** : membres présents en saison courante mais absents des saisons précédentes dans fait_adhesion — NE PAS utiliser `dim_membre[anciennete_annees] = 0`
4. **Statut dossier** : utiliser `fait_adhesion[statut_dossier]` (calculé par trigger) — NE PAS reconstruire les conditions booléennes manuellement
5. **Encadrant principal sortie** : `fait_participation[encadrant_principal]` (calculé par trigger depuis outings.organizer_id → profiles) — NE PAS utiliser `outings.organizer_member_id` (toujours NULL)
6. **Option sondage en clair** : `fait_vote[option_label]` (calculé par trigger) — NE PAS utiliser `fait_vote[options_choisies]` directement (contient des UUIDs)
7. **Cardinalité fait_vote ↔ dim_membre** : relation 1:1 BothDirections — contrainte Power BI, ne peut pas être changée en OneDirection
8. **Relations inactives** : `fait_adhesion.date_id → calendrier` et `fait_vote.date_id → calendrier` sont INACTIVES — utiliser `USERELATIONSHIP()` en DAX si analyse temporelle nécessaire

---

*Dernière mise à jour : 2026-06-04*
