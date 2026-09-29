/* ============================================================
   COMPTE CITOYEN — moteur de la maquette
   Registres, catalogue de champs, filtres et stockage local.
   MAQUETTE : tout est enregistré dans le navigateur (localStorage),
   il n'y a ni serveur ni vraie base de données.
   ============================================================ */
(function(){
  var CLE = 'margency-compte-demo-v1';
  var AUJOURDHUI = new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Paris'}).format(new Date());   /* date du jour, heure de Paris (AAAA-MM-JJ) */

  /* ---------- catalogue des champs qu'un registre peut demander ----------
     Rien n'est collecté « au cas où » : un champ n'est demandé que si un registre en a besoin. */
  var CHAMPS = {
    situation:    {label:'Votre situation', type:'choix',
                   options:['65 ans et plus','Situation de handicap','Isolement ou fragilité passagère']},
    vit_seul:     {label:'Vivez-vous seul(e) ?', type:'bool'},
    contact_urg:  {label:'Personne à prévenir (nom et téléphone)', type:'texte'},
    alertes:      {label:'Alertes souhaitées', type:'multi',
                   options:['Travaux et voirie',"Coupures d'eau ou d'électricité",'Alertes météo','Vie scolaire']},
    preference:   {label:'Vous souhaitez recevoir', type:'choix',
                   options:["Le colis de fin d'année","L'invitation au repas des aînés",'Les deux']},
    foyer_70:     {label:'Autres personnes de 70 ans et plus dans votre foyer', type:'nombre'},
    date_arrivee: {label:"Date d'arrivée à Margency", type:'date'},
    membres_foyer:{label:'Membres de votre foyer', type:'foyer'},
    interets:     {label:"Centres d'intérêt", type:'multi',
                   options:['Sport','Culture','Solidarité','Environnement','Jeunesse']},
    dispo:        {label:'Disponibilités', type:'multi', options:['En semaine','Le week-end','Ponctuellement']},
    competences:  {label:'Compétences à partager (métier, savoir-faire)', type:'texte', facultatif:true}
  };

  var REGISTRES = [
    {id:'canicule', nom:'Plan canicule & grand froid', c1:'#fb923c', c2:'#c2410c', icone:'sun',
     finalite:"Contacter les personnes âgées, isolées ou en situation de handicap lors des alertes canicule et grand froid, et leur apporter une aide si besoin.",
     base:"Obligation légale — registre des personnes vulnérables (art. L121-6-1 du Code de l'action sociale et des familles)",
     service:'CCAS de Margency', conservation:"Jusqu'à la désinscription", ageMin:null,
     champs:['situation','vit_seul','contact_urg'], systeme:true, creeLe:'2026-01-05'},
    {id:'alertes', nom:'Alertes SMS', c1:'#60a5fa', c2:'#2563eb', icone:'bell',
     finalite:"Prévenir par SMS des travaux, coupures et alertes météo qui concernent votre quartier.",
     base:'Consentement', service:'Services techniques', conservation:"Jusqu'à la désinscription", ageMin:null,
     champs:['alertes'], systeme:true, creeLe:'2026-01-05'},
    {id:'aines', nom:"Aînés : colis & repas de fin d'année", c1:'#f472b6', c2:'#be185d', icone:'gift',
     finalite:"Organiser la distribution du colis de fin d'année et l'invitation au repas des aînés.",
     base:'Consentement', service:'CCAS de Margency', conservation:'1 an, renouvelable', ageMin:70,
     champs:['preference','foyer_70'], systeme:true, creeLe:'2026-01-05'},
    {id:'arrivants', nom:'Nouveaux arrivants', c1:'#a78bfa', c2:'#6d28d9', icone:'home',
     finalite:"Inviter les nouveaux habitants et leur famille à la cérémonie d'accueil et leur remettre le guide de la commune.",
     base:'Consentement', service:'Cabinet du maire', conservation:'18 mois', ageMin:18,
     champs:['date_arrivee','membres_foyer'], systeme:true, creeLe:'2026-01-05'},
    {id:'benevolat', nom:'Bénévolat & vie associative', c1:'#4ade80', c2:'#15803d', icone:'hands',
     finalite:"Proposer des missions bénévoles et mettre en relation avec les associations de la commune.",
     base:'Consentement', service:'Service vie associative', conservation:"Jusqu'à la désinscription", ageMin:18,
     champs:['interets','dispo','competences'], systeme:true, creeLe:'2026-01-05'}
  ];

  var RUES = [['Avenue Georges-Pompidou','Centre'],['Place de la Mairie','Centre'],['Rue des Écoles','Centre'],
              ['Rue du Château','Nord'],['Allée des Tilleuls','Nord'],['Rue de la Forêt','Nord'],
              ['Chemin des Vignes','Sud'],['Rue Pasteur','Sud'],['Impasse des Lilas','Sud'],
              ['Rue Jean-Jaurès','Est'],['Allée des Érables','Est'],['Rue de Montmorency','Est']];
  var SECTEURS = ['Centre','Nord','Sud','Est'];

  var ICONES = {
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    gift:'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v9H5v-9M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    home:'<path d="M3 21V10l9-7 9 7v11"/><path d="M9 21v-7h6v7"/>',
    hands:'<path d="M8 13V5a2 2 0 1 1 4 0v6"/><path d="M12 11V4a2 2 0 1 1 4 0v9"/><path d="M16 10a2 2 0 1 1 4 0v5a7 7 0 0 1-7 7h-1a7 7 0 0 1-7-7v-3a2 2 0 1 1 4 0"/>',
    book:'<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22z"/><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20"/>',
    ball:'<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/>',
    leaf:'<path d="M11 20A7 7 0 0 1 4 13c0-6 8-10 16-10 0 8-4 16-10 16z"/><path d="M4 20c3-4 6-6 9-7"/>',
    shield:'<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z"/>',
    user:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users:'<path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    check:'<path d="M20 6 9 17l-5-5"/>',
    x:'<path d="M18 6 6 18M6 6l12 12"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
    back:'<path d="M19 12H5M11 18l-6-6 6-6"/>',
    lock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    trash:'<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>',
    download:'<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    filter:'<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    save:'<path d="M5 3h11l5 5v13H5z"/><path d="M8 3v5h7M8 21v-7h8v7"/>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 7 9 6 9-6"/>',
    alert:'<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>'
  };
  var ICONES_REGISTRE = ['sun','bell','gift','home','hands','book','ball','leaf','shield','users'];
  var COULEURS = [['#fb923c','#c2410c'],['#60a5fa','#2563eb'],['#f472b6','#be185d'],['#a78bfa','#6d28d9'],
                  ['#4ade80','#15803d'],['#2dd4bf','#0f766e'],['#facc15','#a16207'],['#94a3b8','#475569']];

  function svg(nom, extra){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'+
           (extra ? ' '+extra : '') + '>' + (ICONES[nom] || '') + '</svg>';
  }
  function esc(s){
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ---------- dates ---------- */
  function age(iso){
    if(!iso) return null;
    var b = iso.split('-').map(Number), t = AUJOURDHUI.split('-').map(Number);
    var a = t[0] - b[0];
    if(t[1] < b[1] || (t[1] === b[1] && t[2] < b[2])) a--;
    return a;
  }
  var MOIS = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
  function dateFr(iso){
    if(!iso) return '';
    var p = iso.slice(0,10).split('-');
    return parseInt(p[2],10) + ' ' + MOIS[parseInt(p[1],10)-1] + ' ' + p[0];
  }

  /* ---------- stockage ---------- */
  var state;
  function seed(){
    var s = JSON.parse(JSON.stringify(window.DEMO_SEED || {citoyens:[], listes:[], journal:[]}));
    s.registres = JSON.parse(JSON.stringify(REGISTRES));
    s.session = null;
    return s;
  }
  function load(){
    try{ state = JSON.parse(localStorage.getItem(CLE) || 'null'); }catch(e){ state = null; }
    if(!state || !state.citoyens) state = seed();
    return state;
  }
  function save(){
    try{ localStorage.setItem(CLE, JSON.stringify(state)); }catch(e){}
  }
  function reset(){
    state = seed(); save(); return state;
  }

  function registre(id){ return state.registres.filter(function(r){ return r.id === id; })[0]; }
  function citoyen(id){ return state.citoyens.filter(function(c){ return c.id === id; })[0]; }
  function inscrits(regId){ return state.citoyens.filter(function(c){ return c.inscriptions && c.inscriptions[regId]; }); }
  function log(action, detail, agent){
    state.journal.unshift({t:new Date().toISOString().slice(0,16), agent:agent || 'Vous (agent démo)', action:action, detail:detail});
    save();
  }
  function nouvelId(prefixe, liste){
    var n = 1; while(liste.some(function(x){ return x.id === prefixe + n; })) n++;
    return prefixe + n;
  }

  /* ---------- éligibilité ---------- */
  function eligible(reg, c){
    if(reg.ageMin && age(c.naissance) < reg.ageMin) return false;
    return true;
  }

  /* ---------- filtres ----------
     On ne peut filtrer que sur le socle minimal (âge, secteur, rue, date d'inscription)
     et sur les champs que CE registre collecte. Impossible de croiser deux registres. */
  var OPS = {
    nombre:[['gte','au moins'],['lte','au plus'],['eq','égal à']],
    bool:  [['eq','est']],
    choix: [['eq','est']],
    multi: [['has','contient']],
    texte: [['contains','contient'],['notempty','est renseigné']],
    date:  [['after','après le'],['before','avant le']],
    foyer: [['count_gte','au moins (personnes)'],['child_under','un enfant de moins de (ans)']]
  };
  function champsFiltrables(reg){
    var base = [
      {id:'_age', label:'Âge', type:'nombre'},
      {id:'_secteur', label:'Secteur', type:'choix', options:SECTEURS},
      {id:'_rue', label:'Rue', type:'texte'},
      {id:'_inscrit', label:"Date d'inscription", type:'date'}
    ];
    return base.concat(reg.champs.map(function(id){
      var ch = CHAMPS[id]; return {id:id, label:ch.label, type:ch.type, options:ch.options};
    }));
  }
  function valeur(c, reg, champ){
    var ins = c.inscriptions[reg.id];
    switch(champ){
      case '_age':     return age(c.naissance);
      case '_secteur': return c.secteur;
      case '_rue':     return c.adresse.numero + ' ' + c.adresse.rue;
      case '_inscrit': return ins.date;
      default:         return ins.reponses[champ];
    }
  }
  function test(c, reg, cond){
    var v = valeur(c, reg, cond.champ), x = cond.valeur;
    switch(cond.op){
      case 'gte':  return v != null && Number(v) >= Number(x);
      case 'lte':  return v != null && Number(v) <= Number(x);
      case 'eq':   return typeof v === 'boolean' ? String(v) === String(x) :
                          (typeof v === 'number' ? v === Number(x) : String(v) === String(x));
      case 'has':  return Array.isArray(v) && v.indexOf(x) !== -1;
      case 'contains': return String(v || '').toLowerCase().indexOf(String(x).toLowerCase()) !== -1;
      case 'notempty': return !!(v && String(v).trim());
      case 'after':  return !!v && v.slice(0,10) >= x;
      case 'before': return !!v && v.slice(0,10) <= x;
      case 'count_gte':   return Array.isArray(v) && (v.length + 1) >= Number(x);
      case 'child_under': return Array.isArray(v) && v.some(function(m){ return age(m.naissance) < Number(x); });
    }
    return true;
  }
  function filtrer(reg, conditions){
    var completes = (conditions || []).filter(function(k){ return k.champ && k.op && (k.op === 'notempty' || k.valeur !== ''); });
    return inscrits(reg.id).filter(function(c){
      return completes.every(function(k){ return test(c, reg, k); });
    });
  }

  /* ---------- rendu d'une réponse, lisible ---------- */
  function afficherReponse(champId, v){
    var ch = CHAMPS[champId];
    if(v == null || v === '') return '<span class="muted">—</span>';
    switch(ch.type){
      case 'bool':  return v ? 'Oui' : 'Non';
      case 'multi': return v.map(esc).join(', ');
      case 'date':  return dateFr(v);
      case 'foyer': return v.length ? v.map(function(m){ return esc(m.prenom) + ' (' + age(m.naissance) + ' ans)'; }).join(', ')
                                    : '<span class="muted">Personne seule</span>';
      default:      return esc(v);
    }
  }
  function texteReponse(champId, v){
    var ch = CHAMPS[champId];
    if(v == null) return '';
    switch(ch.type){
      case 'bool':  return v ? 'Oui' : 'Non';
      case 'multi': return v.join(' / ');
      case 'foyer': return v.map(function(m){ return m.prenom + ' (' + age(m.naissance) + ' ans, ' + m.lien + ')'; }).join(' / ');
      default:      return String(v);
    }
  }

  /* ---------- champ de formulaire pour une question de registre ---------- */
  function champHTML(regId, champId, v){
    var ch = CHAMPS[champId], name = regId + '__' + champId, h = '';
    var opt = ch.facultatif ? ' <i>(facultatif)</i>' : '';
    switch(ch.type){
      case 'bool':
        return '<div class="field"><span>'+esc(ch.label)+'</span><div class="checks">'+
          '<label class="check-pill"><input type="radio" name="'+name+'" value="true"'+(v===true?' checked':'')+'> Oui</label>'+
          '<label class="check-pill"><input type="radio" name="'+name+'" value="false"'+(v===false?' checked':'')+'> Non</label></div></div>';
      case 'choix':
        h = '<option value="">Choisir…</option>' + ch.options.map(function(o){
          return '<option'+(v===o?' selected':'')+'>'+esc(o)+'</option>'; }).join('');
        return '<label class="field"><span>'+esc(ch.label)+'</span><select name="'+name+'">'+h+'</select></label>';
      case 'multi':
        h = ch.options.map(function(o){
          return '<label class="check-pill"><input type="checkbox" name="'+name+'" value="'+esc(o)+'"'+
                 (v && v.indexOf(o)!==-1?' checked':'')+'> '+esc(o)+'</label>'; }).join('');
        return '<div class="field"><span>'+esc(ch.label)+'</span><div class="checks">'+h+'</div></div>';
      case 'nombre':
        return '<label class="field"><span>'+esc(ch.label)+'</span><input type="number" min="0" max="12" name="'+name+'" value="'+(v!=null?v:'0')+'"></label>';
      case 'date':
        return '<label class="field"><span>'+esc(ch.label)+'</span><input type="date" name="'+name+'" value="'+esc(v||'')+'" max="'+AUJOURDHUI+'"></label>';
      case 'foyer':
        return '<div class="field foyer-field" data-name="'+name+'"><span>'+esc(ch.label)+' <i>(en plus de vous)</i></span>'+
          '<div class="foyer-rows">'+ (v||[]).map(foyerRow).join('') +'</div>'+
          '<button type="button" class="btn btn-glass btn-sm foyer-add">'+svg('plus')+' Ajouter une personne</button></div>';
      default:
        return '<label class="field"><span>'+esc(ch.label)+opt+'</span><input type="text" name="'+name+'" value="'+esc(v||'')+'"></label>';
    }
  }
  function foyerRow(m){
    m = m || {prenom:'', naissance:'', lien:'Enfant'};
    return '<div class="foyer-row grid-3">'+
      '<label class="field"><span>Prénom</span><input type="text" data-k="prenom" value="'+esc(m.prenom)+'"></label>'+
      '<label class="field"><span>Date de naissance</span><input type="date" data-k="naissance" value="'+esc(m.naissance)+'" max="'+AUJOURDHUI+'"></label>'+
      '<label class="field"><span>Lien</span><select data-k="lien">'+
        ['Conjoint(e)','Enfant','Parent','Autre'].map(function(l){ return '<option'+(m.lien===l?' selected':'')+'>'+l+'</option>'; }).join('')+
      '</select></label>'+
      '<button type="button" class="icon-btn foyer-del" aria-label="Retirer">'+svg('x')+'</button></div>';
  }
  /* lit les réponses d'un registre dans un conteneur ; renvoie {reponses, manquants} */
  function lireReponses(root, reg){
    var rep = {}, manquants = [];
    reg.champs.forEach(function(id){
      var ch = CHAMPS[id], name = reg.id + '__' + id, v;
      switch(ch.type){
        case 'bool':
          var r = root.querySelector('input[name="'+name+'"]:checked');
          v = r ? r.value === 'true' : null; break;
        case 'multi':
          v = [].map.call(root.querySelectorAll('input[name="'+name+'"]:checked'), function(i){ return i.value; });
          if(!v.length) v = null; break;
        case 'nombre':
          var n = root.querySelector('[name="'+name+'"]'); v = n && n.value !== '' ? Number(n.value) : null; break;
        case 'foyer':
          v = [].map.call(root.querySelectorAll('.foyer-field[data-name="'+name+'"] .foyer-row'), function(row){
            var o = {}; row.querySelectorAll('[data-k]').forEach(function(i){ o[i.dataset.k] = i.value.trim(); }); return o;
          }).filter(function(m){ return m.prenom && m.naissance; });
          break;
        default:
          var f = root.querySelector('[name="'+name+'"]'); v = f ? f.value.trim() : '';
          if(v === '') v = ch.facultatif ? '' : null;
      }
      if(v === null && ch.type !== 'foyer') manquants.push(ch.label);
      rep[id] = v;
    });
    return {reponses:rep, manquants:manquants};
  }
  /* active les boutons « ajouter / retirer » des lignes du foyer */
  function brancherFoyer(root){
    root.addEventListener('click', function(e){
      var add = e.target.closest('.foyer-add'), del = e.target.closest('.foyer-del');
      if(add){ add.previousElementSibling.insertAdjacentHTML('beforeend', foyerRow()); }
      if(del){ del.closest('.foyer-row').remove(); }
    });
  }

  /* ---------- petites briques d'interface ---------- */
  function toast(msg){
    var t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role','status');
    t.innerHTML = svg('check') + '<span>' + esc(msg) + '</span>';
    document.body.appendChild(t);
    setTimeout(function(){ t.remove(); }, 2800);
  }
  function modal(html){
    var m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = '<div class="modal-card glass" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.appendChild(m);
    function fermer(){ m.remove(); document.removeEventListener('keydown', esc_); }
    function esc_(e){ if(e.key === 'Escape') fermer(); }
    m.addEventListener('click', function(e){ if(e.target === m || e.target.closest('[data-close]')) fermer(); });
    document.addEventListener('keydown', esc_);
    var first = m.querySelector('input,select,textarea,button'); if(first) first.focus();
    return {el:m, fermer:fermer};
  }
  function bindGlow(){
    document.querySelectorAll('.glass').forEach(function(el){
      if(el.dataset.glow) return; el.dataset.glow = '1';
      el.addEventListener('pointermove', function(e){
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }
  function chrome(){
    new MutationObserver(bindGlow).observe(document.body, {childList:true, subtree:true});
    bindGlow();
    var header = document.getElementById('header');
    if(header){
      var onScroll = function(){ header.classList.toggle('scrolled', window.scrollY > 12); };
      onScroll(); window.addEventListener('scroll', onScroll, {passive:true});
    }
    var sheet = document.getElementById('sheet'), burger = document.getElementById('burger');
    if(sheet && burger){
      burger.addEventListener('click', function(){ sheet.classList.add('open'); });
      document.getElementById('closeSheet').addEventListener('click', function(){ sheet.classList.remove('open'); });
      sheet.addEventListener('click', function(e){ if(e.target === sheet) sheet.classList.remove('open'); });
    }
  }

  window.MD = {
    CHAMPS:CHAMPS, RUES:RUES, SECTEURS:SECTEURS, OPS:OPS, ICONES_REGISTRE:ICONES_REGISTRE, COULEURS:COULEURS,
    AUJOURDHUI:AUJOURDHUI,
    get state(){ return state; },
    load:load, save:save, reset:reset,
    registre:registre, citoyen:citoyen, inscrits:inscrits, log:log, nouvelId:nouvelId,
    eligible:eligible, age:age, dateFr:dateFr,
    champsFiltrables:champsFiltrables, filtrer:filtrer, valeur:valeur,
    afficherReponse:afficherReponse, texteReponse:texteReponse,
    champHTML:champHTML, lireReponses:lireReponses, brancherFoyer:brancherFoyer,
    svg:svg, esc:esc, toast:toast, modal:modal, chrome:chrome
  };
  load();
})();
