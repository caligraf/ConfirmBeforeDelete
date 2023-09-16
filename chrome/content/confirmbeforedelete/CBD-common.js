var {
    MailServices
} = ChromeUtils.import(
        "resource:///modules/MailServices.jsm");

if (!CBD)
    var CBD = {};

CBD.prefs = null;
CBD.bundle = null;
CBD.tagService = null;

// async sleep function using Promise

CBD.sleep = async function (delay) {
    let timer = Components.classes["@mozilla.org/timer;1"].createInstance(
            Components.interfaces.nsITimer);
    return new Promise(function (resolve, reject) {
        let event = {
            notify: function (timer) {
                resolve();
            },
        };
        timer.initWithCallback(
            event,
            delay,
            Components.interfaces.nsITimer.TYPE_ONE_SHOT);
    });
},

CBD.init2 = function () {
    CBD.prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    var strBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
    CBD.bundle = strBundleService.createBundle("chrome://confirmbeforedelete/locale/confirmbeforedelete.properties");
    CBD.tagService = Cc["@mozilla.org/messenger/tagservice;1"].getService(Ci.nsIMsgTagService);

    try {
        // butons delete and menu edit delete
        window.addEventListener("command", function (event) {
            if (event.target.id == "hdrTrashButton" || event.target.id == "cmd_delete") {
                if (!window.CBD.checkdelete(event.shiftKey)) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            }
        }, true); // first to capture event
    } catch (e) {
        window.alert(e);
    }
},

CBD.init = async function () {
    CBD.prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    var strBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
    CBD.bundle = strBundleService.createBundle("chrome://confirmbeforedelete/locale/confirmbeforedelete.properties");
    CBD.tagService = Cc["@mozilla.org/messenger/tagservice;1"].getService(Ci.nsIMsgTagService);

    try {
        // butons delete and menu edit delete
        window.addEventListener("command", function (event) {
            if (event.target.id == "hdrTrashButton" || event.target.id == "cmd_delete") {
                if (!window.CBD.checktrash(event.shiftKey)) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            }
        }, true); // first to capture event

        let contentWindow = window.gTabmail.tabInfo[0].chromeBrowser.contentWindow;
        if (contentWindow) {

            let threadTree = contentWindow.threadTree
                if (!threadTree) {
                    for (let i = 0; i < 20; i++) {
                        await this.sleep(50);
                        if (contentWindow.threadTree) {
                            threadTree = contentWindow.threadTree;
                            break;
                        }
                    }
                }
                if (threadTree) {
                    // Delete and delete + shift keyboard
                    threadTree.addEventListener("keydown", function (event) {
                        if (event.key == "Delete") {
                            if (!window.CBD.checktrash(event.shiftKey)) {
                                event.preventDefault();
                            }
                        }
                    }, false);
                }

                // drag a folder into trash
                let folderTree = contentWindow.folderTree;
            if (!folderTree) {
                for (let i = 0; i < 20; i++) {
                    await this.sleep(50);
                    if (contentWindow.folderTree) {
                        folderTree = contentWindow.folderTree;
                        break;
                    }
                }
            }
            if (folderTree) {
                folderTree.addEventListener("dragstart", function (event) {
                    if (CBD.prefs.getBoolPref("extensions.confirmbeforedelete.folders.lock") && event.target.id != "folderTree") {
                        window.alert(CBD.bundle.GetStringFromName("lockedFolder"));
                        event.preventDefault();
                    }
                }, false);

                folderTree.addEventListener("drop", function (event) {
                    //const isFolderMovement = dt.types.indexOf('text/x-moz-folder') !== -1;
                    let folderTree = window.gTabmail.tabInfo[0].chromeBrowser.contentWindow.folderTree;
                    let row = event.target.closest("li");
                    if (!row) {
                        return;
                    }
                    let targetFolder = MailServices.folderLookup.getFolderForURL(row.uri);
                    const isFolderTrash = (targetFolder.flags & 0x00000100);
                    if (isFolderTrash) {
                        if (window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.lock")) {
                            window.alert(window.CBD.bundle.GetStringFromName("deleteLocked"));
                        } else if (window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.gotrash.enable") || window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.protect.enable")
                             || window.CBD.prefs.getBoolPref("mailnews.confirm.moveFoldersToTrash")) {
                            let session = Cc["@mozilla.org/widget/dragservice;1"].getService(Ci.nsIDragService).getCurrentSession();
                            const dt = session.dataTransfer;
                            // we only lock drag of messages
                            const isMessageMovement = dt.types.indexOf('text/x-moz-message') !== -1;
                            if (isMessageMovement) {
                                let isMove = Cc["@mozilla.org/widget/dragservice;1"]
                                    .getService(Ci.nsIDragService).getCurrentSession()
                                    .dragAction == Ci.nsIDragService.DRAGDROP_ACTION_MOVE;

                                if (window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.protect.enable")) {
                                    let tagKey = window.CBD.prefs.getCharPref("extensions.confirmbeforedelete.protect.tag");
                                    const nbMsg = dt.mozItemCount;
                                    let messenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger);
                                    for (let i = 0; i < nbMsg; i++) {
                                        let msgHdr = messenger.msgHdrFromURI(dt.mozGetDataAt("text/x-moz-message", i));
                                        const keyw = msgHdr.getStringProperty("keywords");
                                        if (keyw.indexOf(tagKey) != -1) {
                                            var tagName = window.CBD.tagService.getTagForKey(tagKey);
                                            window.alert(window.CBD.bundle.GetStringFromName("deleteTagLocked1") + " " + tagName + " " + window.CBD.bundle.GetStringFromName("deleteTagLocked2"));
                                            return;
                                        }
                                    }
                                }

                                if (!window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.gotrash.enable")) {
                                    return;
                                } else {
                                    if (window.CBD.confirmbeforedelete('gotrash')) {
                                        // copy code of folderPane.js because getCurrentSession become null after showing popup
                                        let count = dt.mozItemCount;
                                        let array = [];

                                        let sourceFolder;
                                        let messenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger);

                                        for (let i = 0; i < count; i++) {
                                            let msgHdr = messenger.msgHdrFromURI(dt.mozGetDataAt("text/x-moz-message", i));
                                            if (!i)
                                                sourceFolder = msgHdr.folder;
                                            array[i] = msgHdr;
                                        }
                                        let prefBranch = Services.prefs.getBranch("mail.");

                                        if (!sourceFolder.canDeleteMessages)
                                            isMove = false;

                                        let cs = MailServices.copy;
                                        prefBranch.setCharPref("last_msg_movecopy_target_uri", targetFolder.URI);
                                        prefBranch.setBoolPref("last_msg_movecopy_was_move", isMove);
                                        // ### ugh, so this won't work with cross-folder views. We would
                                        // really need to partition the messages by folder.
                                        cs.copyMessages(sourceFolder, array, targetFolder, isMove, null, window.msgWindow, true);
                                    }
                                }
                            } else {
                                if (window.CBD.prefs.getBoolPref("mailnews.confirm.moveFoldersToTrash") && !window.CBD.confirmbeforedelete('gotrashfolder')) {
                                    event.preventDefault();
                                } else {
                                    event.preventDefault();
                                    let sourceFolder = dt.mozGetDataAt("text/x-moz-folder", 0)
                                        .QueryInterface(Ci.nsIMsgFolder);
                                    let isMove = dt.dropEffect == "move";
                                    if (!isMove && sourceFolder.server == targetFolder.server) {
                                        // Don't allow folder copy within the same server; only move allowed.
                                        // Can't copy folder intra-server, change to move.
                                        isMove = true;
                                    }
                                    // Do the transfer. A slight delay in calling copyFolder() helps the
                                    // folder-menupopup chain of items get properly closed so the next folder
                                    // context popup can occur.
                                    setTimeout(() =>
                                        MailServices.copy.copyFolder(
                                            sourceFolder,
                                            targetFolder,
                                            isMove,
                                            null,
                                            msgWindow));
                                    // Save in prefs the target folder URI and if this was a move or copy.
                                    // This is to fill in the next folder or message context menu item
                                    // "Move|Copy to <TargetFolderName> Again".
                                    Services.prefs.setStringPref(
                                        "mail.last_msg_movecopy_target_uri",
                                        targetFolder.URI);
                                    Services.prefs.setBoolPref("mail.last_msg_movecopy_was_move", isMove);
                                }
                            }
                        } else {
                            return;
                        }
                    }
                }, true);
            } else {
                window.alert("folderTree not yet loaded! " + window.document.readyState);
            }

            // delete from context menu
            if (contentWindow.mailContextMenu && contentWindow.mailContextMenu._menupopup) {
                contentWindow.mailContextMenu._menupopup.addEventListener("command", function (event) {
                    if (event.target.id == "mailContext-delete") {
                        if (!window.CBD.checktrash(false)) {
                            event.preventDefault();
                            event.stopPropagation();
                        }
                    }
                }, true); // first to capture event
            } else {
                // case when context menu is not loaded
                contentWindow.addEventListener("contextmenu", function (event) {
                    contentWindow.mailContextMenu._menupopup.addEventListener("command", function (event) {
                        if (event.target.id == "mailContext-delete") {
                            if (!window.CBD.checktrash(false)) {
                                event.preventDefault();
                                event.stopPropagation();
                            }
                        }
                    }, true); // first to capture event
                }, {
                    once: true
                }, false);
            }
        }
    } catch (e) {
        window.alert(e);
    }
},

CBD.confirm = function (string) {
    var prompts = Components.classes["@mozilla.org/prompter;1"].getService(Components.interfaces.nsIPromptService);
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

CBD.isSubTrash = function (msgFolder) {
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

CBD.confirmbeforedelete = function (type) {
    if (window.gTabmail) {
        let folderTree = window.gTabmail.tabInfo[0].chromeBrowser.contentWindow.folderTree;
        if (folderTree && window.GetSelectedMsgFolders()[0]) {
            if (window.GetSelectedMsgFolders()[0].server.type == "nntp")
                return false;
        } else {
            if (window.gTabmail.currentAboutMessage && window.gTabmail.currentAboutMessage.gMessage.folder) {
                if (window.gTabmail.currentAboutMessage.gMessage.folder.server.type == "nntp")
                    return false;
            }
        }
    } else {
        if (window.gDBView) {
            if (window.gDBView.window.gDBView.getSelectedMsgHdrs()[0].folder.server.type == "nntp")
                return false;
        } else { // message opened in a new window
            if (Services.wm.getMostRecentWindow("mail:3pane").gTabmail.tabInfo[0].chromeBrowser.contentWindow.gDBView.getSelectedMsgHdrs()[0].folder.server.type == "nntp")
                return false;
        }
    }
    return CBD.confirm(CBD.bundle.GetStringFromName(type));
},

CBD.checkforshift = function () {
    if (CBD.prefs.getPrefType("mail.warn_on_shift_delete") == 0 || !CBD.prefs.getBoolPref("extensions.confirmbeforedelete.shiftcanc.enable"))
        return true;
    return CBD.confirmbeforedelete('mailyesno');
},

CBD.deleteLocked = function () {
    try {
        if (window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.lock")) {
            window.alert(window.CBD.bundle.GetStringFromName("deleteLocked"));
            return true;
        } else if (window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.protect.enable")) {
            let tagKey = window.CBD.prefs.getCharPref("extensions.confirmbeforedelete.protect.tag");
            if (window.gTabmail) {
                if (window.gTabmail.currentAbout3Pane) {
                    let nbMsg = window.gTabmail.currentAbout3Pane.gDBView.numSelected;
                    for (let i = 0; i < nbMsg; i++) {
                        let keyw = window.gTabmail.currentAbout3Pane.gDBView.getSelectedMsgHdrs()[i].getStringProperty("keywords");
                        if (keyw.indexOf(tagKey) != -1) {
                            var tagName = window.CBD.tagService.getTagForKey(tagKey);
                            window.alert(window.CBD.bundle.GetStringFromName("deleteTagLocked1") + " " + tagName + " " + window.CBD.bundle.GetStringFromName("deleteTagLocked2"));
                            return true;
                        }
                    }
                } else {
                    let keyw = window.gTabmail.currentAboutMessage.gMessage.getStringProperty("keywords");
                    if (keyw.indexOf(tagKey) != -1) {
                        var tagName = window.CBD.tagService.getTagForKey(tagKey);
                        window.alert(window.CBD.bundle.GetStringFromName("deleteTagLocked1") + " " + tagName + " " + window.CBD.bundle.GetStringFromName("deleteTagLocked2"));
                        return true;
                    }
                }
            } else {
                if (window.gDBView) {
                    let nbMsg = window.gDBView.numSelected;
                    for (let i = 0; i < nbMsg; i++) {
                        let keyw = window.gDBView.getSelectedMsgHdrs()[i].getStringProperty("keywords");
                        if (keyw.indexOf(tagKey) != -1) {
                            var tagName = window.CBD.tagService.getTagForKey(tagKey);
                            window.alert(window.CBD.bundle.GetStringFromName("deleteTagLocked1") + " " + tagName + " " + window.CBD.bundle.GetStringFromName("deleteTagLocked2"));
                            return true;
                        }
                    }
                } else { // message opened in a new window
                    let keyw = Services.wm.getMostRecentWindow("mail:3pane").gTabmail.tabInfo[0].chromeBrowser.contentWindow.gDBView.getSelectedMsgHdrs()[0].getStringProperty("keywords")
                        if (keyw.indexOf(tagKey) != -1) {
                            var tagName = window.CBD.tagService.getTagForKey(tagKey);
                            window.alert(window.CBD.bundle.GetStringFromName("deleteTagLocked1") + " " + tagName + " " + window.CBD.bundle.GetStringFromName("deleteTagLocked2"));
                            return true;
                        }
                }
            }
        }
    } catch (e) {
        window.alert(e);
    }
    return false;
},

CBD.checktrash = function (isButtonDeleteWithShift) {
    try {
        if (CBD.deleteLocked())
            return false;

        let msgFol = window.GetSelectedMsgFolders()[0];
        if (!msgFol) {
            msgFol = window.gTabmail.currentAboutMessage.gMessage.folder;
            if (!msgFol) {
                return true;
            }
        }
        if (isButtonDeleteWithShift)
            return window.CBD.checkforshift();

        var folderTrash = (msgFol.flags & 0x00000100);
        var folderSubTrash = window.CBD.isSubTrash(msgFol);
        var isTreeFocused = false;

        let folderTree = window.gTabmail.tabInfo[0].chromeBrowser.contentWindow.folderTree;
        if (folderTree && folderTree.getAttribute("focusring") == "true")
            isTreeFocused = true;

        try {
            var prefDM = "mail.server." + msgFol.server.key + ".delete_model";
            if (!folderTrash && window.CBD.prefs.getPrefType(prefDM) > 0 && window.CBD.prefs.getIntPref(prefDM) == 2)
                folderTrash = true;
        } catch (e) {}

        if (folderTrash && window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.enable"))
            return window.CBD.confirmbeforedelete('mailyesno');
        else if (folderSubTrash && isTreeFocused && window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.enable"))
            return window.CBD.confirmbeforedelete('folderyesno');
        else if (!folderTrash && window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.gotrash.enable"))
            return window.CBD.confirmbeforedelete('gotrash');
        else
            return true;
    } catch (e) {
        window.alert(e);
    }
},

CBD.checkdelete = function (isButtonDeleteWithShift) {
    try {
        if (window.CBD.deleteLocked())
            return false;

        // cannot use window.CBD.checkforshift because in search window default TB window confirmation popup does show when mail.warn_on_shift_delete is true
        if (isButtonDeleteWithShift) {
            if ((window.CBD.prefs.getPrefType("mail.warn_on_shift_delete") > 0 && window.CBD.prefs.getBoolPref("mail.warn_on_shift_delete"))
                 || window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.shiftcanc.enable"))
                return window.CBD.confirmbeforedelete('mailyesno');
            return true;
        }

        if (window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.delete.enable")) {
            if (window.gFolderDisplay) {
                let nbMsg = window.gFolderDisplay.selectedCount;
                for (let i = 0; i < nbMsg; i++) {
                    if (window.gFolderDisplay.selectedMessages[i].folder.getFlag(0x00000100) || window.CBD.isSubTrash(window.gFolderDisplay.selectedMessages[i].folder)) {
                        return window.CBD.confirmbeforedelete('mailyesno');
                    }
                }
            } else { // opened message in a new window
                const folder = Services.wm.getMostRecentWindow("mail:3pane").gTabmail.tabInfo[0].chromeBrowser.contentWindow.gDBView.getSelectedMsgHdrs()[0].folder;
                if (folder.getFlag(0x00000100) || window.CBD.isSubTrash(folder)) {
                    return window.CBD.confirmbeforedelete('mailyesno');
                }
            }
        }

        if (window.CBD.prefs.getBoolPref("extensions.confirmbeforedelete.gotrash.enable"))
            return window.CBD.confirmbeforedelete('gotrash');
        else
            return true;
    } catch (e) {
        window.alert(e);
    }
}
