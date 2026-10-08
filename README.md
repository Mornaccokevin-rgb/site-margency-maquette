# Site de la mairie de Margency — maquette

Refonte complète du site de la commune de Margency (Val-d'Oise), au design
« liquid glass », avec l'interface d'administration qui va avec.

> **Maquette personnelle.** Elle n'a pas été commandée ni validée par la
> commune, et n'est pas en ligne. Le nom et le blason sont ceux de la vraie
> mairie ; ce site n'a aucun caractère officiel.

## Visite guidée

Lancez le serveur, puis suivez ces quatre étapes — c'est le parcours le plus
court pour voir ce que le projet sait faire.

```bash
python3 serveur.py
```

| | À ouvrir | Ce qu'il y a à voir |
| --- | --- | --- |
| 1 | [L'accueil](http://localhost:8766/index.html) | La mairie en plein écran ; en descendant, la photo reste en place pendant que la présentation arrive par-dessus |
| 2 | [L'agenda](http://localhost:8766/agenda.html) | Un calendrier où les événements qui se chevauchent s'empilent sur des voies, sans jamais se masquer |
| 3 | [Vivre à Margency](http://localhost:8766/vivre-a-margency.html#salles) | Le simulateur de réservation de salle, et la page à onglets type |
| 4 | [La gestion](http://localhost:8766/gestion.html) | L'interface qui réécrit les contenus du site, sans toucher au code |

Python 3 suffit : aucune dépendance à installer, aucune compilation.

## Le projet en bref

- **15 pages**, 150 vues en comptant les onglets
- **Aucun framework**, aucune étape de build, 0 dépendance
- **Une interface de gestion** pour les 13 jeux de contenus, avec sauvegardes
  automatiques et dépôt de fichiers
- **Un audit qualité** de 32 défauts relevés puis corrigés, contrôlé à trois
  largeurs d'écran

## Organisation du dossier

```
.
├── index.html et 14 autres pages   le site, une page par rubrique
├── gestion.html                    l'interface d'administration
├── serveur.py                      serveur local et API d'enregistrement
├── css/base.css                    styles partagés
├── js/                             horaires, météo, icônes, compte citoyen
├── data/                           les contenus, un fichier par rubrique
├── assets/                         photos et documents, rangés par section
└── docs/                           architecture, audit, note d'origine
```

Les pages sont à la racine, comme le veut un site statique : l'adresse d'une
page est son nom de fichier, et les liens entre pages restent lisibles.

## Pour aller plus loin

- **[docs/architecture.md](docs/architecture.md)** — comment c'est construit,
  les trois couches, les choix techniques à connaître
- **[docs/audit-qualite.md](docs/audit-qualite.md)** — les défauts relevés, leur
  cause commune, et ce qui a été corrigé
- **[docs/prompt-refonte-origine.md](docs/prompt-refonte-origine.md)** — la note
  de travail qui a lancé le projet

## Ce qui n'est pas versionné

Les demandes envoyées par les habitants (`data/demandes.json`), les sauvegardes
automatiques et les fichiers déposés depuis la gestion restent sur la machine :
ce sont des données de fonctionnement, parfois personnelles, pas du code.

## Reste à trancher

- Le téléphone de l'Urbanisme et celui de l'État civil sont identiques alors que
  seul l'État civil indique une touche — à confirmer auprès de la mairie.
- La ligne « Hébergeur » des mentions légales attend un vrai nom.
