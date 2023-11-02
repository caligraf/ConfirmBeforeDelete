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

async function prompt4Confirm(message) {
   
    return new Promise(resolve => {
        try {
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
            });
        } catch(ex) {
            console.log(ex);
        }
    });
}

async function showAlert(alertMessage) {
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
            url: "alert/alert.html?message="+alertMessage
        });
     });
}

async function confirmbeforedelete(type) {
    return await prompt4Confirm(messenger.i18n.getMessage(type,"Do you want to move these messages to the trash?"));
}

async function isDeleteLocked(messages) {
    let deletelocked = await getPrefInStorage("extensions.confirmbeforedelete.delete.lock");
    let protectDeleted = await getPrefInStorage("extensions.confirmbeforedelete.protect.enable");
    let alertMessage = "";
    let locked = false;
    if (deletelocked) {
        alertMessage = messenger.i18n.getMessage("deleteLocked", "Deletion of messages is blocked by the ConfirmBeforeDelete extension.")
        locked = true;
    } else if (protectDeleted) {
        let tagKey = await getPrefInStorage("extensions.confirmbeforedelete.protect.tag");
        for (let i = 0; i < messages.length; i++) {
            let msgTags = messages[i].tags;
            if( msgTags.indexOf(tagKey) != -1 ) {
                alertMessage = messenger.i18n.getMessage("deleteTagLocked1", "Deletion of messages with the") + " " + tagKey /*tagName */ + " " + messenger.i18n.getMessage("deleteTagLocked2", "tag is blocked by the ConfirmBeforeDelete extension");
                locked = true;
                break;
            }
        }
    }
    if(locked) {
        await showAlert(alertMessage);
        return true;
    }
    return false;
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

async function askUserToConfirmDelete(shiftKey) {
  let selectedMessages = await messenger.mailTabs.getSelectedMessages();
  if( selectedMessages.messages.length > 0 ) {
    let deleteLocked = await isDeleteLocked(selectedMessages.messages);
    if( !deleteLocked ) {
        let inTrash = await isMessageInTrash(selectedMessages.messages[0].folder);
        let deleteMessage = false;
        let confirmDeleteInTrash = await getPrefInStorage("extensions.confirmbeforedelete.delete.enable")
        if (inTrash && confirmDeleteInTrash)
            deleteMessage = await confirmbeforedelete('mailyesno');
        else if (!inTrash) {
            if( shiftKey ) {
                let confirmShift = await getPrefInStorage("extensions.confirmbeforedelete.shiftcanc.enable");
                if( confirmShift )
                    deleteMessage = await confirmbeforedelete('mailyesno');
                else
                    deleteMessage = true;
            } else {
                let confirmGoToTrash = await getPrefInStorage("extensions.confirmbeforedelete.gotrash.enable");
                if(confirmGoToTrash)
                    deleteMessage = await confirmbeforedelete('gotrash');
                else
                    deleteMessage = true;
            }
        } else
            deleteMessage = true;
        if (deleteMessage) {
            let messagesIds = [];
            for( let i =0; i < selectedMessages.messages.length; i++) {
                messagesIds.push(selectedMessages.messages[i].id);
            }
            messenger.messages.delete(messagesIds, shiftKey);
        }
    }
  }
}

// listen on suppr key
browser.DeleteListener.onSupprPressed.addListener( async (shiftKey) => {
  await askUserToConfirmDelete(shiftKey);
});

// listen on delete button on unified toolbar
browser.DeleteListener.onToolBarButtonDeleteClick.addListener( async (shiftKey) => {
  await askUserToConfirmDelete(shiftKey);
});

// listen on delete button
browser.DeleteListener.onButtonDeleteClick.addListener( async (shiftKey) => {
  await askUserToConfirmDelete(shiftKey);
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
