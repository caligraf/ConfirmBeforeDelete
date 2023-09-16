// Import any needed modules.
var Services = globalThis.Services || ChromeUtils.import(
        "resource://gre/modules/Services.jsm").Services;
var {
    MailServices
} = ChromeUtils.import("resource:///modules/MailServices.jsm");

// Load an additional JavaScript file.
Services.scriptloader.loadSubScript("chrome://confirmbeforedelete/content/confirmbeforedelete/CBD-common.js", window, "UTF-8");

if (!CBD)
    var CBD = {};

function onLoad(activatedWhileWindowOpen) {

    window.CBD.init();

    // calendar
    if (typeof window.calendarViewController != "undefined" && typeof calendarViewControllerDeleteOccurrencesOrig == "undefined") {
        var calendarViewControllerDeleteOccurrencesOrig = window.calendarViewController.deleteOccurrences;
        window.calendarViewController.deleteOccurrences = function (aCount, aUseParentItems, aDoNotConfirm) {
            if (CBD.checkForCalendar())
                calendarViewControllerDeleteOccurrencesOrig.apply(this, arguments);
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

CBD.areFoldersLockedWhenEmptyingTrash = function () {
    if (!window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.folders.lock"))
        return false;
    try {
        var msgFolder = window.GetSelectedMsgFolders()[0];
        if (msgFolder) {
            var rootFolder = msgFolder.rootFolder;
            var len = {};
            if (rootFolder.getFoldersWithFlag)
                var trashFolder = rootFolder.getFoldersWithFlag(0x00000100, 1, len);
            else
                var trashFolder = msgFolder.getFolderWithFlags(0x00000100);
            if (trashFolder && trashFolder.hasSubFolders) {
                window.alert(window.CBD.bundle.GetStringFromName("cantEmptyTrash") + window.CBD.bundle.GetStringFromName("lockedFolder"));
                return true;
            }
        }
    } catch (e) {}
    return false;
}

CBD.checkforfolder = function () {
    var folder = window.GetSelectedMsgFolders()[0];
    var folderSubTrash = window.CBD.isSubTrash(folder);
    if (folderSubTrash && window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.enable"))
        return window.CBD.confirmbeforedelete('folderyesno');
    else
        return true;
}

CBD.checkForCalendar = function () {
    if (!window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.calendar.enable"))
        return true;
    else
        return window.CBD.confirmbeforedelete('deleteCalendar');
}
