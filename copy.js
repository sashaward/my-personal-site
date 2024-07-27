function copyLinkText(event) {
    event.preventDefault(); // Prevent default link behavior

    // Get the link text
    var linkText = document.getElementById("myLink").textContent;
    var tooltip = document.getElementById("tooltipText");

    // Copy the text to the clipboard
    navigator.clipboard.writeText(linkText).then(function() {
        // Change tooltip text to "Copied"
        tooltip.textContent = "Copied 👍 ";

        // Reset tooltip text after a delay
        setTimeout(function() {
            tooltip.textContent = "Copy";
        }, 2000);
    }).catch(function(err) {
        console.error('Could not copy text: ', err);
    });
}