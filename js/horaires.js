/* ============================================================
   Statut de la mairie en temps réel, dans la barre du haut.
   Vert : ouverte · Orange : ferme dans moins de 30 min · Rouge : fermée.
   Les horaires suivent l'heure de Paris, quel que soit le fuseau du visiteur.
   ============================================================ */
(function(){
  /* créneaux en minutes depuis minuit — 0 = dimanche.
     C'est l'unique endroit où les horaires de la mairie sont écrits : la barre
     du haut et le pied de page des 13 pages se servent tous les deux ici. */
  var LMV = [[8*60+30, 12*60], [13*60+30, 17*60]];   /* 8h30–12h et 13h30–17h */
  var MJS = [[8*60+30, 11*60+45]];                    /* 8h30–11h45 */
  var HORAIRES = {0:[], 1:LMV, 2:LMV, 3:MJS, 4:MJS, 5:LMV, 6:MJS};
  var PREAVIS = 30;
  var JOURS = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];

  function heure(m){
    var h = Math.floor(m / 60), mn = m % 60;
    return h + 'h' + (mn ? ('0' + mn).slice(-2) : '');
  }
  function plage(c){ return heure(c[0]) + '–' + heure(c[1]); }

  /* le pied de page : horaires et année de copyright, écrits une seule fois */
  [].forEach.call(document.querySelectorAll('[data-horaires-mairie]'), function(n){
    n.innerHTML = 'Lundi, mardi, vendredi : ' + plage(LMV[0]) + ' et ' + plage(LMV[1]) + '.' +
                  '<br>Mercredi, jeudi, samedi : ' + plage(MJS[0]) + '.';
  });
  [].forEach.call(document.querySelectorAll('[data-annee]'), function(n){
    n.textContent = new Intl.DateTimeFormat('fr-FR', {timeZone:'Europe/Paris', year:'numeric'}).format(new Date());
  });

  var el = document.getElementById('statutMairie');
  if(!el) return;
  var dot = el.querySelector('.pulse'), txt = el.querySelector('.statut-txt');

  function maintenantParis(){
    var p = {};
    new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/Paris', weekday:'short',
      hour:'2-digit', minute:'2-digit', hourCycle:'h23'})
      .formatToParts(new Date()).forEach(function(x){ p[x.type] = x.value; });
    return {
      jour: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(p.weekday),
      min:  (parseInt(p.hour, 10) % 24) * 60 + parseInt(p.minute, 10)
    };
  }

  function etat(couleur, texte){
    dot.className = 'pulse ' + couleur;
    txt.textContent = texte;
    el.title = texte;
  }

  function maj(){
    var n = maintenantParis(), creneaux = HORAIRES[n.jour], i;

    for(i = 0; i < creneaux.length; i++){
      var c = creneaux[i];
      if(n.min >= c[0] && n.min < c[1]){
        var reste = c[1] - n.min;
        if(reste <= PREAVIS) etat('orange', 'Fermeture à ' + heure(c[1]) + ' · dans ' + reste + ' min');
        else                 etat('vert',   'Mairie ouverte jusqu\'à ' + heure(c[1]));
        return;
      }
    }
    /* fermée : on annonce la prochaine ouverture, le point reste rouge jusqu'à l'heure pile */
    for(i = 0; i < creneaux.length; i++){
      if(creneaux[i][0] > n.min){
        etat('rouge', 'Mairie fermée · ' + (i === 0 ? 'ouvre' : 'réouvre') + ' à ' + heure(creneaux[i][0]));
        return;
      }
    }
    for(var d = 1; d <= 7; d++){
      var j = (n.jour + d) % 7;
      if(HORAIRES[j].length){
        etat('rouge', 'Mairie fermée · ouvre ' + (d === 1 ? 'demain' : JOURS[j]) + ' à ' + heure(HORAIRES[j][0][0]));
        return;
      }
    }
  }

  maj();
  setInterval(maj, 30000);
})();
