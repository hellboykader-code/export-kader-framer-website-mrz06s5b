// Dr. Novak — comportements partages (menu mobile, scroll-reveal, retour
// en haut, transition de page en ouverture d'aperture rectangulaire)

document.addEventListener('DOMContentLoaded', function () {
  initPageTransitions();
  initMobileMenu();
  initScrollReveal();
  initScrollTop();
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

// Rideau de transition en aperture rectangulaire : un seul panneau dont
// le clip-path inset() se retracte du plein ecran (couvrant par defaut,
// sans transform) vers un point central, comme un diaphragme d'appareil
// photo qui se ferme -- volontairement different des transitions des
// autres demos (glissement diagonal, expansion circulaire au clic,
// vague liquide, volets, mosaique de cercles, double porte 3D).
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
    setTimeout(function () { window.location.href = href; }, 750);
  });
}
