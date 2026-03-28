function copyLinkText(event) {
    event.preventDefault();

    var linkText = document.getElementById("myLink").textContent;
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
    fadeObserver.observe(block);
});
