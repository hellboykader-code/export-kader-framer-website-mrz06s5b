/* DentWebPro — injection de la galerie « Choisissez le site de votre cabinet »
   + nettoyage nav/réseaux, exécuté après l'hydratation Framer. */
(function(){
  var BASE="/export-kader-framer-website-mrz06s5b";
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

  var TEAM=[
    {slug:"kader",name:"Kader",role:"Fondateur · Designer & Développeur"},
    {slug:"amine",name:"Amine",role:"Relations & Marketing"},
    {slug:"yanis",name:"Yanis",role:"Marketeur"}
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
      var fh=BASE+"/assets/dwp-brand-horizontal.svg";
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
      if(t==="Blog"||t==="Tarifs"){ a.style.display="none"; }
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
        // logo blanc + mix-blend-difference => visible sur TOUT fond (clair OU foncé),
        // auto-contrasté (noir sur clair, blanc sur foncé). Résout header/vertical/footer.
        +'[data-framer-name="Brand"] img,[data-framer-name="Logo / Vertical"] img,[data-framer-name="Footer / Top"] img{mix-blend-mode:difference}'
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
    // 4c) À propos — remplacer la chronologie fictive du thème (dates 2019→2024,
    //     « 500 projets ») par NOTRE parcours réel (studio récent : Éclat, Oléa…).
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
    document.querySelectorAll('p,h2,h3,h4,h5,h6,span,div,li').forEach(function(el){
      if(el.getAttribute("data-abt")==="1") return;
      var t=(el.textContent||"").replace(/\s+/g," ").trim();
      if(AB[t]===undefined) return;
      var childMatch=false;
      for(var i=0;i<el.children.length;i++){ if((el.children[i].textContent||"").replace(/\s+/g," ").trim()===t){ childMatch=true; break; } }
      if(childMatch) return;               // laisser l'enfant le plus profond gérer
      abSetText(el, AB[t]); el.setAttribute("data-abt","1");
    });
    // 4d) À propos — remplacer les photos stock du thème par NOS réalisations
    //     (hero + section + chronologie = les vrais sites que nous avons conçus).
    var IMGMAP={
      "29amBkkRhwTMnqGwWbRkfjBNCI":"eclat.jpg",        // hero
      "UnG0EgNqdGV1v1hATRNpeUNtE":"olea-poster.jpg",   // About section (large)
      "xmKml0E7v2iBI4zbbj0yVccaQwg":"reddent.jpg",     // About section (carré)
      "svW242XTP0J6OQ4zk9XflnjqxRQ":"eclat.jpg",       // chronologie 1
      "wOCTh6BhMTLrGPZ7C8doO3XdY":"dentitive.jpg",     // chronologie 2
      "Ov53jG8lAoAFuct0Li7vWgmOqQ":"olea-poster.jpg",  // chronologie 3 (cabinets en ligne)
      "RPxWdsXRtMBhMcTCb414zGg2QY":"noveo-poster.jpg", // chronologie 4
      "fnlUqn2nbXPRmja93vjuaHzY":"zenta-poster.jpg"    // chronologie 5
    };
    document.querySelectorAll("img").forEach(function(im){
      var s=im.getAttribute("src")||"";
      for(var k in IMGMAP){ if(s.indexOf(k)>=0){
        var nu=BASE+"/assets/realisations/"+IMGMAP[k];
        if(im.getAttribute("src")!==nu){ im.setAttribute("src",nu); im.removeAttribute("srcset"); im.removeAttribute("sizes"); }
        break; } }
    });
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

  function boot(){
    apply();
    [200,400,800,1200,2000,2800,4000,6000].forEach(function(t){ setTimeout(apply,t); });
    // arrivée sur l'accueil avec #dwp-gallery (depuis une autre page) : descendre vers
    // la galerie une fois injectée (le scroll natif échoue car la galerie est injectée après).
    if(location.hash==="#dwp-gallery"){
      var gk=0, giv=setInterval(function(){ var g=document.getElementById("dwp-gallery");
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
      if(!document.getElementById("dwp-gallery")||!document.getElementById("dwp-team")) apply();
    });
    try{ obs.observe(main,{childList:true}); }catch(e){}
    // ré-appliquer au redimensionnement/rotation (bascule logo vertical <-> horizontal)
    var rt=null; window.addEventListener("resize",function(){ if(rt) clearTimeout(rt); rt=setTimeout(apply,150); });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
