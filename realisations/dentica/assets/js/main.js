// Dentélia — comportements partagés (menu mobile, scroll-reveal, accordéon
// FAQ, retour en haut, transitions de page en double vague liquide)

document.addEventListener('DOMContentLoaded', function () {
  initPageTransitions();
  initMobileMenu();
  initScrollReveal();
  initScrollTop();
  initFaqAccordion();
});

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
  var targets = document.querySelectorAll('.reveal, .reveal-stagger, .blur-in');
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

  targets.forEach(function (el) {
    if (el.classList.contains('blur-in') && el.closest('.hero, .page-hero')) {
      // Le titre du hero se révèle dès le chargement (après la vague de
      // transition), pas seulement au scroll.
      setTimeout(function () { el.classList.add('is-visible'); }, 550);
    } else {
      observer.observe(el);
    }
  });
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

// Accordéon FAQ : une seule question ouverte à la fois.
function initFaqAccordion() {
  var items = document.querySelectorAll('.faq-item');
  if (!items.length) return;

  items.forEach(function (item) {
    var q = item.querySelector('.faq-item__q');
    q.addEventListener('click', function () {
      var wasActive = item.classList.contains('is-active');
      items.forEach(function (i) { i.classList.remove('is-active'); });
      if (!wasActive) item.classList.add('is-active');
    });
  });
}

// Rideau de transition en double vague liquide (une couche sombre + une
// couche cyan qui suit avec un léger retard) qui glisse verticalement lors
// d'un clic sur un lien interne — volontairement différent des transitions
// des autres démos (glissement diagonal à deux panneaux, expansion
// circulaire depuis le clic) : ici les deux vagues montent/descendent en
// bloc, sans dépendre du point de clic.
//
// Le rideau est du HTML statique (déjà présent dans la page, couvrant par
// défaut via le CSS -- translateY(0%) sans classe) plutôt que créé en JS,
// pour éviter tout flash si un script externe met du temps à charger.
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
    overlay.classList.add('is-closing');
    setTimeout(function () { window.location.href = href; }, 620);
  });
}
