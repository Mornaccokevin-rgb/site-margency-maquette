/* ============================================================
   La photo de la mairie suit la météo réelle à Margency.
   Source : Open-Meteo (gratuit, sans clé, aucune donnée du visiteur envoyée).
   Pour tester un rendu : index.html?meteo=pluie | neige | soleil
   ============================================================ */
(function(){
  var stage = document.querySelector('.photo-stage');
  if(!stage) return;
  var fx = stage.querySelector('.meteo-fx');

  var EFFETS = {
    soleil: '<div class="nuages-overlay"></div>',
    pluie:  '<div class="nuages-overlay gris"></div>' +
            '<div class="pluie-overlay fond"></div><div class="pluie-overlay"></div>',
    neige:  '<div class="nuages-overlay brume"></div>' +
            '<div class="neige-sway"><div class="neige-overlay fond"></div><div class="neige-overlay"></div></div>'
  };

  /* codes météo WMO renvoyés par Open-Meteo */
  function versMeteo(code){
    if([71, 73, 75, 77, 85, 86].indexOf(code) !== -1) return 'neige';
    if((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return 'pluie';
    return 'soleil';
  }

  function appliquer(meteo){
    if(!EFFETS[meteo]) meteo = 'soleil';
    stage.dataset.meteo = meteo;
    fx.innerHTML = EFFETS[meteo];

    var actuelle = stage.querySelector('img.ph');
    if(actuelle && actuelle.dataset.meteo === meteo) return;

    /* la nouvelle photo se charge en arrière-plan, puis apparaît en fondu */
    var img = new Image();
    img.className = 'ph entrante';
    img.alt = '';
    img.dataset.meteo = meteo;
    img.sizes = '100vw';
    img.srcset = 'assets/site/mairie-' + meteo + '-1280.webp 1280w, assets/site/mairie-' + meteo + '-2400.webp 2400w';
    img.src = 'assets/site/mairie-' + meteo + '-2400.webp';
    var montrer = function(){
      stage.insertBefore(img, fx);
      requestAnimationFrame(function(){ requestAnimationFrame(function(){ img.classList.add('visible'); }); });
      if(actuelle) setTimeout(function(){ actuelle.remove(); }, 1500);
    };
    (img.decode ? img.decode() : Promise.resolve()).then(montrer, montrer);
  }

  function lireCache(){
    try{
      var c = JSON.parse(sessionStorage.getItem('meteo-margency') || 'null');
      return (c && Date.now() - c.t < 20 * 60000) ? c.m : null;
    }catch(e){ return null; }
  }
  function ecrireCache(m){
    try{ sessionStorage.setItem('meteo-margency', JSON.stringify({m: m, t: Date.now()})); }catch(e){}
  }

  function actualiser(){
    var force = new URLSearchParams(location.search).get('meteo');
    if(force){ appliquer(force); return; }

    var enCache = lireCache();
    if(enCache){ appliquer(enCache); return; }

    var ctrl = window.AbortController ? new AbortController() : null;
    if(ctrl) setTimeout(function(){ ctrl.abort(); }, 6000);
    fetch('https://api.open-meteo.com/v1/forecast?latitude=49.0017&longitude=2.2917&current=weather_code&timezone=Europe%2FParis',
          ctrl ? {signal: ctrl.signal} : {})
      .then(function(r){ return r.json(); })
      .then(function(d){
        var m = versMeteo(d.current.weather_code);
        ecrireCache(m);
        appliquer(m);
      })
      .catch(function(){ appliquer('soleil'); });   /* hors ligne : on garde la photo ensoleillée */
  }

  actualiser();
  setInterval(actualiser, 30 * 60000);
})();
