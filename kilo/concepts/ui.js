/* Kilo concept prototypes — shared interaction components.
 *
 * The behaviours apple.com's product pages are built from, generalised so each
 * concept can opt in with markup alone. Everything here is progressive: with
 * JavaScript off, or with reduced motion on, the content is still all there.
 *
 *   [data-nav]        sticky local nav that slides in once the hero has passed
 *   .ap-reveal        fade-and-rise as the element enters the viewport
 *   [data-gallery]    horizontal snap track with arrow controls
 *   [data-swatch]     radio-style picker that reports the chosen value
 *   [data-pin]        section that pins while its contents animate on scroll
 */
(function (global) {
    'use strict';

    var reduced = global.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---- Sticky local nav ------------------------------------------------
       Apple shows the nav only after you've left the hero, so the hero itself
       is never covered. The sentinel is whatever [data-nav-after] points at. */
    function initNav() {
        var nav = document.querySelector('[data-nav]');
        if (!nav || nav.dataset.bound) return;
        nav.dataset.bound = '1';
        var after = document.querySelector('[data-nav-after]') ||
                    document.querySelector('header, .hero');
        if (!after) { nav.classList.add('is-on'); return; }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                nav.classList.toggle('is-on', !e.isIntersecting);
            });
        }, { rootMargin: '-60px 0px 0px 0px', threshold: 0 });
        io.observe(after);
    }

    /* ---- Scroll reveals --------------------------------------------------
       Reveal-on-scroll parks content at opacity 0 and waits for JavaScript to
       let it through, which means every way this can fail shows a blank page.
       So it is built to fail open, with three independent paths to visible:

         1. an IntersectionObserver, for the nicely staggered common case
         2. a rect check on scroll, in case the observer never delivers
         3. a timer that gives up and shows everything

       Any one of them is enough. Elements reveal once and stay revealed —
       replaying on the way back up reads as a glitch, not a flourish. */
    var revealEls = [];

    function showAll() {
        // This is the give-up path, so it must not depend on a transition
        // running: without animation frames the opacity would never advance
        // off zero and the class alone would change nothing on screen.
        document.documentElement.classList.add('no-anim');
        revealEls.forEach(function (el) { el.classList.add('is-in'); });
    }

    function initReveals() {
        revealEls = Array.prototype.slice.call(document.querySelectorAll('.ap-reveal'));
        if (!revealEls.length) return;
        if (reduced) { showAll(); return; }

        // 1. The observer.
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (!e.isIntersecting) return;
                e.target.classList.add('is-in');
                io.unobserve(e.target);
            });
        }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
        revealEls.forEach(function (el) { io.observe(el); });

        // 2. A plain rect check, which needs neither frames nor the observer.
        var pending = false;
        function sweep() {
            pending = false;
            var h = global.innerHeight;
            var remaining = false;
            revealEls.forEach(function (el) {
                if (el.classList.contains('is-in')) return;
                var b = el.getBoundingClientRect();
                if (b.top < h * 0.92 && b.bottom > 0) {
                    el.classList.add('is-in');
                    io.unobserve(el);
                } else {
                    remaining = true;
                }
            });
            if (!remaining) {
                global.removeEventListener('scroll', onScroll);
                global.removeEventListener('resize', onScroll);
            }
        }
        function onScroll() {
            if (pending) return;
            pending = true;
            // rAF when it's available, a timer when it isn't.
            if (global.requestAnimationFrame) global.requestAnimationFrame(sweep);
            else global.setTimeout(sweep, 16);
        }
        global.addEventListener('scroll', onScroll, { passive: true });
        global.addEventListener('resize', onScroll);
        sweep();

        // 3. Last resort. Better an un-animated page than an empty one — and
        //    soon enough that nobody sits looking at a blank section.
        global.setTimeout(showAll, 2500);
    }

    /* ---- Horizontal snap gallery ----------------------------------------- */
    function initGalleries() {
        Array.prototype.forEach.call(document.querySelectorAll('[data-gallery]'), function (g) {
            if (g.dataset.bound) return;      // refresh() must not double-bind
            g.dataset.bound = '1';
            var track = g.querySelector('.ap-gallery__track');
            var prev  = g.querySelector('[data-prev]');
            var next  = g.querySelector('[data-next]');
            if (!track) return;

            function step() {
                var item = track.querySelector('.ap-gallery__item');
                return item ? item.getBoundingClientRect().width + 20 : track.clientWidth * 0.8;
            }
            function sync() {
                var max = track.scrollWidth - track.clientWidth - 1;
                if (prev) prev.disabled = track.scrollLeft <= 1;
                if (next) next.disabled = track.scrollLeft >= max;
            }
            if (prev) prev.addEventListener('click', function () {
                track.scrollBy({ left: -step(), behavior: reduced ? 'auto' : 'smooth' });
            });
            if (next) next.addEventListener('click', function () {
                track.scrollBy({ left: step(), behavior: reduced ? 'auto' : 'smooth' });
            });
            track.addEventListener('scroll', sync, { passive: true });
            global.addEventListener('resize', sync);
            sync();
        });
    }

    /* ---- Swatch picker ---------------------------------------------------
       Emits a `swatch` event carrying the chosen value, so a concept can wire
       it to whatever it likes without this file knowing about plates. */
    function initSwatches() {
        Array.prototype.forEach.call(document.querySelectorAll('[data-swatch]'), function (group) {
            if (group.dataset.bound) return;  // refresh() must not double-bind
            group.dataset.bound = '1';
            var label = group.parentElement.querySelector('.ap-swatch-label');
            var items = group.querySelectorAll('.ap-swatch');

            function choose(btn) {
                Array.prototype.forEach.call(items, function (b) {
                    b.setAttribute('aria-checked', String(b === btn));
                });
                if (label) label.textContent = btn.dataset.label || '';
                group.dispatchEvent(new CustomEvent('swatch', {
                    bubbles: true,
                    detail: { value: btn.dataset.value, label: btn.dataset.label }
                }));
            }

            Array.prototype.forEach.call(items, function (b) {
                b.setAttribute('role', 'radio');
                b.addEventListener('click', function () { choose(b); });
                b.addEventListener('keydown', function (e) {
                    var list = Array.prototype.slice.call(items);
                    var i = list.indexOf(b);
                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                        e.preventDefault(); list[(i + 1) % list.length].focus();
                        choose(list[(i + 1) % list.length]);
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                        e.preventDefault(); list[(i - 1 + list.length) % list.length].focus();
                        choose(list[(i - 1 + list.length) % list.length]);
                    }
                });
            });
            group.setAttribute('role', 'radiogroup');
            var initial = group.querySelector('.ap-swatch[aria-checked="true"]') || items[0];
            if (initial) choose(initial);
        });
    }

    /* ---- Pinned scroll sequence ------------------------------------------
       A [data-pin] section stays put while the page scrolls through it, and
       reports progress 0..1 on its [data-pin-stage] child. Concepts read the
       `pin` event rather than doing their own scroll maths. */
    function initPins() {
        var pins = document.querySelectorAll('[data-pin]');
        if (!pins.length) return;

        var items = Array.prototype.map.call(pins, function (el) {
            return { el: el, stage: el.querySelector('[data-pin-stage]') || el };
        });

        var ticking = false;
        function measure() {
            items.forEach(function (it) {
                var r = it.el.getBoundingClientRect();
                var travel = r.height - global.innerHeight;
                if (travel <= 0) return;
                var p = Math.max(0, Math.min(1, -r.top / travel));
                if (it.last === p) return;
                it.last = p;
                it.el.dispatchEvent(new CustomEvent('pin', {
                    bubbles: false, detail: { progress: p }
                }));
            });
            ticking = false;
        }
        function onScroll() {
            if (ticking) return;
            ticking = true;
            global.requestAnimationFrame(measure);
        }
        global.addEventListener('scroll', onScroll, { passive: true });
        global.addEventListener('resize', onScroll);
        measure();
    }

    /* If the browser isn't running animation frames, CSS transitions never
       advance and anything waiting on one stays invisible. Measure for a
       moment and, if we're starved, drop out of transitions entirely. */
    function guardFrames() {
        var frames = 0;
        var t0 = Date.now();
        (function tick() {
            frames++;
            if (Date.now() - t0 < 1800) global.requestAnimationFrame(tick);
        })();
        global.setTimeout(function () {
            if (frames < 5) document.documentElement.classList.add('no-anim');
        }, 2000);
    }

    function init() {
        guardFrames();
        initNav();
        initReveals();
        initGalleries();
        initSwatches();
        initPins();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    global.KiloUI = { reduced: reduced, refresh: init };
})(window);
