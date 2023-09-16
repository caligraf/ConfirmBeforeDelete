// Import any needed modules.
var Services = globalThis.Services || ChromeUtils.import(
  "resource://gre/modules/Services.jsm"
).Services;

// Load an additional JavaScript file.
Services.scriptloader.loadSubScript("chrome://confirmbeforedelete/content/confirmbeforedelete/CBD-common.js", window, "UTF-8");

if (!CBD)
    var CBD = {};

function onLoad(activatedWhileWindowOpen) {
    window.CBD.init2();
    
    
    // Delete message
    if (typeof window.nsSearchResultsController != "undefined" && typeof searchResultsControllerDoCommandOrig == "undefined") {
        var searchResultsControllerDoCommandOrig = window.nsSearchResultsController.doCommand;
        window.nsSearchResultsController.doCommand = function (command) {
            if (!this.isCommandEnabled(command))
                return;
            switch (command) {
            case "button_delete":
            case "cmd_delete":
                if (window.CBD.checkdelete(false))
                    searchResultsControllerDoCommandOrig.apply(this, arguments);
                break;
            case "cmd_shiftDelete":
                if (window.CBD.checkdelete(true))
                    searchResultsControllerDoCommandOrig.apply(this, arguments);
                break;
            default:
                searchResultsControllerDoCommandOrig.apply(this, arguments);
            }
        };
    }
}

function onUnload(deactivatedWhileWindowOpen) {
  if (!deactivatedWhileWindowOpen) {
    return
  }
}


