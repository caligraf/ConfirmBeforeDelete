var MsgDeleteSelectedMessagesOriginal = MsgDeleteSelectedMessages;
var MsgDeleteSelectedMessages = function (aCommandType) {
    var reallyDelete;
    if (aCommandType == Components.interfaces.nsMsgViewCommandType.deleteNoTrash)
        reallyDelete = CBD.ask(true);
    else
        reallyDelete = CBD.ask(false);
    if (reallyDelete)
        MsgDeleteSelectedMessagesOriginal.apply(this, arguments);
};

var CBD = {

    init: function () {
        CBD.prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
        var strBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
        CBD.bundle = strBundleService.createBundle("chrome://confirmbeforedelete/locale/confirmbeforedelete.properties");
        CBD.tagService = Cc["@mozilla.org/messenger/tagservice;1"].getService(Ci.nsIMsgTagService);
    },

    confirm: function (string) {
        var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
            .getService(Components.interfaces.nsIPromptService);
        var canceldefault = CBD.prefs.getBoolPref("extensions.confirmbeforedelete.default.cancel");
        if (canceldefault)
            // This is the prompt with "Cancel" as default
            var flags = prompts.BUTTON_TITLE_OK * prompts.BUTTON_POS_0 +
                prompts.BUTTON_TITLE_CANCEL * prompts.BUTTON_POS_1 + prompts.BUTTON_POS_1_DEFAULT;
        else
            // This is the prompt with "OK" as default
            var flags = prompts.BUTTON_TITLE_OK * prompts.BUTTON_POS_0 +
                prompts.BUTTON_TITLE_CANCEL * prompts.BUTTON_POS_1;
        var wintitle = CBD.bundle.GetStringFromName("wintitle");
        var button = prompts.confirmEx(window, wintitle, string, flags, "Button 0", "Button 1", "", null, {});
        if (button == 1)
            return false;
        else
            return true;
    },

    ask: function (isButtonDeleteWithShift) {
        if (CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.lock")) {
            alert(CBD.bundle.GetStringFromName("deleteLocked"));
            return false;
        } else if (isButtonDeleteWithShift) {
            return CBD.checkforshift();
        } else if (CBD.prefs.getBoolPref("extensions.confirmbeforedelete.protect.enable")) {
            let tagKey = CBD.prefs.getCharPref("extensions.confirmbeforedelete.protect.tag");
            let nbMsg = gFolderDisplay.selectedCount;
            for (let i = 0; i < nbMsg; i++) {
                let keyw = gFolderDisplay.selectedMessages[i].getStringProperty("keywords");
                if (gFolderDisplay.selectedMessages[i].getStringProperty("keywords").indexOf(tagKey) != -1) {
                    var tagName = CBD.tagService.getTagForKey(tagKey);
                    alert(CBD.bundle.GetStringFromName("deleteTagLocked1") + " " + tagName + " " + CBD.bundle.GetStringFromName("deleteTagLocked2"));
                    return false;
                }
            }

        }

        if (CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.enable")) {
            let nbMsg = gFolderDisplay.selectedCount;
            for (let i = 0; i < nbMsg; i++) {
                if (gFolderDisplay.selectedMessages[i].folder.getFlag(0x00000100) || CBD.isSubTrash(gFolderDisplay.selectedMessages[i].folder)) {
                    return CBD.confirmbeforedelete('mailyesno');
                }
            }
        }
        
        if (CBD.prefs.getBoolPref("extensions.confirmbeforedelete.gotrash.enable"))
            return CBD.confirmbeforedelete('gotrash');
        return true;
    },

    isSubTrash: function (msgFolder) {
        var rootFolder = msgFolder;
        var isTrash = false;
        while (!rootFolder.parent.isServer) {
            rootFolder = rootFolder.parent;
            if (rootFolder.flags & 0x00000100) {
                isTrash = true;
                break;
            }
        }
        if (!isTrash)
            isTrash = rootFolder.flags & 0x00000100;
        return isTrash;
    },

    confirmbeforedelete: function (type) {
        return CBD.confirm(CBD.bundle.GetStringFromName(type));
    },

    checkforshift: function () {
        if (!CBD.prefs.getBoolPref("extensions.confirmbeforedelete.shiftcanc.enable"))
            return true;
        return CBD.confirmbeforedelete('mailyesno')
    }
};

window.addEventListener("load", CBD.init, false);