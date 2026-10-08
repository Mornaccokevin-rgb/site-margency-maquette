# Comment le site est construit

## Le parti pris

Aucun framework, aucune étape de compilation, aucune dépendance à installer.
Le site est fait de pages HTML qui s'ouvrent telles quelles, et les contenus
vivent à part dans des fichiers de données. Un petit serveur Python permet à
l'interface de gestion de réécrire ces fichiers.

Pourquoi : une commune de 2 900 habitants doit pouvoir reprendre le site des
années plus tard, sans que rien n'ait « expiré ». Du HTML et du JavaScript
simples restent lisibles et réparables par n'importe qui.

## Les trois couches

**1. Les contenus — `data/*.js`**

Chaque fichier déclare une variable globale et ne contient que des données :

| Fichier | Variable | Contenu |
| --- | --- | --- |
| `accueil.js` | `ACCUEIL` | Les informations de l'écran d'accueil |
| `agenda.js` | `AGENDA` | Les événements |
| `actus.js` | `ACTUS` | Les actualités |
| `conseil.js` | `CONSEIL` | Séances du conseil municipal et élus |
| `ccas.js` | `CCAS` | Séances du conseil d'administration du CCAS |
| `cartes.js` | `CARTES` | Les cartes « Découvrir → » de toutes les pages |
| `services.js` | `SERVICES` | Les rubriques de la page Tous les services |
| `vie-municipale.js` | `VIE` | Annuaire, publications, budgets, marchés, emplois, collectes |
| `enfance.js` | `ENFANCE` | Menus, inscriptions, programmes, caisse des écoles |
| `vivre.js` | `VIVRE` | Salles, commerces, santé, transports, numéros utiles |
| `urbanisme.js` | `URBA` | PLU, arrêtés, projets, logement |
| `culture.js` | `CULTURE` | Associations et bibliothèque |
| `demo-citoyens.js` | `DEMO_SEED` | Habitants fictifs du compte citoyen |

**2. Les pages — un fichier HTML par rubrique**

Chaque page est autonome : son HTML, son CSS et son JavaScript sont dans le même
fichier, et elle lit les fichiers de données dont elle a besoin. On peut en
modifier une sans risquer de casser les autres.

Les pages à onglets (Vie municipale, Enfance, Vivre, Urbanisme, Sport & Culture,
Action sociale) suivent toutes le même schéma : une table `VUES`, une fonction
`route()` branchée sur `location.hash`, et une adresse de la forme
`page.html#onglet` ou `page.html#onglet/section`.

Ce qui est partagé vit dans `css/base.css` (couleurs, formulaires, boutons,
modales) et dans `js/` :

- `horaires.js` — le statut « mairie ouverte / fermée » en temps réel, **et la
  seule définition des horaires** : la barre du haut et les 13 pieds de page s'y
  servent, ainsi que l'année du copyright.
- `meteo.js` — choisit la photo d'accueil selon la météo du jour.
- `icones.js` — la bibliothèque d'icônes et les teintes.
- `compte-demo.js` — le compte citoyen de démonstration.

**3. La gestion — `gestion.html` et `serveur.py`**

`gestion.html` est une application d'administration complète : elle lit les mêmes
fichiers de données, laisse les modifier dans des formulaires, et les renvoie au
serveur. `serveur.py` les réécrit sur le disque.

Le serveur fait quatre choses, et rien d'autre :

- il sert les fichiers du dossier ;
- il réécrit un fichier de `data/` sur demande, en n'acceptant que ceux d'une
  liste fermée, et en gardant l'ancienne version dans `data/historique/` (30
  dernières) ;
- il reçoit les dépôts d'images et de documents dans `assets/uploads/` ;
- il enregistre les demandes envoyées par les habitants dans
  `data/demandes.json`, qui n'est jamais servi.

## Le design

Un système « liquid glass » : des surfaces translucides posées sur une photo et
un fond animé. Trois règles le tiennent :

- une classe `.glass` pour toute surface translucide ;
- une courbe d'animation unique, `--ease: cubic-bezier(.22,1,.36,1)` ;
- des grilles en `minmax(0, 1fr)` et jamais en `1fr` seul, pour qu'une colonne
  ne puisse pas s'élargir au-delà de son cadre sur un petit écran.

## Les choix à connaître

**La photo d'accueil est « collante ».** Elle couvre deux écrans — la mairie en
grand, puis le bloc de présentation — mais garde la taille d'un écran et reste
en place pendant qu'on descend, au lieu d'être étirée. Son cadrage ne se déforme
donc jamais.

**Le calendrier empile les événements sur des voies.** Un événement sur
plusieurs jours n'occupe pas les cases : il est posé par-dessus, en barre
continue. Quand deux événements se chevauchent, le second descend d'une voie.
Rien n'est jamais masqué.

**Les horaires et l'année ne sont écrits qu'une fois.** Les changer dans
`js/horaires.js` les met à jour partout.
