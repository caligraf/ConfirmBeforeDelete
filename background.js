async function getPrefInStorage(prefName, defaultValue) {
    let prefObj = await browser.storage.local.get(prefName);
    if (prefObj && prefObj[prefName] != null)
        return prefObj[prefName];
    return defaultValue;
}

async function setPrefInStorage(prefName, prefValue) {
    let prefObj = {};
    prefObj[prefName] = prefValue;
    await browser.storage.local.set(prefObj);
}

function prompt4Confirm(message) {
    return new Promise(resolve => {
        function close(sender, value) {
            messenger.windows.remove(sender.tab.windowId);        
            messenger.runtime.onMessage.removeListener(handleCommands);        
            resolve(value);
        }
        function handleCommands(message, sender) {
            const { command } = message;
            switch (command) {
                case "prompt.clickOk":
                    close(sender, true);
                    break;                    
                case "prompt.clickCancel":
                    close(sender, false);
                    break;
            }
        };
        messenger.runtime.onMessage.addListener(handleCommands);        
        messenger.windows.create({
            type: "popup",
            url: "prompt4Confirm/prompt.html?message="+message
        })
    })
}

async function confirmbeforedelete(type) {
    // if (window.gTabmail) {
        // let folderTree = window.gTabmail.tabInfo[0].chromeBrowser.contentWindow.folderTree;
        // if (folderTree && window.GetSelectedMsgFolders()[0]) {
            // if (window.GetSelectedMsgFolders()[0].server.type == "nntp")
                // return false;
        // } else {
            // if (window.gTabmail.currentAboutMessage && window.gTabmail.currentAboutMessage.gMessage.folder) {
                // if (window.gTabmail.currentAboutMessage.gMessage.folder.server.type == "nntp")
                    // return false;
            // }
        // }
    // } else {
        // if (window.gDBView) {
            // if (window.gDBView.window.gDBView.getSelectedMsgHdrs()[0].folder.server.type == "nntp")
                // return false;
        // } else { // message opened in a new window
            // if (Services.wm.getMostRecentWindow("mail:3pane").gTabmail.tabInfo[0].chromeBrowser.contentWindow.gDBView.getSelectedMsgHdrs()[0].folder.server.type == "nntp")
                // return false;
        // }
    // }
    return await prompt4Confirm(messenger.i18n.getMessage(type,"Do you want to move these messages to the trash?"));
    //return await confirm(messenger.i18n.getMessage(type,"Do you want to move these messages to the trash?"));
}

async function deleteLocked() {
    try {
        if (getPrefInStorage("extensions.confirmbeforedelete.delete.lock")) {
            //window.alert(window.CBD.bundle.GetStringFromName("deleteLocked"));
            messenge.windows.create({type: "popup"});
            return true;
        } else if (getPrefInStorage("extensions.confirmbeforedelete.protect.enable")) {
            let tagKey = getPrefInStorage("extensions.confirmbeforedelete.protect.tag");
            if (window.gTabmail) {
                if (window.gTabmail.currentAbout3Pane) {
                    let nbMsg = window.gTabmail.currentAbout3Pane.gDBView.numSelected;
                    for (let i = 0; i < nbMsg; i++) {
                        let keyw = window.gTabmail.currentAbout3Pane.gDBView.getSelectedMsgHdrs()[i].getStringProperty("keywords");
                        if (keyw.indexOf(tagKey) != -1) {
                            //var tagName = window.CBD.tagService.getTagForKey(tagKey);
                            let messageTags = await messenger.messages.listTags();
                            for (let i = 0; i < messageTags.length; i++){
                                
                            }
                            window.alert(messenger.i18n.getMessage("deleteTagLocked1","Deletion of messages with the") + " " + tagKey /*tagName */ + " " + window.CBD.bundle.GetStringFromName("deleteTagLocked2"));
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
}

async function checkdelete(isButtonDeleteWithShift) {
    try {
        let ret = await deleteLocked();
        if (ret)
            return false;

        // cannot use window.CBD.checkforshift because in search window default TB window confirmation popup does show when mail.warn_on_shift_delete is true
        if (isButtonDeleteWithShift) {
            let mail_warn_on_shift_delete = await messenger.LegacyPrefs.getPref("mail.warn_on_shift_delete");
            if (mail_warn_on_shift_delete || getPrefInStorage("extensions.confirmbeforedelete.shiftcanc.enable"))
                return confirmbeforedelete('mailyesno');
            return true;
        }

        if (getPrefInStorage("extensions.confirmbeforedelete.delete.enable")) {
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

        if (getPrefInStorage("extensions.confirmbeforedelete.gotrash.enable"))
            return window.CBD.confirmbeforedelete('gotrash');
        else
            return true;
    } catch (e) {
        window.alert(e);
    }
}

async function checkforshift() {
    if (getPrefInStorage("mail.warn_on_shift_delete") == 0 || !getPrefInStorage("extensions.confirmbeforedelete.shiftcanc.enable"))
        return true;
    return confirmbeforedelete('mailyesno');
}

async function isMessageInTrash(folder) {
    if( folder.type === "trash" )
        return true;
    else {
        if( folder.type === undefined ) {
            let parentfolders = await messenger.folders.getParentFolders(folder);
            if( parentfolders && parentfolders.length > 0 )
                return isMessageInTrash(parentfolders[0]);
        }
        return false;
    }
}

// listen on delete button
browser.DeleteListener.onSupprPressed.addListener( async (shiftKey) => {
  let selectedMessages = await messenger.mailTabs.getSelectedMessages();
  if( selectedMessages.messages.length > 0 ) {
    let inTrash = await isMessageInTrash(selectedMessages.messages[0].folder);
    let deleteMessage = false;
    if (inTrash && getPrefInStorage("extensions.confirmbeforedelete.delete.enable"))
        deleteMessage = await confirmbeforedelete('mailyesno');
    else if (!inTrash && getPrefInStorage("extensions.confirmbeforedelete.gotrash.enable"))
        deleteMessage = await confirmbeforedelete('gotrash');
    else
        deleteMessage = true;
    if (deleteMessage) {
        let messagesIds = [];
        for( let i =0; i < selectedMessages.messages.length; i++) {
            messagesIds.push(selectedMessages.messages[i].id);
        }
        messenger.messages.delete(messagesIds, false);
    }
  }
});

// listen on delete button
browser.DeleteListener.onToolBarButtonDeleteClick.addListener( async (shiftKey) => {
  let selectedMessages = await messenger.mailTabs.getSelectedMessages();
  if( selectedMessages.messages.length > 0 ) {
    let inTrash = await isMessageInTrash(selectedMessages.messages[0].folder);
    let deleteMessage = false;
    if (inTrash && getPrefInStorage("extensions.confirmbeforedelete.delete.enable"))
        deleteMessage = await confirmbeforedelete('mailyesno');
    else if (!inTrash && getPrefInStorage("extensions.confirmbeforedelete.gotrash.enable"))
        deleteMessage = await confirmbeforedelete('gotrash');
    else
        deleteMessage = true;
    if (deleteMessage) {
        let messagesIds = [];
        for( let i =0; i < selectedMessages.messages.length; i++) {
            messagesIds.push(selectedMessages.messages[i].id);
        }
        messenger.messages.delete(messagesIds, false);
    }
  }
});

// listen on delete button
browser.DeleteListener.onButtonDeleteClick.addListener( async (shiftKey) => {
  let selectedMessages = await messenger.mailTabs.getSelectedMessages();
  if( selectedMessages.messages.length > 0 ) {
    let inTrash = await isMessageInTrash(selectedMessages.messages[0].folder);
    let deleteMessage = false;
    if (inTrash && getPrefInStorage("extensions.confirmbeforedelete.delete.enable"))
        deleteMessage = await confirmbeforedelete('mailyesno');
    else if (!inTrash && getPrefInStorage("extensions.confirmbeforedelete.gotrash.enable"))
        deleteMessage = await confirmbeforedelete('gotrash');
    else
        deleteMessage = true;
    if (deleteMessage) {
        let messagesIds = [];
        for( let i =0; i < selectedMessages.messages.length; i++) {
            messagesIds.push(selectedMessages.messages[i].id);
        }
        messenger.messages.delete(messagesIds, false);
    }
  }
});

// move preference in local storage, if not exists set value to defaultValue
async function moveToStorage(prefName, defaultValue) {
    let prefValue = await messenger.LegacyPrefs.getPref(prefName);
    let prefObj = {};
    if (prefValue) {
        prefObj[prefName] = prefValue;
    } else {
        prefObj[prefName] = defaultValue;
    }
    await browser.storage.local.set(prefObj);
}

async function main() {
    // move preferences in local storage
    let isPreferencesMigrated = await browser.storage.local.get({
            CBDMigrated: false
        });
    if (!isPreferencesMigrated.CBDMigrated) {
        await moveToStorage("extensions.confirmbeforedelete.addressbook.enable", true);
        await moveToStorage("extensions.confirmbeforedelete.emptytrash.enable", true);
        await moveToStorage("extensions.confirmbeforedelete.shiftcanc.enable", true);
        await moveToStorage("extensions.confirmbeforedelete.delete.enable", true);
        await moveToStorage("extensions.confirmbeforedelete.default.cancel", true);
        await moveToStorage("extensions.confirmbeforedelete.calendar.enable", true);
        await moveToStorage("extensions.confirmbeforedelete.gotrash.enable", true);
        await moveToStorage("extensions.confirmbeforedelete.folders.lock", false);
        await moveToStorage("extensions.confirmbeforedelete.delete.lock", false);
        await moveToStorage("extensions.confirmbeforedelete.protect.enable", false);
        await moveToStorage("extensions.confirmbeforedelete.protect.tag", "$label1");
        //await setPrefInStorage("CBDMigrated", true);
    }


    messenger.tabs.onCreated.addListener((tab) => {
        messenger.DeleteListener.initTab(tab.id);
    });
    
    messenger.windows.onCreated.addListener((windowCreated) => {
        messenger.DeleteListener.initWindow(windowCreated.id);
    });

    let currentWindow = await messenger.windows.getCurrent();
    messenger.DeleteListener.initWindow(currentWindow.id);
    
    let tabs = await browser.tabs.query({})
    for (let tab of tabs) {
        messenger.DeleteListener.initTab(tab.id);
    }
}

main();
