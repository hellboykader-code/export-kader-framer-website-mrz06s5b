/* Zenta — après hydratation Framer : retire avis/partenaires, traduit le hero animé, ajoute jour+heure. */
(function(){
  var KILL=/^(Testimonials?|About Partners Wrap)$/;
  var TESTI=/(best dental experience|used to dread|top-notch|found a dentist I trust|full restorative treatment)/i;
  // masquage CSS robuste : FAQ + Offres (survit à l'hydratation)
  function injectCSS(){
    if(document.getElementById('zenta-fix-css')) return;
    var css=[
      '[data-framer-name="FAQ"]{display:none !important}',
      '[data-framer-name="FAQ List"]{display:none !important}',
      '[data-framer-name="Offers"]{display:none !important}',
      '[data-framer-name*="Pricing"]{display:none !important}'
    ].join('');
    var st=document.createElement('style'); st.id='zenta-fix-css'; st.textContent=css;
    (document.head||document.documentElement).appendChild(st);
  }
  // remplacer le TEXTE d'un élément sans casser ses <span> stylés
  function setTxt(el,val){
    var walk=function(n){for(var i=0;i<n.childNodes.length;i++){var c=n.childNodes[i];
      if(c.nodeType===3 && c.nodeValue && c.nodeValue.trim()){c.nodeValue=val;
        for(var j=i+1;j<n.childNodes.length;j++){var d=n.childNodes[j];
          if(d.nodeType===3&&d.nodeValue&&d.nodeValue.trim()) d.nodeValue='';}
        return true;}
      if(c.nodeType===1 && walk(c))return true;}return false;};
    if(!walk(el)) el.textContent=val;
  }
  var NAV={ 'About':'À propos','Services':'Soins','Team':'Équipe','Contact Us':'Contact','Contact us':'Contact' };
  function fixNav(){
    document.querySelectorAll('nav a, header a, [data-framer-name*="Nav"] a, [data-framer-name*="Menu"] a, [data-framer-name*="Header"] a').forEach(function(a){
      var t=(a.textContent||'').replace(/\s+/g,' ').trim();
      var h=a.getAttribute('href')||'';
      if(t==='Offers'||t==='FAQ'||t==='Faq'||/#offers|#faq/i.test(h)){ (a.closest('li')||a).style.display='none'; a.style.display='none'; return; }
      if(NAV[t]){ setTxt(a,NAV[t]); }
    });
  }
  function main(){ return document.querySelector('main[data-framer-root]')||document.querySelector('main'); }
  function topOfMain(el){ var m=main(); if(!m) return el; var p=el; while(p&&p.parentElement&&p.parentElement!==m) p=p.parentElement; return (p&&p.parentElement===m)?p:null; }
  function hide(el){ if(el) el.style.display='none'; }
  var SPLIT={
    "Wecareaboutyoursmile.":"Nous prenons soin de votre sourire.",
    "Wecareaboutyoursmile":"Nous prenons soin de votre sourire",
    "Services":"Soins","Team":"Équipe","Contact":"Contact","AboutUs":"À propos",
    "BookaVisit":"Prendre rendez-vous","MeetTheTeam":"Rencontrez l'équipe",
    "MeetTheFounder":"Rencontrez la fondatrice","CurrentOffers":"Offres du moment",
    "ServicesWeOffer":"Nos soins"
  };
  function fixSplit(){
    document.querySelectorAll('h1,h2,h3,h4,p,a,div').forEach(function(el){
      if(el.getAttribute('data-frfixed')==='1') return;
      var leaves=[].filter.call(el.children,function(c){return c.tagName==='SPAN'&&c.children.length===0&&(c.textContent||'').length>=1&&(c.textContent||'').length<=20&&(c.textContent||'').indexOf(' ')<0;});
      if(leaves.length<3) return;
      var txt=leaves.map(function(s){return s.textContent;}).join('');
      var key=txt.replace(/\s+/g,'');
      while(key.length%2===0 && key.length>0 && key.slice(0,key.length/2)===key.slice(key.length/2)) key=key.slice(0,key.length/2);
      var fr=SPLIT[key]; if(!fr) return;
      var cs=window.getComputedStyle(leaves[0]);
      var sp=document.createElement('span');
      sp.textContent=fr; sp.style.color=cs.color; sp.style.fontFamily=cs.fontFamily;
      sp.style.fontSize=cs.fontSize; sp.style.fontWeight=cs.fontWeight; sp.style.letterSpacing=cs.letterSpacing;
      el.innerHTML=''; el.appendChild(sp); el.setAttribute('data-frfixed','1');
    });
  }
  function addBooking(){
    if(document.getElementById('zenta-booking')) return;
    var form=document.querySelector('form'); if(!form) return;
    var sub=form.querySelector('button[type="submit"],input[type="submit"],[data-framer-name="Submit"]')||form.lastElementChild;
    var wrap=document.createElement('div'); wrap.id='zenta-booking';
    wrap.innerHTML='<div class="zb-field"><label>Jour souhaité</label><input type="date"></div>'+
      '<div class="zb-field"><label>Heure souhaitée</label><select>'+
      '<option>09:00</option><option>10:00</option><option>11:00</option><option>14:00</option>'+
      '<option>15:00</option><option>16:00</option><option>17:00</option></select></div>';
    if(sub&&sub.parentElement) sub.parentElement.insertBefore(wrap,sub); else form.appendChild(wrap);
  }
  var LOGO="/zenta/assets/framer/images/nlDAVGXHzl0E1n6jsEZKonrrg0.png";
  function forceLogo(){
    document.querySelectorAll('img[src*="nlDAVG"]').forEach(function(img){
      if(img.getAttribute('srcset')) img.removeAttribute('srcset');
      if((img.getAttribute('src')||'').indexOf('framerusercontent')>=0) img.setAttribute('src',LOGO);
    });
  }
  function isHero(s){ var m=main(); return s && m && s===m.firstElementChild; }
  function killSection(el){ var s=topOfMain(el); if(isHero(s)){ hide(el); return; } hide(s); hide(el); }
  function apply(){
    injectCSS();
    forceLogo();
    fixNav();
    document.querySelectorAll('[data-framer-name]').forEach(function(el){
      if(KILL.test((el.getAttribute('data-framer-name')||'').trim())){ killSection(el); }
    });
    // cartes témoignage détectées par contenu
    document.querySelectorAll('[data-framer-name],figure,blockquote').forEach(function(el){
      if(el.offsetParent===null) return;
      if(TESTI.test(el.textContent||'')){ killSection(el); }
    });
    fixSplit();
    addBooking();
    document.querySelectorAll('a[href*="framer.com"],a[href*="cerberus"]').forEach(function(a){ a.style.display='none'; });
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

/* ── Zenta : traducteur CMS (soins rendus côté client) + overlays boutons ── */
(function(){
  var BASE="/zenta";
  var BOOK=BASE+"/contacts/";
  function norm(s){return (s||'').replace(/\s+/g,' ').trim();}
  var PLAIN={
    "General Dentistry":"Dentisterie générale","Dental Hygiene":"Hygiène dentaire",
    "Cosmetic Dentistry":"Dentisterie esthétique","Restorative Dentistry":"Dentisterie restauratrice",
    "Orthodontics":"Orthodontie","Pediatric Dentistry":"Dentisterie pédiatrique",
    "Emergency Dentistry":"Dentisterie d'urgence",
    "Routine check-ups, cleanings, and preventive treatments designed to maintain healthy teeth and gums and detect issues early.":
      "Bilans de routine, détartrages et soins préventifs pour préserver des dents et des gencives saines et détecter les problèmes tôt.",
    "Professional cleanings, preventive treatments, and personalised care designed to maintain healthy teeth and gums and reduce the risk of oral disease.":
      "Détartrages professionnels, soins préventifs et accompagnement personnalisé pour préserver des dents et gencives saines et réduire le risque de maladies bucco-dentaires.",
    "Aesthetic dental treatments designed to enhance the appearance of your teeth, creating a brighter, more balanced, and confident smile.":
      "Des soins dentaires esthétiques pour sublimer vos dents et créer un sourire plus lumineux, harmonieux et confiant.",
    "Restorative treatments designed to repair damaged teeth, replace missing teeth, and restore the function, health, and appearance of your smile.":
      "Des soins restaurateurs pour réparer les dents abîmées, remplacer les dents manquantes et redonner fonction, santé et esthétique à votre sourire.",
    "Dental Check-Ups":"Bilans dentaires","Oral Examinations":"Examens bucco-dentaires",
    "Digital X-Rays":"Radiographies numériques","Fillings":"Obturations",
    "Emergency Dental Care":"Soins dentaires d'urgence","Teeth Cleaning":"Détartrage",
    "Scaling & Polishing":"Détartrage et polissage","Fluoride Treatments":"Traitements au fluor",
    "Gum Care":"Soin des gencives","Oral Hygiene Advice":"Conseils d'hygiène bucco-dentaire",
    "Teeth Whitening":"Blanchiment dentaire","Veneers":"Facettes","Cosmetic Bonding":"Collage esthétique",
    "Smile Makeovers":"Relooking du sourire","Tooth Contouring":"Remodelage dentaire",
    "Crowns":"Couronnes","Root Canal Treatment":"Traitement de racine","Dentures":"Prothèses dentaires",
    "Inlays & Onlays":"Inlays et onlays","Full-Mouth Rehabilitation":"Réhabilitation complète",
    "En savoir plus":"Prendre rendez-vous","Learn More":"Prendre rendez-vous","Read More":"Prendre rendez-vous",
    "Book Now":"Prendre rendez-vous","Book Appointment":"Prendre rendez-vous","Our Services":"Nos soins",
    "Services We Offer":"Nos soins"
  };
  function fixPlain(){
    document.querySelectorAll('h1,h2,h3,h4,h5,p,span,a,li,button,div').forEach(function(el){
      if(el.children.length>0) return;
      if(el.getAttribute('data-zp')==='1') return;
      var fr=PLAIN[norm(el.textContent)]; if(!fr) return;
      var w=function(n){for(var i=0;i<n.childNodes.length;i++){var c=n.childNodes[i];if(c.nodeType===3&&c.nodeValue&&c.nodeValue.trim()){c.nodeValue=fr;return true;}}return false;};
      if(!w(el)) el.textContent=fr; el.setAttribute('data-zp','1');
    });
  }
  function btnText(el){var t=norm((el&&el.textContent)||'').split('{')[0].replace(/\.?rolling-text[-a-z0-9_]*/gi,' ').replace(/[«»↗→›]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
    while(t.length>1&&t.length%2===0&&t.slice(0,t.length/2)===t.slice(t.length/2))t=t.slice(0,t.length/2);return t.trim();}
  function starts(t,l){return t.indexOf(l)===0;}
  function destFor(el){var t=btnText(el); if(!t||t.indexOf('@')>=0) return null;
    if(t.indexOf('prendre rendez-vous')>=0||t.indexOf('en savoir plus')>=0||starts(t,'réserver')||starts(t,'reserver')||starts(t,'demander')||starts(t,'book')||starts(t,'learn more')||starts(t,'read more')||starts(t,'prenez rendez')) return BOOK;
    if(t==='soins'||t==='nos soins'||t==='services'||starts(t,'voir tous')||starts(t,'nos services')) return BASE+'/services/';
    if(t==='équipe'||t==='equipe'||t==='team'||starts(t,'notre équipe')||starts(t,'rencontrez')) return BASE+'/team/';
    if(t==='contact'||t==='contacts'||starts(t,'nous contacter')||starts(t,'contact us')) return BASE+'/contacts/';
    if(t==='à propos'||t==='a propos'||t==='about'||t==='accueil') return BASE+'/';
    if(/dentisterie|hygiène|hygiene|esthétique|restauratrice|orthodont|implant|blanchiment/.test(t)) return BASE+'/services/';
    return null;
  }
  var OVL=[],layer=null;
  function ensureLayer(){ if(layer&&document.body.contains(layer))return; layer=document.createElement('div'); layer.id='zt-ovl-layer';
    layer.style.cssText='position:fixed;top:0;left:0;width:0;height:0;z-index:2147482500;pointer-events:none'; document.body.appendChild(layer);}
  function targets(){var out=[]; document.querySelectorAll('a,button,[role="link"],[role="button"]').forEach(function(el){
    if(el.closest('#zt-ovl-layer')||el.closest('form')||el.closest('#zenta-booking')) return;
    var r=el.getBoundingClientRect(); if(r.width<4||r.height<4) return; var d=destFor(el);
    if(!d && r.top<110 && r.left<340 && r.width<270 && el.querySelector('img,svg')) d=BASE+'/';
    if(d) out.push({el:el,dest:d});}); return out;}
  function sync(){ ensureLayer(); var tg=targets();
    tg.sort(function(a,b){var ra=a.el.getBoundingClientRect(),rb=b.el.getBoundingClientRect();return (rb.width*rb.height)-(ra.width*ra.height);});
    while(OVL.length<tg.length){var d=document.createElement('div');d.style.cssText='position:fixed;display:block;background:transparent;cursor:pointer;pointer-events:auto;';
      d.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();var dest=this.getAttribute('data-dest')||'';if(dest.indexOf('tel:')===0){window.location.href=dest;return;}window.location.assign(dest);});
      layer.appendChild(d);OVL.push(d);}
    for(var i=OVL.length-1;i>=tg.length;i--){OVL[i].remove();OVL.splice(i,1);}
    for(var j=0;j<tg.length;j++){var o=OVL[j],t=tg[j],r=t.el.getBoundingClientRect();o.setAttribute('data-dest',t.dest);o.style.left=r.left+'px';o.style.top=r.top+'px';o.style.width=r.width+'px';o.style.height=r.height+'px';o.style.display='block';}
  }
  var raf=null; function tick(){ try{fixPlain();}catch(e){} if(raf)return; raf=requestAnimationFrame(function(){raf=null;try{sync();}catch(e){}}); }
  if(!window.__ztOvl){ window.__ztOvl=1;
    window.addEventListener('scroll',tick,true); window.addEventListener('resize',tick,true); setInterval(tick,700);
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',tick); else tick();
    [300,800,1500,3000,5000,8000].forEach(function(ms){setTimeout(tick,ms);});
  }
})();
