# Site de la mairie de Margency — maquette

Refonte complète du site de la commune de Margency (Val-d'Oise), au design
« liquid glass ». **Maquette personnelle, sans lien avec la commune :** elle
n'a pas été commandée ni validée par la mairie, et n'est pas en ligne.

## Ce que contient le projet

Un site statique — HTML, CSS et JavaScript, sans framework ni build — et une
interface de gestion qui écrit directement dans les fichiers de données.

| Dossier | Contenu |
| --- | --- |
| `*.html` | Les 15 pages du site, chacune autonome |
| `css/base.css` | Styles partagés : couleurs, formulaires, boutons, modales |
| `js/` | Statut d'ouverture de la mairie, météo, icônes, compte citoyen de démonstration |
| `data/*.js` | Les contenus : agenda, actualités, conseil municipal, services… |
| `assets/` | Photos, blason, documents |
| `serveur.py` | Serveur local et API d'enregistrement |

## Lancer le site

Le site se consulte sans rien installer, mais **l'interface de gestion a besoin
du serveur** pour enregistrer les modifications.

```bash
python3 serveur.py
```

- Le site : http://localhost:8766/index.html
- La gestion : http://localhost:8766/gestion.html

Python 3 suffit — aucune dépendance à installer.

## L'interface de gestion

`gestion.html` permet d'ajouter et de modifier les contenus sans toucher au
code : événements, actualités, séances du conseil, informations de l'écran
d'accueil, cartes « Découvrir → », annuaires, horaires. Chaque enregistrement
écrit le fichier `data/*.js` correspondant et garde l'ancienne version dans
`data/historique/`, qui conserve les 30 dernières.

## Ce qui n'est pas versionné

Les demandes envoyées par les habitants (`data/demandes.json`), les sauvegardes
automatiques et les fichiers déposés depuis la gestion restent sur la machine :
ce sont des données de fonctionnement, pas du code.

## Reste à faire

- Le téléphone de l'Urbanisme et celui de l'État civil sont identiques alors que
  seul l'État civil indique une touche — à confirmer auprès de la mairie.
- La ligne « Hébergeur » des mentions légales attend un vrai nom.
