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

  function buildGallery(){
    var sec=document.createElement("section");
    sec.id="dwp-gallery"; sec.setAttribute("data-dwp","1");
    var cards=CLINICS.map(function(c){
      var url=BASE+'/realisations/'+c.slug+'/index.html';
      return '<div class="dwp-cardlink" role="link" tabindex="0" data-dwp-site="'+url+'">'+
        '<div class="dwp-card-shot"><img src="'+BASE+'/assets/realisations/'+c.slug+'.webp" alt="Aperçu du site '+c.name+'" loading="lazy"></div>'+
        '<div class="dwp-card-meta"><h3>'+c.name+'</h3><span class="dwp-card-city">'+c.city+'</span></div>'+
        '<span class="dwp-card-cat">Cabinet dentaire · '+c.city+'</span>'+
        '</div>';
    }).join("");
    sec.innerHTML='<div class="dwp-wrap">'+
      '<span class="dwp-eyebrow2">{ Nos modèles }</span>'+
      '<h2>Choisissez le site de votre cabinet</h2>'+
      '<p class="dwp-sub">Des sites prêts à l\'emploi, conçus pour les cabinets dentaires. Cliquez sur un modèle pour le découvrir en détail.</p>'+
      '<div class="dwp-grid">'+cards+'</div></div>';
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
    // 0) forcer le logo DentWebPro via une URL fraîche (contourne le cache navigateur)
    document.querySelectorAll('[data-framer-name="Brand"] img, [data-framer-name*="Logo"] img').forEach(function(img){
      var fresh=BASE+"/assets/dwp-brand-vertical.svg";
      if(img.getAttribute("src")!==fresh) img.setAttribute("src", fresh);
    });
    // 1) retirer réseaux Facebook + Instagram + X/Twitter
    document.querySelectorAll('a[href*="facebook.com"],a[href*="instagram.com"],a[href*="twitter.com"],a[href*="//x.com"]').forEach(function(a){
      var w=a.closest('[data-framer-name="Icon Wrap"]')||a; w.style.display="none";
    });
    // 1b) hero : remplacer les avatars de l'ancienne équipe + pointer le bouton vers la nouvelle équipe
    var TP=[BASE+"/assets/team/kader.webp",BASE+"/assets/team/amine.webp",BASE+"/assets/team/yanis.webp"];
    var avatars=document.querySelectorAll('[data-framer-name^="Avatar-"] img, [data-framer-name^="Avatar-"]>div>img');
    avatars.forEach(function(img,i){ img.setAttribute("src", TP[i%TP.length]); });
    document.querySelectorAll('[data-framer-name="Arrow Button"]').forEach(function(a){ a.style.cursor="pointer"; });
    // 2) retirer liens nav "Blog"/"Tarifs" ; repointer "Réalisations" vers la galerie
    document.querySelectorAll('nav a, header a, footer a, [data-framer-name*="Nav"] a, [data-framer-name*="Footer"] a').forEach(function(a){
      var t=(a.textContent||"").trim();
      if(t==="Blog"||t==="Tarifs"){ a.style.display="none"; }
      if(t==="Réalisations"){ a.setAttribute("href", BASE+"/#dwp-gallery"); }
    });
    // 3) galerie — accueil uniquement (page possédant la "Project Section")
    var main=document.querySelector('main[data-framer-name="Main"]');
    var isHome=main && main.querySelector('[data-framer-name="Project Section"]');
    if(isHome && !document.getElementById("dwp-gallery")){
      var svc=main.querySelector('[data-framer-name="Service Section"]');
      var gal=buildGallery();
      if(svc){ main.insertBefore(gal, svc); } else { main.insertBefore(gal, main.children[1]||null); }
    }
    // 4) équipe personnalisée (accueil uniquement)
    if(isHome && !document.getElementById("dwp-team")){
      var teamSec=main.querySelector('[data-framer-name="Team Section"]');
      if(teamSec){ main.insertBefore(buildTeam(), teamSec); }
    }
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
      if(a){ e.preventDefault(); e.stopPropagation(); window.location.href=a.getAttribute("data-dwp-site"); return; }
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
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
