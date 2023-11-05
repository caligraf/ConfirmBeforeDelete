document.addEventListener("click", handleClicks);

function handleClicks(event) {
    switch (event.target.id) {
        case "button-ok":
            messenger.runtime.sendMessage({ command: "prompt.clickOk" });
            break;
        case "button-cancel":
            messenger.runtime.sendMessage({ command: "prompt.clickCancel" });
            break;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const queryString = document.location.search;
    const urlParams = new URLSearchParams(queryString);
    const message = urlParams.get('message');
   
    let cancelDefaultButton = true;
    let prefName = "extensions.confirmbeforedelete.default.cancel";
    let prefObj = await browser.storage.local.get(prefName);
    if (prefObj && prefObj[prefName] != null)
        cancelDefaultButton = prefObj[prefName];
    if( cancelDefaultButton ) {
        document.getElementById("button-cancel").style.backgroundColor="#1373d9";
        document.getElementById("button-cancel").style.color="white";
    } else {
        document.getElementById("button-ok").style.backgroundColor="#1373d9";
        document.getElementById("button-ok").style.color="white";
    }
    
     document.addEventListener('keyup', (e) => {
        if (e.key === "Enter" && !cancelDefaultButton) {
            messenger.runtime.sendMessage({ command: "prompt.clickOk" });
        } else if (e.key === "Enter" && cancelDefaultButton) {
            messenger.runtime.sendMessage({ command: "prompt.clickCancel" });
        } else if (e.key === "Escape") {
            messenger.runtime.sendMessage({ command: "prompt.clickCancel" });
        }
    });
    document.getElementById("confirmMesssage").textContent = message;
}, {
    once: true
});