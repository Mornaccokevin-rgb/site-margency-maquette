# Audit qualité — 32 défauts relevés, 31 corrigés

Balayage des 15 pages et de leurs 150 vues, à 390 px, 768 px et 1440 px de
large, accordéons ouverts puis fermés. Position réelle de chaque élément
mesurée dans un navigateur, plutôt que relecture du code.

**Ce qui a été cherché :** débordement hors du cadre, texte coupé ou masqué,
éléments qui se recouvrent, défilement horizontal, grilles plus larges que leur
conteneur, images cassées, champs sans intitulé, cibles trop petites,
contrastes, erreurs de console, liens et ancres morts, identifiants dupliqués,
fautes de typographie.

## Les cinq défauts bloquants

| Où | Ce qui se passait | Cause |
| --- | --- | --- |
| Gestion → Catégories | Dans Safari, les cases à cocher s'étiraient sur toute la largeur de leur pastille et passaient par-dessus le texte | `.field input` appliquait `width:100%` à tous les champs ; Chrome l'ignore sur une case à cocher, WebKit non |
| Réservation de salle | Mêmes règles sur les boutons radio masqués, qui pouvaient déborder sur le choix voisin | idem |
| Vie municipale → Démarches, sur mobile | Un accordéon ouvert mesurait 385 px dans un cadre de 308 px : le texte était coupé net | grille en `1fr` |
| Gestion, sur mobile | Défilement horizontal, cartes débordant de 15 px | grille en `1fr` |
| Agenda | Le mois d'ouverture et le bouton « Aujourd'hui » étaient figés sur septembre 2026 | dates écrites en dur |

## La cause commune

Six défauts venaient d'une seule écriture. En CSS, `1fr` signifie « au minimum
la largeur du contenu, au maximum une part égale » : quand le contenu est trop
large, la colonne grossit au-delà de son cadre au lieu de comprimer le contenu.
**281 grilles** sont passées à `minmax(0, 1fr)`.

## Les autres corrections

- **Navigation :** le menu principal avait six versions différentes selon la
  page, et sur téléphone cinq des six rubriques étaient injoignables depuis une
  page intérieure. Un seul menu, un seul volet mobile, un seul pied de page.
- **Liens :** quatre liens morts rebranchés, dont la carte « Nouvel arrivant »
  de l'accueil ; libellés alignés sur leur destination.
- **Contenu :** trois événements de test retirés de l'agenda public.
- **Maintenance :** horaires de la mairie et année du copyright ramenés à une
  source unique, au lieu d'être recopiés dans 13 pieds de page.
- **Typographie :** ponctuation française corrigée dans le texte affiché,
  heures du journal au format 9h12.
- **Accessibilité :** couleur du texte secondaire assombrie pour passer le seuil
  AA (3,52 → 4,59 pour 1), 25 champs sans intitulé nommés, cible « Lire la
  suite » agrandie, barre d'onglets de la gestion signalée comme défilante.

## Contrôle après correction

Même balayage relancé sur les 15 pages et leurs 150 vues, aux trois largeurs :
**aucun défaut, aucune erreur de console.**

## Le point resté ouvert

L'Urbanisme et l'État civil partagent le 01 34 27 40 41, et seul l'État civil
indique une touche. Corriger demanderait d'inventer un numéro : c'est à la
mairie de dire lequel est juste.
