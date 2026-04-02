function copyLinkText(event) {
    event.preventDefault();

    var el = document.getElementById("myLink");
    var linkText = el && el.dataset.copyEmail ? el.dataset.copyEmail : el.textContent;
    var container = event.currentTarget.closest('.tooltip');
    var tooltip = container ? container.querySelector('.tooltiptext') : document.getElementById("tooltipText");
    var originalText = tooltip.textContent;

    navigator.clipboard.writeText(linkText).then(function() {
        tooltip.textContent = "Copied 👍";

        setTimeout(function() {
            tooltip.textContent = originalText;
        }, 2000);
    }).catch(function(err) {
        console.error('Could not copy text: ', err);
    });
}

const fadeObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                fadeObserver.unobserve(entry.target);
            }
        });
    },
    { threshold: 0.1 }
);

document.querySelectorAll('.fade-in-block').forEach((block) => {
    if (block.classList.contains('work-card') && block.classList.contains('monzo')) {
        return;
    }
    fadeObserver.observe(block);
});

(function revealMonzoCardOnLoad() {
    var monzoCard = document.querySelector('.work-card.monzo.fade-in-block');
    if (!monzoCard) {
        return;
    }
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function reveal() {
        monzoCard.classList.add('visible');
    }
    if (reducedMotion) {
        reveal();
    } else {
        requestAnimationFrame(function () {
            requestAnimationFrame(reveal);
        });
    }
})();

(function initBentoCarousel() {
    var root = document.querySelector('[data-bento-carousel]');
    if (!root) {
        return;
    }

    var chrome = root.querySelector('.bento-carousel__chrome');
    var viewport = root.querySelector('.bento-carousel__viewport');
    var slides = root.querySelectorAll('.bento-carousel__slide');
    var dotsInner = root.querySelector('.bento-carousel__dots-inner');
    var dotButtons = root.querySelectorAll('.bento-carousel__dot');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var slidesEl = root.querySelector('.bento-carousel__slides');
    if (!chrome || !viewport || !slides.length || !dotsInner || !slidesEl) {
        return;
    }

    var slideEndListener = null;
    var settleEndListener = null;
    var txGen = 0;

    function removeCarouselTxListeners() {
        if (slideEndListener) {
            slidesEl.removeEventListener('transitionend', slideEndListener);
            slideEndListener = null;
        }
        if (settleEndListener) {
            slidesEl.removeEventListener('transitionend', settleEndListener);
            settleEndListener = null;
        }
    }

    function setSlideTransformOrigin() {
        var step = parseFloat(window.getComputedStyle(root).getPropertyValue('--bento-carousel-step-y'));
        if (!Number.isFinite(step) || step <= 0) {
            slidesEl.style.transformOrigin = '';
            return;
        }
        var g = parseFloat(window.getComputedStyle(root).getPropertyValue('--bento-carousel-gap'));
        if (!Number.isFinite(g)) {
            g = 16;
        }
        var slotH = step - g;
        var y = current * step + slotH * 0.5;
        slidesEl.style.transformOrigin = '50% ' + y + 'px';
    }

    function syncCarouselStep() {
        var h = viewport.getBoundingClientRect().height;
        if (h <= 0) {
            return;
        }
        var g = parseFloat(
            window.getComputedStyle(root).getPropertyValue('--bento-carousel-gap')
        );
        if (!Number.isFinite(g)) {
            g = 16;
        }
        root.style.setProperty('--bento-carousel-step-y', h + g + 'px');
        setSlideTransformOrigin();
    }

    var physicalCount = slides.length;
    var logicalCount = dotButtons.length;
    if (logicalCount < 2 || physicalCount !== logicalCount + 1) {
        return;
    }

    var current = 0;
    var intervalMs = 4000;
    var timerId = null;

    function physicalToLogical(p) {
        return p % logicalCount;
    }

    function updateStripCssVars() {
        root.style.setProperty('--bento-carousel-strip-index', String(current));
        root.style.setProperty('--bento-carousel-active', String(physicalToLogical(current)));
    }

    function applyAccessibility() {
        slides.forEach(function (slide, i) {
            slide.setAttribute('aria-hidden', i === current ? 'false' : 'true');
        });
        var logical = physicalToLogical(current);
        dotButtons.forEach(function (btn, i) {
            var on = i === logical;
            btn.setAttribute('aria-selected', on ? 'true' : 'false');
            btn.tabIndex = on ? 0 : -1;
        });
    }

    function resetToLoopStartWithoutAnimation() {
        removeCarouselTxListeners();
        txGen += 1;
        root.style.setProperty('--bento-carousel-tx-dur', '0s');
        root.style.setProperty('--bento-carousel-scale', '1');
        current = 0;
        updateStripCssVars();
        applyAccessibility();
        setSlideTransformOrigin();
        void slidesEl.offsetHeight;
        root.style.setProperty('--bento-carousel-tx-dur', '0.55s');
    }

    function goToPhysical(nextPhysical, opts) {
        opts = opts || {};
        var instant = opts.instant === true;
        var prev = current;
        if (nextPhysical === prev && !opts.force) {
            return;
        }

        current = nextPhysical;
        updateStripCssVars();
        applyAccessibility();
        setSlideTransformOrigin();

        var changed = nextPhysical !== prev;

        if (reduceMotion || !changed || instant) {
            removeCarouselTxListeners();
            root.style.setProperty('--bento-carousel-scale', '1');
            root.style.setProperty('--bento-carousel-tx-dur', '0s');
            void slidesEl.offsetHeight;
            root.style.setProperty('--bento-carousel-tx-dur', '0.55s');
            return;
        }

        removeCarouselTxListeners();
        txGen += 1;
        var myGen = txGen;

        root.style.setProperty('--bento-carousel-tx-dur', '0.55s');
        root.style.setProperty('--bento-carousel-scale', '0.97');

        slideEndListener = function onSlideEnd(e) {
            if (e.target !== slidesEl || e.propertyName !== 'transform') {
                return;
            }
            if (myGen !== txGen) {
                return;
            }
            slidesEl.removeEventListener('transitionend', slideEndListener);
            slideEndListener = null;

            root.style.setProperty('--bento-carousel-tx-dur', '0.32s');
            window.requestAnimationFrame(function () {
                if (myGen !== txGen) {
                    return;
                }
                root.style.setProperty('--bento-carousel-scale', '1');
            });

            settleEndListener = function onSettleEnd(e2) {
                if (e2.target !== slidesEl || e2.propertyName !== 'transform') {
                    return;
                }
                if (myGen !== txGen) {
                    return;
                }
                slidesEl.removeEventListener('transitionend', settleEndListener);
                settleEndListener = null;

                if (current === logicalCount) {
                    resetToLoopStartWithoutAnimation();
                    return;
                }

                root.style.setProperty('--bento-carousel-tx-dur', '0.55s');
            };
            slidesEl.addEventListener('transitionend', settleEndListener);
        };
        slidesEl.addEventListener('transitionend', slideEndListener);
    }

    function next() {
        if (reduceMotion) {
            if (current === logicalCount) {
                goToPhysical(0, { instant: true });
                return;
            }
            var logical = physicalToLogical(current);
            goToPhysical((logical + 1) % logicalCount, { instant: true });
            return;
        }
        if (current === logicalCount) {
            return;
        }
        if (current === logicalCount - 1) {
            goToPhysical(logicalCount);
        } else {
            goToPhysical(current + 1);
        }
    }

    function restartTimer() {
        if (reduceMotion || logicalCount < 2) {
            return;
        }
        if (timerId !== null) {
            window.clearInterval(timerId);
        }
        timerId = window.setInterval(next, intervalMs);
    }

    root.style.setProperty('--bento-carousel-count', String(physicalCount));
    goToPhysical(0, { force: true });

    syncCarouselStep();
    window.requestAnimationFrame(function () {
        syncCarouselStep();
        window.requestAnimationFrame(syncCarouselStep);
    });
    window.addEventListener('resize', syncCarouselStep);

    if (typeof ResizeObserver !== 'undefined') {
        var ro = new ResizeObserver(syncCarouselStep);
        ro.observe(viewport);
    }

    root.addEventListener('click', function (e) {
        if (e.target.closest('.bento-carousel__dots-buttons')) {
            return;
        }
        next();
        restartTimer();
    });

    chrome.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') {
            return;
        }
        e.preventDefault();
        next();
        restartTimer();
    });

    dotButtons.forEach(function (btn, i) {
        btn.addEventListener('click', function () {
            goToPhysical(i, { instant: true });
            restartTimer();
        });
    });

    if (!reduceMotion && logicalCount > 1) {
        restartTimer();
    }

    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            if (timerId !== null) {
                window.clearInterval(timerId);
                timerId = null;
            }
        } else {
            restartTimer();
        }
    });
})();

(function initLogisticianTooltipPointerFollow() {
    var cell = document.querySelector('.bento-cell--logistician');
    if (!cell) {
        return;
    }
    var inner = cell.querySelector('.bento-cell__inner--logistician');
    var badge = cell.querySelector('.bento-personality-badge');
    if (!inner || !badge) {
        return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    var trackingClass = 'is-logistician-pointer-tracking';
    var springDurationMs = 680;
    var springEasing = 'cubic-bezier(0.34, 1.45, 0.32, 1)';
    var maxOffset = 36;
    var followStrength = 0.52;
    var smoothFactor = 0.17;
    var settleEpsilonSq = 0.02 * 0.02;
    var fallbackTimerId = null;
    var smoothRafId = null;
    var targetTx = 0;
    var targetTy = 0;
    var currentTx = 0;
    var currentTy = 0;

    function clearFallbackTimer() {
        if (fallbackTimerId !== null) {
            window.clearTimeout(fallbackTimerId);
            fallbackTimerId = null;
        }
    }

    function cancelSmoothLoop() {
        if (smoothRafId !== null) {
            window.cancelAnimationFrame(smoothRafId);
            smoothRafId = null;
        }
    }

    function readTransformFromBadge() {
        var tr = window.getComputedStyle(badge).transform;
        if (!tr || tr === 'none') {
            return { x: 0, y: 0 };
        }
        var m = tr.match(/^matrix\(([^)]+)\)$/);
        if (m) {
            var p = m[1].split(',').map(Number);
            return { x: p[4], y: p[5] };
        }
        m = tr.match(/^matrix3d\(([^)]+)\)$/);
        if (m) {
            var q = m[1].split(',').map(Number);
            return { x: q[12], y: q[13] };
        }
        return { x: 0, y: 0 };
    }

    function finishTracking() {
        clearFallbackTimer();
        cancelSmoothLoop();
        badge.removeEventListener('transitionend', onSpringTransitionEnd);
        badge.style.transition = '';
        badge.style.transform = '';
        cell.classList.remove(trackingClass);
        targetTx = 0;
        targetTy = 0;
        currentTx = 0;
        currentTy = 0;
    }

    function onSpringTransitionEnd(e) {
        if (e.propertyName !== 'transform') {
            return;
        }
        finishTracking();
    }

    function computeTarget(clientX, clientY) {
        var rect = inner.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
            return null;
        }
        var cx = rect.left + rect.width * 0.5;
        var cy = rect.top + rect.height * 0.5;
        var nx = (clientX - cx) / (rect.width * 0.5);
        var ny = (clientY - cy) / (rect.height * 0.5);
        nx = Math.max(-1, Math.min(1, nx));
        ny = Math.max(-1, Math.min(1, ny));
        return {
            tx: nx * maxOffset * followStrength,
            ty: ny * maxOffset * followStrength
        };
    }

    function smoothTick() {
        smoothRafId = null;
        var dx = targetTx - currentTx;
        var dy = targetTy - currentTy;
        if (dx * dx + dy * dy <= settleEpsilonSq) {
            currentTx = targetTx;
            currentTy = targetTy;
            badge.style.transform = 'translate3d(' + currentTx + 'px,' + currentTy + 'px,0)';
            return;
        }
        currentTx += dx * smoothFactor;
        currentTy += dy * smoothFactor;
        badge.style.transform = 'translate3d(' + currentTx + 'px,' + currentTy + 'px,0)';
        smoothRafId = window.requestAnimationFrame(smoothTick);
    }

    function queueSmooth() {
        if (smoothRafId === null) {
            smoothRafId = window.requestAnimationFrame(smoothTick);
        }
    }

    function onPointerMove(e) {
        if (!e.isPrimary) {
            return;
        }
        var t = computeTarget(e.clientX, e.clientY);
        if (!t) {
            return;
        }
        targetTx = t.tx;
        targetTy = t.ty;
        queueSmooth();
    }

    function onPointerEnter(e) {
        if (!e.isPrimary) {
            return;
        }
        clearFallbackTimer();
        badge.removeEventListener('transitionend', onSpringTransitionEnd);
        var pos = readTransformFromBadge();
        cell.classList.add(trackingClass);
        badge.style.transition = 'none';
        currentTx = pos.x;
        currentTy = pos.y;
        var t = computeTarget(e.clientX, e.clientY);
        if (t) {
            targetTx = t.tx;
            targetTy = t.ty;
        }
        inner.addEventListener('pointermove', onPointerMove);
        queueSmooth();
    }

    function onPointerLeave(e) {
        if (!e.isPrimary) {
            return;
        }
        inner.removeEventListener('pointermove', onPointerMove);
        cancelSmoothLoop();
        badge.removeEventListener('transitionend', onSpringTransitionEnd);
        clearFallbackTimer();
        badge.style.transition = 'none';
        badge.style.transform = 'translate3d(' + currentTx + 'px,' + currentTy + 'px,0)';
        void badge.offsetWidth;
        badge.style.transition = 'transform ' + springDurationMs + 'ms ' + springEasing;
        badge.addEventListener('transitionend', onSpringTransitionEnd);
        fallbackTimerId = window.setTimeout(finishTracking, springDurationMs + 80);
        window.requestAnimationFrame(function () {
            badge.style.transform = 'translate3d(0,0,0)';
        });
    }

    inner.addEventListener('pointerenter', onPointerEnter);
    inner.addEventListener('pointerleave', onPointerLeave);
})();
