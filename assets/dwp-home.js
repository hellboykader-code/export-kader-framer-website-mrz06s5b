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
    {name:"Oléa",  city:"Marseille", url:"/olea/",  vid:"olea",  brand:"#0d1b15", accent:"#d1fc71"},
    {name:"Novéo", city:"Lyon",      url:"/noveo/",  vid:"noveo", brand:"#33231a", accent:"#e8853b"},
    {name:"Zenta", city:"Paris",     url:"/zenta/", vid:"zenta", brand:"#2f2e5c", accent:"#b9b7f0"}
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
    } else {
      shot='<div class="dwp-card-shot dwp-live-shot">'+
        '<span class="dwp-live-badge"><i></i>En ligne</span>'+
        '<span class="dwp-live-name">'+c.name+'</span>'+
        '<span class="dwp-live-tag">Cabinet dentaire · '+c.city+'</span>'+
        '<span class="dwp-live-cta">Voir le site en direct →</span>'+
        '</div>';
    }
    return '<div class="dwp-cardlink dwp-live-card'+(c.vid?' dwp-vid-card':'')+'" role="link" tabindex="0" data-dwp-site="'+c.url+'" style="--brand:'+c.brand+';--accent:'+c.accent+'">'+
      shot+
      '<div class="dwp-card-meta"><h3>'+c.name+'</h3><span class="dwp-card-city">'+c.city+'</span></div>'+
      '<span class="dwp-card-cat">Site livré · en ligne</span>'+
      '</div>';
  }
  // lecture automatique en boucle (relance si le navigateur met l'autoplay en pause)
  function wireVideos(){
    document.querySelectorAll('.dwp-vid-card video').forEach(function(v){
      if(v.getAttribute('data-vwired')) return;
      v.setAttribute('data-vwired','1');
      v.muted=true;
      var play=function(){ var pr=v.play(); if(pr&&pr.catch) pr.catch(function(){}); };
      play(); v.addEventListener('canplay',play); v.addEventListener('loadeddata',play);
    });
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
    // 1) retirer réseaux Facebook + Instagram + X/Twitter
    document.querySelectorAll('a[href*="facebook.com"],a[href*="instagram.com"],a[href*="twitter.com"],a[href*="//x.com"],a[href*="behance.net"]').forEach(function(a){
      var w=a.closest('[data-framer-name="Icon Wrap"]')||a; w.style.display="none";
    });
    // 1b) hero : remplacer les avatars de l'ancienne équipe + pointer le bouton vers la nouvelle équipe
    var TP=[BASE+"/assets/team/kader.webp",BASE+"/assets/team/amine.webp",BASE+"/assets/team/yanis.webp"];
    var avatars=document.querySelectorAll('[data-framer-name^="Avatar-"] img, [data-framer-name^="Avatar-"]>div>img');
    avatars.forEach(function(img,i){ img.setAttribute("src", TP[i%TP.length]); });
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
    // 2b) TOUT lien vers la page "projects" (réalisations du thème : VistaHaven,
    //     Kindred Space, Glow Theory…) -> notre galerie de sites. Évite d'afficher
    //     des réalisations qui ne sont pas les nôtres.
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
      hc.textContent='[data-framer-name="Team Section"]{display:none !important}[data-framer-name="Awards Section"]{display:none !important}';
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
    // 4) équipe DentWebPro (Kader/Amine/Yanis) sur TOUTE page ayant une "Team Section"
    //    (accueil ET À propos). On masque l'équipe fictive du thème + les fausses
    //    récompenses (Awwwards…), vestiges du modèle « BrightEdge ».
    if(main){
      var teamSec=main.querySelector('[data-framer-name="Team Section"]');
      if(teamSec){
        if(!document.getElementById("dwp-team")) main.insertBefore(buildTeam(), teamSec);
        teamSec.style.display="none";
      }
      var awardsSec=main.querySelector('[data-framer-name="Awards Section"]');
      if(awardsSec) awardsSec.style.display="none";
    }
    // 5) retirer le crédit auteur du thème « Créé par Duncan Shen » (texte brut)
    document.querySelectorAll('footer *, [data-framer-name*="Footer"] *').forEach(function(el){
      if(el.children.length) return;
      var t=(el.textContent||'').replace(/\s+/g,' ').trim();
      if(/Cr[ée]{2}\s+par\s+Duncan\s+Shen|Duncan\s+Shen|Made by\b/i.test(t)){
        (el.closest('div')||el).style.display="none"; el.style.display="none";
      }
    });
  }

  function boot(){
    apply();
    [200,400,800,1200,2000,2800,4000,6000].forEach(function(t){ setTimeout(apply,t); });
    // maintien du logo/avatars pendant que Framer s'hydrate
    var n=0, iv=setInterval(function(){ apply(); if(++n>20) clearInterval(iv); }, 500);
    // ouverture fiable des cartes (contourne le routeur Framer)
    document.addEventListener("click",function(e){
      if(!e.target.closest) return;
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
