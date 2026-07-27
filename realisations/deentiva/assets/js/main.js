// Sourelia — comportements partagés (menu mobile, révélation de texte lettre
// par lettre, scroll-reveal, compteurs animés, sélecteur de soins, transitions
// de page en rideau diagonal)

document.addEventListener('DOMContentLoaded', function () {
  initPageTransitions();
  initMobileMenu();
  initScrollReveal();
  initScrollTop();
  initCounters();
  initTreatmentTabs();
  initTextReveal();
  initFloatingHeader();
});

// Le header flottant (au-dessus de la photo plein écran du hero) devient
// opaque dès que l'utilisateur quitte la zone de la photo.
function initFloatingHeader() {
  var header = document.querySelector('.site-header--floating');
  if (!header) return;

  function update() {
    header.classList.toggle('is-scrolled', window.scrollY > 80);
  }
  update();
  window.addEventListener('scroll', update);
}

function initMobileMenu() {
  var toggle = document.getElementById('nav-toggle');
  var menu = document.getElementById('mobile-menu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', function () {
    menu.classList.toggle('open');
    var isOpen = menu.classList.contains('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.textContent = isOpen ? '✕' : '☰';
  });

  menu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = '☰';
    });
  });
}

function initScrollReveal() {
  var targets = document.querySelectorAll('.reveal, .reveal-stagger');
  if (!targets.length) return;

  if (!('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

  targets.forEach(function (el) { observer.observe(el); });
}

function initScrollTop() {
  var btn = document.getElementById('scroll-top');
  if (!btn) return;
  window.addEventListener('scroll', function () {
    btn.classList.toggle('hidden', window.scrollY < 500);
  });
  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// Compte de 0 jusqu'à la valeur cible (data-target) quand l'élément entre
// dans le viewport, avec un easing "ease-out" pour un rendu dynamique.
function initCounters() {
  var counters = document.querySelectorAll('.counter');
  if (!counters.length) return;

  function animate(el) {
    var target = parseFloat(el.getAttribute('data-target')) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    var duration = 1400;
    var start = null;

    function step(timestamp) {
      if (!start) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target) + suffix;
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target + suffix;
    }
    requestAnimationFrame(step);
  }

  if (!('IntersectionObserver' in window)) {
    counters.forEach(animate);
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        animate(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(function (el) { observer.observe(el); });
}

// Sélecteur de soins interactif : cliquer un nom de traitement change la
// photo + légende affichées, sans recharger la page.
function initTreatmentTabs() {
  var wrapper = document.querySelector('.treatment-layout');
  if (!wrapper) return;

  var buttons = wrapper.querySelectorAll('.treatment-list button');
  var images = wrapper.querySelectorAll('.treatment-visual img');
  var badge = wrapper.querySelector('.treatment-visual__badge');
  var caption = wrapper.querySelector('.treatment-visual__caption');

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      buttons.forEach(function (b) { b.classList.remove('is-active'); });
      images.forEach(function (img) { img.classList.remove('is-active'); });
      btn.classList.add('is-active');

      var key = btn.getAttribute('data-key');
      var targetImg = wrapper.querySelector('.treatment-visual img[data-key="' + key + '"]');
      if (targetImg) targetImg.classList.add('is-active');
      if (badge) badge.textContent = btn.getAttribute('data-badge') || btn.textContent.trim();
      if (caption) caption.textContent = btn.getAttribute('data-caption') || '';
    });
  });
}

// Découpe un titre en mots puis en lettres, chaque lettre dans un
// span-fenêtre (overflow hidden) pour l'effet de "montée" à l'entrée,
// avec un délai en cascade par lettre via la variable CSS --i.
function initTextReveal() {
  var headings = document.querySelectorAll('.text-reveal');
  if (!headings.length) return;

  headings.forEach(function (heading) {
    var words = heading.textContent.trim().split(/\s+/);
    heading.textContent = '';
    heading.setAttribute('aria-label', words.join(' '));
    var globalIndex = 0;

    words.forEach(function (word, wIndex) {
      var wordEl = document.createElement('span');
      wordEl.className = 'tr-word';

      word.split('').forEach(function (char) {
        var wrap = document.createElement('span');
        wrap.className = 'tr-char-wrap';
        var charEl = document.createElement('span');
        charEl.className = 'tr-char';
        charEl.style.setProperty('--i', globalIndex);
        charEl.textContent = char;
        wrap.appendChild(charEl);
        wordEl.appendChild(wrap);
        globalIndex++;
      });

      heading.appendChild(wordEl);
      if (wIndex < words.length - 1) {
        heading.appendChild(document.createTextNode(' '));
      }
    });
  });

  if (!('IntersectionObserver' in window)) {
    headings.forEach(function (h) { h.classList.add('is-visible'); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  headings.forEach(function (h) {
    if (h.closest('.hero, .page-hero')) {
      // Le texte du hero se révèle dès le chargement (juste après le rideau
      // de transition), pas seulement au scroll.
      setTimeout(function () { h.classList.add('is-visible'); }, 550);
    } else {
      observer.observe(h);
    }
  });
}

// Rideau de transition en deux panneaux (diagonal, couleur accent) qui se
// referme sur un clic de lien interne puis se rouvre sur la page suivante —
// remplace le routage React/Framer, impossible à porter en HTML statique.
//
// Le rideau est du HTML statique (déjà présent dans la page, couvrant par
// défaut via le CSS) plutôt que créé en JS : s'il était créé ici, un script
// externe lent à charger (police, CDN EmailJS) retarderait son apparition
// et le visiteur verrait la page brute s'afficher un instant avant que le
// rideau ne se mette en place — le "glitch" occasionnel constaté.
function initPageTransitions() {
  var overlay = document.querySelector('.page-transition');
  if (!overlay) return;

  requestAnimationFrame(function () {
    setTimeout(function () { overlay.classList.add('is-open'); }, 60);
  });

  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href]');
    if (!link) return;

    var href = link.getAttribute('href');
    if (!href || href.charAt(0) === '#') return;
    if (link.target === '_blank') return;
    if (/^(mailto:|tel:|https?:)/.test(href)) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;

    event.preventDefault();
    overlay.classList.remove('is-open');
    setTimeout(function () { window.location.href = href; }, 560);
  });
}
