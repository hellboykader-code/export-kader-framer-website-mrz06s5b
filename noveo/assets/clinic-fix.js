/* Novéo — retire les avis/témoignages patients + liens secondaires, après hydratation Framer. */
(function(){
  var KILLNAME=/Review|Testimonial|Smile Journey|Care Journey|Smile Experience|4,920/i;
  var QUOTE=/[“"«][^]{60,}/;                 // longue citation
  var TESTI=/(transformed|makeover|life-changing|smile looks|caring, skilled|stress-free|made me feel|exceeded my expectations|insecure about my teeth|grateful for the gentle)/i;
  function main(){ return document.querySelector('main[data-framer-root]')||document.querySelector('main'); }
  function topOfMain(el){
    var m=main();
    if(!m) return el;
    var p=el;
    while(p && p.parentElement && p.parentElement!==m) p=p.parentElement;
    return (p && p.parentElement===m)?p:null;
  }
  function hide(el){ if(el){ el.style.display='none'; } }
  // « rolling text » (titres animés lettre par lettre) : clé = texte sans espaces -> FR
  var ROLL={
    "AboutUs":"À propos","Appointment":"Rendez-vous","Appointments":"Rendez-vous",
    "BackHome":"Retour à l'accueil","BookAnAppointment":"Prendre rendez-vous",
    "BookYourDentalAppointmentToday":"Prenez rendez-vous dès aujourd'hui",
    "Call(+1)3105552847":"Appeler le 04 78 92 14 60","Call0478921460":"Appeler le 04 78 92 14 60",
    "(+1)3105552847":"04 78 92 14 60","+13105552847":"04 78 92 14 60","(483)356-0058":"04 78 92 14 60",
    "CavityFillings":"Obturations des caries","ClearAligners":"Gouttières transparentes",
    "ConfirmAppointment":"Confirmer le rendez-vous","Contact":"Contact",
    "CrownRestoration":"Restauration par couronne","DentalBonding":"Collage dentaire",
    "DentalCheckups":"Bilans dentaires","DentalImplants":"Implants dentaires",
    "FindaDentists":"Trouver un dentiste","FindaDentist":"Trouver un dentiste",
    "GumTreatment":"Traitement des gencives","InvisalignTreatment":"Traitement Invisalign",
    "Locations":"Nos adresses","MeetOurDentists":"Rencontrez nos dentistes",
    "Orthodontics":"Orthodontie","OurDentists":"Nos dentistes",
    "PediatricDentistry":"Dentisterie pédiatrique","PorcelainVeneers":"Facettes en céramique",
    "PrivacyPolicy":"Politique de confidentialité","RequestAppointment":"Demander un rendez-vous",
    "RootCanalTherapy":"Traitement de racine","SedationDentistry":"Sédation consciente",
    "Services":"Soins","SmileMakeovers":"Esthétique du sourire","TeethCleaning":"Détartrage",
    "TeethWhitening":"Blanchiment dentaire","TermsConditions":"Conditions générales",
    "GeneralDentistry":"Dentisterie générale","CosmeticDentistry":"Dentisterie esthétique",
    "EmergencyDentalCare":"Soins dentaires d'urgence","DentalVeneers":"Facettes dentaires",
    "AdvancedDentalCarePerfectSmiles":"Soins dentaires avancés, sourires parfaits",
    "About":"À propos","AboutUs":"À propos","Home":"Accueil","Team":"Équipe","Search":"Rechercher",
    "DentalTeam":"Équipe dentaire","OurServices":"Nos soins","ContactUs":"Contact"
  };
  // Textes CMS des soins rendus AVEC espaces (pas SplitText) -> match exact du textContent
  var PLAIN={
    "Dental Veneers":"Facettes dentaires","Pediatric Dentistry":"Dentisterie pédiatrique",
    "Orthodontics":"Orthodontie","Emergency Dental Care":"Soins dentaires d'urgence",
    "General Dentistry":"Dentisterie générale","Cosmetic Dentistry":"Dentisterie esthétique",
    "Teeth Whitening":"Blanchiment dentaire","Dental Implants":"Implants dentaires",
    "Root Canal Therapy":"Traitement de racine","Teeth Cleaning":"Détartrage",
    "Cavity Fillings":"Obturations des caries","Gum Treatment":"Traitement des gencives",
    "Safe and effective treatments designed to brighten stained or discolored teeth.":
      "Des traitements sûrs et efficaces pour éclaircir les dents tachées ou décolorées.",
    "Long-lasting tooth replacement solutions that restore function and appearance.":
      "Des solutions durables de remplacement dentaire qui restaurent la fonction et l'esthétique.",
    "Braces and clear aligners for correcting misaligned teeth and improving bite structure.":
      "Bagues et gouttières transparentes pour corriger les dents mal alignées et améliorer l'occlusion.",
    "Complete dental care for the whole family, from routine checkups to advanced treatments.":
      "Des soins dentaires complets pour toute la famille, du bilan de routine aux traitements avancés.",
    "Gentle, specialized dental care tailored to children of all ages.":
      "Des soins dentaires doux et spécialisés, adaptés aux enfants de tous âges.",
    "Immediate care for dental emergencies to relieve pain and prevent complications.":
      "Une prise en charge immédiate des urgences dentaires pour soulager la douleur et éviter les complications."
  };
  function fixPlain(){
    document.querySelectorAll('h1,h2,h3,h4,h5,p,span,a,li,div').forEach(function(el){
      if(el.children.length>0) return;
      if(el.getAttribute('data-frplain')==='1') return;
      var t=(el.textContent||'').replace(/\s+/g,' ').trim();
      var fr=PLAIN[t]; if(!fr) return;
      var w=function(n){for(var i=0;i<n.childNodes.length;i++){var c=n.childNodes[i];
        if(c.nodeType===3&&c.nodeValue&&c.nodeValue.trim()){c.nodeValue=fr;return true;}}return false;};
      if(!w(el)) el.textContent=fr;
      el.setAttribute('data-frplain','1');
    });
  }
  function fixRolling(){
    document.querySelectorAll('p,h1,h2,h3,h4').forEach(function(p){
      if(p.getAttribute('data-frfixed')==='1') return;
      var chars=[].filter.call(p.querySelectorAll('span'),function(s){return s.children.length===0 && (s.textContent||'').length===1;});
      if(chars.length<4) return;
      var txt=chars.map(function(s){return s.textContent;}).join('');
      var key=txt.replace(/\s+/g,'');
      while(key.length%2===0 && key.slice(0,key.length/2)===key.slice(key.length/2)) key=key.slice(0,key.length/2);
      var fr=ROLL[key];
      if(!fr) return;
      // préserver couleur + police de la lettre d'origine
      var cs=window.getComputedStyle(chars[0]);
      var sp=document.createElement('span');
      sp.textContent=fr;
      sp.style.color=cs.color; sp.style.fontFamily=cs.fontFamily; sp.style.fontSize=cs.fontSize;
      sp.style.fontWeight=cs.fontWeight; sp.style.letterSpacing=cs.letterSpacing; sp.style.whiteSpace='nowrap';
      p.innerHTML=''; p.appendChild(sp); p.setAttribute('data-frfixed','1');
    });
  }
  function isHero(s){
    if(!s) return false;
    var m=main();
    if(m && s===m.firstElementChild) return true;                 // 1re section (bannière) toujours protégée
    return (s.getAttribute&&s.getAttribute('data-framer-name')==='Hero') || !!s.querySelector('[data-framer-name="Hero"]');
  }
  function killSection(el){
    var s=topOfMain(el);
    // ne JAMAIS masquer la bannière : la pastille d'avis y est intégrée -> masquer seulement l'élément
    if(isHero(s)){ hide(el); return; }
    hide(s); hide(el);
  }
  var LOGO="/noveo/assets/framer/images/wY3EHmZVW2XGTOvsKjwf6dsdxN8.svg";
  function forceLogo(){
    document.querySelectorAll('[data-framer-name="Logo"] img,[data-framer-name*="Logo"] img,img[src*="wY3EHmZ"]').forEach(function(img){
      if(img.getAttribute('srcset')) img.removeAttribute('srcset');
      if((img.getAttribute('src')||'')!==LOGO) img.setAttribute('src',LOGO);
    });
    document.querySelectorAll('[data-framer-name="Logo"] source,source[srcset*="wY3EHmZ"]').forEach(function(s){ s.setAttribute('srcset',LOGO); });
  }
  // badges de confiance américains (Chamber of Commerce, Top Doctor, Neighborhood Favorite) -> retirer
  function killBadges(){
    ['OxKMPH3','SsS8ExF5','T9zGWjCk'].forEach(function(k){
      document.querySelectorAll('img[src*="'+k+'"]').forEach(function(im){
        var fig=im.closest('figure[data-framer-name="Image wrap"]')||im.closest('figure')||im.parentElement;
        if(fig){ fig.style.display='none'; }
      });
    });
  }
  function apply(){
    forceLogo();
    killBadges();
    // 1) sections/cartes de témoignage : nom = « Review/… », ou le nom EST la citation
    document.querySelectorAll('[data-framer-name]').forEach(function(el){
      var n=el.getAttribute('data-framer-name')||'';
      if(KILLNAME.test(n) || TESTI.test(n) || (/^[“"«]/.test(n) && n.length>50)){ killSection(el); }
    });
    // 2b) « rolling text » : le nom (FR) est bon mais le texte lettre-par-lettre est resté EN -> forcer le FR
    var SKIP=/^(Desktop|Container|Card|Wrapper|Content|Slider|Home \/|Link →|Heading|Menu|Nav|Icon|Image|Frame|Group|Stack|Section)/;
    var ENW=/\b(Book|Appointment|Dental|Smile|Today|Your|Care|Meet|Trusted|Welcome|Read More|Learn More|View All|Get In Touch|Why Choose|About Us|Our Dentists|Our Team)\b/i;
    document.querySelectorAll('[data-framer-name][data-framer-component-type="RichTextContainer"]').forEach(function(el){
      var n=(el.getAttribute('data-framer-name')||'').trim();
      if(n.length<6 || n.indexOf(' ')<0 || SKIP.test(n)) return;
      var cur=(el.textContent||'');
      if(cur.replace(/\s+/g,'')!==n.replace(/\s+/g,'') && ENW.test(cur)){ el.textContent=n; }
    });
    fixRolling();
    fixPlain();
    // 3) liens Blog / Legal / Reviews (nav + footer)
    document.querySelectorAll('a[href]').forEach(function(a){
      var h=a.getAttribute('href')||'';
      if(/\/blog|\/legal\/|\/reviews/.test(h)){ (a.closest('li')||a).style.display='none'; a.style.display='none'; }
    });
    // 4) badge « Made in Framer »
    document.querySelectorAll('a[href*="framer.com"]').forEach(function(a){ a.style.display='none'; });
  }
  var _t=null;
  function _schedule(){ if(_t) return; _t=setTimeout(function(){ _t=null; apply(); }, 180); }
  function boot(){ apply(); [300,800,1600,3000,5000].forEach(function(ms){setTimeout(apply,ms);});
    var obs=new MutationObserver(_schedule);
    try{ obs.observe(document.body,{childList:true,subtree:true}); }catch(e){}
    setTimeout(function(){ try{obs.disconnect();}catch(e){} }, 14000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();

/* ── city/RedDent-style : COUCHE D'OVERLAYS pour faire marcher les boutons ──
   Framer réécrit tous les <a> en void(0) ; on pose des <div> transparents (hors #main)
   qui naviguent par location.assign. Mappage par LIBELLÉ. */
(function(){
  var BASE="/noveo";
  var TEL="tel:+33478921460";
  function norm(s){return (s||'').replace(/\s+/g,' ').trim();}
  function btnText(el){
    var t=norm((el&&el.textContent)||'');
    t=t.split('{')[0];                                 // couper le CSS injecté par « rolling text »
    t=t.replace(/\.?rolling-text[-a-z0-9_]*/gi,' ');
    t=t.replace(/[«»↗→›]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
    while(t.length>1&&t.length%2===0&&t.slice(0,t.length/2)===t.slice(t.length/2))t=t.slice(0,t.length/2);
    return t.trim();
  }
  function starts(t,l){return t.indexOf(l)===0;}
  function destFor(el){
    var t=btnText(el); if(!t) return null;
    if(t.indexOf('@')>=0) return null;                 // e-mail -> laisser
    if(t.indexOf('prendre rendez-vous')>=0||starts(t,'demander un rendez-vous')||t==='rendez-vous'||starts(t,'réserver')||starts(t,'reserver')||starts(t,'confirmer le rendez-vous')) return BASE+'/appointment/';
    if(starts(t,'appeler')||/^0[0-9]([ .]?[0-9]{2}){4}$/.test(t)) return TEL;
    if(t==='soins'||t==='nos soins'||starts(t,'voir tous nos soins')||starts(t,'nos services')) return BASE+'/service/';
    if(t==='à propos'||t==='a propos') return BASE+'/about/';
    if(t==='contact'||starts(t,'nous contacter')||starts(t,'trouver un dentiste')||t==='nos adresses'||starts(t,'45 cours')) return BASE+'/contact/';
    if(t==='équipe'||t==='equipe'||starts(t,'notre équipe')||starts(t,'rencontrez nos dentistes')||starts(t,'voir toute')) return BASE+'/team/';
    if(t==='conseils'||t==='blog'||t==='journal') return BASE+'/blog/';
    if(t==='avis'||starts(t,'témoignages')||starts(t,'temoignages')) return BASE+'/reviews/';
    if(t==='accueil'||t==='novéo'||t==='noveo') return BASE+'/';
    if(/dentisterie|implant|orthodont|blanchiment|détartrage|detartrage|couronne|facette|prothès|prothes|parodont|endodont/.test(t)) return BASE+'/service/';
    if(starts(t,'en savoir plus')||starts(t,'lire la suite')||starts(t,'read more')||starts(t,'découvrir')||starts(t,'decouvrir')) return BASE+'/service/';
    return null;
  }
  var OVL=[],layer=null;
  function ensureLayer(){ if(layer&&document.body.contains(layer))return;
    layer=document.createElement('div'); layer.id='nv-ovl-layer';
    layer.style.cssText='position:fixed;top:0;left:0;width:0;height:0;z-index:2147482500;pointer-events:none';
    document.body.appendChild(layer);
  }
  function targets(){ var out=[];
    document.querySelectorAll('a,button,[role="link"],[role="button"]').forEach(function(el){
      if(el.closest('#nv-ovl-layer')||el.closest('form')) return;
      var r=el.getBoundingClientRect(); if(r.width<4||r.height<4) return;
      var d=destFor(el);
      // logo « Novéo » en haut à gauche (image, sans texte) -> accueil
      if(!d && r.top<110 && r.left<340 && r.width<270 && el.querySelector('img,svg')) d=BASE+'/';
      if(d) out.push({el:el,dest:d});
    });
    return out;
  }
  function sync(){ ensureLayer(); var tg=targets();
    // grands éléments (cartes) d'abord -> petits boutons créés en dernier = AU-DESSUS
    tg.sort(function(a,b){ var ra=a.el.getBoundingClientRect(),rb=b.el.getBoundingClientRect();
      return (rb.width*rb.height)-(ra.width*ra.height); });
    while(OVL.length<tg.length){ var d=document.createElement('div'); d.className='nv-ovl';
      d.style.cssText='position:fixed;display:block;background:transparent;cursor:pointer;pointer-events:auto;';
      d.addEventListener('click',function(e){ e.preventDefault(); e.stopPropagation();
        var dest=this.getAttribute('data-dest')||''; if(dest.indexOf('tel:')===0){ window.location.href=dest; return;} window.location.assign(dest); });
      layer.appendChild(d); OVL.push(d);
    }
    for(var i=OVL.length-1;i>=tg.length;i--){ OVL[i].remove(); OVL.splice(i,1); }
    for(var j=0;j<tg.length;j++){ var o=OVL[j],t=tg[j],r=t.el.getBoundingClientRect();
      o.setAttribute('data-dest',t.dest);
      o.style.left=r.left+'px'; o.style.top=r.top+'px'; o.style.width=r.width+'px'; o.style.height=r.height+'px'; o.style.display='block';
    }
  }
  var raf=null; function sched(){ if(raf)return; raf=requestAnimationFrame(function(){raf=null;try{sync();}catch(e){}}); }
  if(!window.__nvOvl){ window.__nvOvl=1;
    window.addEventListener('scroll',sched,true); window.addEventListener('resize',sched,true); setInterval(sched,700);
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',sched); else sched();
    [300,800,1500,3000,5000].forEach(function(ms){setTimeout(sched,ms);});
  }
})();
