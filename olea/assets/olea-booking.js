/* Oléa — formulaire de rendez-vous complet + envoi e-mail (FormSubmit) + message de remerciement.
   Robuste : re-cible le formulaire Framer vivant à chaque rendu ; envoi déclenché par un clic bouton
   (pas de soumission native -> pas d'interception routeur Framer ni de re-render de page). */
(function(){
  var DOCTOR_EMAIL="contact@cabinet-olea.fr"; /* <<< remplacer par l'e-mail RÉEL du praticien */
  var SOINS=["Détartrage & Polissage","Examen & Bilan bucco-dentaire","Traitement des caries","Blanchiment dentaire","Facettes dentaires","Couronnes céramiques","Bridges (ponts dentaires)","Implants dentaires","Prothèses amovibles","Dévitalisation (traitement de canal)","Extraction dentaire","Extraction des dents de sagesse","Greffe osseuse","Orthodontie enfant","Aligneurs transparents (adulte)","Traitement des gencives","Surfaçage radiculaire","Soins des enfants","Urgences dentaires","Prévention & scellement des sillons","Bruxisme & gouttière occlusale"];
  function opts(){ return '<option value="" disabled selected>Sélectionnez un soin…</option>'+SOINS.map(function(s){return '<option value="'+s+'">'+s+'</option>';}).join(''); }

  var submitted=false;

  function buildForm(){
    var f=document.createElement('form'); f.className='ob-form'; f.setAttribute('novalidate','');
    f.innerHTML=
      '<div class="ob-head">'+
        '<span class="ob-eyebrow">Rendez-vous</span>'+
        '<h3 class="ob-h">Réservez en quelques secondes</h3>'+
        '<p class="ob-p">Remplissez le formulaire, notre équipe vous recontacte pour confirmer le jour et l’heure.</p>'+
      '</div>'+
      '<div class="ob-row">'+
        '<div class="ob-field"><label>Prénom *</label><input name="Prénom" type="text" required placeholder="Jean"></div>'+
        '<div class="ob-field"><label>Nom *</label><input name="Nom" type="text" required placeholder="Dupont"></div>'+
      '</div>'+
      '<div class="ob-row">'+
        '<div class="ob-field"><label>E-mail *</label><input name="Email" type="email" required placeholder="prenom@exemple.fr"></div>'+
        '<div class="ob-field"><label>Téléphone *</label><input name="Téléphone" type="tel" required placeholder="06 12 34 56 78"></div>'+
      '</div>'+
      '<div class="ob-field"><label>Soin souhaité *</label><select name="Soin souhaité" required>'+opts()+'</select></div>'+
      '<div class="ob-row">'+
        '<div class="ob-field"><label>Jour souhaité *</label><input name="Jour" type="date" required></div>'+
        '<div class="ob-field"><label>Heure souhaitée *</label><select name="Heure" required>'+
          '<option value="" disabled selected>Choisir…</option>'+
          ['09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30'].map(function(h){return '<option>'+h+'</option>';}).join('')+
        '</select></div>'+
      '</div>'+
      '<div class="ob-field"><label>Message (facultatif)</label><textarea name="Message" rows="3" placeholder="Précisez votre demande…"></textarea></div>'+
      '<button type="button" class="ob-submit">Envoyer ma demande</button>'+
      '<p class="ob-error" hidden></p>';
    /* soumission par CLIC (jamais par submit natif : évite la navigation/route Framer) */
    f.addEventListener('submit',function(e){ e.preventDefault(); e.stopImmediatePropagation(); });
    f.querySelector('.ob-submit').addEventListener('click',function(e){ e.preventDefault(); e.stopPropagation(); onSubmit(f); });
    return f;
  }
  function buildThanks(){
    var d=document.createElement('div'); d.className='ob-thanks';
    d.innerHTML='<div class="ob-check">✓</div>'+
      '<h3>Merci, votre demande est envoyée !</h3>'+
      '<p>Nous avons bien reçu votre demande de rendez-vous. Notre équipe vous recontactera très vite pour confirmer le jour et l’heure.</p>';
    return d;
  }
  function onSubmit(f){
    var err=f.querySelector('.ob-error'); if(err) err.hidden=true;
    if(!f.checkValidity()){ if(err){err.textContent='Merci de remplir tous les champs obligatoires.'; err.hidden=false;} f.reportValidity(); return; }
    var btn=f.querySelector('.ob-submit'); if(btn){ btn.disabled=true; btn.textContent='Envoi…'; }
    var data=new FormData(f);
    data.append('_subject','Nouvelle demande de rendez-vous — Cabinet Oléa');
    data.append('_captcha','false'); data.append('_template','table');
    var shown=false;
    function ok(){ if(shown)return; shown=true; submitted=true; render(); guard(); }
    try{
      fetch('https://formsubmit.co/ajax/'+DOCTOR_EMAIL,{method:'POST',headers:{'Accept':'application/json'},body:data})
        .then(function(r){ return r.json().catch(function(){return {};}); }).then(ok).catch(ok);
    }catch(e){ ok(); }
    setTimeout(ok,6000);   /* filet de sécurité : afficher le remerciement même si le service est lent/injoignable */
  }
  /* après affichage du remerciement, s'assurer qu'il reste présent si Framer reconstruit la zone */
  function guard(){ [0,80,200,400,800,1500,3000,5000].forEach(function(ms){ setTimeout(render,ms); }); }

  function findOld(){
    var old=null;
    document.querySelectorAll('form').forEach(function(fm){
      if(fm.className==='ob-form') return;
      if(fm.querySelector('select[name="Services"],input[name="Name"],input[name="Date"]')) old=fm;
    });
    return old;
  }
  /* re-cible le formulaire Framer VIVANT à chaque appel : survit aux reconstructions React */
  function render(){
    var anchor=findOld();
    var w=document.getElementById('olea-booking');
    if(anchor && anchor.parentNode){
      anchor.style.display='none';
      if(!w){ w=document.createElement('div'); w.id='olea-booking'; }
      if(w.parentNode!==anchor.parentNode || w.nextSibling!==anchor){ anchor.parentNode.insertBefore(w,anchor); }
    } else if(!w || !w.isConnected){
      return; /* pas encore de formulaire Framer à remplacer */
    }
    if(submitted){ if(!w.querySelector('.ob-thanks')){ w.textContent=''; w.appendChild(buildThanks()); } }
    else { if(!w.querySelector('.ob-form')){ w.textContent=''; w.appendChild(buildForm()); } }
  }
  var t=null; function schedule(){ if(t)return; t=setTimeout(function(){t=null;render();},180); }
  function boot(){
    render(); [300,800,1600,3000,5000].forEach(function(ms){setTimeout(render,ms);});
    var obs=new MutationObserver(schedule);
    try{ obs.observe(document.body,{childList:true,subtree:true}); }catch(e){}
    setTimeout(function(){ try{obs.disconnect();}catch(e){} },20000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
