// Menta Dentaire — comportements partagés (menu mobile, scroll-reveal, scroll-top)

document.addEventListener('DOMContentLoaded', function () {
  initPageTransitions();
  initMobileMenu();
  initScrollReveal();
  initScrollTop();
  initHeroTextAnimation();
  initOverlayHeader();
  initServiceAccordion();
});

// Rideau de transition en cercle qui grandit/rétrécit depuis le point de
// clic exact (coordonnées capturées via les variables CSS --ox/--oy) —
// volontairement différent des transitions des autres démos (ex. le
// rideau diagonal à deux panneaux de Sourelia) : ici un seul cercle plein
// qui part du doigt/curseur de l'utilisateur plutôt que des bords de l'écran.
//
// Le rideau est du HTML statique (déjà présent dans la page, couvrant par
// défaut via le CSS — clip-path: circle(150% ...) sans classe) plutôt que
// créé en JS, pour éviter tout flash si un script externe met du temps à
// charger (voir la même leçon appliquée au rideau de Sourelia).
function initPageTransitions() {
  var overlay = document.querySelector('.page-transition');
  if (!overlay) return;

  overlay.style.setProperty('--ox', '50%');
  overlay.style.setProperty('--oy', '50%');

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
    overlay.style.setProperty('--ox', event.clientX + 'px');
    overlay.style.setProperty('--oy', event.clientY + 'px');
    overlay.classList.remove('is-open');
    overlay.classList.add('is-closing');
    setTimeout(function () { window.location.href = href; }, 520);
  });
}

// Accordéon des soins (01-04) : un clic ouvre la ligne (fond sombre) et
// fait apparaître la photo correspondante, légèrement inclinée, dans le
// panneau visuel à droite.
function initServiceAccordion() {
  var items = document.querySelectorAll('.accordion-item');
  var visuals = document.querySelectorAll('.accordion-visual img');
  if (!items.length) return;

  items.forEach(function (item) {
    var header = item.querySelector('.accordion-item__header');
    header.addEventListener('click', function () {
      var wasActive = item.classList.contains('is-active');
      items.forEach(function (i) { i.classList.remove('is-active'); });
      visuals.forEach(function (v) { v.classList.remove('is-active'); });

      if (!wasActive) {
        item.classList.add('is-active');
        var idx = item.getAttribute('data-index');
        var visual = document.querySelector('.accordion-visual img[data-index="' + idx + '"]');
        if (visual) visual.classList.add('is-active');
      }
    });
  });
}

// The transparent header (index.html hero) turns into the normal solid
// header once the user scrolls past the photo, so nav text stays readable
// over the white sections below.
function initOverlayHeader() {
  var header = document.querySelector('.site-header--overlay');
  var hero = document.querySelector('.hero');
  if (!header || !hero) return;

  function update() {
    var threshold = hero.offsetHeight - 80;
    header.classList.toggle('is-scrolled', window.scrollY > threshold);
  }

  window.addEventListener('scroll', update);
  update();
}

// Word-by-word entrance animation for the hero heading, played once on load
// (the markup already wraps each word in <span class="word">; see hero sections).
function initHeroTextAnimation() {
  var heading = document.querySelector('.hero h1');
  if (!heading) return;
  requestAnimationFrame(function () {
    setTimeout(function () { heading.classList.add('is-loaded'); }, 100);
  });
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

// Recreates the fade+slide-up entrance feel of the Framer reference site
// using IntersectionObserver, since Framer's own React motion runtime
// cannot be ported to a static HTML/CSS/JS build.
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
