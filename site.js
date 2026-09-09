/* ═══════════════════════════════════════════════════════════════════════════
   A.POINT ADVISORY — le seul script du site
   ═══════════════════════════════════════════════════════════════════════════

   Quatre choses, et rien d'autre : la barre du haut qui gagne son trait, le
   menu du téléphone, la bascule mensuel/annuel, et l'apparition au
   défilement.

   Trois règles tenues d'un bout à l'autre :

   1. **Aucune dépendance, aucun appel réseau.** Pas de bibliothèque, pas de
      police distante, pas de mesure d'audience. C'est ce qui rend vraie la
      phrase « no third-party trackers » du site — et un test la vérifie.

   2. **La page est juste SANS ce fichier.** Si le script ne s'exécute pas
      (erreur, réseau coupé, navigateur ancien), la bascule reste cachée, les
      prix mensuels sont affichés, le menu du téléphone est un `hidden` que
      personne n'ouvre — mais tous les liens y sont, dans le pied de page.
      Rien d'essentiel n'est confié à JavaScript.

   3. **Les prix ne se calculent pas ici.** Les deux montants sont écrits
      dans le HTML par le générateur (`data-mois`, `data-an`), qui les tient
      de `contenu.py`. Un prix calculé côté client serait une deuxième
      source, et la deuxième source finit toujours par mentir.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ── 1. La barre du haut ────────────────────────────────────────────────
     Elle ne prend son trait qu'une fois la page descendue : posée en haut du
     premier écran, une ligne le couperait en deux. Le seuil est bas (8 px)
     pour que la transition suive le doigt dès le premier geste. */
  var entete = $('#entete');
  if (entete) {
    var majBarre = function () {
      entete.classList.toggle('est-descendu', window.scrollY > 8);
    };
    majBarre();
    window.addEventListener('scroll', majBarre, { passive: true });
  }

  /* ── 2. Le menu du téléphone ────────────────────────────────────────────
     `hidden` plutôt que `display:none` en CSS : c'est l'attribut que les
     lecteurs d'écran respectent, et il n'a pas besoin d'une classe. */
  var burger = $('#burger'), menu = $('#menu-mobile');
  if (burger && menu) {
    var basculerMenu = function (ouvrir) {
      var ouvert = typeof ouvrir === 'boolean' ? ouvrir : menu.hidden;
      menu.hidden = !ouvert;
      burger.setAttribute('aria-expanded', String(ouvert));
      burger.setAttribute('aria-label', ouvert ? 'Close menu' : 'Open menu');
    };
    burger.addEventListener('click', function () { basculerMenu(); });
    // Un lien cliqué referme le menu : sinon il reste ouvert par-dessus la
    // page d'arrivée quand le lien pointe vers une ancre de la même page.
    $$('a', menu).forEach(function (a) {
      a.addEventListener('click', function () { basculerMenu(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) { basculerMenu(false); burger.focus(); }
    });
    // Repasser en grand écran doit refermer le menu : sinon il reste ouvert,
    // invisible, et vole le focus au clavier.
    var large = window.matchMedia('(min-width: 900px)');
    var surLarge = function (e) { if (e.matches) basculerMenu(false); };
    if (large.addEventListener) large.addEventListener('change', surLarge);
    else if (large.addListener) large.addListener(surLarge);
  }

  /* ── 3. La bascule mensuel / annuel ─────────────────────────────────────
     Le bouton est `hidden` dans le HTML produit : il n'apparaît que si ce
     script tourne. Le choix est retenu d'une page à l'autre — quelqu'un qui
     a choisi « annuel » sur l'accueil ne veut pas le rechoisir sur la page
     des tarifs. `localStorage` peut lever (navigation privée stricte,
     stockage refusé) : chaque accès est donc protégé. */
  var MEM = 'apoint-rythme';
  var lire = function () { try { return localStorage.getItem(MEM); } catch (e) { return null; } };
  var ecrire = function (v) { try { localStorage.setItem(MEM, v); } catch (e) { /* refusé : tant pis */ } };

  var bascule = $('#bascule'), btn = $('#bascule-btn');
  if (bascule && btn) {
    var labM = $('#bascule-lab-m'), labA = $('#bascule-lab-a');
    var cartes = $$('.niveau');

    var euro = function (n) { return '€' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };

    var peindre = function (annuel) {
      cartes.forEach(function (c) {
        var mois = c.getAttribute('data-mois'), an = c.getAttribute('data-an');
        var prix = $('[data-prix]', c), per = $('[data-per]', c), note = $('[data-note]', c);
        if (!prix || !per || !note) return;
        if (annuel) {
          prix.textContent = euro(an);
          per.textContent = '/ year';
          note.textContent = 'two months free — ' + euro(mois) + ' a month if you prefer';
        } else {
          prix.textContent = euro(mois);
          per.textContent = '/ month';
          note.textContent = 'or ' + euro(an) + ' a year — two months free';
        }
      });
      btn.setAttribute('aria-checked', String(annuel));
      if (labM) labM.classList.toggle('est-actif', !annuel);
      if (labA) labA.classList.toggle('est-actif', annuel);
    };

    bascule.hidden = false;
    peindre(lire() === 'an');
    btn.addEventListener('click', function () {
      var annuel = btn.getAttribute('aria-checked') !== 'true';
      peindre(annuel);
      ecrire(annuel ? 'an' : 'mois');
    });
  }

  /* ── 4. L'apparition au défilement ──────────────────────────────────────
     Discrète : dix-huit pixels et une opacité. Elle donne le rythme d'une
     page qu'on découvre, sans jamais faire attendre une information.

     Deux garde-fous. D'abord `prefers-reduced-motion` : un réglage du
     téléphone qui dit « moins d'animations » est un besoin, pas un goût, et
     on n'anime alors rien du tout. Ensuite, si `IntersectionObserver`
     n'existe pas, on ne pose simplement jamais la classe — donc rien n'est
     caché. Cacher d'abord et révéler ensuite serait le piège : le jour où
     l'observateur manque, la page reste blanche. */
  var moinsDeMouvement = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!moinsDeMouvement && 'IntersectionObserver' in window) {
    var aReveler = $$('.sec .tete, .sec .carte, .sec .cap, .sec .mini, .sec .chiffre, '
      + '.sec .etape, .sec .niveau, .sec .ecran, .sec .axe, .sec .piece, .sec .garantie, '
      + '.sec .an1, .sec .tab-enveloppe, .sec .qa, .sec .fiche, .hero-visuel');

    var obs = new IntersectionObserver(function (entrees, o) {
      entrees.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('est-vu');
        o.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    aReveler.forEach(function (el, i) {
      // Ce qui est déjà à l'écran au chargement ne s'anime pas : une
      // animation qui démarre sous les yeux d'un lecteur qui n'a rien fait
      // se lit comme un défaut d'affichage.
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92) return;
      el.classList.add('revele');
      // Un décalage très court entre voisins, plafonné : au-delà de quatre,
      // le dernier arrive trop tard et on croit que la page est cassée.
      el.style.transitionDelay = (Math.min(i % 4, 3) * 60) + 'ms';
      obs.observe(el);
    });
  }
})();
