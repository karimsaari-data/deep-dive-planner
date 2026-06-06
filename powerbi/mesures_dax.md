# Mesures DAX — Deep Dive Planner

Toutes les mesures sont regroupées dans la table calculée **`_Mesures`**.
Mise à jour : 2026-06-06 — modèle `model_backup_2026-06-04.tmdl`.

---

## Sommaire

| Mesure | Catégorie | Format |
|--------|-----------|--------|
| [Nb Membres Actifs](#nb-membres-actifs) | Membres | Entier |
| [Nb Adhésions Saison Courante](#nb-adhésions-saison-courante) | Adhésions | Entier |
| [Nb Encadrants](#nb-encadrants) | Adhésions | Entier |
| [Âge Moyen Membres](#âge-moyen-membres) | Membres | Décimal |
| [Nb Nouveaux Membres](#nb-nouveaux-membres) | Membres | Entier |
| [Taux Dossier Complet](#taux-dossier-complet) | Dossiers | % (1 déc.) |
| [Nb Dossiers Incomplets](#nb-dossiers-incomplets) | Dossiers | Entier |
| [Nb Sorties](#nb-sorties) | Sorties | Entier |
| [Nb Participations](#nb-participations) | Sorties | Entier |
| [Choix Sondage](#choix-sondage) | Sondages | Texte |

---

## Membres

### Nb Membres Actifs

Compte le nombre de membres ayant un statut actif dans `dim_membre`.

```dax
COUNTROWS(
    FILTER('public dim_membre',
        'public dim_membre'[est_membre_actif] = TRUE())
)
```

**Format :** `0`  
**Table source :** `dim_membre`  
**Champ clé :** `dim_membre[est_membre_actif]` — positionné à TRUE par trigger quand le membre a une adhésion valide.

> ⚠️ Inclut tous les membres actifs toutes saisons confondues. Pour filtrer sur la saison courante, utiliser **Nb Adhésions Saison Courante** à la place.

---

### Âge Moyen Membres

Moyenne d'âge de tous les membres présents dans `dim_membre`.

```dax
AVERAGE('public dim_membre'[age])
```

**Format :** décimal automatique  
**Table source :** `dim_membre`  
**Champ clé :** `dim_membre[age]` — calculé à partir de `dim_membre[date_naissance]`.

> ℹ️ La mesure répond aux filtres du rapport (tranche d'âge, genre, niveau…).

---

### Nb Nouveaux Membres

Membres inscrits en saison courante (saison_id = 2026) qui n'étaient **jamais** présents dans les saisons antérieures.

```dax
CALCULATE(
    DISTINCTCOUNT('public fait_adhesion'[membre_id]),
    'public fait_adhesion'[saison_id] = 2026,
    NOT('public fait_adhesion'[membre_id]
        IN CALCULATETABLE(
            VALUES('public fait_adhesion'[membre_id]),
            'public fait_adhesion'[saison_id] < 2026
        )
    )
)
```

**Format :** `0`  
**Table source :** `fait_adhesion`  
**Logique :** membres présents en 2026 SAUF ceux ayant eu au moins une adhésion avant 2026.

> ⚠️ La saison 2026 est codée en dur. À mettre à jour chaque saison, ou remplacer `2026` par `MAXX(ALL('public fait_adhesion'), 'public fait_adhesion'[saison_id])` pour le rendre dynamique.

---

## Adhésions

### Nb Adhésions Saison Courante

Nombre de lignes dans `fait_adhesion` pour la saison marquée `est_saison_courante = TRUE` dans `dim_saison`.

```dax
CALCULATE(
    COUNTROWS('public fait_adhesion'),
    'public dim_saison'[est_saison_courante] = TRUE()
)
```

**Format :** `0`  
**Tables sources :** `fait_adhesion`, `dim_saison`  

> ⚠️ **Incohérence connue :** `dim_saison[est_saison_courante]` pointe sur `saison_id = 2025`, alors que les données de `fait_adhesion` utilisent `saison_id = 2026`. Cette mesure peut donc retourner 0 si le flag n'est pas à jour. Alternative fiable :
> ```dax
> CALCULATE(
>     COUNTROWS('public fait_adhesion'),
>     'public fait_adhesion'[saison_id] = MAXX(ALL('public fait_adhesion'), 'public fait_adhesion'[saison_id])
> )
> ```

---

### Nb Encadrants

Nombre de membres avec `is_encadrant = TRUE` pour la saison courante.

```dax
CALCULATE(
    COUNTROWS(FILTER('public fait_adhesion',
        'public fait_adhesion'[is_encadrant] = TRUE()
    )),
    FILTER('public dim_saison', 'public dim_saison'[est_saison_courante] = TRUE())
)
```

**Format :** `0`  
**Tables sources :** `fait_adhesion`, `dim_saison`  

> ⚠️ Même incohérence que **Nb Adhésions Saison Courante** sur `dim_saison[est_saison_courante]`. Préférer :
> ```dax
> CALCULATE(
>     COUNTROWS(FILTER('public fait_adhesion', 'public fait_adhesion'[is_encadrant] = TRUE())),
>     'public fait_adhesion'[saison_id] = MAXX(ALL('public fait_adhesion'), 'public fait_adhesion'[saison_id])
> )
> ```
> Ne pas utiliser `dim_membre[est_encadrant_saison_courante]` — partiellement fiable.

---

## Dossiers

### Taux Dossier Complet

Proportion de dossiers avec `statut_dossier = "Complet"` pour la saison courante.

```dax
VAR saison_courante = MAXX(ALL('public fait_adhesion'), 'public fait_adhesion'[saison_id])
VAR adhesions_saison =
    FILTER('public fait_adhesion', 'public fait_adhesion'[saison_id] = saison_courante)
RETURN
DIVIDE(
    COUNTROWS(FILTER(adhesions_saison, 'public fait_adhesion'[statut_dossier] = "Complet")),
    COUNTROWS(adhesions_saison)
)
```

**Format :** `0.0\ %;-0.0\ %;0.0\ %`  
**Table source :** `fait_adhesion`  
**Logique :** utilise `MAXX(ALL(...))` pour détecter dynamiquement la saison courante — robuste à l'incohérence de `dim_saison`.

**Valeurs possibles de `statut_dossier` :**
- `"Complet"` — tous les éléments validés
- `"Niveau non reconnu"` — niveau apnée non trouvé dans `apnea_levels.code`
- `"Admin incomplet"` — cotisation / certificat / charte / assurance manquant
- `"Admin incomplet + Niveau non reconnu"` — double problème

---

### Nb Dossiers Incomplets

Nombre de dossiers dont `statut_dossier ≠ "Complet"` pour la saison courante.

```dax
VAR saison_courante = MAXX(ALL('public fait_adhesion'), 'public fait_adhesion'[saison_id])
RETURN
COUNTROWS(
    FILTER('public fait_adhesion',
        'public fait_adhesion'[saison_id] = saison_courante
        && 'public fait_adhesion'[statut_dossier] <> "Complet"
    )
)
```

**Format :** `0`  
**Table source :** `fait_adhesion`  

> ℹ️ Complément de **Taux Dossier Complet** : `Nb Dossiers Incomplets + dossiers complets = Nb Adhésions Saison Courante`.

---

## Sorties

### Nb Sorties

Nombre de sorties distinctes ayant au moins une participation enregistrée.

```dax
DISTINCTCOUNT('public fait_participation'[sortie_id])
```

**Format :** `0`  
**Table source :** `fait_participation`  

> ℹ️ Répond aux filtres du rapport (période, type de sortie, encadrant, site…). Pour compter uniquement les sorties de la table `outings` (y compris sans participants), utiliser `COUNTROWS('public outings')` ou `DISTINCTCOUNT('public outings'[id])`.

---

### Nb Participations

Total des inscriptions (confirmées ou présentes) : somme de `nb_inscriptions` dans `fait_participation`.

```dax
SUM('public fait_participation'[nb_inscriptions])
```

**Format :** `0`  
**Table source :** `fait_participation`  
**Champ clé :** `fait_participation[nb_inscriptions]` — toujours 1 par ligne (une ligne = un membre sur une sortie).

> ℹ️ Équivaut à `COUNTROWS('public fait_participation')` car `nb_inscriptions` vaut toujours 1. Pour distinguer présents/absents, filtrer sur `fait_participation[present] = 1` ou `fait_participation[absent] = 1`.

---

## Sondages

### Choix Sondage

Retourne le libellé de l'option choisie pour le contexte de filtre courant (un membre, un sondage). Retourne `"Non répondu"` si aucun vote.

```dax
COALESCE(
    CALCULATE(MAX('public fait_vote'[option_label])),
    "Non répondu"
)
```

**Format :** texte  
**Table source :** `fait_vote`  
**Champ clé :** `fait_vote[option_label]` — calculé par trigger depuis `polls.options[]`, contient les libellés en clair séparés par ` | ` si choix multiple.

> ℹ️ Conçu pour être utilisé dans un tableau avec `dim_membre` en lignes et `dim_sondage` en colonnes (matrice de réponses). La relation `fait_vote ↔ dim_membre` est en **BothDirections** (cardinalité 1:1) — contrainte Power BI, ne peut pas être changée.
>
> ⚠️ Ne pas utiliser `fait_vote[options_choisies]` directement — contient des UUIDs, pas des libellés.

---

## Bonnes pratiques DAX

### Saison courante

Toujours utiliser la variable suivante plutôt que `dim_saison[est_saison_courante]` :

```dax
VAR saison_courante = MAXX(ALL('public fait_adhesion'), 'public fait_adhesion'[saison_id])
```

`dim_saison[est_saison_courante]` pointe sur `saison_id = 2025` mais les données de `fait_adhesion` utilisent `saison_id = 2026` — incohérence connue.

### Relations inactives

Les relations suivantes sont **inactives** dans le modèle — utiliser `USERELATIONSHIP()` pour l'analyse temporelle :

```dax
-- Exemple : participations par mois
CALCULATE(
    [Nb Participations],
    USERELATIONSHIP('public fait_participation'[date_id], 'public calendrier'[date_id])
)
```

Relations inactives connues :
- `fait_adhesion[date_id] → calendrier[date_id]`
- `fait_vote[date_id] → calendrier[date_id]`

### DIVIDE plutôt que `/`

Toujours utiliser `DIVIDE(numérateur, dénominateur, [résultat_si_0])` pour éviter les erreurs de division par zéro (ex: `Taux Dossier Complet`).

---

*Documentation générée le 2026-06-06 — modèle Power BI `model_backup_2026-06-04.tmdl`*
