/* Kilo concept prototypes — shared preview chrome.
 * Injects the back-to-gallery pill, hides it when embedded in the gallery,
 * and wires keyboard navigation so concepts can be flicked through fullscreen. */
(function (global) {
    'use strict';

    var MANIFEST = [
        { n: 1, file: '01-plate-calculator.html', title: 'Plate Calculator Hero',
          idea: 'Idea 3', accent: '#ff4d52' },
        { n: 2, file: '02-loaded-scroll.html',    title: 'Plate-Loaded Scroll',
          idea: 'Ideas 1 + 6', accent: '#408cff' },
        { n: 3, file: '03-your-number.html',      title: 'Your Number First',
          idea: 'Idea 17', accent: '#c6f24e' },
        { n: 4, file: '04-drag-to-lift.html',     title: 'Drag to Lift',
          idea: 'Ideas 7 + 10', accent: '#ffd959' },
        { n: 5, file: '05-numerals.html',         title: 'Numerals Only',
          idea: 'Ideas 13 + 16', accent: '#eae8e3' }
    ];

    var embedded = false;
    try { embedded = global.self !== global.top; } catch (e) { embedded = true; }

    function current() {
        var path = global.location.pathname.split('/').pop();
        for (var i = 0; i < MANIFEST.length; i++) {
            if (MANIFEST[i].file === path) return i;
        }
        return -1;
    }

    function go(index) {
        var wrapped = (index + MANIFEST.length) % MANIFEST.length;
        global.location.href = MANIFEST[wrapped].file;
    }

    function init() {
        var idx = current();

        if (embedded) {
            document.body.classList.add('embedded');
        } else if (idx >= 0) {
            // The gallery loads this file too, only for MANIFEST — it should not
            // get a "back to gallery" pill pointing at itself.
            var pill = document.createElement('a');
            pill.className = 'concept-back';
            pill.href = './';
            pill.innerHTML = '<span aria-hidden="true">←</span> All concepts' +
                ' <span style="opacity:.45">· ' + (idx + 1) + '/' + MANIFEST.length +
                ' · ← → to switch</span>';
            document.body.appendChild(pill);

            document.addEventListener('keydown', function (e) {
                if (e.metaKey || e.ctrlKey || e.altKey) return;
                var tag = (e.target.tagName || '').toLowerCase();
                if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;

                if (e.key === 'ArrowRight') { go(idx + 1); }
                else if (e.key === 'ArrowLeft') { go(idx - 1); }
                else if (e.key === 'Escape') { global.location.href = './'; }
                else if (/^[1-5]$/.test(e.key)) { go(parseInt(e.key, 10) - 1); }
            });
        }

        // Let the gallery label its own frames without re-parsing the manifest.
        if (embedded && global.parent) {
            try {
                global.parent.postMessage({ kiloConcept: current() }, '*');
            } catch (e) { /* cross-origin, not important */ }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    global.KiloConcepts = { MANIFEST: MANIFEST, embedded: embedded };
})(window);
