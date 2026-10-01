/* ============================================================
   COMPTE CITOYEN — démarches en ligne
   Connexion, inscriptions scolaires, restauration scolaire,
   signalements et suivi des demandes d'urbanisme.
   MAQUETTE : tout est enregistré dans le navigateur (localStorage),
   il n'y a ni serveur, ni envoi, ni vraie instruction des dossiers.
   Dépend de js/compte-demo.js (window.MD) et js/icones.js (window.ICONES).
   ============================================================ */
(function(){

  /* ---------- pictogrammes ---------- */
  var ICO = {};
  var base = window.ICONES || {};
  for(var k in base) ICO[k] = base[k];
  ICO.user     = '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>';
  ICO.lock     = '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>';
  ICO.arrow    = '<path d="M5 12h14M13 6l6 6-6 6"/>';
  ICO.back     = '<path d="M19 12H5M11 18l-6-6 6-6"/>';
  ICO.plus     = '<path d="M12 5v14M5 12h14"/>';
  ICO.x        = '<path d="M18 6 6 18M6 6l12 12"/>';
  ICO.alert    = '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>';
  ICO.pin      = '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>';
  ICO.clock    = '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>';
  ICO.send     = '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>';
  ICO.eye      = '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>';
  ICO.download = '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>';
  ICO.school   = '<path d="M22 10 12 5 2 10l10 5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>';
  ICO.left     = '<path d="M15 18 9 12l6-6"/>';
  ICO.right    = '<path d="m9 6 6 6-6 6"/>';
  ICO.ruler    = '<path d="M3 15 15 3l6 6L9 21z"/><path d="m7 11 2 2M11 7l2 2M11 15l2 2M15 11l2 2"/>';

  function svg(nom, extra){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'+
           (extra ? ' ' + extra : '') + '>' + (ICO[nom] || '') + '</svg>';
  }
  function esc(s){ return MD.esc(s); }
  function S(){ return MD.state; }

  /* ---------- dates ---------- */
  var JOURS = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
  var MOIS_LONG = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  function moisLong(ym){ return MOIS_LONG[Number(ym.slice(5, 7)) - 1] + ' ' + ym.slice(0, 4); }
  function p2(n){ return n < 10 ? '0' + n : '' + n; }
  function enDate(iso){ var p = iso.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function enIso(d){ return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function plusJours(iso, n){ var d = enDate(iso); d.setDate(d.getDate() + n); return enIso(d); }
  function joursEntre(a, b){ return Math.round((enDate(b) - enDate(a)) / 86400000); }
  function plusMois(iso, n){
    var d = enDate(iso), j = d.getDate();
    d.setDate(1); d.setMonth(d.getMonth() + n);
    var dernier = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(j, dernier));
    return enIso(d);
  }
  function dateLongue(iso){
    if(!iso) return '';
    return JOURS[enDate(iso).getDay()] + ' ' + MD.dateFr(iso);
  }
  function aujourdhui(){ return MD.AUJOURDHUI; }

  /* ============================================================
     RÉFÉRENTIELS
     ============================================================ */

  var ECOLES = {
    mat:  {id:'mat',  nom:'École maternelle Le Petit Prince',   court:'Maternelle Le Petit Prince',
           niveaux:['TPS','PS','MS','GS'], c1:'#f472b6', c2:'#be185d'},
    elem: {id:'elem', nom:'École élémentaire Saint-Exupéry',    court:'Élémentaire Saint-Exupéry',
           niveaux:['CP','CE1','CE2','CM1','CM2'], c1:'#60a5fa', c2:'#2563eb'}
  };
  var NIVEAUX = {2:'TPS', 3:'PS', 4:'MS', 5:'GS', 6:'CP', 7:'CE1', 8:'CE2', 9:'CM1', 10:'CM2'};

  /* en France, la classe dépend de l'année de naissance, pas du jour anniversaire */
  function niveauPour(naissance, rentree){
    if(!naissance) return null;
    return NIVEAUX[rentree - Number(naissance.slice(0, 4))] || null;
  }
  function ecolePour(niveau){
    if(!niveau) return null;
    return ECOLES.mat.niveaux.indexOf(niveau) !== -1 ? ECOLES.mat
         : ECOLES.elem.niveaux.indexOf(niveau) !== -1 ? ECOLES.elem : null;
  }
  /* année de la rentrée en cours : on bascule sur la suivante au 1er septembre */
  function rentreeEnCours(){
    var p = aujourdhui().split('-');
    return Number(p[1]) >= 9 ? Number(p[0]) : Number(p[0]) - 1;
  }
  function libelleAnnee(r){ return r + '-' + (r + 1); }

  var PERISCO = [
    {id:'resto',    nom:'Restauration scolaire', detail:'Déjeuner au restaurant scolaire, réservé jour par jour depuis votre compte.'},
    {id:'etude',    nom:'Étude surveillée',      detail:'Après la classe, de 16h30 à 18h, pour les élémentaires.'},
    {id:'mercredi', nom:'Centre de loisirs — mercredis', detail:'Les Marcyens, journée ou demi-journée.'},
    {id:'vacances', nom:'Centre de loisirs — vacances',  detail:'Les Marcyens, pendant les vacances scolaires.'}
  ];

  var PIECES_SCOLAIRE = [
    'Livret de famille ou acte de naissance de l’enfant',
    'Justificatif de domicile de moins de 3 mois',
    'Carnet de santé (pages vaccinations)',
    'Certificat de radiation, en cas de changement d’école',
    'Attestation d’assurance scolaire et extrascolaire'
  ];

  var CATS = [
    {id:'voirie',    nom:'Voirie et chaussée',     ic:'car',   c1:'#94a3b8', c2:'#475569',
     ex:'Nid-de-poule, trottoir dégradé, affaissement, marquage effacé',
     service:'Services techniques', delai:'10 jours ouvrés'},
    {id:'eclairage', nom:'Éclairage public',       ic:'bulb',  c1:'#facc15', c2:'#a16207',
     ex:'Lampadaire éteint, clignotant ou allumé en plein jour',
     service:'Services techniques', delai:'5 jours ouvrés'},
    {id:'proprete',  nom:'Propreté',               ic:'trash', c1:'#4ade80', c2:'#15803d',
     ex:'Dépôt sauvage, corbeille débordante, tag, déjections',
     service:'Services techniques', delai:'3 jours ouvrés'},
    {id:'espaces',   nom:'Espaces verts',          ic:'leaf',  c1:'#34d399', c2:'#047857',
     ex:'Branche dangereuse, haie non taillée, arbre à élaguer',
     service:'Service espaces verts', delai:'15 jours'},
    {id:'mobilier',  nom:'Mobilier urbain',        ic:'build', c1:'#a78bfa', c2:'#6d28d9',
     ex:'Banc cassé, panneau tombé, jeux abîmés, abri-bus dégradé',
     service:'Services techniques', delai:'10 jours ouvrés'},
    {id:'eau',       nom:'Eau et assainissement',  ic:'tools', c1:'#60a5fa', c2:'#2563eb',
     ex:'Fuite, avaloir bouché, grille descellée',
     service:'Services techniques', delai:'5 jours ouvrés'},
    {id:'autre',     nom:'Autre',                  ic:'chat',  c1:'#fb923c', c2:'#c2410c',
     ex:'Tout ce qui ne rentre dans aucune autre catégorie',
     service:'Accueil de la mairie', delai:'15 jours'}
  ];
  function categorie(id){ return CATS.filter(function(c){ return c.id === id; })[0]; }

  var URBA = [
    {id:'cua',  code:'CU',   nom:"Certificat d'urbanisme d'information", delai:1, cerfa:'13410*11',
     ex:"Connaître les règles d'urbanisme applicables à un terrain.",
     pieces:['Plan de situation du terrain']},
    {id:'cub',  code:'CU',   nom:"Certificat d'urbanisme opérationnel", delai:2, cerfa:'13410*11',
     ex:"Savoir si un projet précis est réalisable sur un terrain.",
     pieces:['Plan de situation du terrain','Note descriptive du projet','Plan du terrain, s’il existe des constructions']},
    {id:'dp',   code:'DP',   nom:'Déclaration préalable de travaux', delai:1, cerfa:'13703*12',
     ex:"Clôture, fenêtre, ravalement, abri de jardin, piscine de moins de 100 m², extension de moins de 20 m².",
     pieces:['Plan de situation du terrain','Plan de masse','Plan des façades et des toitures',
             'Représentation de l’aspect extérieur','Photographie de près et de loin']},
    {id:'pcmi', code:'PCMI', nom:'Permis de construire — maison individuelle', delai:2, cerfa:'13406*14',
     ex:"Construction, extension de plus de 20 m² ou surélévation d'une maison individuelle.",
     pieces:['Plan de situation du terrain','Plan de masse coté','Plan en coupe du terrain',
             'Notice décrivant le terrain et le projet','Plan des façades et des toitures',
             'Document graphique d’insertion','Photographie de près et de loin']},
    {id:'pc',   code:'PC',   nom:'Permis de construire — autres constructions', delai:3, cerfa:'13409*14',
     ex:"Immeuble, local d'activité, équipement recevant du public.",
     pieces:['Plan de situation du terrain','Plan de masse coté','Plan en coupe du terrain',
             'Notice décrivant le terrain et le projet','Plan des façades et des toitures',
             'Document graphique d’insertion','Photographie de près et de loin']},
    {id:'pd',   code:'PD',   nom:'Permis de démolir', delai:2, cerfa:'13405*10',
     ex:"Démolition totale ou partielle d'une construction.",
     pieces:['Plan de situation du terrain','Plan de masse','Photographie de la construction à démolir']},
    {id:'pa',   code:'PA',   nom:"Permis d'aménager", delai:3, cerfa:'13409*14',
     ex:"Lotissement, aire de stationnement, terrain de camping, affouillement.",
     pieces:['Plan de situation du terrain','Notice décrivant le terrain et le projet',
             'Plan de l’état actuel','Plan de composition du projet','Photographie de près et de loin']}
  ];
  function typeUrba(id){ return URBA.filter(function(t){ return t.id === id; })[0]; }

  /* ---------- étapes de suivi, par famille de démarche ---------- */
  var FLUX = {
    scolaire: [
      {id:'recue',   label:'Demande reçue',            note:'Votre demande est enregistrée par le service scolaire.'},
      {id:'etude',   label:'Dossier en cours d’examen', note:'Le service vérifie les pièces et l’adresse de résidence.'},
      {id:'validee', label:'Inscription validée',       note:'L’enfant est inscrit. La directrice vous contacte pour le rendez-vous d’admission.'}
    ],
    signalement: [
      {id:'recu',   label:'Signalement reçu',        note:'Votre signalement est enregistré et horodaté.'},
      {id:'pris',   label:'Pris en charge',          note:'Un agent s’est rendu sur place pour constater.'},
      {id:'cours',  label:'Intervention programmée', note:'Les travaux sont planifiés.'},
      {id:'resolu', label:'Résolu',                  note:'L’intervention est terminée.'}
    ],
    urbanisme: [
      {id:'depose',      label:'Dossier déposé',  note:'Un récépissé vous est remis avec le numéro de dossier.'},
      {id:'instruction', label:'En instruction',  note:'Le service urbanisme instruit le dossier et consulte, si besoin, les services extérieurs.'},
      {id:'decision',    label:'Décision rendue', note:'L’arrêté est notifié et affiché en mairie.'}
    ]
  };
  var FAMILLES = {
    scolaire:    {nom:'Inscriptions scolaires',  ic:'school', c1:'#f472b6', c2:'#be185d', hash:'scolaire',
                  service:'Service scolaire', resume:'Déclarer vos enfants et demander leur inscription à l’école.'},
    cantine:     {nom:'Restauration scolaire',   ic:'fork',   c1:'#fb923c', c2:'#c2410c', hash:'cantine',
                  service:'Service périscolaire', resume:'Réserver ou annuler les repas, jour par jour.'},
    signalement: {nom:'Signaler un problème',    ic:'alert',  c1:'#facc15', c2:'#a16207', hash:'signalement',
                  service:'Services techniques', resume:'Voirie, éclairage, propreté, espaces verts, mobilier urbain.'},
    urbanisme:   {nom:'Suivi urbanisme',         ic:'doc',    c1:'#60a5fa', c2:'#2563eb', hash:'urbanisme',
                  service:'Service urbanisme', resume:'Déposer une demande et suivre son instruction.'}
  };

  /* ============================================================
     MODÈLE — stockage des enfants, des demandes et des repas
     ============================================================ */

  function init(){
    var s = S();
    if(!s.demandes) s.demandes = [];
    if(!s.repas)    s.repas = {};
    s.citoyens.forEach(function(c){ if(!c.enfants) c.enfants = []; });
    if(!s.demoDemarches){ seedDemo(); s.demoDemarches = 1; }
    MD.save();
  }

  function demandes(citoyenId, famille){
    return S().demandes.filter(function(d){
      return d.citoyen === citoyenId && (!famille || d.famille === famille);
    }).sort(function(a, b){ return a.date < b.date ? 1 : -1; });
  }
  function enCours(citoyenId, famille){
    return demandes(citoyenId, famille).filter(function(d){ return !termine(d); });
  }
  function termine(d){
    var flux = FLUX[d.famille];
    return d.statut === flux[flux.length - 1].id;
  }
  function etapeIndex(d){
    var flux = FLUX[d.famille];
    for(var i = 0; i < flux.length; i++) if(flux[i].id === d.statut) return i;
    return 0;
  }

  function numero(famille, an){
    var n = S().demandes.filter(function(d){
      return d.famille === famille && d.date.slice(0, 4) === String(an);
    }).length + 1;
    return n;
  }
  function reference(famille, data){
    var an = aujourdhui().slice(0, 4), n = numero(famille, an);
    if(famille === 'scolaire')    return 'SCO-' + an + '-' + p4(n);
    if(famille === 'signalement') return 'SIG-' + an + '-' + p4(n);
    /* urbanisme : type + code INSEE de Margency + année + numéro d'ordre */
    return data.code + ' 095 370 ' + an.slice(2) + ' ' + p4(n);
  }
  function p4(n){ return ('0000' + n).slice(-5); }

  function creerDemande(citoyenId, famille, titre, data, options){
    var s = S(), opt = options || {};
    var d = {
      id: MD.nouvelId('d', s.demandes),
      ref: opt.ref || reference(famille, data),
      citoyen: citoyenId,
      famille: famille,
      titre: titre,
      date: opt.date || aujourdhui(),
      statut: FLUX[famille][0].id,
      data: data,
      suivi: [{date: opt.date || aujourdhui(), etat: FLUX[famille][0].id, note: FLUX[famille][0].note}]
    };
    s.demandes.push(d);
    MD.save();
    return d;
  }
  /* fait avancer une demande jusqu'à une étape donnée (uniquement pour les exemples de démonstration) */
  function avancer(d, etatId, dates, fin){
    var flux = FLUX[d.famille], cible = 0;
    flux.forEach(function(e, i){ if(e.id === etatId) cible = i; });
    for(var i = 1; i <= cible; i++){
      d.suivi.push({date: dates[i - 1] || aujourdhui(), etat: flux[i].id, note: flux[i].note});
    }
    d.statut = etatId;
    if(fin) d.fin = fin;
  }

  /* ---------- repas ---------- */
  function repasDe(enfantId){
    var s = S();
    if(!s.repas[enfantId]) s.repas[enfantId] = {};
    return s.repas[enfantId];
  }
  /* jours de cantine : lundi, mardi, jeudi, vendredi (le mercredi relève du centre de loisirs) */
  function jourDeCantine(iso){
    var j = enDate(iso).getDay();
    return j === 1 || j === 2 || j === 4 || j === 5;
  }
  /* réservation et annulation jusqu'à l'avant-veille */
  function jourVerrouille(iso){ return joursEntre(aujourdhui(), iso) <= 1; }

  /* ---------- enfants ---------- */
  function enfantsDe(c){ return c.enfants || []; }
  function enfantInscrit(c, e){
    return demandes(c.id, 'scolaire').some(function(d){ return d.data.enfant === e.id; });
  }
  function enfantsCantine(c){
    /* la cantine suppose une inscription scolaire où la restauration a été demandée */
    return enfantsDe(c).filter(function(e){
      return demandes(c.id, 'scolaire').some(function(d){
        return d.data.enfant === e.id && (d.data.services || []).indexOf('resto') !== -1;
      });
    });
  }

  /* ============================================================
     EXEMPLES DE DÉMONSTRATION
     Trois comptes fictifs sont préremplis pour que chaque écran
     ait quelque chose à montrer dès la première visite.
     ============================================================ */
  function trouver(test){ return S().citoyens.filter(test)[0]; }

  function comptesDemo(){
    var s = S();
    var famille = trouver(function(c){ return (c.enfants || []).length >= 2; })
               || trouver(function(c){ var a = MD.age(c.naissance); return a >= 32 && a <= 45; });
    var senior  = trouver(function(c){ return Object.keys(c.inscriptions).length >= 2 && MD.age(c.naissance) >= 75; });
    var riverain = trouver(function(c){
      var a = MD.age(c.naissance);
      return a >= 46 && a <= 64 && c !== famille && c !== senior;
    });
    var liste = [];
    if(famille)  liste.push({c:famille,  role:'Parent de deux enfants', detail:'Inscriptions scolaires, cantine et un dossier d’urbanisme en cours.'});
    if(senior)   liste.push({c:senior,   role:'Habitant de longue date', detail:'Inscrit au plan canicule et au colis des aînés.'});
    if(riverain) liste.push({c:riverain, role:'Riverain', detail:'A déjà envoyé deux signalements aux services techniques.'});
    return liste.filter(function(x){ return !!x.c; });
  }

  function seedDemo(){
    var s = S(), r = rentreeEnCours();
    var famille = trouver(function(c){ var a = MD.age(c.naissance); return a >= 32 && a <= 45; });
    var riverain = trouver(function(c){ var a = MD.age(c.naissance); return a >= 46 && a <= 64; });

    if(famille){
      /* deux enfants : une en élémentaire, un en maternelle */
      var e1 = {id:'e' + famille.id + '1', prenom:'Léa',  nom:famille.nom, naissance:(r - 8) + '-04-12'};
      var e2 = {id:'e' + famille.id + '2', prenom:'Noah', nom:famille.nom, naissance:(r - 5) + '-11-03'};
      famille.enfants = [e1, e2];

      var d1 = creerDemande(famille.id, 'scolaire', 'Inscription scolaire — ' + e1.prenom,
        {enfant:e1.id, rentree:r, niveau:niveauPour(e1.naissance, r), ecole:'elem',
         services:['resto','etude'], pieces:PIECES_SCOLAIRE.slice(0, 3)},
        {date:(r) + '-06-04'});
      avancer(d1, 'validee', [(r) + '-06-09', (r) + '-06-21']);

      var d2 = creerDemande(famille.id, 'scolaire', 'Inscription scolaire — ' + e2.prenom,
        {enfant:e2.id, rentree:r, niveau:niveauPour(e2.naissance, r), ecole:'mat',
         services:['resto','mercredi'], pieces:PIECES_SCOLAIRE.slice(0, 3)},
        {date:(r) + '-06-04'});
      avancer(d2, 'validee', [(r) + '-06-09', (r) + '-06-21']);

      /* quelques repas déjà réservés sur les trois prochaines semaines */
      [e1, e2].forEach(function(e){
        var m = repasDe(e.id);
        for(var i = 0; i < 28; i++){
          var j = plusJours(aujourdhui(), i);
          if(jourDeCantine(j) && enDate(j).getDay() !== 5) m[j] = true;
        }
      });

      var du = creerDemande(famille.id, 'urbanisme', 'Déclaration préalable — véranda',
        {type:'dp', code:'DP', objet:'Création d’une véranda de 16 m² à l’arrière de la maison',
         adresse:famille.adresse.numero + ' ' + famille.adresse.rue, parcelle:'AB 0147',
         surface:16, abf:false, pieces:typeUrba('dp').pieces.slice(0, 4),
         limite:plusMois(plusJours(aujourdhui(), -24), 1)},
        {date:plusJours(aujourdhui(), -24)});
      avancer(du, 'instruction', [plusJours(aujourdhui(), -21)]);
      du.data.limite = plusMois(du.date, 1);

      var ds = creerDemande(famille.id, 'signalement', 'Éclairage public — ' + famille.adresse.rue,
        {categorie:'eclairage', rue:famille.adresse.rue, precision:'Devant le numéro ' + famille.adresse.numero,
         description:'Le lampadaire clignote toute la nuit depuis une semaine.', photo:null},
        {date:plusJours(aujourdhui(), -9)});
      avancer(ds, 'resolu', [plusJours(aujourdhui(), -8), plusJours(aujourdhui(), -5), plusJours(aujourdhui(), -3)],
              'Ampoule et ballast remplacés par les services techniques.');
    }

    if(riverain){
      var s1 = creerDemande(riverain.id, 'signalement', 'Voirie — ' + riverain.adresse.rue,
        {categorie:'voirie', rue:riverain.adresse.rue, precision:'À hauteur du passage piéton',
         description:'Un nid-de-poule s’est formé après les pluies, il devient dangereux pour les deux-roues.', photo:null},
        {date:plusJours(aujourdhui(), -12)});
      avancer(s1, 'cours', [plusJours(aujourdhui(), -11), plusJours(aujourdhui(), -6)]);

      var s2 = creerDemande(riverain.id, 'signalement', 'Propreté — Place de la Mairie',
        {categorie:'proprete', rue:'Place de la Mairie', precision:'Près des conteneurs à verre',
         description:'Dépôt sauvage de cartons et d’encombrants depuis le week-end.', photo:null},
        {date:plusJours(aujourdhui(), -4)});
      avancer(s2, 'pris', [plusJours(aujourdhui(), -3)]);
    }
  }

  /* ============================================================
     BRIQUES D'INTERFACE
     ============================================================ */
  var ctx = {};          /* fourni par la page : app, head, majNav */
  var apres = null;      /* vue demandée avant de se connecter */

  function vars(o){ return '--c1:' + o.c1 + ';--c2:' + o.c2 + ';'; }

  /* fil de retour : le titre de la démarche est déjà porté par le h1 de la page */
  function barre(){
    return '<div class="dem-bar">'+
      '<a class="btn btn-glass btn-sm" href="#espace">' + svg('back') + ' Mon espace</a>'+
    '</div>';
  }

  function pastille(d){
    var i = etapeIndex(d), flux = FLUX[d.famille], fini = termine(d);
    return '<span class="etat' + (fini ? ' fini' : i === 0 ? ' neuf' : ' cours') + '">' +
      (fini ? svg('check') : svg('clock')) + esc(flux[i].label) + '</span>';
  }

  function piste(d){
    var i = etapeIndex(d);
    return '<ol class="piste">' + FLUX[d.famille].map(function(e, k){
      var fait = (d.suivi || []).filter(function(s){ return s.etat === e.id; })[0];
      return '<li class="' + (k < i ? 'fait' : k === i ? 'ici' : 'futur') + '">'+
        '<span class="pt">' + (k <= i ? svg('check') : '') + '</span>'+
        '<span class="tx"><b>' + esc(e.label) + '</b>'+
          (fait ? '<small>' + MD.dateFr(fait.date) + ' — ' + esc(fait.note) + '</small>'
                : '<small class="muted">À venir</small>') + '</span>'+
      '</li>';
    }).join('') + '</ol>' +
    (d.fin ? '<p class="piste-fin">' + svg('check') + '<span>' + esc(d.fin) + '</span></p>' : '');
  }

  function vide(ic, titre, texte, bouton){
    return '<div class="rien glass"><span class="ic">' + svg(ic) + '</span>'+
      '<b>' + esc(titre) + '</b><p>' + texte + '</p>' + (bouton || '') + '</div>';
  }

  function erreur(cible, message){
    document.getElementById(cible).innerHTML = message
      ? '<div class="form-error" role="alert">' + svg('alert') + '<span>' + message + '</span></div>' : '';
  }

  /* le titre de la page change à chaque démarche : on remonte le voir */
  function hautDePage(){
    if(window.scrollY > 10) window.scrollTo({top:0, behavior:'smooth'});
  }

  /* numéro de semaine ISO, pour retrouver le menu de la cantine correspondant */
  function semaineIso(iso){
    var d = enDate(iso);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    var jan4 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - jan4) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
  }

  /* ============================================================
     1. CONNEXION
     ============================================================ */
  var connexion = {etape:'email', email:'', code:'', citoyen:null};

  function vueConnexion(){
    ctx.head('Connexion', 'Me <em>connecter</em>',
      'Entrez l’adresse e-mail de votre compte. Un code de connexion à usage unique vous est envoyé, sans mot de passe à retenir.', 'Connexion');

    var comptes = comptesDemo();
    ctx.app.innerHTML =
      '<div class="connect view">'+
        '<section class="panel glass" id="boxConnect"></section>'+
        '<aside class="intro-side glass">'+
          '<h3>Comptes de démonstration</h3>'+
          '<p class="aide">Ces habitants sont fictifs. Cliquez sur l’un d’eux pour entrer directement dans son espace et parcourir toutes les démarches.</p>'+
          comptes.map(function(x){
            return '<button class="mini-reg bouton" data-demo="' + x.c.id + '" style="--c1:#2dd4bf;--c2:#0f766e">'+
              '<span class="ic">' + svg('user') + '</span>'+
              '<span><b>' + esc(x.c.prenom + ' ' + x.c.nom) + '</b><small>' + esc(x.role) + ' · ' + esc(x.detail) + '</small></span></button>';
          }).join('')+
          '<div class="side-note">' + svg('shield') + '<span>Aucun mot de passe n’est stocké dans cette maquette : la connexion se fait par code à usage unique, comme sur les téléservices publics.</span></div>'+
        '</aside>'+
      '</div>';

    ctx.app.querySelectorAll('[data-demo]').forEach(function(b){
      b.addEventListener('click', function(){ connecter(b.dataset.demo, true); });
    });
    etapeConnexion();
  }

  function etapeConnexion(){
    var box = document.getElementById('boxConnect');
    if(connexion.etape === 'email'){
      box.innerHTML =
        '<h2>Votre adresse e-mail</h2>'+
        '<p class="sub">Celle que vous avez indiquée en créant votre compte citoyen.</p>'+
        '<form id="fConnect" novalidate>'+
          '<label class="field"><span>Adresse e-mail</span>'+
            '<input type="email" name="email" autocomplete="email" placeholder="prenom.nom@example.com" value="' + esc(connexion.email) + '"></label>'+
          '<div id="errConnect"></div>'+
          '<div class="panel-foot">'+
            '<a class="btn btn-glass" href="#accueil">' + svg('back') + ' Retour</a>'+
            '<button type="submit" class="btn btn-solid">Recevoir mon code ' + svg('arrow') + '</button>'+
          '</div>'+
        '</form>'+
        '<p class="aide pied">Pas encore de compte ? <a class="lnk" href="#inscription">Créer mon compte citoyen</a>.</p>';

      document.getElementById('fConnect').addEventListener('submit', function(e){
        e.preventDefault();
        var val = this.email.value.trim().toLowerCase();
        connexion.email = this.email.value.trim();
        if(!val){ erreur('errConnect', 'Merci d’indiquer votre adresse e-mail.'); return; }
        var c = S().citoyens.filter(function(x){ return (x.email || '').toLowerCase() === val; })[0];
        if(!c){
          erreur('errConnect', 'Aucun compte n’est associé à cette adresse. Vérifiez la saisie, ou créez votre compte citoyen.');
          return;
        }
        connexion.citoyen = c.id;
        connexion.code = String(Math.floor(100000 + Math.random() * 900000));
        connexion.etape = 'code';
        etapeConnexion();
      });

    } else {
      var c = MD.citoyen(connexion.citoyen);
      box.innerHTML =
        '<h2>Votre code de connexion</h2>'+
        '<p class="sub">Un code à six chiffres vient d’être envoyé à <b>' + esc(c.email) + '</b>. Il est valable 10 minutes.</p>'+
        '<div class="faux-mail">' + svg('mail') +
          '<div><b>Maquette : le code s’affiche ici</b>'+
          '<span>Dans la version réelle, il arrive dans votre boîte aux lettres électronique.</span>'+
          '<code>' + connexion.code + '</code></div></div>'+
        '<form id="fCode" novalidate>'+
          '<label class="field"><span>Code reçu</span>'+
            '<input name="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000"></label>'+
          '<div id="errCode"></div>'+
          '<div class="panel-foot">'+
            '<button type="button" class="btn btn-glass" id="autreMail">' + svg('back') + ' Changer d’adresse</button>'+
            '<button type="submit" class="btn btn-solid">' + svg('lock') + ' Me connecter</button>'+
          '</div>'+
        '</form>';

      document.getElementById('autreMail').addEventListener('click', function(){
        connexion.etape = 'email'; etapeConnexion();
      });
      document.getElementById('fCode').addEventListener('submit', function(e){
        e.preventDefault();
        if(this.code.value.trim() !== connexion.code){
          erreur('errCode', 'Ce code ne correspond pas. Recopiez les six chiffres affichés ci-dessus.');
          return;
        }
        connecter(connexion.citoyen, false);
      });
    }
  }

  function connecter(id, estDemo){
    var c = MD.citoyen(id);
    S().session = id; MD.save();
    connexion = {etape:'email', email:'', code:'', citoyen:null};
    ctx.majNav();
    MD.toast('Bonjour ' + c.prenom + (estDemo ? ' (habitant fictif)' : '') + ' !');
    var cible = apres; apres = null;
    location.hash = cible || 'espace';
  }

  /* ============================================================
     2. INSCRIPTIONS SCOLAIRES
     ============================================================ */
  function vueScolaire(){
    var c = ctx.moi(), r = rentreeEnCours();
    ctx.head('Inscriptions scolaires', 'Inscriptions <em>scolaires</em>',
      'Déclarez vos enfants une seule fois, puis demandez leur inscription à l’école maternelle ou élémentaire de Margency.', 'Inscriptions scolaires');

    var enfants = enfantsDe(c);
    ctx.app.innerHTML =
      barre() +
      '<div class="dem view">'+
        '<section>'+
          '<div class="bloc-tete">'+
            '<h3>Mes enfants</h3>'+
            '<button class="btn btn-solid btn-sm" id="addEnfant">' + svg('plus') + ' Déclarer un enfant</button>'+
          '</div>'+
          (enfants.length
            ? '<div class="cartes">' + enfants.map(function(e){ return carteEnfant(c, e, r); }).join('') + '</div>'
            : vide('baby', 'Aucun enfant déclaré',
                   'Déclarez d’abord vos enfants : leur niveau de classe et leur école sont ensuite déduits de leur année de naissance.'))+
        '</section>'+
        '<aside class="dem-side">'+
          '<div class="info-card glass">'+
            '<h4>' + svg('cal') + ' Année scolaire</h4>'+
            '<p>Rentrée en cours : <b>' + libelleAnnee(r) + '</b>. Les demandes pour <b>' + libelleAnnee(r + 1) + '</b> sont ouvertes.</p>'+
          '</div>'+
          '<div class="info-card glass">'+
            '<h4>' + svg('doc') + ' Pièces à fournir</h4>'+
            '<ul class="puces">' + PIECES_SCOLAIRE.map(function(p){ return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>'+
            '<p class="aide">Elles sont remises au service scolaire, en mairie, lors du rendez-vous.</p>'+
          '</div>'+
          '<div class="info-card glass">'+
            '<h4>' + svg('school') + ' Les deux écoles</h4>'+
            '<p><b>' + ECOLES.mat.court + '</b> — ' + ECOLES.mat.niveaux.join(', ') + '</p>'+
            '<p style="margin-top:.5rem"><b>' + ECOLES.elem.court + '</b> — ' + ECOLES.elem.niveaux.join(', ') + '</p>'+
            '<p class="aide"><a class="lnk" href="enfance-education.html">Voir la page Enfance &amp; Éducation</a></p>'+
          '</div>'+
        '</aside>'+
      '</div>';

    document.getElementById('addEnfant').addEventListener('click', function(){ formEnfant(c, null); });
    ctx.app.querySelectorAll('[data-enf]').forEach(function(b){
      b.addEventListener('click', function(){
        var e = enfantsDe(c).filter(function(x){ return x.id === b.dataset.enf; })[0];
        if(b.dataset.act === 'edit')    formEnfant(c, e);
        if(b.dataset.act === 'suppr')   supprimerEnfant(c, e);
        if(b.dataset.act === 'inscrire')formInscription(c, e);
        if(b.dataset.act === 'suivi')   detailDemande(S().demandes.filter(function(d){ return d.id === b.dataset.dem; })[0]);
      });
    });
    hautDePage();
  }

  function carteEnfant(c, e, r){
    var niv = niveauPour(e.naissance, r), ec = ecolePour(niv);
    var dem = demandes(c.id, 'scolaire').filter(function(d){ return d.data.enfant === e.id; });
    var couleur = ec || {c1:'#94a3b8', c2:'#475569'};
    return '<article class="carte glass" style="' + vars(couleur) + '">'+
      '<div class="carte-tete">'+
        '<span class="ic">' + svg('baby') + '</span>'+
        '<span class="t"><b>' + esc(e.prenom + ' ' + e.nom) + '</b>'+
          '<small>' + MD.age(e.naissance) + ' ans · né·e le ' + MD.dateFr(e.naissance) + '</small></span>'+
        (niv ? '<span class="niv">' + esc(niv) + '</span>' : '<span class="niv gris">Hors école</span>')+
      '</div>'+
      '<div class="carte-corps">'+
        (niv
          ? '<p>' + esc(ec.nom) + ' · année ' + libelleAnnee(r) + '</p>'
          : '<p class="muted">' + (MD.age(e.naissance) < 3
              ? 'Pas encore en âge d’être scolarisé·e. Voir la page Petite enfance pour la crèche et les assistantes maternelles.'
              : 'L’âge dépasse l’école élémentaire : l’inscription au collège se fait auprès du département.') + '</p>')+
        (dem.length
          ? '<div class="mini-dem">' + dem.map(function(d){
              return '<div class="ligne-dem">'+
                '<span class="ref">' + esc(d.ref) + '</span>' + pastille(d) +
                '<button class="btn btn-glass btn-sm" data-enf="' + e.id + '" data-dem="' + d.id + '" data-act="suivi">' + svg('eye') + ' Suivre</button>'+
              '</div>'; }).join('') + '</div>'
          : '')+
        '<div class="carte-actions">'+
          (niv && !dem.length
            ? '<button class="btn btn-solid btn-sm" data-enf="' + e.id + '" data-act="inscrire">' + svg('school') + ' Demander l’inscription</button>'
            : '')+
          (niv && dem.length
            ? '<button class="btn btn-glass btn-sm" data-enf="' + e.id + '" data-act="inscrire">' + svg('plus') + ' Nouvelle demande</button>'
            : '')+
          '<button class="btn btn-glass btn-sm" data-enf="' + e.id + '" data-act="edit">Modifier</button>'+
          '<button class="btn btn-danger btn-sm" data-enf="' + e.id + '" data-act="suppr">' + svg('trash') + ' Retirer</button>'+
        '</div>'+
      '</div>'+
    '</article>';
  }

  function formEnfant(c, e){
    var nouveau = !e, r = rentreeEnCours();
    var m = MD.modal(
      '<h3>' + (nouveau ? 'Déclarer un enfant' : 'Modifier ' + esc(e.prenom)) + '</h3>'+
      '<p class="sub" style="margin-top:.5rem">Le niveau de classe et l’école sont déduits de l’année de naissance : rien d’autre n’est demandé.</p>'+
      '<form id="fEnfant" novalidate style="margin-top:1rem">'+
        '<div class="grid-2">'+
          '<label class="field"><span>Prénom</span><input name="prenom" value="' + esc(e ? e.prenom : '') + '"></label>'+
          '<label class="field"><span>Nom</span><input name="nom" value="' + esc(e ? e.nom : c.nom) + '"></label>'+
        '</div>'+
        '<label class="field" style="margin-top:14px"><span>Date de naissance</span>'+
          '<input type="date" name="naissance" max="' + aujourdhui() + '" value="' + esc(e ? e.naissance : '') + '">'+
          '<span class="age-live" id="nivLive" hidden></span></label>'+
        '<div id="errEnfant"></div>'+
        '<div class="modal-actions"><button type="button" class="btn btn-glass" data-close>Annuler</button>'+
        '<button type="submit" class="btn btn-solid">' + svg('check') + ' Enregistrer</button></div>'+
      '</form>');

    var f = m.el.querySelector('#fEnfant');
    function majNiveau(){
      var el = m.el.querySelector('#nivLive'), niv = niveauPour(f.naissance.value, r);
      el.hidden = !f.naissance.value;
      el.textContent = niv ? 'Niveau ' + niv + ' à la rentrée ' + libelleAnnee(r) + ' · ' + ecolePour(niv).court
                           : 'Hors âge scolaire (maternelle et élémentaire)';
    }
    f.naissance.addEventListener('input', majNiveau);
    majNiveau();

    f.addEventListener('submit', function(ev){
      ev.preventDefault();
      var p = f.prenom.value.trim(), n = f.nom.value.trim(), nai = f.naissance.value;
      if(!p || !n || !nai){
        m.el.querySelector('#errEnfant').innerHTML = '<div class="form-error">' + svg('alert') + '<span>Merci de renseigner le prénom, le nom et la date de naissance.</span></div>';
        return;
      }
      var a = MD.age(nai);
      if(a == null || a < 0 || a > 20){
        m.el.querySelector('#errEnfant').innerHTML = '<div class="form-error">' + svg('alert') + '<span>La date de naissance ne correspond pas à un enfant.</span></div>';
        return;
      }
      if(nouveau){
        c.enfants.push({id: MD.nouvelId('e' + c.id + '_', c.enfants), prenom:p, nom:n, naissance:nai});
      } else {
        e.prenom = p; e.nom = n; e.naissance = nai;
      }
      MD.save(); m.fermer();
      MD.toast(nouveau ? 'Enfant déclaré' : 'Informations enregistrées');
      vueScolaire();
    });
  }

  function supprimerEnfant(c, e){
    var dem = demandes(c.id, 'scolaire').filter(function(d){ return d.data.enfant === e.id; });
    var m = MD.modal('<h3>Retirer ' + esc(e.prenom) + ' de votre compte ?</h3>'+
      '<p style="margin-top:.7rem;color:var(--ink-soft)">Ses informations seront effacées' +
      (dem.length ? ', ainsi que ' + (dem.length > 1 ? 'ses ' + dem.length + ' demandes d’inscription' : 'sa demande d’inscription') + ' et ses réservations de repas' : '') +
      '. Cette action est irréversible.</p>'+
      '<div class="modal-actions"><button class="btn btn-glass" data-close>Annuler</button>'+
      '<button class="btn btn-danger" id="okSup">' + svg('trash') + ' Retirer</button></div>');
    m.el.querySelector('#okSup').addEventListener('click', function(){
      var s = S();
      c.enfants = c.enfants.filter(function(x){ return x.id !== e.id; });
      s.demandes = s.demandes.filter(function(d){ return !(d.famille === 'scolaire' && d.data.enfant === e.id); });
      delete s.repas[e.id];
      MD.save(); m.fermer(); MD.toast('Enfant retiré'); vueScolaire();
    });
  }

  function formInscription(c, e){
    var r = rentreeEnCours();
    var annees = [r, r + 1];
    var m = MD.modal(
      '<h3>Demande d’inscription — ' + esc(e.prenom) + '</h3>'+
      '<form id="fInsc" novalidate style="margin-top:1rem">'+
        '<label class="field"><span>Année scolaire</span><select name="rentree">'+
          annees.map(function(a){
            return '<option value="' + a + '">' + libelleAnnee(a) + (a === r ? ' (en cours)' : ' (prochaine rentrée)') + '</option>';
          }).join('') + '</select></label>'+
        '<div class="aff-ecole" id="affEcole"></div>'+
        '<div class="field" style="margin-top:14px"><span>Services périscolaires souhaités</span>'+
          '<div class="checks">' + PERISCO.map(function(p){
            return '<label class="check-pill" title="' + esc(p.detail) + '"><input type="checkbox" name="serv" value="' + p.id + '"> ' + esc(p.nom) + '</label>';
          }).join('') + '</div>'+
          '<small>Vous pourrez les modifier plus tard. La restauration scolaire ouvre la réservation des repas depuis votre compte.</small></div>'+
        '<div class="field" style="margin-top:14px"><span>Pièces que vous pouvez déjà fournir</span>'+
          '<div class="checks col">' + PIECES_SCOLAIRE.map(function(p, i){
            return '<label class="check-pill"><input type="checkbox" name="piece" value="' + i + '"> ' + esc(p) + '</label>';
          }).join('') + '</div>'+
          '<small>Rien n’est téléversé dans cette maquette : vous déclarez seulement ce que vous apporterez en mairie.</small></div>'+
        '<label class="consent" style="margin-top:14px"><input type="checkbox" name="ok"> <span>Je certifie résider à Margency et j’accepte que le service scolaire utilise ces informations pour instruire l’inscription de mon enfant.</span></label>'+
        '<div id="errInsc"></div>'+
        '<div class="modal-actions"><button type="button" class="btn btn-glass" data-close>Annuler</button>'+
        '<button type="submit" class="btn btn-solid">' + svg('send') + ' Envoyer ma demande</button></div>'+
      '</form>');

    var f = m.el.querySelector('#fInsc');
    function majEcole(){
      var an = Number(f.rentree.value), niv = niveauPour(e.naissance, an), ec = ecolePour(niv);
      m.el.querySelector('#affEcole').innerHTML = ec
        ? '<div class="ecole-tag" style="' + vars(ec) + '">' + svg('school') +
          '<span><b>' + esc(ec.nom) + '</b><small>Niveau ' + niv + ' à la rentrée ' + libelleAnnee(an) + '</small></span></div>'
        : '<div class="form-error" style="margin-top:1rem">' + svg('alert') +
          '<span>À cette rentrée, ' + esc(e.prenom) + ' n’est pas en âge d’être scolarisé·e dans les écoles de la commune.</span></div>';
    }
    f.rentree.addEventListener('change', majEcole);
    majEcole();

    f.addEventListener('submit', function(ev){
      ev.preventDefault();
      var an = Number(f.rentree.value), niv = niveauPour(e.naissance, an), ec = ecolePour(niv);
      var serv = [].map.call(f.querySelectorAll('input[name=serv]:checked'), function(i){ return i.value; });
      var pieces = [].map.call(f.querySelectorAll('input[name=piece]:checked'), function(i){ return PIECES_SCOLAIRE[+i.value]; });
      if(!ec){ erreur('errInsc', 'Choisissez une année où l’enfant relève de la maternelle ou de l’élémentaire.'); return; }
      if(demandes(c.id, 'scolaire').some(function(d){ return d.data.enfant === e.id && d.data.rentree === an; })){
        erreur('errInsc', 'Une demande existe déjà pour ' + esc(e.prenom) + ' à la rentrée ' + libelleAnnee(an) + '.');
        return;
      }
      if(!f.ok.checked){ erreur('errInsc', 'Merci de cocher la déclaration pour continuer.'); return; }
      var d = creerDemande(c.id, 'scolaire', 'Inscription scolaire — ' + e.prenom,
        {enfant:e.id, rentree:an, niveau:niv, ecole:ec.id, services:serv, pieces:pieces});
      m.fermer();
      MD.toast('Demande envoyée — ' + d.ref);
      vueScolaire();
    });
  }

  /* ============================================================
     3. RESTAURATION SCOLAIRE
     ============================================================ */
  var cal = {mois:null, enfant:null, brouillon:null};

  function vueCantine(){
    var c = ctx.moi(), enfants = enfantsCantine(c);
    ctx.head('Restauration scolaire', 'Restauration <em>scolaire</em>',
      'Réservez ou annulez les repas de vos enfants, jour par jour. Les modifications sont possibles jusqu’à l’avant-veille.', 'Restauration scolaire');

    if(!enfants.length){
      ctx.app.innerHTML = barre() +
        '<div class="view">' + vide('fork', 'Aucun enfant inscrit à la restauration',
          'La réservation des repas s’ouvre dès qu’une inscription scolaire mentionne la restauration scolaire.',
          '<a class="btn btn-solid" href="#scolaire">' + svg('school') + ' Aller aux inscriptions scolaires</a>') + '</div>';
      hautDePage();
      return;
    }

    if(!cal.enfant || !enfants.some(function(e){ return e.id === cal.enfant; })) cal.enfant = enfants[0].id;
    cal.mois = aujourdhui().slice(0, 7);   /* on ouvre toujours sur le mois en cours */
    cal.brouillon = {};

    ctx.app.innerHTML =
      barre() +
      '<div class="dem view">'+
        '<section>'+
          (enfants.length > 1
            ? '<div class="onglets" id="ongletsEnfants">' + enfants.map(function(e){
                return '<button class="ong' + (e.id === cal.enfant ? ' on' : '') + '" data-e="' + e.id + '">' +
                  svg('baby') + esc(e.prenom) + '</button>'; }).join('') + '</div>'
            : '')+
          '<div class="glass cal-card" id="calCard"></div>'+
        '</section>'+
        '<aside class="dem-side">'+
          '<div class="info-card glass" id="recapCal"></div>'+
          '<div class="info-card glass">'+
            '<h4>' + svg('clock') + ' Règle de réservation</h4>'+
            '<p>Un repas se réserve ou s’annule <b>jusqu’à l’avant-veille</b>. Au-delà, le jour est verrouillé et le repas reste dû.</p>'+
            '<p class="aide">En cas d’absence imprévue (maladie, hospitalisation), prévenez le service périscolaire : le repas est alors déduit.</p>'+
          '</div>'+
          menusCard()+
        '</aside>'+
      '</div>';

    var ong = document.getElementById('ongletsEnfants');
    if(ong) ong.addEventListener('click', function(ev){
      var b = ev.target.closest('.ong'); if(!b) return;
      cal.enfant = b.dataset.e; cal.brouillon = {};
      ong.querySelectorAll('.ong').forEach(function(x){ x.classList.toggle('on', x === b); });
      rendreCalendrier();
    });
    rendreCalendrier();
    hautDePage();
  }

  function menusCard(){
    var menus = (window.ENFANCE && window.ENFANCE.menus) || [];
    if(!menus.length) return '';
    /* on garde les menus à partir de la semaine en cours, à défaut les derniers publiés */
    var semaine = semaineIso(aujourdhui());
    var aVenir = menus.filter(function(m){
      var n = /Semaine\s+(\d+)/i.exec(m.titre);
      return n && Number(n[1]) >= semaine;
    });
    var liste = (aVenir.length ? aVenir : menus.slice(-4)).slice(0, 4);
    return '<div class="info-card glass">'+
      '<h4>' + svg('fork') + ' Menus de la cantine</h4>'+
      '<ul class="puces liens">' + liste.map(function(m){
        return '<li><a class="lnk" href="' + esc(m.url) + '" target="_blank" rel="noopener">' + esc(m.titre) + '</a></li>';
      }).join('') + '</ul>'+
      '<p class="aide"><a class="lnk" href="enfance-education.html#cantine">Tous les menus</a></p>'+
    '</div>';
  }

  function rendreCalendrier(){
    var c = ctx.moi(), e = enfantsCantine(c).filter(function(x){ return x.id === cal.enfant; })[0];
    var reserves = repasDe(e.id);
    var an = Number(cal.mois.slice(0, 4)), mo = Number(cal.mois.slice(5, 7));
    var premier = new Date(an, mo - 1, 1), nbJours = new Date(an, mo, 0).getDate();
    var decalage = (premier.getDay() + 6) % 7;   /* la semaine commence le lundi */

    var cases = '';
    for(var i = 0; i < decalage; i++) cases += '<span class="jour creux"></span>';
    for(var j = 1; j <= nbJours; j++){
      var iso = an + '-' + p2(mo) + '-' + p2(j);
      var ouvert = jourDeCantine(iso), verrou = jourVerrouille(iso);
      var on = cal.brouillon[iso] !== undefined ? cal.brouillon[iso] : !!reserves[iso];
      var chg = cal.brouillon[iso] !== undefined && cal.brouillon[iso] !== !!reserves[iso];
      var cls = 'jour' + (ouvert ? '' : ' hors') + (verrou ? ' verrou' : '') + (on ? ' on' : '') + (chg ? ' chg' : '') +
                (iso === aujourdhui() ? ' auj' : '');
      var titre = !ouvert ? 'Pas de restauration ce jour'
                : verrou ? 'Trop tard pour modifier ce jour'
                : (on ? 'Repas réservé — cliquer pour annuler' : 'Cliquer pour réserver le repas');
      cases += '<button class="' + cls + '" data-d="' + iso + '"' + (!ouvert || verrou ? ' disabled' : '') +
               ' title="' + titre + '" aria-label="' + esc(dateLongue(iso)) + '">'+
               '<i>' + j + '</i>' + (ouvert && on ? svg('check', 'class="coche"') : '') + '</button>';
    }

    document.getElementById('calCard').innerHTML =
      '<div class="cal-tete">'+
        '<button class="icon-btn" id="moisPrec" aria-label="Mois précédent">' + svg('left') + '</button>'+
        '<b>' + moisLong(cal.mois) + '</b>'+
        '<button class="icon-btn" id="moisSuiv" aria-label="Mois suivant">' + svg('right') + '</button>'+
      '</div>'+
      '<div class="cal-sem">' + ['L','M','M','J','V','S','D'].map(function(x){ return '<span>' + x + '</span>'; }).join('') + '</div>'+
      '<div class="cal-grille" id="calGrille">' + cases + '</div>'+
      '<div class="cal-legende">'+
        '<span><i class="pt on"></i> Repas réservé</span>'+
        '<span><i class="pt"></i> Jour d’école sans repas</span>'+
        '<span><i class="pt hors"></i> Pas de restauration</span>'+
        '<span><i class="pt verrou"></i> Verrouillé (moins de 48 h)</span>'+
      '</div>'+
      '<div class="cal-foot">'+
        '<div class="cal-outils">'+
          '<button class="btn btn-glass btn-sm" id="toutCocher">Réserver tout le mois</button>'+
          '<button class="btn btn-glass btn-sm" id="toutVider">Tout annuler</button>'+
        '</div>'+
        '<div class="cal-actions">'+
          '<span class="chg-info" id="chgInfo"></span>'+
          '<button class="btn btn-solid" id="saveCal" disabled>' + svg('check') + ' Enregistrer</button>'+
        '</div>'+
      '</div>';

    document.getElementById('moisPrec').addEventListener('click', function(){ bougerMois(-1); });
    document.getElementById('moisSuiv').addEventListener('click', function(){ bougerMois(1); });
    document.getElementById('calGrille').addEventListener('click', function(ev){
      var b = ev.target.closest('.jour'); if(!b || b.disabled) return;
      var iso = b.dataset.d;
      var actuel = cal.brouillon[iso] !== undefined ? cal.brouillon[iso] : !!reserves[iso];
      cal.brouillon[iso] = !actuel;
      if(cal.brouillon[iso] === !!reserves[iso]) delete cal.brouillon[iso];
      rendreCalendrier();
    });
    document.getElementById('toutCocher').addEventListener('click', function(){ toutLeMois(true, reserves, an, mo, nbJours); });
    document.getElementById('toutVider').addEventListener('click', function(){ toutLeMois(false, reserves, an, mo, nbJours); });
    document.getElementById('saveCal').addEventListener('click', function(){ enregistrerRepas(e); });

    var nb = Object.keys(cal.brouillon).length;
    document.getElementById('chgInfo').textContent = nb ? nb + ' modification' + (nb > 1 ? 's' : '') + ' non enregistrée' + (nb > 1 ? 's' : '') : '';
    document.getElementById('saveCal').disabled = !nb;
    majRecap(e, reserves);
  }

  function toutLeMois(valeur, reserves, an, mo, nbJours){
    for(var j = 1; j <= nbJours; j++){
      var iso = an + '-' + p2(mo) + '-' + p2(j);
      if(!jourDeCantine(iso) || jourVerrouille(iso)) continue;
      if(!!reserves[iso] === valeur) delete cal.brouillon[iso];
      else cal.brouillon[iso] = valeur;
    }
    rendreCalendrier();
  }

  function bougerMois(n){
    var an = Number(cal.mois.slice(0, 4)), mo = Number(cal.mois.slice(5, 7)) + n;
    if(mo < 1){ mo = 12; an--; } if(mo > 12){ mo = 1; an++; }
    cal.mois = an + '-' + p2(mo);
    cal.brouillon = {};
    rendreCalendrier();
  }

  function enregistrerRepas(e){
    var m = repasDe(e.id), n = 0;
    for(var iso in cal.brouillon){
      if(cal.brouillon[iso]) m[iso] = true; else delete m[iso];
      n++;
    }
    cal.brouillon = {};
    MD.save();
    MD.toast(n + ' jour' + (n > 1 ? 's' : '') + ' mis à jour');
    rendreCalendrier();
  }

  function majRecap(e, reserves){
    var moisCourant = Object.keys(reserves).filter(function(iso){ return iso.slice(0, 7) === cal.mois; }).length;
    var suivants = Object.keys(reserves).filter(function(iso){ return iso >= aujourdhui(); }).sort().slice(0, 5);
    document.getElementById('recapCal').innerHTML =
      '<h4>' + svg('fork') + ' ' + esc(e.prenom) + '</h4>'+
      '<p class="gros"><b>' + moisCourant + '</b> repas réservés en ' + moisLong(cal.mois) + '</p>'+
      (suivants.length
        ? '<p class="aide" style="margin-top:.6rem">Prochains repas</p><ul class="puces">' +
          suivants.map(function(iso){ return '<li>' + esc(dateLongue(iso)) + '</li>'; }).join('') + '</ul>'
        : '<p class="aide" style="margin-top:.6rem">Aucun repas réservé à venir.</p>')+
      '<p class="aide" style="margin-top:.8rem">La facturation suit le tarif voté par le conseil municipal et reste gérée par le service périscolaire.</p>';
  }

  /* ============================================================
     4. SIGNALER UN PROBLÈME
     ============================================================ */
  var sigFiltre = 'tous';

  function vueSignalement(){
    var c = ctx.moi(), mes = demandes(c.id, 'signalement');
    ctx.head('Signaler un problème', 'Signaler un <em>problème</em>',
      'Un lampadaire éteint, un nid-de-poule, un dépôt sauvage ? Décrivez-le en une minute : les services techniques le reçoivent et vous suivez son traitement.', 'Signalement');

    var liste = mes.filter(function(d){
      return sigFiltre === 'tous' || (sigFiltre === 'cours' ? !termine(d) : termine(d));
    });

    ctx.app.innerHTML =
      barre() +
      '<div class="dem view">'+
        '<section>'+
          '<div class="bloc-tete">'+
            '<h3>Mes signalements</h3>'+
            '<button class="btn btn-solid btn-sm" id="newSig">' + svg('plus') + ' Nouveau signalement</button>'+
          '</div>'+
          (mes.length
            ? '<div class="filtres">' + [['tous','Tous'],['cours','En cours'],['fini','Résolus']].map(function(f){
                var n = f[0] === 'tous' ? mes.length
                      : mes.filter(function(d){ return f[0] === 'cours' ? !termine(d) : termine(d); }).length;
                return '<button class="filtre' + (sigFiltre === f[0] ? ' on' : '') + '" data-f="' + f[0] + '">' +
                  f[1] + '<i>' + n + '</i></button>';
              }).join('') + '</div>' +
              '<div class="cartes">' + liste.map(carteSignalement).join('') + '</div>' +
              (liste.length ? '' : '<p class="aide" style="margin-top:1rem">Aucun signalement dans cette catégorie.</p>')
            : vide('alert', 'Aucun signalement',
                   'Votre premier signalement part directement aux services techniques, avec sa date et son lieu.',
                   '<button class="btn btn-solid" id="newSig2">' + svg('plus') + ' Signaler un problème</button>'))+
        '</section>'+
        '<aside class="dem-side">'+
          '<div class="info-card glass urgence">'+
            '<h4>' + svg('sos') + ' Danger immédiat</h4>'+
            '<p>Fuite de gaz, câble électrique à terre, arbre sur la chaussée, inondation : n’utilisez pas ce formulaire.</p>'+
            '<p><b>Mairie : <a class="lnk" href="tel:0134274040">01 34 27 40 40</a></b><br>Hors horaires : <b>17</b> (police) ou <b>18</b> (pompiers).</p>'+
          '</div>'+
          '<div class="info-card glass">'+
            '<h4>' + svg('clock') + ' Délais indicatifs</h4>'+
            '<ul class="puces">' + CATS.slice(0, 6).map(function(x){
              return '<li><b>' + esc(x.nom) + '</b> — ' + esc(x.delai) + '</li>'; }).join('') + '</ul>'+
            '<p class="aide">Délais de première intervention. Un chantier plus lourd peut demander un marché public et davantage de temps.</p>'+
          '</div>'+
        '</aside>'+
      '</div>';

    var b1 = document.getElementById('newSig'), b2 = document.getElementById('newSig2');
    if(b1) b1.addEventListener('click', function(){ formSignalement(c); });
    if(b2) b2.addEventListener('click', function(){ formSignalement(c); });
    ctx.app.querySelectorAll('[data-f]').forEach(function(b){
      b.addEventListener('click', function(){ sigFiltre = b.dataset.f; vueSignalement(); });
    });
    ctx.app.querySelectorAll('[data-voir]').forEach(function(b){
      b.addEventListener('click', function(){
        detailDemande(S().demandes.filter(function(d){ return d.id === b.dataset.voir; })[0]);
      });
    });
    hautDePage();
  }

  function carteSignalement(d){
    var cat = categorie(d.data.categorie);
    return '<article class="carte glass" style="' + vars(cat) + '">'+
      '<div class="carte-tete">'+
        '<span class="ic">' + svg(cat.ic) + '</span>'+
        '<span class="t"><b>' + esc(cat.nom) + '</b><small>' + esc(d.ref) + ' · envoyé le ' + MD.dateFr(d.date) + '</small></span>'+
        pastille(d)+
      '</div>'+
      '<div class="carte-corps">'+
        '<p class="lieu">' + svg('pin') + esc(d.data.rue) + (d.data.precision ? ' — ' + esc(d.data.precision) : '') + '</p>'+
        '<p class="desc">' + esc(d.data.description) + '</p>'+
        (d.data.photo ? '<img class="vignette" src="' + d.data.photo + '" alt="Photo jointe au signalement">' : '')+
        '<div class="carte-actions">'+
          '<button class="btn btn-glass btn-sm" data-voir="' + d.id + '">' + svg('eye') + ' Voir le suivi</button>'+
        '</div>'+
      '</div>'+
    '</article>';
  }

  function formSignalement(c){
    var photo = null;
    var m = MD.modal(
      '<h3>Signaler un problème</h3>'+
      '<p class="sub" style="margin-top:.5rem">Plus le lieu est précis, plus l’intervention est rapide.</p>'+
      '<form id="fSig" novalidate style="margin-top:1rem">'+
        '<div class="field"><span>De quoi s’agit-il ?</span>'+
          '<div class="cats">' + CATS.map(function(x, i){
            return '<label class="cat" style="' + vars(x) + '"><input type="radio" name="cat" value="' + x.id + '"' + (i === 0 ? ' checked' : '') + '>'+
              '<span class="ic">' + svg(x.ic) + '</span><b>' + esc(x.nom) + '</b><small>' + esc(x.ex) + '</small></label>';
          }).join('') + '</div></div>'+
        '<div class="grid-2" style="margin-top:14px">'+
          '<label class="field"><span>Rue ou lieu</span><select name="rue"><option value="">Choisir…</option>'+
            MD.RUES.map(function(r){ return '<option>' + esc(r[0]) + '</option>'; }).join('') +
            '<option>Autre lieu de la commune</option></select></label>'+
          '<label class="field"><span>Précision</span><input name="precision" placeholder="Devant le n° 12, près de l’arrêt de bus…"></label>'+
        '</div>'+
        '<label class="field" style="margin-top:14px"><span>Description</span>'+
          '<textarea name="description" rows="4" placeholder="Ce que vous constatez, depuis quand, et en quoi c’est gênant."></textarea></label>'+
        '<div class="field" style="margin-top:14px"><span>Photo <i>(facultative)</i></span>'+
          '<label class="photo-zone" id="zonePhoto">' + svg('camera') +
            '<span id="photoTxt">Ajouter une photo</span>'+
            '<input type="file" name="photo" accept="image/*" hidden></label>'+
          '<small>L’image est réduite et reste dans votre navigateur : elle n’est envoyée nulle part.</small></div>'+
        '<label class="consent" style="margin-top:14px"><input type="checkbox" name="ok"> <span>J’accepte que les services techniques utilisent ces informations et mes coordonnées pour traiter ce signalement et me tenir informé·e.</span></label>'+
        '<div id="errSig"></div>'+
        '<div class="modal-actions"><button type="button" class="btn btn-glass" data-close>Annuler</button>'+
        '<button type="submit" class="btn btn-solid">' + svg('send') + ' Envoyer le signalement</button></div>'+
      '</form>');

    var f = m.el.querySelector('#fSig');
    f.photo.addEventListener('change', function(){
      var file = f.photo.files[0];
      if(!file) return;
      document.getElementById('photoTxt').textContent = 'Préparation de l’image…';
      reduirePhoto(file, function(data){
        photo = data;
        var z = document.getElementById('zonePhoto');
        if(data){
          z.classList.add('avec');
          z.innerHTML = '<img src="' + data + '" alt="Aperçu de la photo"><span>' + esc(file.name) + ' — cliquer pour changer</span>' +
                        '<input type="file" name="photo2" accept="image/*" hidden>';
        } else {
          document.getElementById('photoTxt').textContent = 'Image illisible, réessayez';
        }
      });
    });

    f.addEventListener('submit', function(ev){
      ev.preventDefault();
      var cat = f.cat.value, rue = f.rue.value, desc = f.description.value.trim();
      if(!rue){ erreur('errSig', 'Indiquez la rue ou le lieu concerné.'); return; }
      if(desc.length < 10){ erreur('errSig', 'Décrivez le problème en quelques mots (dix caractères au minimum).'); return; }
      if(!f.ok.checked){ erreur('errSig', 'Merci de cocher votre accord pour que le service puisse vous répondre.'); return; }
      var x = categorie(cat);
      var d = creerDemande(c.id, 'signalement', x.nom + ' — ' + rue,
        {categorie:cat, rue:rue, precision:f.precision.value.trim(), description:desc, photo:photo});
      m.fermer();
      MD.toast('Signalement envoyé — ' + d.ref);
      sigFiltre = 'tous';
      vueSignalement();
    });
  }

  /* réduit l'image avant de la garder : une photo de téléphone ne tiendrait pas dans le stockage du navigateur */
  function reduirePhoto(file, cb){
    var fr = new FileReader();
    fr.onerror = function(){ cb(null); };
    fr.onload = function(){
      var img = new Image();
      img.onerror = function(){ cb(null); };
      img.onload = function(){
        var max = 640, k = Math.min(1, max / Math.max(img.width, img.height));
        var cv = document.createElement('canvas');
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        try{ cb(cv.toDataURL('image/jpeg', 0.6)); }catch(e){ cb(null); }
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  }

  /* ============================================================
     5. SUIVI URBANISME
     ============================================================ */
  function vueUrbanisme(){
    var c = ctx.moi(), mes = demandes(c.id, 'urbanisme');
    ctx.head('Suivi urbanisme', 'Mes demandes d’<em>urbanisme</em>',
      'Déposez une déclaration préalable, un permis ou un certificat d’urbanisme, et suivez son instruction jour après jour.', 'Suivi urbanisme');

    ctx.app.innerHTML =
      barre() +
      '<div class="dem view">'+
        '<section>'+
          '<div class="bloc-tete">'+
            '<h3>Mes dossiers</h3>'+
            '<button class="btn btn-solid btn-sm" id="newUrba">' + svg('plus') + ' Déposer une demande</button>'+
          '</div>'+
          (mes.length
            ? '<div class="cartes">' + mes.map(carteUrba).join('') + '</div>'
            : vide('doc', 'Aucun dossier déposé',
                   'Clôture, fenêtre, abri de jardin, véranda, piscine : la plupart des travaux demandent au moins une déclaration préalable.',
                   '<button class="btn btn-solid" id="newUrba2">' + svg('plus') + ' Déposer une demande</button>'))+
        '</section>'+
        '<aside class="dem-side">'+
          '<div class="info-card glass">'+
            '<h4>' + svg('user') + ' Service urbanisme</h4>'+
            '<p>' + esc((window.URBA && window.URBA.service && window.URBA.service.responsable) || 'Service urbanisme') + '<br>'+
              '<a class="lnk" href="tel:0134274041">01 34 27 40 41</a><br>'+
              '<a class="lnk" href="mailto:urbanisme@mairie-margency.fr">urbanisme@mairie-margency.fr</a></p>'+
            '<p class="aide"><a class="lnk" href="environnement-urbanisme.html">Le PLU et les règles applicables</a></p>'+
          '</div>'+
          '<div class="info-card glass">'+
            '<h4>' + svg('clock') + ' Délais d’instruction</h4>'+
            '<ul class="puces">'+
              '<li><b>Certificat d’urbanisme</b> — 1 à 2 mois</li>'+
              '<li><b>Déclaration préalable</b> — 1 mois</li>'+
              '<li><b>Permis de construire</b> — 2 à 3 mois</li>'+
              '<li><b>Permis de démolir</b> — 2 mois</li>'+
            '</ul>'+
            '<p class="aide">Le délai est majoré d’un mois si le terrain se trouve aux abords d’un monument historique : l’architecte des Bâtiments de France est alors consulté.</p>'+
          '</div>'+
          '<div class="info-card glass">'+
            '<h4>' + svg('info') + ' Silence de l’administration</h4>'+
            '<p>Sans réponse à la fin du délai, l’accord est en principe tacite. Demandez alors un certificat attestant cet accord avant de commencer les travaux.</p>'+
          '</div>'+
        '</aside>'+
      '</div>';

    var b1 = document.getElementById('newUrba'), b2 = document.getElementById('newUrba2');
    if(b1) b1.addEventListener('click', function(){ formUrba(c); });
    if(b2) b2.addEventListener('click', function(){ formUrba(c); });
    ctx.app.querySelectorAll('[data-voir]').forEach(function(b){
      b.addEventListener('click', function(){
        detailDemande(S().demandes.filter(function(d){ return d.id === b.dataset.voir; })[0]);
      });
    });
    hautDePage();
  }

  function carteUrba(d){
    var t = typeUrba(d.data.type), fini = termine(d);
    var total = joursEntre(d.date, d.data.limite), passe = joursEntre(d.date, aujourdhui());
    var pct = Math.max(0, Math.min(100, Math.round(passe / Math.max(1, total) * 100)));
    var reste = joursEntre(aujourdhui(), d.data.limite);
    return '<article class="carte glass" style="--c1:#60a5fa;--c2:#2563eb">'+
      '<div class="carte-tete">'+
        '<span class="ic">' + svg('doc') + '</span>'+
        '<span class="t"><b>' + esc(t.nom) + '</b><small>' + esc(d.ref) + ' · déposé le ' + MD.dateFr(d.date) + '</small></span>'+
        pastille(d)+
      '</div>'+
      '<div class="carte-corps">'+
        '<p class="desc">' + esc(d.data.objet) + '</p>'+
        '<p class="lieu">' + svg('pin') + esc(d.data.adresse) + (d.data.parcelle ? ' · parcelle ' + esc(d.data.parcelle) : '') + '</p>'+
        (fini ? ''
          : '<div class="jauge"><div class="jauge-barre"><i style="width:' + pct + '%"></i></div>'+
            '<span class="jauge-txt">' + (reste > 0
              ? 'Décision attendue avant le <b>' + MD.dateFr(d.data.limite) + '</b> — ' + reste + ' jour' + (reste > 1 ? 's' : '') + ' restant' + (reste > 1 ? 's' : '')
              : 'Délai d’instruction écoulé le <b>' + MD.dateFr(d.data.limite) + '</b> : l’accord est en principe tacite') + '</span></div>')+
        '<div class="carte-actions">'+
          '<button class="btn btn-glass btn-sm" data-voir="' + d.id + '">' + svg('eye') + ' Voir le suivi</button>'+
        '</div>'+
      '</div>'+
    '</article>';
  }

  function formUrba(c){
    var m = MD.modal(
      '<h3>Déposer une demande d’urbanisme</h3>'+
      '<p class="sub" style="margin-top:.5rem">Le formulaire Cerfa et les pièces se déposent ensuite en mairie ou sur le guichet numérique ; cette demande en ligne ouvre le dossier et son suivi.</p>'+
      '<form id="fUrba" novalidate style="margin-top:1rem">'+
        '<label class="field"><span>Nature de la demande</span><select name="type">'+
          URBA.map(function(t){ return '<option value="' + t.id + '">' + esc(t.nom) + '</option>'; }).join('') +
        '</select></label>'+
        '<div id="infoType"></div>'+
        '<label class="field" style="margin-top:14px"><span>Objet des travaux ou de la demande</span>'+
          '<textarea name="objet" rows="3" placeholder="Remplacement de la clôture sur rue par un grillage rigide de 1,60 m…"></textarea></label>'+
        '<div class="grid-2" style="margin-top:14px">'+
          '<label class="field"><span>Adresse du terrain</span><input name="adresse" value="' + esc(c.adresse.numero + ' ' + c.adresse.rue) + '"></label>'+
          '<label class="field"><span>Référence cadastrale <i>(facultatif)</i></span><input name="parcelle" placeholder="AB 0147"></label>'+
        '</div>'+
        '<div class="grid-2" style="margin-top:14px">'+
          '<label class="field"><span>Surface de plancher créée <i>(m², facultatif)</i></span><input type="number" min="0" max="2000" name="surface"></label>'+
          '<div class="field"><span>Situation du terrain</span>'+
            '<label class="check-pill"><input type="checkbox" name="abf"> Aux abords d’un monument historique</label>'+
            '<small>Ajoute un mois d’instruction et l’avis de l’architecte des Bâtiments de France.</small></div>'+
        '</div>'+
        '<div class="field" style="margin-top:14px"><span>Pièces du dossier</span><div class="checks col" id="piecesUrba"></div>'+
          '<small>Cochez celles que vous avez déjà préparées : le service vous rappellera les manquantes.</small></div>'+
        '<label class="consent" style="margin-top:14px"><input type="checkbox" name="ok"> <span>Je certifie être le propriétaire du terrain ou avoir qualité pour déposer cette demande, et j’accepte que le service urbanisme traite ces informations pour l’instruire.</span></label>'+
        '<div id="errUrba"></div>'+
        '<div class="modal-actions"><button type="button" class="btn btn-glass" data-close>Annuler</button>'+
        '<button type="submit" class="btn btn-solid">' + svg('send') + ' Déposer ma demande</button></div>'+
      '</form>');

    var f = m.el.querySelector('#fUrba');
    function majType(){
      var t = typeUrba(f.type.value), delai = t.delai + (f.abf.checked ? 1 : 0);
      m.el.querySelector('#infoType').innerHTML =
        '<div class="ecole-tag" style="--c1:#60a5fa;--c2:#2563eb">' + svg('info') +
          '<span><b>' + esc(t.ex) + '</b><small>Formulaire Cerfa n° ' + esc(t.cerfa) + ' · délai d’instruction : ' +
          delai + ' mois, soit jusqu’au ' + MD.dateFr(plusMois(aujourdhui(), delai)) + '</small></span></div>';
      m.el.querySelector('#piecesUrba').innerHTML = t.pieces.map(function(p, i){
        return '<label class="check-pill"><input type="checkbox" name="piece" value="' + i + '"> ' + esc(p) + '</label>';
      }).join('');
    }
    f.type.addEventListener('change', majType);
    f.abf.addEventListener('change', majType);
    majType();

    f.addEventListener('submit', function(ev){
      ev.preventDefault();
      var t = typeUrba(f.type.value), objet = f.objet.value.trim(), adresse = f.adresse.value.trim();
      if(objet.length < 10){ erreur('errUrba', 'Décrivez en une phrase l’objet de votre demande.'); return; }
      if(!adresse){ erreur('errUrba', 'Indiquez l’adresse du terrain concerné.'); return; }
      if(!f.ok.checked){ erreur('errUrba', 'Merci de cocher la déclaration pour déposer la demande.'); return; }
      var delai = t.delai + (f.abf.checked ? 1 : 0);
      var pieces = [].map.call(f.querySelectorAll('input[name=piece]:checked'), function(i){ return t.pieces[+i.value]; });
      var d = creerDemande(c.id, 'urbanisme', t.nom,
        {type:t.id, code:t.code, objet:objet, adresse:adresse, parcelle:f.parcelle.value.trim(),
         surface:f.surface.value ? Number(f.surface.value) : null, abf:f.abf.checked,
         pieces:pieces, delai:delai, limite:plusMois(aujourdhui(), delai)});
      m.fermer();
      recepisse(d, t);
      vueUrbanisme();
    });
  }

  function recepisse(d, t){
    MD.modal(
      '<h3>Récépissé de dépôt</h3>'+
      '<p class="sub" style="margin-top:.5rem">Conservez ce numéro : il identifie votre dossier dans tous les échanges avec la mairie.</p>'+
      '<div class="recepisse">'+
        '<dl class="kv">'+
          '<dt>Numéro de dossier</dt><dd><b>' + esc(d.ref) + '</b></dd>'+
          '<dt>Nature</dt><dd>' + esc(t.nom) + '</dd>'+
          '<dt>Déposé le</dt><dd>' + esc(dateLongue(d.date)) + '</dd>'+
          '<dt>Délai d’instruction</dt><dd>' + d.data.delai + ' mois' + (d.data.abf ? ' (majoré d’un mois — avis de l’ABF)' : '') + '</dd>'+
          '<dt>Décision attendue</dt><dd>avant le <b>' + MD.dateFr(d.data.limite) + '</b></dd>'+
        '</dl>'+
        '<p class="aide">Sans réponse à cette date, l’accord est en principe tacite. Si le dossier est incomplet, le service vous écrit dans le mois et le délai repart.</p>'+
      '</div>'+
      '<div class="modal-actions"><button class="btn btn-solid" data-close>' + svg('check') + ' J’ai noté</button></div>');
  }

  /* ============================================================
     DÉTAIL D'UNE DEMANDE — suivi commun aux trois familles
     ============================================================ */
  function detailDemande(d){
    if(!d) return;
    var corps = '';
    if(d.famille === 'scolaire'){
      var c = MD.citoyen(d.citoyen);
      var e = enfantsDe(c).filter(function(x){ return x.id === d.data.enfant; })[0];
      var ec = ECOLES[d.data.ecole];
      corps = '<dl class="kv">'+
        '<dt>Enfant</dt><dd>' + esc(e ? e.prenom + ' ' + e.nom : '—') + '</dd>'+
        '<dt>Année scolaire</dt><dd>' + libelleAnnee(d.data.rentree) + '</dd>'+
        '<dt>Niveau</dt><dd>' + esc(d.data.niveau) + '</dd>'+
        '<dt>École</dt><dd>' + esc(ec.nom) + '</dd>'+
        '<dt>Périscolaire</dt><dd>' + ((d.data.services || []).length
            ? (d.data.services || []).map(function(id){
                return esc((PERISCO.filter(function(p){ return p.id === id; })[0] || {}).nom || id); }).join(', ')
            : '<span class="muted">Aucun service demandé</span>') + '</dd>'+
        '<dt>Pièces annoncées</dt><dd>' + ((d.data.pieces || []).length
            ? (d.data.pieces || []).map(esc).join('<br>') : '<span class="muted">Aucune</span>') + '</dd>'+
      '</dl>';
    }
    if(d.famille === 'signalement'){
      var cat = categorie(d.data.categorie);
      corps = '<dl class="kv">'+
        '<dt>Catégorie</dt><dd>' + esc(cat.nom) + '</dd>'+
        '<dt>Lieu</dt><dd>' + esc(d.data.rue) + (d.data.precision ? '<br><span class="muted">' + esc(d.data.precision) + '</span>' : '') + '</dd>'+
        '<dt>Description</dt><dd>' + esc(d.data.description) + '</dd>'+
        '<dt>Service en charge</dt><dd>' + esc(cat.service) + '</dd>'+
      '</dl>' + (d.data.photo ? '<img class="vignette grande" src="' + d.data.photo + '" alt="Photo jointe au signalement">' : '');
    }
    if(d.famille === 'urbanisme'){
      var t = typeUrba(d.data.type);
      corps = '<dl class="kv">'+
        '<dt>Nature</dt><dd>' + esc(t.nom) + '</dd>'+
        '<dt>Objet</dt><dd>' + esc(d.data.objet) + '</dd>'+
        '<dt>Terrain</dt><dd>' + esc(d.data.adresse) + (d.data.parcelle ? '<br><span class="muted">Parcelle ' + esc(d.data.parcelle) + '</span>' : '') + '</dd>'+
        (d.data.surface ? '<dt>Surface créée</dt><dd>' + d.data.surface + ' m²</dd>' : '')+
        '<dt>Décision attendue</dt><dd>avant le ' + MD.dateFr(d.data.limite) + (d.data.abf ? ' <span class="muted">(délai majoré — avis de l’ABF)</span>' : '') + '</dd>'+
        '<dt>Pièces annoncées</dt><dd>' + ((d.data.pieces || []).length
            ? (d.data.pieces || []).map(esc).join('<br>') : '<span class="muted">Aucune</span>') + '</dd>'+
      '</dl>';
    }

    var peutRelancer = !termine(d) && joursEntre(d.date, aujourdhui()) >= 7;
    var m = MD.modal(
      '<h3>' + esc(d.titre) + '</h3>'+
      '<p class="sub" style="margin-top:.4rem">Dossier <b>' + esc(d.ref) + '</b> · ouvert le ' + esc(dateLongue(d.date)) + '</p>'+
      '<div class="detail">' + corps + '</div>'+
      '<h4 class="detail-h">Suivi</h4>' + piste(d) +
      ((d.relances || []).length
        ? '<div class="relances">' + d.relances.map(function(r){
            return '<p>' + svg('chat') + '<span><b>Relance du ' + MD.dateFr(r.date) + '</b><br>' + esc(r.texte) + '</span></p>'; }).join('') + '</div>'
        : '')+
      '<div class="modal-actions">'+
        (peutRelancer ? '<button class="btn btn-glass" id="relancer">' + svg('chat') + ' Relancer le service</button>' : '')+
        '<button class="btn btn-solid" data-close>Fermer</button></div>');

    var b = m.el.querySelector('#relancer');
    if(b) b.addEventListener('click', function(){
      m.fermer();
      formRelance(d);
    });
  }

  function formRelance(d){
    var m = MD.modal(
      '<h3>Relancer le service</h3>'+
      '<p class="sub" style="margin-top:.5rem">Votre message est joint au dossier <b>' + esc(d.ref) + '</b>. Le service vous répond par e-mail.</p>'+
      '<form id="fRel" novalidate style="margin-top:1rem">'+
        '<label class="field"><span>Votre message</span><textarea name="texte" rows="4" placeholder="Depuis mon signalement, la situation s’est aggravée…"></textarea></label>'+
        '<div id="errRel"></div>'+
        '<div class="modal-actions"><button type="button" class="btn btn-glass" data-close>Annuler</button>'+
        '<button type="submit" class="btn btn-solid">' + svg('send') + ' Envoyer</button></div>'+
      '</form>');
    var f = m.el.querySelector('#fRel');
    f.addEventListener('submit', function(ev){
      ev.preventDefault();
      var t = f.texte.value.trim();
      if(t.length < 5){ erreur('errRel', 'Écrivez quelques mots avant d’envoyer.'); return; }
      if(!d.relances) d.relances = [];
      d.relances.push({date:aujourdhui(), texte:t});
      MD.save(); m.fermer();
      MD.toast('Relance enregistrée');
      if(d.famille === 'signalement') vueSignalement();
      else if(d.famille === 'urbanisme') vueUrbanisme();
      else vueScolaire();
    });
  }

  /* ============================================================
     TUILES « MES DÉMARCHES » — reprises dans l'espace personnel
     ============================================================ */
  function tuiles(c){
    return '<div class="demarches">' + Object.keys(FAMILLES).map(function(id){
      var f = FAMILLES[id], chiffre = '', libelle = '';
      if(id === 'cantine'){
        var e = enfantsCantine(c), n = 0;
        e.forEach(function(x){
          n += Object.keys(repasDe(x.id)).filter(function(iso){ return iso >= aujourdhui(); }).length;
        });
        chiffre = n; libelle = n ? 'repas réservés à venir' : 'aucun repas réservé';
      } else {
        var mes = demandes(c.id, id), ouverts = enCours(c.id, id).length;
        chiffre = mes.length;
        libelle = !mes.length ? 'aucune démarche'
                : ouverts ? ouverts + ' en cours sur ' + mes.length : mes.length + ' terminée' + (mes.length > 1 ? 's' : '');
      }
      return '<a class="demarche glass" href="#' + f.hash + '" style="' + vars(f) + '">'+
        '<span class="ic">' + svg(f.ic) + '</span>'+
        '<span class="tx"><b>' + esc(f.nom) + '</b><small>' + esc(f.resume) + '</small></span>'+
        '<span class="chiffre"><b>' + chiffre + '</b><small>' + esc(libelle) + '</small></span>'+
        '<span class="fleche">' + svg('arrow') + '</span>'+
      '</a>';
    }).join('') + '</div>';
  }

  /* ============================================================
     API PUBLIQUE
     ============================================================ */
  var VUES = {
    connexion:   vueConnexion,
    scolaire:    vueScolaire,
    cantine:     vueCantine,
    signalement: vueSignalement,
    urbanisme:   vueUrbanisme
  };

  window.DEM = {
    VUES: VUES,
    FAMILLES: FAMILLES,
    init: init,
    brancher: function(c){ ctx = c; },
    connu: function(nom){ return Object.prototype.hasOwnProperty.call(VUES, nom); },
    /* renvoie false si la vue demande d'être connecté et redirige vers la connexion */
    rendre: function(nom){
      init();
      if(nom !== 'connexion' && !ctx.moi()){
        apres = nom;
        MD.toast('Connectez-vous pour accéder à cette démarche');
        location.hash = 'connexion';
        return false;
      }
      VUES[nom]();
      return true;
    },
    tuiles: tuiles,
    demandes: demandes,
    enCours: enCours,
    enfantsDe: enfantsDe,
    enfantsCantine: enfantsCantine,
    repasDe: repasDe,
    comptesDemo: comptesDemo,
    detail: detailDemande,
    svg: svg
  };
})();
