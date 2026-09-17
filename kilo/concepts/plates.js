/* Kilo concept prototypes — plate maths + barbell renderer.
 *
 * calculatePlates() is a direct port of KiloTracker/Models/PlateCalculator.swift:
 * an exact minimum-plate solution per side via coin-change DP in 0.5kg units,
 * tie-broken toward heavier plates. Greedy is wrong for some targets, so we
 * keep the DP rather than approximating it.
 */
(function (global) {
    'use strict';

    // weight -> colour, thickness and diameter. Colours come from Theme.swift;
    // the geometry is tuned for legibility on screen rather than scale-accurate.
    var SPECS = [
        { kg: 25,  color: '#ff4d52', th: 34, dia: 200, label: '25' },
        { kg: 20,  color: '#408cff', th: 28, dia: 190, label: '20' },
        { kg: 15,  color: '#ffd959', th: 23, dia: 176, label: '15' },
        { kg: 10,  color: '#59e6b3', th: 19, dia: 158, label: '10' },
        { kg: 5,   color: '#a6a6b3', th: 15, dia: 130, label: '5'  },
        { kg: 2.5, color: '#ff4d52', th: 9,  dia: 96,  label: '2.5' },
        { kg: 2,   color: '#408cff', th: 8,  dia: 88,  label: '2'  },
        { kg: 1.5, color: '#ffd959', th: 7,  dia: 80,  label: '1.5' },
        { kg: 1,   color: '#59e6b3', th: 6,  dia: 72,  label: '1'  },
        { kg: 0.5, color: '#f5f5f7', th: 5,  dia: 64,  label: '0.5' }
    ];

    var BUMPERS = [25, 20, 15, 10, 5];

    function specFor(kg) {
        for (var i = 0; i < SPECS.length; i++) if (SPECS[i].kg === kg) return SPECS[i];
        return SPECS[4];
    }

    function units(kg) { return Math.round(kg / 0.5); }

    /** Available plates for a rounding increment, descending. */
    function plateOrder(increment) {
        var micros;
        if (increment === 1 || increment === 0.5) micros = [2.5, 2, 1.5, 1, 0.5];
        else micros = [2.5];
        return BUMPERS.concat(micros);
    }

    function roundTo(value, increment) {
        return Math.round(value / increment) * increment;
    }

    /** Exact minimum-plate solution for one side. Returns { kg: count }. */
    function minPlateCounts(perSideKg, available) {
        var target = units(perSideKg);
        if (target <= 0) return {};

        // Descending units so equal-count ties resolve toward heavier plates.
        var coins = available
            .map(function (kg) { return { units: units(kg), kg: kg }; })
            .sort(function (a, b) { return b.units - a.units; });

        var INF = Infinity;
        var dp = new Array(target + 1).fill(INF);
        var prev = new Array(target + 1).fill(-1);
        dp[0] = 0;

        for (var i = 1; i <= target; i++) {
            for (var c = 0; c < coins.length; c++) {
                var coin = coins[c];
                if (coin.units <= 0 || i < coin.units) continue;
                var candidate = dp[i - coin.units] + 1;
                if (candidate < dp[i]) { dp[i] = candidate; prev[i] = c; }
            }
        }
        if (dp[target] === INF) return {};

        var counts = {};
        var cur = target;
        while (cur > 0) {
            var idx = prev[cur];
            if (idx < 0) break;
            var used = coins[idx];
            counts[used.kg] = (counts[used.kg] || 0) + 1;
            cur -= used.units;
        }
        return counts;
    }

    /**
     * @param {number} totalWeight  Target total including the bar, in kg.
     * @param {object} [opts]  { barWeight = 20, increment = 2.5, snapOnce = false }
     *
     * snapOnce skips the pre-round of the target. The app rounds twice — the total
     * to the increment, then the per-side load to the smallest plate — and both
     * roundings can go the same way: 50% of 142.5kg is 71.25, which double-rounds
     * up to 75 when the nearest weight you can actually load is 70. Pass
     * snapOnce: true wherever the input is a derived number (a percentage of a max)
     * rather than something the lifter typed.
     * @returns {{ plates: Array, perSide: Array, totalWeight: number, barWeight: number, loadable: boolean }}
     *   plates[] carry the full count (both sides); perSide[] the per-side count.
     */
    function calculatePlates(totalWeight, opts) {
        opts = opts || {};
        var barWeight = opts.barWeight === undefined ? 20 : opts.barWeight;
        var increment = opts.increment === undefined ? 2.5 : opts.increment;

        var available = plateOrder(increment);
        var smallest = Math.min.apply(null, available);

        var target = opts.snapOnce ? totalWeight : roundTo(totalWeight, increment);
        var plateWeight = Math.max(0, target - barWeight);
        var perSideKg = plateWeight / 2;
        var roundedPerSide = Math.round(perSideKg / smallest) * smallest;
        var actualTotal = roundedPerSide * 2 + barWeight;

        var counts = minPlateCounts(roundedPerSide, available);
        var perSide = Object.keys(counts)
            .map(parseFloat)
            .sort(function (a, b) { return b - a; })
            .map(function (kg) {
                var spec = specFor(kg);
                return { weight: kg, count: counts[kg], color: spec.color, spec: spec };
            });

        return {
            plates: perSide.map(function (p) {
                return { weight: p.weight, count: p.count * 2, color: p.color, spec: p.spec };
            }),
            perSide: perSide,
            totalWeight: actualTotal,
            barWeight: barWeight,
            loadable: actualTotal >= barWeight
        };
    }

    /** Flat per-side list, innermost (heaviest) first — the order they go on the bar. */
    function loadOrder(config) {
        var out = [];
        config.perSide.forEach(function (p) {
            for (var i = 0; i < p.count; i++) out.push(p.spec);
        });
        return out;
    }

    /**
     * Render a loaded barbell as SVG, viewed head-on.
     * @param {object} [opts] { showLabels = true, animate = true, sleeveOnly = false }
     */
    function renderBar(config, opts) {
        opts = opts || {};
        var showLabels = opts.showLabels !== false;
        var animate = opts.animate !== false;

        var side = loadOrder(config);
        // Proportioned like a real 2.2m bar: the grip section is most of the length
        // and the plates sit out at the ends. Short shafts read as a dumbbell.
        var W = 1600, H = 300, cy = H / 2;
        var shaftHalf = 350;  // half-length of the bare grip section
        var collarW = 18;

        // Lay plates outward from the centre so the heaviest sit innermost.
        var stack = [];
        var x = shaftHalf;
        side.forEach(function (spec, i) {
            stack.push({ spec: spec, x0: x, i: i });
            x += spec.th + 2;
        });
        var loadedW = x - shaftHalf;
        var sleeveEnd = shaftHalf + Math.max(loadedW + collarW + 30, 170);

        // Scale down if the load runs past the viewBox.
        var scale = Math.min(1, (W / 2 - 20) / sleeveEnd);

        var parts = [];
        parts.push('<svg class="kbar" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Barbell loaded to ' +
            fmt(config.totalWeight) + ' kilograms">');
        parts.push('<defs>' +
            '<linearGradient id="kbar-steel" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#d7dae0"/><stop offset="0.45" stop-color="#9ea2ab"/>' +
            '<stop offset="0.55" stop-color="#83878f"/><stop offset="1" stop-color="#5e626a"/>' +
            '</linearGradient>' +
            '<linearGradient id="kbar-gloss" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#fff" stop-opacity="0.34"/>' +
            '<stop offset="0.42" stop-color="#fff" stop-opacity="0.06"/>' +
            '<stop offset="1" stop-color="#000" stop-opacity="0.34"/>' +
            '</linearGradient>' +
            '</defs>');

        parts.push('<g transform="translate(' + (W / 2) + ' 0) scale(' + scale + ' ' + scale + ')">');

        // Shaft, drawn full width so it reads as continuous behind the plates.
        parts.push('<rect x="' + (-sleeveEnd) + '" y="' + (cy - 8) + '" width="' + (sleeveEnd * 2) +
            '" height="16" rx="8" fill="url(#kbar-steel)"/>');

        // Knurling, in the two grip bands and the centre knurl only — where it is on a real bar.
        // It is Kilo's one decorative motif, so it should be accurate.
        [[-40, 40], [-250, -110], [110, 250]].forEach(function (band) {
            parts.push('<g opacity="0.45">');
            for (var kx = band[0]; kx < band[1] - 4; kx += 7) {
                parts.push('<line x1="' + kx + '" y1="' + (cy - 7) + '" x2="' + (kx + 5) + '" y2="' + (cy + 7) +
                    '" stroke="#26282c" stroke-width="1.7"/>');
            }
            parts.push('</g>');
        });

        ['-1', '1'].forEach(function (dir) {
            var s = parseFloat(dir);
            parts.push('<g transform="scale(' + s + ' 1)">');

            stack.forEach(function (item) {
                var spec = item.spec;
                var h = spec.dia;
                var y = cy - h / 2;
                var delay = animate ? (item.i * 0.055) : 0;
                var style = animate
                    ? ' style="animation-delay:' + delay.toFixed(3) + 's"'
                    : '';
                // Two nested groups on purpose: a CSS `transform` in a keyframe
                // overrides the SVG transform ATTRIBUTE, so animating the same
                // element that carries the position makes plates fly in from the
                // centre of the bar. The outer group holds position, the inner
                // one is what the animation is allowed to touch.
                parts.push('<g transform="translate(' + item.x0 + ' 0)">');
                parts.push('<g class="kbar__plate"' + style + '>');
                parts.push('<rect x="0" y="' + y + '" width="' + spec.th + '" height="' + h +
                    '" rx="' + Math.min(7, spec.th / 2) + '" fill="' + spec.color + '"/>');
                parts.push('<rect x="0" y="' + y + '" width="' + spec.th + '" height="' + h +
                    '" rx="' + Math.min(7, spec.th / 2) + '" fill="url(#kbar-gloss)"/>');
                parts.push('</g></g>');
            });

            // Collar sits outside the last plate.
            var collarX = shaftHalf + loadedW + 5;
            parts.push('<rect x="' + collarX + '" y="' + (cy - 30) + '" width="' + collarW +
                '" height="60" rx="6" fill="url(#kbar-steel)"/>');
            parts.push('</g>');
        });

        parts.push('</g>');

        if (showLabels) {
            parts.push('<text class="kbar__total tnum" x="' + (W / 2) + '" y="' + (H - 6) +
                '" text-anchor="middle">' + fmt(config.totalWeight) + ' kg</text>');
        }
        parts.push('</svg>');
        return parts.join('');
    }

    /** Per-side breakdown as "2 × 25, 1 × 10" — how a lifter actually reads a load. */
    function describe(config) {
        if (!config.perSide.length) return 'Empty bar — ' + fmt(config.barWeight) + ' kg';
        return config.perSide.map(function (p) {
            return p.count + ' × ' + fmt(p.weight);
        }).join('  ·  ') + '  per side';
    }

    function fmt(n) {
        return (Math.round(n * 100) / 100).toString();
    }

    global.Kilo = global.Kilo || {};
    global.Kilo.SPECS = SPECS;
    global.Kilo.calculatePlates = calculatePlates;
    global.Kilo.renderBar = renderBar;
    global.Kilo.loadOrder = loadOrder;
    global.Kilo.describe = describe;
    global.Kilo.fmt = fmt;
    global.Kilo.roundTo = roundTo;
})(window);
