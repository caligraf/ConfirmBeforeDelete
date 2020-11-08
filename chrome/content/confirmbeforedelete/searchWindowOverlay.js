// Import any needed modules.
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

// Load an additional JavaScript file.
Services.scriptloader.loadSubScript("chrome://confirmbeforedelete/content/confirmbeforedelete/CBD-common.js", window, "UTF-8");

if (!CBD)
    var CBD = {};

function onLoad(activatedWhileWindowOpen) {
    window.CBD.init();
    
    
    // Delete message
    if (typeof window.nsSearchResultsController != "undefined" && typeof searchResultsControllerDoCommandOrig == "undefined") {
        var searchResultsControllerDoCommandOrig = window.nsSearchResultsController.doCommand;
        window.nsSearchResultsController.doCommand = function (command) {
            if (!this.isCommandEnabled(command))
                return;
            switch (command) {
            case "button_delete":
            case "cmd_delete":
                if (CBD.checktrash(false))
                    searchResultsControllerDoCommandOrig.apply(this, arguments);
                break;
            case "cmd_shiftDelete":
                if (CBD.checktrash(true))
                    searchResultsControllerDoCommandOrig.apply(this, arguments);
                break;
            default:
                searchResultsControllerDoCommandOrig.apply(this, arguments);
            }
        };
    }
    
/*     var MsgDeleteSelectedMessagesOriginal = window.MsgDeleteSelectedMessages;
    var MsgDeleteSelectedMessages = function (aCommandType) {
        var reallyDelete;
        if (aCommandType == Components.interfaces.nsMsgViewCommandType.deleteNoTrash)
            reallyDelete = CBD.ask(true);
        else
            reallyDelete = CBD.ask(false);
        if (reallyDelete)
            MsgDeleteSelectedMessagesOriginal.apply(this, arguments);
    };
    var MsgDeleteMessageOriginal = window.MsgDeleteMessage;
    var MsgDeleteMessage = function (reallyDelete, fromToolbar) {
        var reallyDelete2;
        if (aCommandType == Components.interfaces.nsMsgViewCommandType.deleteNoTrash)
            reallyDelete2 = CBD.ask(true);
        else
            reallyDelete2 = CBD.ask(false);
        if (reallyDelete2)
            MsgDeleteMessage.apply(this, arguments);
    };
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
    } */
}

function onUnload(deactivatedWhileWindowOpen) {
  // Cleaning up the window UI is only needed when the
  // add-on is being deactivated/removed while the window
  // is still open. It can be skipped otherwise.
  if (!deactivatedWhileWindowOpen) {
    return
  }
}

CBD.checktrash = function (isButtonDeleteWithShift) {
    try {
        if (CBD.deleteLocked())
            return false;

        if (isButtonDeleteWithShift)
            return window.CBD.checkforshift();

        if (window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.enable")) {
            let nbMsg = window.gFolderDisplay.selectedCount;
            for (let i = 0; i < nbMsg; i++) {
                if (window.gFolderDisplay.selectedMessages[i].folder.getFlag(0x00000100) || window.CBD.isSubTrash(window.gFolderDisplay.selectedMessages[i].folder)) {
                    return window.CBD.confirmbeforedelete ('mailyesno');
                }
            }
        }
        
        if (window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.gotrash.enable"))
            return window.CBD.confirmbeforedelete ('gotrash');
        else
            return true;
    } catch (e) {
        window.alert(e);
    }
}

CBD.ask = function (isButtonDeleteWithShift) {
    if (window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.lock")) {
        window.alert(window.CBD.bundle.GetStringFromName("deleteLocked"));
        return false;
    } else if (isButtonDeleteWithShift) {
        if (window.CBD.prefs.getPrefType("mail.warn_on_shift_delete") || window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.shiftcanc.enable"))
            return window.CBD.confirmbeforedelete ('mailyesno');
        return true;
    } else if (window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.protect.enable")) {
        let tagKey = window.CBD.prefs.getCharPref("extensions.confirmbeforedelete.protect.tag");
        let nbMsg = window.gFolderDisplay.selectedCount;
        for (let i = 0; i < nbMsg; i++) {
            let keyw = window.gFolderDisplay.selectedMessages[i].getStringProperty("keywords");
            if (window.gFolderDisplay.selectedMessages[i].getStringProperty("keywords").indexOf(tagKey) != -1) {
                var tagName = window.CBD.tagService.getTagForKey(tagKey);
                window.alert(window.CBD.bundle.GetStringFromName("deleteTagLocked1") + " " + tagName + " " + window.CBD.bundle.GetStringFromName("deleteTagLocked2"));
                return false;
            }
        }

    }

    if (window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.enable")) {
        let nbMsg = window.gFolderDisplay.selectedCount;
        for (let i = 0; i < nbMsg; i++) {
            if (window.gFolderDisplay.selectedMessages[i].folder.getFlag(0x00000100) || window.CBD.isSubTrash(window.gFolderDisplay.selectedMessages[i].folder)) {
                return window.CBD.confirmbeforedelete ('mailyesno');
            }
        }
    }

    if (window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.gotrash.enable"))
        return window.CBD.confirmbeforedelete ('gotrash');
    return true;
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
