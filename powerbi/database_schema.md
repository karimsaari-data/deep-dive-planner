# Schéma base de données — Deep Dive Planner

Généré le 2026-06-04 depuis Supabase


## apnea_levels

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `id` | uuid | ❌ | gen_random_uuid() |
| `code` | text | ❌ |  |
| `name` | text | ❌ |  |
| `prerogatives` | text | ✅ |  |
| `is_instructor` | boolean | ✅ | false |
| `federation` | text | ✅ |  |
| `federation_full_name` | text | ✅ |  |
| `created_at` | timestamp with time zone | ✅ | now() |
| `profondeur_max_eaa` | integer | ✅ |  |
| `profondeur_max_eao` | integer | ✅ |  |
| `max_participants_encadrement` | integer | ✅ |  |

## boats

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `id` | uuid | ❌ | gen_random_uuid() |
| `name` | text | ❌ |  |
| `registration_number` | text | ✅ |  |
| `capacity` | integer | ❌ | 6 |
| `pilot_name` | text | ✅ |  |
| `pilot_phone` | text | ✅ |  |
| `oxygen_location` | text | ✅ |  |
| `home_port` | text | ✅ |  |
| `created_at` | timestamp with time zone | ❌ | now() |
| `updated_at` | timestamp with time zone | ❌ | now() |

## calendrier

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `date_id` | date | ❌ |  |
| `annee` | smallint | ❌ |  |
| `debut_annee` | date | ❌ |  |
| `fin_annee` | date | ❌ |  |
| `annee_label` | text | ❌ |  |
| `annee_relatif` | smallint | ❌ |  |
| `trimestre` | smallint | ❌ |  |
| `trimestre_label` | text | ❌ |  |
| `trimestre_annee_label` | text | ❌ |  |
| `trimestre_annee_tri` | integer | ❌ |  |
| `debut_trimestre` | date | ❌ |  |
| `fin_trimestre` | date | ❌ |  |
| `trimestre_relatif` | integer | ❌ |  |
| `mois` | smallint | ❌ |  |
| `mois_label` | text | ❌ |  |
| `mois_court` | text | ❌ |  |
| `mois_annee_label` | text | ❌ |  |
| `mois_annee_tri` | integer | ❌ |  |
| `debut_mois` | date | ❌ |  |
| `fin_mois` | date | ❌ |  |
| `jours_dans_mois` | smallint | ❌ |  |
| `mois_relatif` | integer | ❌ |  |
| `semaine_iso` | smallint | ❌ |  |
| `annee_semaine_iso` | smallint | ❌ |  |
| `semaine_label` | text | ❌ |  |
| `semaine_annee_label` | text | ❌ |  |
| `semaine_annee_tri` | integer | ❌ |  |
| `debut_semaine` | date | ❌ |  |
| `fin_semaine` | date | ❌ |  |
| `semaine_relative` | integer | ❌ |  |
| `jour_mois` | smallint | ❌ |  |
| `jour_annee` | smallint | ❌ |  |
| `jour_semaine` | smallint | ❌ |  |
| `jour_label` | text | ❌ |  |
| `jour_court` | text | ❌ |  |
| `jour_lettre` | text | ❌ |  |
| `est_weekend` | boolean | ❌ |  |
| `est_semaine` | boolean | ❌ |  |
| `est_aujourd_hui` | boolean | ❌ |  |
| `est_passe` | boolean | ❌ |  |
| `est_futur` | boolean | ❌ |  |
| `jour_relatif` | integer | ❌ |  |
| `annee_mois_jour_tri` | integer | ❌ |  |
| `label_complet` | text | ❌ |  |
| `saison_id` | integer | ❌ |  |

## carpool_passengers

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `id` | uuid | ❌ | gen_random_uuid() |
| `carpool_id` | uuid | ❌ |  |
| `passenger_id` | uuid | ❌ |  |
| `created_at` | timestamp with time zone | ❌ | now() |

## carpools

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `id` | uuid | ❌ | gen_random_uuid() |
| `outing_id` | uuid | ❌ |  |
| `driver_id` | uuid | ❌ |  |
| `departure_time` | time without time zone | ❌ |  |
| `available_seats` | integer | ❌ |  |
| `meeting_point` | text | ❌ |  |
| `maps_link` | text | ✅ |  |
| `notes` | text | ✅ |  |
| `created_at` | timestamp with time zone | ❌ | now() |
| `updated_at` | timestamp with time zone | ❌ | now() |

## club_members_directory

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `id` | uuid | ❌ | gen_random_uuid() |
| `member_id` | text | ❌ |  |
| `first_name` | text | ❌ |  |
| `last_name` | text | ❌ |  |
| `email` | text | ❌ |  |
| `phone` | text | ✅ |  |
| `birth_date` | date | ✅ |  |
| `address` | text | ✅ |  |
| `joined_at` | date | ✅ | CURRENT_DATE |
| `notes` | text | ✅ |  |
| `created_at` | timestamp with time zone | ❌ | now() |
| `updated_at` | timestamp with time zone | ❌ | now() |
| `emergency_contact_name` | text | ✅ |  |
| `emergency_contact_phone` | text | ✅ |  |
| `gender` | text | ✅ |  |
| `security_docs_url` | text | ✅ |  |

## dim_compte

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `compte_id` | uuid | ❌ |  |
| `prenom` | text | ✅ |  |
| `nom` | text | ✅ |  |
| `nom_complet` | text | ✅ |  |
| `email` | text | ✅ |  |
| `role` | text | ✅ | 'member'::text |
| `code_membre` | text | ✅ |  |
| `created_at` | timestamp with time zone | ✅ |  |

## dim_equipement

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `inventory_id` | uuid | ❌ |  |
| `catalog_id` | uuid | ✅ |  |
| `nom` | text | ✅ |  |
| `description` | text | ✅ |  |
| `valeur_estimee` | numeric | ✅ |  |
| `unique_code` | text | ✅ |  |
| `statut` | text | ✅ |  |
| `date_acquisition` | date | ✅ |  |
| `notes` | text | ✅ |  |
| `updated_at` | timestamp with time zone | ✅ | now() |

## dim_membre

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `membre_id` | uuid | ❌ |  |
| `code_membre` | text | ✅ |  |
| `prenom` | text | ✅ |  |
| `nom` | text | ✅ |  |
| `nom_complet` | text | ✅ |  |
| `email` | text | ✅ |  |
| `telephone` | text | ✅ |  |
| `date_naissance` | date | ✅ |  |
| `age` | integer | ✅ |  |
| `genre` | text | ✅ |  |
| `date_adhesion` | timestamp with time zone | ✅ |  |
| `anciennete_annees` | integer | ✅ |  |
| `contact_urgence_nom` | text | ✅ |  |
| `contact_urgence_tel` | text | ✅ |  |
| `profile_id` | uuid | ✅ |  |
| `statut_membre` | text | ✅ |  |
| `niveau_apnee` | text | ✅ |  |
| `avatar_url` | text | ✅ |  |
| `a_compte_app` | boolean | ✅ | false |
| `niveau_apnee_saison_courante` | text | ✅ |  |
| `est_encadrant_saison_courante` | boolean | ✅ |  |
| `role_bureau_saison_courante` | text | ✅ |  |
| `est_membre_actif` | boolean | ✅ | false |
| `updated_at` | timestamp with time zone | ✅ | now() |
| `apnea_level_id` | uuid | ✅ |  |
| `created_at` | timestamp with time zone | ✅ | now() |

## dim_options_sondage

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `option_id` | text | ❌ |  |
| `sondage_id` | text | ❌ |  |
| `option_label` | text | ✅ |  |
| `nb_votes` | integer | ✅ | 0 |
| `updated_at` | timestamp with time zone | ✅ | now() |

## dim_role

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `role_id` | uuid | ❌ |  |
| `user_id` | uuid | ✅ |  |
| `email` | text | ✅ |  |
| `membre_id` | uuid | ✅ |  |
| `role_app` | text | ✅ |  |
| `updated_at` | timestamp with time zone | ✅ | now() |

## dim_saison

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `saison_id` | integer | ❌ |  |
| `libelle` | text | ❌ |  |
| `date_debut` | date | ❌ |  |
| `date_fin` | date | ❌ |  |
| `est_saison_courante` | boolean | ❌ | false |

## dim_site

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `site_id` | uuid | ❌ |  |
| `nom` | text | ✅ |  |
| `adresse` | text | ✅ |  |
| `type_site` | text | ✅ |  |
| `latitude` | double precision | ✅ |  |
| `longitude` | double precision | ✅ |  |
| `profondeur_max` | numeric | ✅ |  |
| `commentaires` | text | ✅ |  |
| `photo_url` | text | ✅ |  |
| `updated_at` | timestamp with time zone | ✅ | now() |

## dim_sondage

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `sondage_id` | uuid | ❌ |  |
| `titre` | text | ✅ |  |
| `options_disponibles` | jsonb | ✅ |  |
| `choix_multiple` | boolean | ✅ |  |
| `est_actif` | boolean | ✅ |  |
| `cree_par` | uuid | ✅ |  |
| `date_creation` | date | ✅ |  |
| `date_cloture` | date | ✅ |  |
| `updated_at` | timestamp with time zone | ✅ | now() |

## dim_waypoint

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `waypoint_id` | uuid | ❌ |  |
| `site_id` | uuid | ✅ |  |
| `nom` | text | ✅ |  |
| `latitude` | double precision | ✅ |  |
| `longitude` | double precision | ✅ |  |
| `type_point` | text | ✅ |  |
| `updated_at` | timestamp with time zone | ✅ | now() |

## equipment_catalog

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `id` | uuid | ❌ | gen_random_uuid() |
| `name` | text | ❌ |  |
| `description` | text | ✅ |  |
| `photo_url` | text | ✅ |  |
| `created_at` | timestamp with time zone | ❌ | now() |
| `updated_at` | timestamp with time zone | ❌ | now() |
| `estimated_value` | numeric | ✅ | 0 |

## equipment_history

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `id` | uuid | ❌ | gen_random_uuid() |
| `inventory_id` | uuid | ❌ |  |
| `action_type` | text | ❌ |  |
| `from_user_id` | uuid | ✅ |  |
| `to_user_id` | uuid | ✅ |  |
| `old_status` | USER-DEFINED | ✅ |  |
| `new_status` | USER-DEFINED | ✅ |  |
| `notes` | text | ✅ |  |
| `created_at` | timestamp with time zone | ❌ | now() |
| `created_by` | uuid | ❌ |  |
| `date_id` | date | ✅ |  |

## equipment_inventory

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `id` | uuid | ❌ | gen_random_uuid() |
| `catalog_id` | uuid | ❌ |  |
| `owner_id` | uuid | ❌ |  |
| `status` | USER-DEFINED | ❌ | 'disponible'::equipment_status |
| `notes` | text | ✅ |  |
| `acquired_at` | timestamp with time zone | ❌ | now() |
| `created_at` | timestamp with time zone | ❌ | now() |
| `updated_at` | timestamp with time zone | ❌ | now() |
| `photo_url` | text | ✅ |  |
| `unique_code` | text | ❌ |  |

## fait_adhesion

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `adhesion_id` | uuid | ❌ | gen_random_uuid() |
| `date_id` | date | ✅ |  |
| `membre_id` | uuid | ✅ |  |
| `niveau_apnee` | text | ✅ |  |
| `role_bureau` | text | ✅ |  |
| `is_encadrant` | boolean | ✅ |  |
| `numero_licence` | text | ✅ |  |
| `cotisation_payee` | integer | ✅ | 0 |
| `certificat_medical_ok` | integer | ✅ | 0 |
| `charte_signee` | integer | ✅ | 0 |
| `assurance_ok` | integer | ✅ | 0 |
| `membre_valide` | integer | ✅ | 0 |
| `nb_adhesions` | integer | ✅ | 1 |
| `updated_at` | timestamp with time zone | ✅ | now() |
| `saison_id` | integer | ✅ |  |
| `statut_dossier` | text | ✅ |  |

## fait_co_instructeur

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `co_instructeur_id` | uuid | ❌ |  |
| `date_id` | date | ✅ |  |
| `sortie_id` | uuid | ✅ |  |
| `membre_id` | uuid | ✅ |  |
| `nb_co_instructeurs` | integer | ✅ | 1 |
| `updated_at` | timestamp with time zone | ✅ | now() |

## fait_covoiturage

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `covoiturage_id` | uuid | ❌ |  |
| `date_id` | date | ✅ |  |
| `sortie_id` | uuid | ✅ |  |
| `conducteur_id` | uuid | ✅ |  |
| `places_disponibles` | integer | ✅ |  |
| `point_rencontre` | text | ✅ |  |
| `heure_depart` | time without time zone | ✅ |  |
| `nb_covoiturages` | integer | ✅ | 1 |
| `updated_at` | timestamp with time zone | ✅ | now() |

## fait_mouvement_equipement

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `mouvement_id` | uuid | ❌ |  |
| `date_id` | date | ✅ |  |
| `equipement_id` | uuid | ✅ |  |
| `membre_id_source` | uuid | ✅ |  |
| `membre_id_dest` | uuid | ✅ |  |
| `type_action` | text | ✅ |  |
| `ancien_statut` | text | ✅ |  |
| `nouveau_statut` | text | ✅ |  |
| `notes` | text | ✅ |  |
| `nb_mouvements` | integer | ✅ | 1 |
| `nb_prets` | integer | ✅ | 0 |
| `nb_retours` | integer | ✅ | 0 |
| `nb_pertes` | integer | ✅ | 0 |
| `updated_at` | timestamp with time zone | ✅ | now() |

## fait_participation

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `participation_id` | uuid | ❌ |  |
| `date_id` | date | ✅ |  |
| `membre_id` | uuid | ✅ |  |
| `site_id` | uuid | ✅ |  |
| `bateau_id` | uuid | ✅ |  |
| `sortie_id` | uuid | ✅ |  |
| `titre_sortie` | text | ✅ |  |
| `type_sortie` | text | ✅ |  |
| `mode_plongee` | text | ✅ |  |
| `capacite_max` | integer | ✅ |  |
| `heure_mise_eau` | text | ✅ |  |
| `heure_sortie_eau` | text | ✅ |  |
| `statut_reservation` | text | ✅ |  |
| `option_covoiturage` | text | ✅ |  |
| `present` | integer | ✅ | 0 |
| `absent` | integer | ✅ | 0 |
| `nb_inscriptions` | integer | ✅ | 1 |
| `updated_at` | timestamp with time zone | ✅ | now() |
| `encadrant_principal` | text | ✅ |  |

## fait_participation_historique

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `participation_id` | uuid | ❌ |  |
| `date_id` | date | ✅ |  |
| `membre_id` | uuid | ✅ |  |
| `sortie_id` | uuid | ✅ |  |
| `titre_sortie` | text | ✅ |  |
| `type_sortie` | text | ✅ |  |
| `site_id` | uuid | ✅ |  |
| `nb_participations` | integer | ✅ | 1 |
| `updated_at` | timestamp with time zone | ✅ | now() |
| `encadrant_principal` | text | ✅ |  |

## fait_passager_covoiturage

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `passager_id` | uuid | ❌ |  |
| `date_id` | date | ✅ |  |
| `covoiturage_id` | uuid | ✅ |  |
| `membre_id` | uuid | ✅ |  |
| `nb_passagers` | integer | ✅ | 1 |
| `updated_at` | timestamp with time zone | ✅ | now() |

## fait_vote

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `vote_id` | uuid | ❌ |  |
| `date_id` | date | ✅ |  |
| `sondage_id` | uuid | ✅ |  |
| `membre_id` | uuid | ✅ |  |
| `options_choisies` | jsonb | ✅ |  |
| `nb_votes` | integer | ✅ | 1 |
| `updated_at` | timestamp with time zone | ✅ | now() |
| `option_label` | text | ✅ |  |

## historical_outing_participants

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `id` | uuid | ❌ | gen_random_uuid() |
| `outing_id` | uuid | ❌ |  |
| `member_id` | uuid | ❌ |  |
| `created_at` | timestamp with time zone | ❌ | now() |

## locations

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `id` | uuid | ❌ | gen_random_uuid() |
| `name` | text | ❌ |  |
| `address` | text | ✅ |  |
| `type` | text | ✅ |  |
| `maps_url` | text | ✅ |  |
| `created_at` | timestamp with time zone | ✅ | now() |
| `updated_at` | timestamp with time zone | ✅ | now() |
| `latitude` | double precision | ✅ |  |
| `longitude` | double precision | ✅ |  |
| `photo_url` | text | ✅ |  |
| `max_depth` | numeric | ✅ |  |
| `comments` | text | ✅ |  |
| `satellite_map_url` | text | ✅ |  |
| `bathymetric_map_url` | text | ✅ |  |

## membership_yearly_status

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `id` | uuid | ❌ | gen_random_uuid() |
| `member_id` | uuid | ❌ |  |
| `season_year` | integer | ❌ |  |
| `payment_status` | boolean | ❌ | false |
| `medical_certificate_ok` | boolean | ❌ | false |
| `buddies_charter_signed` | boolean | ❌ | false |
| `fsgt_insurance_ok` | boolean | ❌ | false |
| `created_at` | timestamp with time zone | ❌ | now() |
| `updated_at` | timestamp with time zone | ❌ | now() |
| `is_encadrant` | boolean | ❌ | false |
| `board_role` | text | ✅ |  |
| `apnea_level` | text | ✅ |  |
| `license_number` | text | ✅ |  |
| `date_id` | date | ✅ |  |

## outing_co_instructors

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `id` | uuid | ❌ | gen_random_uuid() |
| `outing_id` | uuid | ❌ |  |
| `user_id` | uuid | ❌ |  |
| `added_at` | timestamp with time zone | ❌ | now() |

## outings

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `id` | uuid | ❌ | gen_random_uuid() |
| `title` | text | ❌ |  |
| `description` | text | ✅ |  |
| `date_time` | timestamp with time zone | ❌ |  |
| `location` | text | ❌ |  |
| `organizer_id` | uuid | ✅ |  |
| `outing_type` | USER-DEFINED | ❌ |  |
| `max_participants` | integer | ❌ | 10 |
| `created_at` | timestamp with time zone | ✅ | now() |
| `updated_at` | timestamp with time zone | ✅ | now() |
| `end_date` | timestamp with time zone | ✅ |  |
| `location_id` | uuid | ✅ |  |
| `session_report` | text | ✅ |  |
| `reminder_sent` | boolean | ✅ | false |
| `photos` | ARRAY | ✅ | '{}'::text[] |
| `is_deleted` | boolean | ❌ | false |
| `is_archived` | boolean | ❌ | false |
| `is_staff_only` | boolean | ❌ | false |
| `dive_mode` | text | ✅ |  |
| `boat_id` | uuid | ✅ |  |
| `organizer_member_id` | uuid | ✅ |  |
| `is_poss_locked` | boolean | ✅ | false |
| `water_entry_time` | time without time zone | ✅ |  |
| `water_exit_time` | time without time zone | ✅ |  |
| `date_id` | date | ✅ |  |

## polls

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `id` | uuid | ❌ | gen_random_uuid() |
| `title` | text | ❌ |  |
| `options` | jsonb | ❌ |  |
| `allow_multiple` | boolean | ✅ | false |
| `is_active` | boolean | ✅ | true |
| `created_by` | uuid | ✅ |  |
| `created_at` | timestamp with time zone | ✅ | now() |
| `closes_at` | timestamp with time zone | ✅ |  |

## profiles

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `id` | uuid | ❌ |  |
| `first_name` | text | ❌ |  |
| `last_name` | text | ❌ |  |
| `email` | text | ❌ |  |
| `apnea_level` | text | ✅ |  |
| `specialty` | text | ✅ |  |
| `created_at` | timestamp with time zone | ✅ | now() |
| `updated_at` | timestamp with time zone | ✅ | now() |
| `avatar_url` | text | ✅ |  |
| `member_status` | USER-DEFINED | ✅ | 'Membre'::member_status |
| `member_code` | text | ✅ |  |
| `phone` | text | ✅ |  |

## reservations

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `id` | uuid | ❌ | gen_random_uuid() |
| `outing_id` | uuid | ❌ |  |
| `user_id` | uuid | ❌ |  |
| `created_at` | timestamp with time zone | ✅ | now() |
| `status` | USER-DEFINED | ✅ | 'confirmÃ©'::booking_status |
| `cancelled_at` | timestamp with time zone | ✅ |  |
| `carpool_option` | USER-DEFINED | ✅ | 'none'::carpool_option |
| `carpool_seats` | integer | ✅ | 0 |
| `is_present` | boolean | ✅ | false |
| `membre_id` | uuid | ✅ |  |

## site_waypoints

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `id` | uuid | ❌ | gen_random_uuid() |
| `site_id` | uuid | ❌ |  |
| `name` | text | ❌ |  |
| `latitude` | double precision | ❌ |  |
| `longitude` | double precision | ❌ |  |
| `point_type` | USER-DEFINED | ❌ |  |
| `created_at` | timestamp with time zone | ❌ | now() |

## user_roles

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `id` | uuid | ❌ | gen_random_uuid() |
| `user_id` | uuid | ❌ |  |
| `role` | USER-DEFINED | ❌ | 'member'::app_role |

## votes

| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| `id` | uuid | ❌ | gen_random_uuid() |
| `poll_id` | uuid | ❌ |  |
| `member_id` | uuid | ❌ |  |
| `user_id` | uuid | ✅ |  |
| `selected_options` | jsonb | ❌ |  |
| `voted_at` | timestamp with time zone | ✅ | now() |

