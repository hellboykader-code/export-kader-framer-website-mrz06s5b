// Cliniva Dentaire — comportements partages (menu mobile, scroll-reveal,
// retour en haut, accordeon FAQ, transition de page en flou/fondu)

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

function initFaqAccordion() {
  var items = document.querySelectorAll('.faq-item');
  if (!items.length) return;
  items.forEach(function (item) {
    var q = item.querySelector('.faq-item__q');
    if (!q) return;
    q.addEventListener('click', function () {
      var wasOpen = item.classList.contains('open');
      items.forEach(function (i) { i.classList.remove('open'); });
      if (!wasOpen) item.classList.add('open');
    });
  });
}

// Rideau de transition en flou/fondu : un seul panneau dont l'opacite et
// le flou (backdrop) se dissipent -- comme une image qui reprend sa
// nettete -- plutot que de glisser, pivoter ou se decouper en formes
// (comme dans les autres demos : glissement diagonal, expansion
// circulaire au clic, vague liquide, volets, mosaique de cercles,
// double porte 3D, aperture rectangulaire). Purement pilote par
// opacity/filter, aucune transformation geometrique.
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
    setTimeout(function () { window.location.href = href; }, 700);
  });
}
