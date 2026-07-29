/* DentWebPro — injection de la galerie « Choisissez le site de votre cabinet »
   + nettoyage nav/réseaux, exécuté après l'hydratation Framer. */
(function(){
  var BASE="";
  var CLINICS=[
    {slug:"dentica",name:"Dentélia",city:"Lyon"},
    {slug:"menta",name:"Menta",city:"Créteil"},
    {slug:"cliniva",name:"Cliniva",city:"Paris"},
    {slug:"orelia",name:"Orélia",city:"Paris"},
    {slug:"serenia",name:"Sérenia",city:"Paris"},
    {slug:"solmea",name:"Solmea",city:"Paris"},
    {slug:"lumea",name:"Lumea",city:"Bordeaux"},
    {slug:"novak",name:"Dr. Novak",city:"Nice"},
    {slug:"ondelys",name:"Ondelys",city:"Strasbourg"},
    {slug:"deentiva",name:"Sourelia",city:"Créteil"}
  ];

  // Sites réels déjà livrés & en ligne (clic -> ouverture du site en direct, nouvel onglet)
  var LIVE=[
    {name:"Oléa",  city:"Marseille", url:"https://hellboykader-code.github.io/export-kader1-framer-website-ms074a1w/",  vid:"olea",  brand:"#0d1b15", accent:"#d1fc71"},
    {name:"Novéo", city:"Lyon",      url:"https://hellboykader-code.github.io/export-kader9-framer-website-mrzfoouq/",  vid:"noveo", brand:"#33231a", accent:"#e8853b"},
    {name:"Zenta", city:"Paris",     url:"https://hellboykader-code.github.io/export-kader10-framer-website-mrzfwfoi/", vid:"zenta", brand:"#2f2e5c", accent:"#b9b7f0"},
    // Modèles livrés — image (capture) pour l'instant, vidéos à venir
    {name:"Éclat",     city:"Modèle", url:"https://hellboykader-code.github.io/Oral/",                                     img:"eclat.jpg",     brand:"#0d1b15", accent:"#d1fc71"},
    {name:"Dentitive", city:"Modèle", url:"https://hellboykader-code.github.io/export-dentitive1-framer-website-ms0t5u8s/", img:"dentitive.jpg", brand:"#0f2733", accent:"#37b3a3"},
    {name:"RedDent",   city:"Modèle", url:"https://hellboykader-code.github.io/export-reddent1-framer-website-ms1xnfft/",  img:"reddent.jpg",   brand:"#0b1e17", accent:"#d0fc6d"}
  ];
  // carte « site réel en ligne » : vidéo (survol) si dispo, sinon tuile de marque
  function liveCard(c){
    var shot;
    if(c.vid){
      shot='<div class="dwp-card-shot dwp-vid-shot">'+
        '<span class="dwp-live-badge"><i></i>En ligne</span>'+
        '<video class="dwp-vid" autoplay muted loop playsinline preload="auto" poster="'+BASE+'/assets/realisations/'+c.vid+'-poster.jpg">'+
          '<source src="'+BASE+'/assets/realisations/'+c.vid+'.mp4" type="video/mp4"></video>'+
        '</div>';
    } else if(c.img){
      // capture d'écran (temporaire, remplacée par la vidéo plus tard)
      shot='<div class="dwp-card-shot">'+
        '<span class="dwp-live-badge"><i></i>En ligne</span>'+
        '<img src="'+BASE+'/assets/realisations/'+c.img+'" alt="Aperçu du site '+c.name+'" loading="lazy">'+
        '</div>';
    } else {
      shot='<div class="dwp-card-shot dwp-live-shot">'+
        '<span class="dwp-live-badge"><i></i>En ligne</span>'+
        '<span class="dwp-live-name">'+c.name+'</span>'+
        '<span class="dwp-live-tag">Cabinet dentaire · '+c.city+'</span>'+
        '<span class="dwp-live-cta">Voir le site en direct →</span>'+
        '</div>';
    }
    return '<div class="dwp-cardlink dwp-live-card'+(c.vid?' dwp-vid-card':'')+'" role="link" tabindex="0" data-dwp-site="'+c.url+'" data-dwp-ext="1" style="--brand:'+c.brand+';--accent:'+c.accent+'">'+
      shot+
      '<div class="dwp-card-meta"><h3>'+c.name+'</h3><span class="dwp-card-city">'+c.city+'</span></div>'+
      '<span class="dwp-card-cat">En ligne</span>'+
      '</div>';
  }
  // lecture automatique en boucle (relance si le navigateur met l'autoplay en pause)
  // écrit une valeur dans le 1er nœud texte (et vide les suivants) — gère les
  // titres découpés en <span> (SplitText) sans casser la structure.
  function abSetText(el,val){
    var walk=function(n){for(var i=0;i<n.childNodes.length;i++){var c=n.childNodes[i];
      if(c.nodeType===3 && c.nodeValue && c.nodeValue.trim()){c.nodeValue=val;
        for(var j=i+1;j<n.childNodes.length;j++){var d=n.childNodes[j];
          if(d.nodeType===3 && d.nodeValue && d.nodeValue.trim()) d.nodeValue="";}
        return true;}
      if(c.nodeType===1 && walk(c))return true;}return false;};
    if(!walk(el)) el.textContent=val;
  }
  function wireVideos(){
    document.querySelectorAll('.dwp-vid-card video').forEach(function(v){
      if(v.getAttribute('data-vwired')) return;
      v.setAttribute('data-vwired','1');
      v.muted=true;
      var play=function(){ var pr=v.play(); if(pr&&pr.catch) pr.catch(function(){}); };
      play(); v.addEventListener('canplay',play); v.addEventListener('loadeddata',play);
    });
  }
  // apparition animée des cartes (image/vidéo qui se révèle en zoom, en cascade)
  function revealCards(){
    var cards=document.querySelectorAll('#dwp-gallery .dwp-cardlink:not([data-dwp-seen])');
    if(!cards.length) return;
    if(!window.IntersectionObserver){ [].forEach.call(cards,function(c){c.classList.add('dwp-in');}); return; }
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting){ var el=e.target;
        var i=parseInt(el.getAttribute('data-dwp-idx')||'0',10);
        el.style.transitionDelay=(Math.min(i,7)*0.09)+'s';
        el.classList.add('dwp-in'); io.unobserve(el); } });
    },{threshold:0.12,rootMargin:'0px 0px -8% 0px'});
    [].forEach.call(cards,function(c,i){ c.setAttribute('data-dwp-seen','1'); c.setAttribute('data-dwp-idx',(i%12)); io.observe(c); });
  }

  function buildGallery(){
    var sec=document.createElement("section");
    sec.id="dwp-gallery"; sec.setAttribute("data-dwp","1");
    var live=LIVE.map(liveCard).join("");
    var demo=CLINICS.map(function(c){
      var url=BASE+'/realisations/'+c.slug+'/index.html';
      return '<div class="dwp-cardlink" role="link" tabindex="0" data-dwp-site="'+url+'">'+
        '<div class="dwp-card-shot"><img src="'+BASE+'/assets/realisations/'+c.slug+'.webp" alt="Aperçu du site '+c.name+'" loading="lazy"></div>'+
        '<div class="dwp-card-meta"><h3>'+c.name+'</h3><span class="dwp-card-city">'+c.city+'</span></div>'+
        '<span class="dwp-card-cat">Cabinet dentaire · '+c.city+'</span>'+
        '</div>';
    }).join("");
    sec.innerHTML='<div class="dwp-wrap">'+
      '<span class="dwp-eyebrow2">{ Nos réalisations }</span>'+
      '<h2>Choisissez le site de votre cabinet</h2>'+
      '<p class="dwp-sub">Nos sites déjà en ligne et nos modèles prêts à l\'emploi, conçus pour les cabinets dentaires. Cliquez pour découvrir.</p>'+
      '<div class="dwp-grid">'+live+demo+'</div></div>';
    return sec;
  }

  var FICHE=BASE+"/fiche/";
  var WA_NUM="33745929520"; // +33 7 45 92 95 20
  var WA_URL="https://wa.me/"+WA_NUM+"?text="+encodeURIComponent("Bonjour, je souhaite un site pour mon cabinet dentaire.");
  var ARROW='<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M4 10h11M11 5.5L15.5 10 11 14.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var CHK='<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="#f14e30"/><path d="M6 10.2l2.6 2.6L14 7.5" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // ─── « Comment ça marche » (4 étapes) ───
  function buildSteps(){
    var sec=document.createElement("section");
    sec.id="dwp-steps"; sec.setAttribute("data-dwp","1");
    var steps=[
      {t:"Vous remplissez la fiche",d:"Décrivez votre cabinet, vos soins, vos couleurs et vos préférences. Simple et rapide, en 5 minutes."},
      {t:"Nous concevons votre site",d:"Nous créons votre site sur mesure — logo professionnel, pages, photos et formulaire de rendez-vous compris."},
      {t:"Vous validez",d:"Vous relisez tranquillement. On ajuste autant qu’il faut jusqu’à ce que le résultat vous plaise vraiment.",tag:null},
      {t:"Mise en ligne",d:"Votre site est publié, sécurisé (SSL) et référencé sur Google. Prêt à recevoir vos patients.",tag:"Livré en 3 jours"}
    ].map(function(s,i){
      return '<div class="dwp-step"><div class="dwp-step__n">'+(i+1)+'</div>'+
        '<h3>'+s.t+'</h3><p>'+s.d+'</p>'+(s.tag?'<span class="dwp-step__tag">'+s.tag+'</span>':'')+'</div>';
    }).join("");
    sec.innerHTML='<div class="dwp-wrap">'+
      '<div class="dwp-thead">'+
        '<span class="dwp-eyebrow2">{ Comment ça marche }</span>'+
        '<h2>Votre site en 4 étapes simples</h2>'+
        '<p class="dwp-sub">De la première idée à la mise en ligne, on s’occupe de tout. Vous n’avez qu’à valider.</p>'+
      '</div>'+
      '<div class="dwp-steps-grid">'+steps+'</div>'+
      '<div class="dwp-steps-cta"><a class="dwp-btn-primary" href="'+FICHE+'">Demander un devis gratuit '+ARROW+'</a></div>'+
    '</div>';
    return sec;
  }

  // ─── « Tarifs » : 3 formules (Essentiel / Pro / Premium) ───
  function buildTarifs(){
    var sec=document.createElement("section");
    sec.id="dwp-tarifs"; sec.setAttribute("data-dwp","1");
    var feats=function(arr){ return arr.map(function(f){return '<li class="dwp-formule__feat">'+CHK+'<span>'+f+'</span></li>';}).join(""); };
    var essentiel=feats([
      "Site <b>3 pages</b> (Accueil, Soins, Contact)","Logo professionnel <b>offert</b>",
      "100% mobile &amp; tablette","Formulaire de <b>rendez-vous</b>",
      "Certificat <b>SSL</b>","Nom de domaine <b>1ʳᵉ année offert</b>",
      "<b>Hébergement gratuit à vie</b>","Mise en ligne clé en main"
    ]);
    var pro=feats([
      "Site <b>5 pages</b> complet","<b>Tout</b> ce qu’il y a dans Essentiel",
      "Référencement <b>Google</b> (SEO)","Adresse <b>e-mail pro</b>",
      "Comparateur <b>avant / après</b>","Modifications incluses",
      "Support &amp; accompagnement"
    ]);
    var premium=feats([
      "<b>Tout</b> ce qu’il y a dans Pro","Fiche <b>Google Business</b> (Maps)",
      "Galerie <b>photos &amp; vidéos</b>","<b>5 modifications</b> / an",
      "Optimisation vitesse avancée","<b>Support prioritaire</b>"
    ]);
    var card=function(o){
      return '<div class="dwp-formule'+(o.pro?' is-pro':'')+'">'+
        (o.pro?'<span class="dwp-formule__badge">★ Recommandé</span>':'')+
        '<div class="dwp-formule__name">'+o.name+'</div>'+
        '<div class="dwp-formule__tag">'+o.tag+'</div>'+
        '<div class="dwp-formule__price"><b>'+o.price+'€</b><span>une seule fois</span></div>'+
        '<div class="dwp-formule__once">✓ Payé à la réception du site</div>'+
        '<ul class="dwp-formule__list">'+o.feats+'</ul>'+
        '<a class="dwp-btn-primary dwp-formule__cta" href="'+FICHE+'">'+o.cta+' '+ARROW+'</a>'+
      '</div>';
    };
    sec.innerHTML='<div class="dwp-wrap">'+
      '<div class="dwp-thead">'+
        '<span class="dwp-eyebrow2">{ Nos formules }</span>'+
        '<h2>Un prix clair, payé à la livraison</h2>'+
        '<p class="dwp-sub">Trois formules tout compris, sans abonnement. Vous ne payez qu’une fois votre site livré et en ligne.</p>'+
      '</div>'+
      '<div class="dwp-formules">'+
        card({name:"Essentiel",tag:"Le site vitrine idéal pour démarrer",price:"290",feats:essentiel,cta:"Choisir Essentiel"})+
        card({name:"Pro",tag:"Le plus choisi — complet et référencé",price:"390",feats:pro,cta:"Choisir Pro",pro:true})+
        card({name:"Premium",tag:"Pour aller plus loin en visibilité",price:"590",feats:premium,cta:"Choisir Premium"})+
      '</div>'+
      '<p class="dwp-tarifs-note">Toutes les formules incluent l’<b>hébergement gratuit à vie</b>. Ensuite, seulement <b>50€/an</b> pour le renouvellement du nom de domaine — c’est tout.</p>'+
    '</div>';
    return sec;
  }

  // ─── Bandeau « Garanties » ───
  function buildGaranties(){
    var sec=document.createElement("section");
    sec.id="dwp-garanties"; sec.setAttribute("data-dwp","1");
    var clock='<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.4" stroke="#f14e30" stroke-width="1.5"/><path d="M10 5.5V10l3 2" stroke="#f14e30" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var life='<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 17s-6-3.7-6-8a3.5 3.5 0 016-2.4A3.5 3.5 0 0116 9c0 4.3-6 8-6 8z" stroke="#f14e30" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    var redo='<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15.5 6.5A6 6 0 104 10" stroke="#f14e30" stroke-width="1.5" stroke-linecap="round"/><path d="M15.5 3v3.5H12" stroke="#f14e30" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    sec.innerHTML='<div class="dwp-wrap">'+
      '<span class="dwp-gar">'+clock+'<span><b>Livré en 3 jours</b></span></span>'+
      '<span class="dwp-gar">'+life+'<span>Support inclus</span></span>'+
      '<span class="dwp-gar">'+redo+'<span>Satisfait ou refait</span></span>'+
    '</div>';
    return sec;
  }

  // ─── FAQ (accordéon) ───
  function buildFaq(){
    var sec=document.createElement("section");
    sec.id="dwp-faq"; sec.setAttribute("data-dwp","1");
    var plus='<span class="dwp-faq-ico"><svg width="13" height="13" viewBox="0 0 14 14"><line x1="7" y1="1.5" x2="7" y2="12.5" stroke="#17171b" stroke-width="1.8" stroke-linecap="round"/><line x1="1.5" y1="7" x2="12.5" y2="7" stroke="#17171b" stroke-width="1.8" stroke-linecap="round"/></svg></span>';
    var qa=[
      ["Quel est le délai de livraison ?","Votre site est livré en <b>3 jours</b> après réception de votre fiche complète. On vous tient informé à chaque étape."],
      ["L’hébergement est-il vraiment gratuit ?","Oui. L’<b>hébergement est gratuit à vie</b> : votre site reste en ligne sans aucun frais mensuel, sur toutes les formules."],
      ["Et le nom de domaine ?","La <b>1ʳᵉ année est offerte</b>. Ensuite, il faut seulement <b>50€/an</b> pour le renouvellement du domaine (ex. votre-cabinet.fr)."],
      ["Puis-je modifier mon site plus tard ?","Bien sûr. Les <b>modifications sont incluses</b> dès la formule Pro, et jusqu’à <b>5 modifications par an</b> en Premium."],
      ["Combien ça coûte ?","À partir de <b>290€</b>, une seule fois. Pas d’abonnement, pas de frais cachés — le prix affiché est le prix final."],
      ["Quand dois-je payer ?","<b>Uniquement à la livraison</b>, une fois votre site en ligne et validé par vos soins. Aucun paiement avant."]
    ].map(function(x){
      return '<details class="dwp-faq-item"><summary>'+x[0]+plus+'</summary><div class="dwp-faq-a">'+x[1]+'</div></details>';
    }).join("");
    sec.innerHTML='<div class="dwp-wrap">'+
      '<div class="dwp-thead">'+
        '<span class="dwp-eyebrow2">{ Questions fréquentes }</span>'+
        '<h2>Vous vous posez des questions ?</h2>'+
      '</div>'+
      qa+
      '<div class="dwp-faq-cta"><a class="dwp-btn-primary" href="'+FICHE+'">Demander un devis gratuit '+ARROW+'</a></div>'+
    '</div>';
    return sec;
  }

  // ─── Bouton WhatsApp flottant (toutes les pages) ───
  function addWhatsApp(){
    if(document.getElementById("dwp-wa")) return;
    var a=document.createElement("a");
    a.id="dwp-wa"; a.href=WA_URL; a.target="_blank"; a.rel="noopener";
    a.setAttribute("aria-label","Nous contacter sur WhatsApp");
    a.innerHTML='<span class="dwp-wa-ico"><svg width="30" height="30" viewBox="0 0 32 32" fill="none">'+
      '<path d="M16 3C8.8 3 3 8.8 3 16c0 2.5.7 4.8 1.9 6.8L3 29l6.4-1.8c1.9 1 4.1 1.6 6.6 1.6 7.2 0 13-5.8 13-13S23.2 3 16 3z" fill="#fff"/>'+
      '<path d="M12.3 9.6c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9 0 1.7 1.2 3.4 1.4 3.6.2.2 2.4 3.8 6 5.2 3 1.2 3.6 1 4.3.9.7-.1 2.1-.9 2.4-1.7.3-.8.3-1.6.2-1.7-.1-.2-.4-.3-.8-.5-.4-.2-2.1-1-2.4-1.1-.3-.1-.6-.2-.8.2-.2.3-.9 1.1-1.1 1.3-.2.2-.4.3-.8.1-.4-.2-1.5-.6-2.9-1.8-1.1-1-1.8-2.2-2-2.5-.2-.4 0-.6.2-.7.2-.2.4-.4.5-.6.2-.2.2-.3.4-.6.1-.2.1-.4 0-.6-.1-.2-.8-2-1.1-2.7z" fill="#25d366"/>'+
      '</svg></span><span class="dwp-wa-txt">Discutons sur WhatsApp</span>';
    document.body.appendChild(a);
  }

  var TEAM=[
    {slug:"kader",name:"Kader",role:"Fondateur · Designer & Développeur"},
    {slug:"amine",name:"Amine",role:"Co-fondateur · Relations & Marketing"},
    {slug:"yanis",name:"Yanis",role:"Relations & Marketing"}
  ];
  function buildTeam(){
    var sec=document.createElement("section");
    sec.id="dwp-team"; sec.setAttribute("data-dwp","1");
    var cards=TEAM.map(function(m){
      return '<figure class="dwp-member">'+
        '<img src="'+BASE+'/assets/team/'+m.slug+'.webp" alt="'+m.name+'" loading="lazy">'+
        '<figcaption class="dwp-member__body"><h3>'+m.name+'</h3><span class="dwp-member__role">'+m.role+'</span></figcaption>'+
        '</figure>';
    }).join("");
    sec.innerHTML='<div class="dwp-wrap">'+
      '<span class="dwp-eyebrow2">{ Notre équipe }</span>'+
      '<h2>Rencontrez notre équipe</h2>'+
      '<p class="dwp-sub">Une équipe soudée qui conçoit, développe et fait rayonner votre cabinet dentaire en ligne.</p>'+
      '<div class="dwp-team-grid">'+cards+'</div></div>';
    return sec;
  }

  // ⭐ Remplacement des photos « À propos » par NOS visuels — AUTO-RÉPARANT.
  //    React reconstruit ces <img> quand la section entre dans le viewport (scroll)
  //    et rétablit le src CDN d'origine. apply() s'arrête après ~10 s, donc un scroll
  //    tardif « annulait » le remplacement. fixImgs() est rappelé en continu par un
  //    MutationObserver + un interval léger -> le swap se ré-applique à chaque rendu.
  var IMGMAP={
    "29amBkkRhwTMnqGwWbRkfjBNCI":"story-hero.jpg",   // hero — studio web
    "UnG0EgNqdGV1v1hATRNpeUNtE":"story-about-lg.jpg", // About section (large)
    "xmKml0E7v2iBI4zbbj0yVccaQwg":"story-about-sq.jpg", // About section (carré)
    "svW242XTP0J6OQ4zk9XflnjqxRQ":"story-1.jpg",     // chronologie 1
    "wOCTh6BhMTLrGPZ7C8doO3XdY":"story-2.jpg",       // chronologie 2
    "Ov53jG8lAoAFuct0Li7vWgmOqQ":"story-3.jpg",      // chronologie 3
    "RPxWdsXRtMBhMcTCb414zGg2QY":"story-4.jpg",      // chronologie 4
    "fnlUqn2nbXPRmja93vjuaHzY":"story-5.jpg",        // chronologie 5
    "sO8Qc7EI5ijTzk0bY8jBsX1qYew":"amine-contact.webp" // section Contact — photo d'Amine
  };
  // ⭐ Chronologie « À propos » (dates + textes) — NOTRE parcours réel, AUTO-RÉPARANT.
  //    React reconstruit ces textes au scroll / à la navigation client-side (bien après
  //    l'arrêt de apply()) -> « Novembre 2024 » revenait. fixText() est rappelé en continu.
  var AB={
    "Janvier 2019":"2017","Juillet 2020":"2018 – 2021","Mai 2021":"2022 – 2024",
    "Février 2023":"2025","Novembre 2024":"Aujourd'hui",
    "Création de DentWebPro Studio":"Mes débuts dans le web",
    "Fondé avec l'ambition de transformer la présence en ligne des cabinets dentaires grâce à des sites web innovants.":
      "Depuis 2017, je conçois des sites de vente en ligne — comme gsmak.com — pour des produits électroniques.",
    "Lancement des services d'identité de marque":"Des sites pour les entreprises",
    "Élargissement de notre offre à des solutions complètes d'identité de marque, pour aider les cabinets à se démarquer.":
      "Création de sites web pour des entreprises et des commerces, dans des secteurs variés.",
    "Développement web avancé":"Montée en compétences",
    "Renforcement de nos compétences en développement web pour livrer des sites dynamiques et parfaitement responsives.":
      "Design, développement et référencement : des sites professionnels, rapides et faits sur mesure.",
    "Extension au marketing digital":"Naissance de DentWebPro",
    "Développement de notre expertise en marketing digital pour accroître la visibilité et l'engagement en ligne de nos clients.":
      "En 2025, l'idée d'un studio entièrement dédié aux sites web pour cabinets dentaires voit le jour.",
    "Plus de 500 projets réussis":"DentWebPro aujourd'hui",
    "Plus de 500 projets menés à bien, témoignant de notre exigence et de la satisfaction de nos clients.":
      "L'idée concrétisée : premiers sites livrés — Éclat, Oléa, Novéo, Zenta — et en pleine croissance."
  };
  function fixText(){
    document.querySelectorAll('p,h2,h3,h4,h5,h6,span,div,li').forEach(function(el){
      if(el.getAttribute("data-abt")==="1") return;
      var t=(el.textContent||"").replace(/\s+/g," ").trim();
      if(AB[t]===undefined) return;
      var childMatch=false;
      for(var i=0;i<el.children.length;i++){ if((el.children[i].textContent||"").replace(/\s+/g," ").trim()===t){ childMatch=true; break; } }
      if(childMatch) return;               // laisser l'enfant le plus profond gérer
      abSetText(el, AB[t]); el.setAttribute("data-abt","1");
    });
  }

  function fixImgs(){
    document.querySelectorAll("img").forEach(function(im){
      var s=(im.getAttribute("src")||"")+" "+(im.getAttribute("srcset")||"");
      for(var k in IMGMAP){ if(s.indexOf(k)>=0){
        var nu=BASE+"/assets/realisations/"+IMGMAP[k];
        if(im.getAttribute("src")!==nu){ im.setAttribute("src",nu); im.removeAttribute("srcset"); im.removeAttribute("sizes"); }
        break; } }
    });
  }

  function apply(){
    // 0) forcer le logo DentWebPro. Sur mobile (<=810px) : version HORIZONTALE
    //    (le logo vertical se retrouve écrasé/minuscule dans la barre du header).
    var mobileLogo = window.innerWidth <= 810;
    var fresh = BASE + (mobileLogo ? "/assets/dwp-brand-horizontal.svg" : "/assets/dwp-brand-vertical.svg");
    // conteneur du logo : boîte horizontale sur mobile, réglages Framer d'origine sinon
    document.querySelectorAll('[data-framer-name="Brand"] a, [data-framer-name="Logo / Vertical"]').forEach(function(a){
      if(mobileLogo){ a.style.width="154px"; a.style.height="32px"; a.style.aspectRatio="auto"; a.style.flex="0 0 auto"; }
      else { a.style.width=""; a.style.height=""; a.style.aspectRatio=""; a.style.flex=""; }
    });
    document.querySelectorAll('[data-framer-name="Brand"]').forEach(function(b){
      if(mobileLogo){ b.style.width="auto"; b.style.minWidth="154px"; } else { b.style.width=""; b.style.minWidth=""; }
    });
    document.querySelectorAll('[data-framer-name="Brand"] img, [data-framer-name*="Logo"] img').forEach(function(img){
      if(img.getAttribute("src")!==fresh) img.setAttribute("src", fresh);
      if(mobileLogo){ img.style.objectFit="contain"; img.style.objectPosition="left center"; img.style.maxWidth="none"; }
      else { img.style.objectPosition=""; img.style.maxWidth=""; }
    });
    // logo du pied de page (« Footer / Top ») : version horizontale DentWebPro
    // (le calque ne contient pas « Logo »/« Brand » => non couvert ci-dessus ; c'était
    //  le logo « BrightEdge » du thème resté visible dans le footer).
    document.querySelectorAll('[data-framer-name="Footer / Top"] img').forEach(function(img){
      var fh=BASE+"/assets/dwp-brand-horizontal-white.svg";
      if(img.getAttribute("src")!==fh) img.setAttribute("src", fh);
      img.style.objectFit="contain"; img.style.objectPosition="left center";
    });
    // 1) retirer réseaux Facebook + Instagram + X/Twitter
    document.querySelectorAll('a[href*="facebook.com"],a[href*="instagram.com"],a[href*="twitter.com"],a[href*="//x.com"],a[href*="behance.net"]').forEach(function(a){
      var w=a.closest('[data-framer-name="Icon Wrap"]')||a; w.style.display="none";
    });
    // 1b) hero : remplacer les avatars de l'ancienne équipe + pointer le bouton vers la nouvelle équipe
    var TP=[BASE+"/assets/team/kader.webp",BASE+"/assets/team/amine.webp",BASE+"/assets/team/yanis.webp"];
    var avatars=document.querySelectorAll('[data-framer-name^="Avatar-"] img, [data-framer-name^="Avatar-"]>div>img');
    // 3 membres seulement : remplir les 3 premiers, masquer les avatars en trop
    // (le thème en avait 4 -> le 4e reprenait la photo de Kader = doublon).
    avatars.forEach(function(img,i){
      if(i<TP.length){ img.setAttribute("src", TP[i]); }
      else { var av=img.closest('[data-framer-name^="Avatar-"]'); (av||img).style.display="none"; }
    });
    document.querySelectorAll('[data-framer-name="Arrow Button"]').forEach(function(a){ a.style.cursor="pointer"; });
    // 1c) retirer le crédit auteur du thème (« Créé par … » + logo oldshen) et le badge « acheter ce template »
    document.querySelectorAll('a[href*="lemonsqueezy.com"]').forEach(function(a){
      a.style.display="none"; if(a.parentElement) a.parentElement.style.display="none";
    });
    document.querySelectorAll('a[href*="ShenDuncan"]').forEach(function(a){
      var p=a;
      for(var k=0;k<7&&p;k++){ p=p.parentElement; if(p&&p.querySelector('img[src*="ZdGiQIvKJf4"]')){ p.style.display="none"; return; } }
      a.style.display="none";
    });
    // 2) retirer liens nav "Blog"/"Tarifs" ; repointer "Réalisations" vers la galerie
    document.querySelectorAll('nav a, header a, footer a, [data-framer-name*="Nav"] a, [data-framer-name*="Footer"] a').forEach(function(a){
      var t=(a.textContent||"").trim();
      if(t==="Blog"){ a.style.display="none"; }
      if(t==="Tarifs"){ a.style.display=""; a.setAttribute("href", BASE+"/#dwp-tarifs"); }
      if(t==="Réalisations"){ a.setAttribute("href", BASE+"/#dwp-gallery"); }
    });
    // 2b) TOUT lien vers la page "projects" (réalisations fictives du thème : VistaHaven,
    //     Kindred Space, Glow Theory…) -> notre galerie de sites.
    document.querySelectorAll('a[href]').forEach(function(a){
      var h=a.getAttribute("href")||"";
      if(/\/projects(\/|$|#|\?)/.test(h) && h.indexOf("#dwp-gallery")<0){
        a.setAttribute("href", BASE+"/#dwp-gallery");
        if(!a.__dwpProj){ a.__dwpProj=1; a.addEventListener("click",function(e){
          e.preventDefault(); e.stopPropagation();
          var g=document.getElementById("dwp-gallery");
          if(g){ g.scrollIntoView({behavior:"smooth"}); } else { location.href=BASE+"/#dwp-gallery"; }
        },true); }
      }
    });
    // CSS robuste : masquer l'équipe fictive + fausses récompenses du thème (survit au re-render)
    if(!document.getElementById("dwp-hide-css")){
      var hc=document.createElement("style"); hc.id="dwp-hide-css";
      hc.textContent='[data-framer-name="Team Section"]{display:none !important}[data-framer-name="Awards Section"]{display:none !important}'
        // masquer le bloc de chiffres fictifs (10 ans / 500 sites / 140 cabinets / 98%)
        +'[data-framer-name="About Achieve Numbers"]{display:none !important}'
        // logo « réseau/pixels » à variantes de couleur fixes : version encre dans
        // l'en-tête (fond clair) via dwp-brand-vertical/horizontal.svg, version blanche
        // dans le footer (fond foncé) via dwp-brand-horizontal-white.svg. Plus de
        // mix-blend-difference : l'accent corail resterait corail (sinon viré cyan sur clair).
        // animation d'apparition des cartes du portfolio (image qui se révèle en zoom)
        +'#dwp-gallery .dwp-cardlink{opacity:0;transform:translateY(32px);transition:opacity .7s cubic-bezier(.2,.7,.2,1),transform .7s cubic-bezier(.2,.7,.2,1)}'
        +'#dwp-gallery .dwp-cardlink.dwp-in{opacity:1;transform:none}'
        +'#dwp-gallery .dwp-card-shot{overflow:hidden}'
        +'#dwp-gallery .dwp-card-shot img,#dwp-gallery .dwp-card-shot video{transform:scale(1.14);transition:transform 1.15s cubic-bezier(.2,.7,.2,1)}'
        +'#dwp-gallery .dwp-cardlink.dwp-in .dwp-card-shot img,#dwp-gallery .dwp-cardlink.dwp-in .dwp-card-shot video{transform:scale(1)}'
        +'@media (prefers-reduced-motion:reduce){#dwp-gallery .dwp-cardlink,#dwp-gallery .dwp-card-shot img,#dwp-gallery .dwp-card-shot video{opacity:1;transform:none;transition:none}}';
      (document.head||document.documentElement).appendChild(hc);
    }
    // 3) galerie — accueil uniquement (page possédant la "Project Section")
    var main=document.querySelector('main[data-framer-name="Main"]');
    var isHome=main && main.querySelector('[data-framer-name="Project Section"]');
    if(isHome && !document.getElementById("dwp-gallery")){
      var svc=main.querySelector('[data-framer-name="Service Section"]');
      var gal=buildGallery();
      if(svc){ main.insertBefore(gal, svc); } else { main.insertBefore(gal, main.children[1]||null); }
    }
    // sections DentWebPro (accueil uniquement), dans l'ordre, juste après la galerie :
    // Comment ça marche → Tarifs (3 formules) → Garanties → FAQ
    if(isHome){
      var anchor=document.getElementById("dwp-gallery");
      [["dwp-steps",buildSteps],["dwp-tarifs",buildTarifs],["dwp-garanties",buildGaranties],["dwp-faq",buildFaq]].forEach(function(pair){
        var ex=document.getElementById(pair[0]);
        if(ex){ anchor=ex; return; }
        var node=pair[1]();
        if(anchor && anchor.parentNode){ anchor.parentNode.insertBefore(node, anchor.nextSibling); }
        else if(main){ main.insertBefore(node, main.children[2]||null); }
        anchor=node;
      });
    }
    addWhatsApp();
    wireVideos();
    revealCards();
    // 4) équipe DentWebPro sur TOUTE page ayant une "Team Section" (accueil ET À propos).
    //    Masque l'équipe fictive du thème + les fausses récompenses (BrightEdge).
    if(main){
      var teamSec=main.querySelector('[data-framer-name="Team Section"]');
      if(teamSec){
        if(!document.getElementById("dwp-team")) main.insertBefore(buildTeam(), teamSec);
        teamSec.style.display="none";
      }
      var awardsSec=main.querySelector('[data-framer-name="Awards Section"]');
      if(awardsSec) awardsSec.style.display="none";
    }
    // 4c/4d) À propos — chronologie (textes) + photos = NOTRE parcours, auto-réparant.
    fixText();
    fixImgs();
    // 5) retirer le crédit auteur du thème « Créé par Duncan Shen »
    document.querySelectorAll('footer *, [data-framer-name*="Footer"] *').forEach(function(el){
      if(el.children.length) return;
      var t=(el.textContent||'').replace(/\s+/g,' ').trim();
      if(/Cr[ée]{2}\s+par\s+Duncan\s+Shen|Duncan\s+Shen|Made by\b/i.test(t)){
        (el.closest('div')||el).style.display="none"; el.style.display="none";
      }
    });
    // 6) carte du pied de page : forcer l'adresse Créteil (le CMS du thème
    //    reconstruit l'iframe avec une adresse US -> on impose la bonne).
    var MAP="https://maps.google.com/maps?q=4+Avenue+du+Mar%C3%A9chal+de+Lattre+de+Tassigny,+94000+Cr%C3%A9teil,+France&z=15&output=embed";
    document.querySelectorAll('iframe[src*="maps.google"],iframe[src*="google.com/maps"]').forEach(function(f){
      if(f.getAttribute("src")!==MAP) f.setAttribute("src", MAP);
    });
  }

  // message de retour du formulaire de contact studio
  function studioMsg(f,ok){
    var b=f.parentNode&&f.parentNode.querySelector('.dwp-cmsg');
    if(!b){ b=document.createElement('div'); b.className='dwp-cmsg'; if(f.parentNode) f.parentNode.appendChild(b); }
    b.style.cssText='margin-top:14px;padding:13px 16px;border-radius:10px;font-weight:600;font-family:inherit;'+(ok?'background:#e7f6ec;color:#137a3a':'background:#fdecea;color:#b3261e');
    b.textContent=ok?'Merci ! Votre message a bien été envoyé — nous vous recontactons vite.':'Une erreur est survenue. Réessayez ou écrivez à contact@dentwebpro.site.';
    if(ok){ try{ f.reset(); }catch(_){ } }
  }

  function boot(){
    // formulaire de contact du studio : le <form> Framer natif échoue en statique
    // -> on intercepte l'envoi (phase capture) et on poste vers send.php.
    document.addEventListener('submit',function(e){
      var f=e.target; if(!f||!f.querySelector) return;
      if(!(f.querySelector('input[name="Name"]') && f.querySelector('select[name="Service"]'))) return;
      e.preventDefault(); e.stopImmediatePropagation();
      var v=function(s){ var el=f.querySelector(s); return el?el.value:''; };
      var data={ site:'studio', _subject:'Nouveau message — Contact DentWebPro',
        'Nom':v('[name="Name"]'), 'E-mail':v('[name="Email"]'),
        'Service':v('[name="Service"]'), 'Message':v('[name="Text Area"]') };
      fetch('https://dentwebpro.site/send.php',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(data)})
        .then(function(r){return r.json();}).then(function(j){ studioMsg(f,j&&j.success); }).catch(function(){ studioMsg(f,false); });
    },true);

    apply();
    [200,400,800,1200,2000,2800,4000,6000].forEach(function(t){ setTimeout(apply,t); });
    // arrivée sur l'accueil avec un hash de section injectée (#dwp-gallery / #dwp-tarifs …)
    // depuis une autre page : descendre une fois la section injectée (scroll natif échoue
    // car ces sections sont ajoutées après l'hydratation).
    if(/^#dwp-(gallery|tarifs|steps|faq)$/.test(location.hash)){
      var hid=location.hash.slice(1);
      var gk=0, giv=setInterval(function(){ var g=document.getElementById(hid);
        if(g){ g.scrollIntoView({behavior:"smooth"}); clearInterval(giv); } if(++gk>30) clearInterval(giv); }, 300);
    }
    // maintien du logo/avatars pendant que Framer s'hydrate
    var n=0, iv=setInterval(function(){ apply(); if(++n>20) clearInterval(iv); }, 500);
    // ouverture fiable des cartes (contourne le routeur Framer)
    document.addEventListener("click",function(e){
      if(!e.target.closest) return;
      // ⭐ « Réalisations » : Framer vide le href et son routeur va vers /projects (thème).
      //    On intercepte AVANT le routeur (phase capture) -> ferme le menu + galerie.
      var rl=e.target.closest('a,[role="link"]');
      if(rl){
        var rt=(rl.textContent||'').replace(/[↗→»«]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
        while(rt.length>1 && rt.length%2===0 && rt.slice(0,rt.length/2)===rt.slice(rt.length/2)) rt=rt.slice(0,rt.length/2);
        if(/^r[ée]alisation/.test(rt)){
          e.preventDefault(); e.stopImmediatePropagation();
          // fermer le menu mobile : le toggle est en haut-gauche (son data-framer-name
          // change entre "Variant 1"/"Variant 2" à l'ouverture -> on le cible par position).
          var tog=document.querySelector('[data-framer-name="Variant 1"],[data-framer-name="Variant 2"]');
          if(!tog){ tog=[].slice.call(document.querySelectorAll('[data-framer-name],button,[role="button"]')).filter(function(el){
            var r=el.getBoundingClientRect(); return r.top<110&&r.left<120&&r.width>20&&r.width<90&&r.height>20&&r.height<90; })[0]; }
          if(tog){ try{ tog.click(); }catch(_){ } }
          var gg=document.getElementById("dwp-gallery");
          if(gg){ setTimeout(function(){ gg.scrollIntoView({behavior:"smooth"}); }, 340); }
          else { window.location.assign(BASE+"/#dwp-gallery"); }
          return;
        }
        // « Tarifs » : afficher la section des formules (accueil) ou y naviguer.
        if(rt==="tarifs"){
          e.preventDefault(); e.stopImmediatePropagation();
          var tog2=document.querySelector('[data-framer-name="Variant 1"],[data-framer-name="Variant 2"]');
          if(tog2){ try{ tog2.click(); }catch(_){ } }
          var tt=document.getElementById("dwp-tarifs");
          if(tt){ setTimeout(function(){ tt.scrollIntoView({behavior:"smooth"}); }, 340); }
          else { window.location.assign(BASE+"/#dwp-tarifs"); }
          return;
        }
      }
      var a=e.target.closest("[data-dwp-site]");
      if(a){ e.preventDefault(); e.stopPropagation(); var u=a.getAttribute("data-dwp-site");
        if(a.getAttribute("data-dwp-ext")){ window.open(u,"_blank","noopener"); } else { window.location.href=u; } return; }
      var arrow=e.target.closest('[data-framer-name="Arrow Button"]');
      var team=document.getElementById("dwp-team");
      if(arrow && team){ e.preventDefault(); e.stopPropagation(); team.scrollIntoView({behavior:"smooth"}); }
    },true);
    // garde : ré-applique si Framer ré-hydrate
    var main=document.querySelector('main[data-framer-name="Main"]')||document.body;
    var obs=new MutationObserver(function(){
      if(!document.getElementById("dwp-gallery")||!document.getElementById("dwp-team")||!document.getElementById("dwp-tarifs")||!document.getElementById("dwp-faq")||!document.getElementById("dwp-wa")) apply();
    });
    try{ obs.observe(main,{childList:true}); }catch(e){}
    // ⭐ garde PERMANENTE des photos « À propos » : React reconstruit ces <img> au
    //    scroll (bien après l'arrêt de apply()) -> on ré-applique fixImgs() à chaque
    //    changement de src/srcset (observer) + filet interval léger. Le guard interne
    //    (ne réécrit que si différent) évite toute boucle.
    var fixT=null;
    function healNow(){ fixT=null; fixImgs(); fixText(); }
    var imgObs=new MutationObserver(function(){ if(fixT) return; fixT=setTimeout(healNow,80); });
    try{ imgObs.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["src","srcset"]}); }catch(e){}
    setInterval(function(){ fixImgs(); fixText(); },1000);
    // ré-appliquer au redimensionnement/rotation (bascule logo vertical <-> horizontal)
    var rt=null; window.addEventListener("resize",function(){ if(rt) clearTimeout(rt); rt=setTimeout(apply,150); });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
