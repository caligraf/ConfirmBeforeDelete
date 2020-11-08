// Import any needed modules.
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

// Load an additional JavaScript file.
Services.scriptloader.loadSubScript("chrome://confirmbeforedelete/content/confirmbeforedelete/CBD-common.js", window, "UTF-8");

if (!CBD)
    var CBD = {};

function onLoad(activatedWhileWindowOpen) {
    
    window.CBD.init();
    
    // case message in a new window
    if (Array.isArray && typeof window.MessageWindowController != "undefined" && typeof MessageWindowControllerDoCommandOrig == "undefined") {
        var MessageWindowControllerDoCommandOrig = window.MessageWindowController.doCommand;
        window.MessageWindowController.doCommand = function (command) {
            if (!this.isCommandEnabled(command))
                return;
            switch (command) {
            case "button_delete":
            case "cmd_delete":
                if (CBD.checktrash(false))
                    MessageWindowControllerDoCommandOrig.apply(this, arguments);
                break;
            case "cmd_shiftDelete":
                if (CBD.checktrash(true))
                    MessageWindowControllerDoCommandOrig.apply(this, arguments);
                break;
            default:
                MessageWindowControllerDoCommandOrig.apply(this, arguments);
            }
        };
    }
    
    // Menu move message to trash
    if (typeof window.MsgMoveMessage != "undefined" && typeof MsgMoveMessageOrig == "undefined") {
        var MsgMoveMessageOrig = window.MsgMoveMessage;
        window.MsgMoveMessage = function (aDestFolder) {
            if (window.CBD.isSubTrash(aDestFolder) != 0) {
                if (CBD.deleteLocked() || !window.CBD.confirmbeforedelete ('gotrash'))
                    return;
            }
            MsgMoveMessageOrig.apply(this, arguments);
        };
    }
}

function onUnload(deactivatedWhileWindowOpen) {
  // Cleaning up the window UI is only needed when the
  // add-on is being deactivated/removed while the window
  // is still open. It can be skipped otherwise.
  if (!deactivatedWhileWindowOpen) {
    return
  }
}


CBD.deleteLocked = function () {
    try {
        if (window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.lock")) {
            window.alert(window.CBD.bundle.GetStringFromName("deleteLocked"));
            return true;
        } else if (window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.protect.enable")) {
            let tagKey = window.CBD.prefs.getCharPref("extensions.confirmbeforedelete.protect.tag");
            let nbMsg = window.gFolderDisplay.selectedCount;
            for (let i = 0; i < nbMsg; i++) {
                let keyw = window.gFolderDisplay.selectedMessages[i].getStringProperty("keywords");
                if (window.gFolderDisplay.selectedMessages[i].getStringProperty("keywords").indexOf(tagKey) != -1) {
                    var tagName = window.CBD.tagService.getTagForKey(tagKey);
                    window.alert(window.CBD.bundle.GetStringFromName("deleteTagLocked1") + " " + tagName + " " + window.CBD.bundle.GetStringFromName("deleteTagLocked2"));
                    return true;
                }
            }
        }
    } catch (e) {
        window.alert(e);
    }
    return false;
}

CBD.checktrash = function (isButtonDeleteWithShift) {
    try {
        if (CBD.deleteLocked())
            return false;

        var msgFol = window.GetSelectedMsgFolders()[0];
        if (!msgFol)
            return true;
        if (isButtonDeleteWithShift)
            return window.CBD.checkforshift();

        var folderTrash = (msgFol.flags & 0x00000100);
        var folderSubTrash = window.CBD.isSubTrash(msgFol);
        var isTreeFocused = false;

        if (document.getElementById("folderTree") &&
            document.getElementById("folderTree").getAttribute("focusring") == "true")
            isTreeFocused = true;

        try {
            var prefDM = "mail.server." + msgFol.server.key + ".delete_model";
            if (!folderTrash && window.CBD.prefs.getPrefType(prefDM) > 0 && window.CBD.prefs.getIntPref(prefDM) == 2)
                folderTrash = true;
        } catch (e) {}

        if (folderTrash && window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.enable"))
            return window.CBD.confirmbeforedelete ('mailyesno');
        else if (folderSubTrash && isTreeFocused && window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.enable"))
            return window.CBD.confirmbeforedelete ('folderyesno');
        else if (!folderTrash && window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.gotrash.enable"))
            return window.CBD.confirmbeforedelete ('gotrash');
        else
            return true;
    } catch (e) {
        window.alert(e)
    }
}
