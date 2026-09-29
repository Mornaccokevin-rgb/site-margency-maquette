# PROMPT — Refonte page d'accueil de mairie (style Liquid Glass)

> Mode d'emploi : copie tout ce qui est entre les lignes `───`, remplace les 3 champs
> en haut (URL, NOM, DOSSIER), colle dans Claude Code. Rien d'autre à faire.

───────────────────────────────────────────────────────────────────

## MISSION

Tu vas refaire **la page d'accueil uniquement** du site officiel de la mairie ci-dessous,
dans une version nettement plus moderne, avec une identité visuelle "liquid glass".

- **Site actuel à reprendre :** `[COLLER L'URL ICI]`
- **Nom de la commune :** `[NOM DE LA COMMUNE]`
- **Dossier de sortie :** `~/Desktop/[nom-du-dossier]/index.html`

---

## ÉTAPE 1 — Récupérer le vrai contenu (obligatoire, avant d'écrire une ligne de code)

Va chercher sur le site actuel, et note-les :

1. Les **rubriques du menu principal** (reprends-les telles quelles, c'est l'architecture
   voulue par la commune — ne les réinvente pas).
2. Les **accès rapides / services mis en avant** sur la home.
3. Les **2 à 3 dernières actualités** (titre, date, sujet).
4. Les **prochains événements** de l'agenda (date, intitulé, lieu, horaire).
5. Les **infos pratiques** : adresse exacte, téléphone, fax, e-mail, horaires d'ouverture
   jour par jour.
6. Une **phrase d'accroche** sur l'identité de la commune (situation géographique,
   nombre d'habitants, caractère du lieu, distance d'une grande ville).

**Règle sur les contenus :** tout ce qui vient du vrai site est repris fidèlement.
Ce que tu ne trouves pas, tu l'inventes de façon plausible **et tu me le signales
explicitement à la fin** comme "à valider". Ne jamais inventer un horaire, un numéro
de téléphone ou une adresse : ces trois-là, si tu ne les trouves pas, tu me le dis.

---

## ÉTAPE 2 — Le design system (c'est le cœur, respecte-le à la lettre)

### Le principe du "liquid glass"

Une classe `.glass` sert de brique de base à **toutes** les surfaces (nav, cartes,
panneaux, boutons secondaires). Elle empile 4 couches :

```css
.glass{
  position:relative; isolation:isolate; overflow:hidden;
  border-radius:30px;
  background:rgba(255,255,255,.42);                          /* 1. fond translucide */
  backdrop-filter:blur(22px) saturate(180%);                 /* 2. flou + saturation */
  -webkit-backdrop-filter:blur(22px) saturate(180%);
  border:1px solid rgba(255,255,255,.65);
  box-shadow:0 8px 32px rgba(9,42,54,.13),                   /* 3. ombre portée douce */
             inset 0 1px 0 rgba(255,255,255,.85),            /*    + épaisseur du verre */
             inset 0 -1px 0 rgba(255,255,255,.25);
}
/* reflet spéculaire diagonal figé */
.glass::before{
  content:""; position:absolute; inset:0; z-index:0; pointer-events:none;
  background:linear-gradient(135deg, rgba(255,255,255,.55) 0%, rgba(255,255,255,0) 42%,
             rgba(255,255,255,0) 60%, rgba(255,255,255,.22) 100%);
}
/* 4. halo lumineux qui suit le curseur */
.glass::after{
  content:""; position:absolute; inset:-1px; z-index:0; pointer-events:none;
  opacity:0; transition:opacity .45s cubic-bezier(.22,1,.36,1);
  background:radial-gradient(340px circle at var(--mx,50%) var(--my,50%),
             rgba(255,255,255,.6), transparent 62%);
}
.glass:hover::after{opacity:1}
.glass > *{position:relative; z-index:1}
```

Piloté par ce JS (indispensable, sinon le verre est mort) :

```js
document.querySelectorAll('.glass').forEach(function(el){
  el.addEventListener('pointermove', function(e){
    var r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    el.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });
});
```

### Le fond animé (non négociable)

Le verre n'a de sens que s'il a **quelque chose à réfracter**. Donc en `position:fixed`,
`z-index:-2`, derrière tout : **4 blobs** de couleur en `border-radius:50%` +
`filter:blur(90px)`, largeur 520–640px, `opacity` .35 à .55, animés en `translate`+`scale`
sur 24 à 33 secondes en boucle. Par-dessus, un **grain SVG** (`feTurbulence`,
`baseFrequency .85`, `opacity .22`) en `z-index:-1`.

### Les boutons — 3 niveaux, jamais plus

C'est le point le plus important : **on doit distinguer les boutons au premier coup d'œil.**

| Classe | Usage | Rendu |
|---|---|---|
| `.btn-solid` | action principale (1 seule par section) | dégradé plein de la couleur de marque, ombre colorée `0 8px 26px rgba(marque,.4)`, `inset 0 1px 0 rgba(255,255,255,.32)`, texte blanc |
| `.btn-glass` | action secondaire | verre épais `rgba(255,255,255,.62)`, texte foncé |
| `.btn-ghost` | action sur fond sombre | `rgba(255,255,255,.28)` + bordure blanche à 40 % |

Tous en `border-radius:999px`, tous avec une flèche SVG `→` qui glisse de 3px au survol,
tous en `translateY(-2px)` au survol et `scale(.98)` au clic.

### Palette — à adapter à la commune

Garde la structure, change les teintes selon l'identité du lieu (blason, paysage,
couleur historique de la ville) :

```css
--ink:#0b1a24;        /* texte principal, presque noir bleuté */
--ink-soft:#3d5563;   /* paragraphes */
--ink-mute:#6b8494;   /* légendes, dates */
--brand:#0f766e;      /* couleur de marque → À CHANGER par commune */
--accent:#c2703d;     /* accent chaud → À CHANGER */
--bg:#eef4f3;         /* fond général, très désaturé */
```

**Deux polices, pas une de plus :** `Inter` (300→700) pour tout le texte,
`Instrument Serif` en italique **uniquement** pour 2–3 mots mis en valeur dans le H1,
en dégradé `-webkit-background-clip:text`.

### Rayons et animation

Rayons : `14 / 22 / 30 / 40px` + `999px` pour les pilules. Une seule courbe d'easing
partout : `cubic-bezier(.22,1,.36,1)`. Apparition des blocs au scroll via
`IntersectionObserver` (translateY 26px → 0, opacity 0 → 1, délai échelonné de 60ms).

---

## ÉTAPE 3 — La structure de la page (dans cet ordre)

1. **Barre d'infos** fine — pastille verte qui pulse + "Mairie ouverte aujourd'hui
   jusqu'à Xh", téléphone cliquable, adresse ; à droite : liens utilitaires.
   Masquée sous 900px.
2. **Nav flottante en pilule** `.glass`, `position:sticky`, avec blason en dégradé,
   nom de la commune + département en petites capitales, les rubriques du vrai site,
   une icône loupe et **un bouton `.btn-solid`** pour l'espace citoyen.
   Elle se densifie au scroll (fond plus opaque + ombre plus marquée via une classe
   `.scrolled` posée au-delà de 12px).
3. **Hero en 2 colonnes.** À gauche, un panneau `.glass` : sur-titre, H1 avec les mots
   en serif italique dégradé, accroche, 2 boutons (`.btn-solid` + `.btn-glass`),
   et 3 chiffres clés séparés par un filet. À droite, un visuel en dégradé profond
   avec une **silhouette SVG stylisée du village** (toits, clocher, arbres, en blanc
   à 10–22 % d'opacité), un badge en verre en haut à gauche, et une **carte flottante
   en verre** en bas annonçant le prochain conseil municipal.
4. **Accès rapides** — grille de 5 cartes `.glass`, chacune avec une icône en dégradé
   dans un carré de 50px (une couleur différente par carte), titre, description courte,
   et un lien "Accéder →" poussé en bas de carte. Au survol : `translateY(-7px)`
   et l'icône pivote de -4°.
5. **Actualités** — grille asymétrique `1.35fr 1fr 1fr` : la première en vedette avec
   un visuel plus haut. Chaque carte : zone média en dégradé qui zoome au survol,
   tag en verre posé dessus, date, titre, chapô, lien.
6. **Agenda + Infos pratiques** — deux panneaux `.glass` côte à côte (`1.25fr .95fr`).
   À gauche, 4 événements : pastille de date en dégradé plein, titre, lieu ; la ligne
   glisse de 6px vers la droite au survol. À droite, les horaires jour par jour
   (les jours fermés en gris clair), puis adresse / téléphone / e-mail avec icônes,
   puis un `.btn-solid` pleine largeur "Prendre rendez-vous".
7. **Bandeau compte citoyen** — bloc sombre en dégradé de la couleur de marque avec
   deux halos radiaux, texte à gauche + 4 tuiles en verre à droite.
8. **Footer** sombre 4 colonnes + réseaux sociaux + barre légale.

---

## ÉTAPE 4 — Contraintes techniques

- **Un seul fichier `index.html`**, CSS et JS inclus dedans. Zéro framework, zéro build.
  Seule dépendance externe autorisée : Google Fonts.
- **Responsive réel**, testé à 3 points de rupture : 1100px (grilles qui se resserrent),
  900px (nav → menu plein écran en verre, hero en 1 colonne),
  640px (tout en colonne unique).
- `@media (prefers-reduced-motion:reduce)` qui coupe animations et transitions
  et force les blocs révélés en visible.
- Balises sémantiques (`header`, `main`, `section`, `article`, `footer`),
  `aria-label` sur tous les boutons-icônes, contraste de texte suffisant.
- **Icônes en SVG inline** (stroke, `stroke-width:2`, `stroke-linecap:round`) —
  aucune bibliothèque d'icônes, aucun emoji.
- Dans le footer, inclure le lien **"Accessibilité : non conforme"** : c'est une
  obligation légale RGAA pour un site public, à mettre à jour après audit.
- Métadonnées `<title>` et `<meta name="description">` renseignées avec le vrai nom
  de la commune et son code postal.

---

## ÉTAPE 5 — Vérification avant de me répondre

1. Lance un serveur local depuis le dossier (`python3 -m http.server <port libre>` —
   **vérifie que le port est libre**, j'ai souvent d'autres serveurs qui tournent).
2. Ouvre la page dans le navigateur et **regarde-la vraiment** : screenshot en haut,
   au milieu, en bas, puis en largeur mobile.
3. Vérifie qu'il n'y a **aucune erreur console**.

Puis réponds-moi avec : le chemin du fichier, la commande pour ouvrir l'aperçu,
ce que tu as repris du vrai site, **et la liste explicite de ce que tu as inventé
et que je dois valider**.

───────────────────────────────────────────────────────────────────
