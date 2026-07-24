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
      return '<a class="dwp-cardlink" href="'+BASE+'/portfolio/'+c.slug+'.html">'+
        '<div class="dwp-card-shot"><img src="'+BASE+'/assets/realisations/'+c.slug+'.webp" alt="Aperçu du site '+c.name+'" loading="lazy"></div>'+
        '<div class="dwp-card-meta"><h3>'+c.name+'</h3><span class="dwp-card-city">'+c.city+'</span></div>'+
        '<span class="dwp-card-cat">Cabinet dentaire · '+c.city+'</span>'+
        '</a>';
    }).join("");
    sec.innerHTML='<div class="dwp-wrap">'+
      '<span class="dwp-eyebrow2">{ Nos modèles }</span>'+
      '<h2>Choisissez le site de votre cabinet</h2>'+
      '<p class="dwp-sub">Des sites prêts à l\'emploi, conçus pour les cabinets dentaires. Cliquez sur un modèle pour le découvrir en détail.</p>'+
      '<div class="dwp-grid">'+cards+'</div></div>';
    return sec;
  }

  function apply(){
    // 1) retirer réseaux Facebook + Instagram
    document.querySelectorAll('a[href="https://www.facebook.com/"],a[href="https://www.instagram.com/"]').forEach(function(a){
      var w=a.closest('[data-framer-name="Icon Wrap"]')||a; w.style.display="none";
    });
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
  }

  function boot(){
    apply();
    setTimeout(apply,400); setTimeout(apply,1200); setTimeout(apply,2500);
    // garde : ré-applique si Framer ré-hydrate
    var main=document.querySelector('main[data-framer-name="Main"]')||document.body;
    var obs=new MutationObserver(function(){ 
      if(!document.getElementById("dwp-gallery")) apply();
    });
    try{ obs.observe(main,{childList:true}); }catch(e){}
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
