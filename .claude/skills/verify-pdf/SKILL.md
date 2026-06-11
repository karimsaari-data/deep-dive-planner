---
name: verify-pdf
description: Rendu visuel exact d'une page PDF (pipeline React + html2canvas) pour vérifier la mise en forme AVANT de pousser. Utiliser à chaque modification d'un composant de src/components/pdf/pages/.
---

# Vérifier le rendu d'une page PDF

Les PDF de l'app sont générés en capturant un composant React avec html2canvas
(jsPDF assemble ensuite l'image). html2canvas a des écarts de rendu connus par
rapport au navigateur (alignements flex `center`/`baseline` non fiables,
notamment). **Une page PDF modifiée doit donc être vérifiée via ce skill — pas
seulement via `npm run build`** : la capture produite contient les pixels
exacts du futur PDF.

## Usage

```bash
node .claude/skills/verify-pdf/render-pdf-page.mjs <NomComposant> [options]
```

Exemple :

```bash
node .claude/skills/verify-pdf/render-pdf-page.mjs PDFPageEvacuationApnee
# → /tmp/pdf-verify-PDFPageEvacuationApnee.png
```

Options :
- `--props <fichier.json>` : props à passer au composant (JSON)
- `--width <px>` / `--height <px>` : dimensions de la page (défaut 794×1123, A4 portrait à 96dpi ; A4 paysage = 1123×794)
- `--out <chemin.png>` : chemin de sortie de la capture

Ensuite **lire le PNG produit** (outil Read) et inspecter : alignements des
lignes/cases/libellés, débordements, chevauchements texte/règles.

## Composants

Les pages sont dans `src/components/pdf/pages/`, un export nommé identique au
nom de fichier (`PDFPageEvacuationApnee.tsx` → `export const
PDFPageEvacuationApnee`). Certaines pages exigent des props (données de
sortie, membres…) : créer un petit JSON de fixture et le passer via `--props`.
Si le composant plante sans props, le script affiche l'erreur de la console
navigateur.

## Prérequis (gérés automatiquement par le script)

- `playwright-core` (installé via `npm i --no-save` si absent)
- Chromium Playwright (installé via `npx playwright install chromium` si absent)

## Pièges html2canvas connus dans ce projet

- `align-items: center`/`baseline` sur des flex : décalages verticaux →
  préférer `flex-end` + hauteurs fixes (`height`/`lineHeight` explicites).
- Texte posé sur une bordure basse : risque d'effet « barré » → positionner la
  règle en `position: absolute; bottom: 0` et le texte 2px au-dessus.
- Divs vides dans un flex `baseline` : la ligne « flotte » au-dessus du texte.
