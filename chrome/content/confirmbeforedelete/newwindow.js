// Import any needed modules.
var Services = globalThis.Services || ChromeUtils.import(
        "resource://gre/modules/Services.jsm").Services;

// Load an additional JavaScript file.
Services.scriptloader.loadSubScript("chrome://confirmbeforedelete/content/confirmbeforedelete/CBD-common.js", window, "UTF-8");

if (!CBD)
    var CBD = {};

function onLoad(activatedWhileWindowOpen) {

    window.CBD.init2();

    // butons delete and menu edit delete
    window.addEventListener("keydown", function (event) {
        if (event.key == "Delete") {
            if (!window.CBD.checkdelete(event.shiftKey)) {
                event.preventDefault();
                event.stopPropagation();
            }
        }
    }, true); // first to capture event
}

function onUnload(deactivatedWhileWindowOpen) {
    // Cleaning up the window UI is only needed when the
    // add-on is being deactivated/removed while the window
    // is still open. It can be skipped otherwise.
    if (!deactivatedWhileWindowOpen) {
        return
    }
}
