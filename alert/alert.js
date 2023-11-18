document.addEventListener("click", handleClicks);

function handleClicks(event) {
    switch (event.target.id) {
        case "button-ok":
            messenger.runtime.sendMessage({ command: "prompt.clickOk" });
            break;
    }
}
document.addEventListener('DOMContentLoaded', () => {
    const queryString = document.location.search;
    const urlParams = new URLSearchParams(queryString);
    const message = urlParams.get('message');
    document.getElementById("alertMessage").textContent = message;
    
    document.addEventListener('keyup', (e) => {
       if (e.key === "Enter" || e.key === "Escape") 
           messenger.runtime.sendMessage({ command: "prompt.clickOk" });
    });
     
    document.getElementById("button-ok").focus();
}, {
    once: true
});