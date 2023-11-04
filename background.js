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

async function askUserToConfirmDelete(shiftKey, selectedMessages) {
  if( selectedMessages.length > 0 ) {
    let deleteLocked = await isDeleteLocked(selectedMessages);
    if( !deleteLocked ) {
        let inTrash = await isMessageInTrash(selectedMessages[0].folder);
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
            for( let i =0; i < selectedMessages.length; i++) {
                messagesIds.push(selectedMessages[i].id);
            }
            messenger.messages.delete(messagesIds, shiftKey);
        }
    }
  }
}

// listen on suppr key
browser.DeleteListener.onSupprPressed.addListener( async (shiftKey) => {
    let selectedMessages = await messenger.mailTabs.getSelectedMessages();
    console.log("onSupprPressed");
    await askUserToConfirmDelete(shiftKey, selectedMessages.messages);
});

// listen on suppr key in a MessageDisplayed in a window
browser.DeleteListener.onWindowSupprPressed.addListener( async (shiftKey) => {
    let currentWindow = await messenger.windows.getCurrent({populate:true});
    if( currentWindow && currentWindow.tabs.length > 0) {
        let message = await browser.messageDisplay.getDisplayedMessage(currentWindow.tabs[0].id);
        let messagesDisplayed = [];
        messagesDisplayed.push(message);
        console.log("onWindowSupprPressed");
        await askUserToConfirmDelete(shiftKey, messagesDisplayed);
    }
});

// listen on suppr key in a MessageDisplayed in a tab
browser.DeleteListener.onMailMessageSupprPressed.addListener( async (shiftKey) => {
   let currentWindow = await messenger.windows.getCurrent({populate:true});
   if( currentWindow && currentWindow.tabs.length > 0) {
       let i = 0;
       for( ; i < currentWindow.tabs.length ; i++ ) {
           if( currentWindow.tabs[i].active )
               break;
       }
       if( i < currentWindow.tabs.length) {
        let currentTab = await messenger.tabs.get(currentWindow.tabs[i].id);
        if( currentTab ) {
            let displayedMesage = await messenger.messageDisplay.getDisplayedMessage(currentTab.id);
            let messagesDisplayed = [];
            messagesDisplayed.push(displayedMesage);
            console.log("onMailMessageSupprPressed");
            await askUserToConfirmDelete(shiftKey, messagesDisplayed);
        }
       }
   }
});


// listen on delete button on unified toolbar
browser.DeleteListener.onToolBarButtonDeleteClick.addListener( async (shiftKey) => {
    let selectedMessages = await messenger.mailTabs.getSelectedMessages();
    console.log("onToolBarButtonDeleteClick");
    await askUserToConfirmDelete(shiftKey, selectedMessages.messages);
});

// listen on delete button on window message toolbar
browser.DeleteListener.onWindowToolBarButtonDeleteClick.addListener( async (shiftKey) => {
    let currentWindow = await messenger.windows.getCurrent({populate:true});
    if( currentWindow && currentWindow.tabs.length > 0) {
        let message = await browser.messageDisplay.getDisplayedMessage(currentWindow.tabs[0].id);
        let messagesDisplayed = [];
        messagesDisplayed.push(message);
        console.log("onWindowToolBarButtonDeleteClick");
        await askUserToConfirmDelete(shiftKey, messagesDisplayed);
    }
});

// listen on delete button in a tab message
browser.DeleteListener.onMailMessageToolBarButtonDeleteClick.addListener( async (shiftKey) => {
   let currentWindow = await messenger.windows.getCurrent({populate:true});
   if( currentWindow && currentWindow.tabs.length > 0) {
       let i = 0;
       for( ; i < currentWindow.tabs.length ; i++ ) {
           if( currentWindow.tabs[i].active )
               break;
       }
       if( i < currentWindow.tabs.length) {
        let currentTab = await messenger.tabs.get(currentWindow.tabs[i].id);
        if( currentTab ) {
            let displayedMesage = await messenger.messageDisplay.getDisplayedMessage(currentTab.id);
            let messagesDisplayed = [];
            messagesDisplayed.push(displayedMesage);
            console.log("onMailMessageToolBarButtonDeleteClick");
            await askUserToConfirmDelete(shiftKey, messagesDisplayed);
        }
       }
   }
});

// listen on delete button
browser.DeleteListener.onButtonDeleteClick.addListener( async (shiftKey) => {
    let selectedMessages = await messenger.mailTabs.getSelectedMessages();
    console.log("onButtonDeleteClick");
    await askUserToConfirmDelete(shiftKey, selectedMessages.messages);
});

// listen on delete from context menu in message tree
browser.DeleteListener.onContextMenu.addListener( async (shiftKey) => {
    let selectedMessages = await messenger.mailTabs.getSelectedMessages();
    console.log("onButtonDeleteClick");
    await askUserToConfirmDelete(shiftKey, selectedMessages.messages);
});

// listen on delete from context menu in message tab
browser.DeleteListener.onMailMessageContextMenu.addListener( async (shiftKey) => {
    let currentWindow = await messenger.windows.getCurrent({populate:true});
    if( currentWindow && currentWindow.tabs.length > 0) {
       let i = 0;
       for( ; i < currentWindow.tabs.length ; i++ ) {
           if( currentWindow.tabs[i].active )
               break;
       }
       if( i < currentWindow.tabs.length) {
        let currentTab = await messenger.tabs.get(currentWindow.tabs[i].id);
        if( currentTab ) {
            let displayedMesage = await messenger.messageDisplay.getDisplayedMessage(currentTab.id);
            let messagesDisplayed = [];
            messagesDisplayed.push(displayedMesage);
            console.log("onMailMessageContextMenu");
            await askUserToConfirmDelete(shiftKey, messagesDisplayed);
        }
       }
    }
});

browser.DeleteListener.onWindowContextMenu.addListener( async (shiftKey) => {
    let currentWindow = await messenger.windows.getCurrent({populate:true});
    if( currentWindow && currentWindow.tabs.length > 0) {
        let message = await browser.messageDisplay.getDisplayedMessage(currentWindow.tabs[0].id);
        let messagesDisplayed = [];
        messagesDisplayed.push(message);
        console.log("onWindowContextMenu");
        await askUserToConfirmDelete(shiftKey, messagesDisplayed);
    }
});


// listen on delete from delete menu in main window
browser.DeleteListener.onMenuDelete.addListener( async (shiftKey) => {
    let currentWindow = await messenger.windows.getCurrent({populate:true});
    if( currentWindow && currentWindow.tabs.length > 0) {
       let i = 0;
       for( ; i < currentWindow.tabs.length ; i++ ) {
           if( currentWindow.tabs[i].active )
               break;
       }
       if( i < currentWindow.tabs.length) {
        let currentTab = await messenger.tabs.get(currentWindow.tabs[i].id);
        if( currentTab ) {
            if( currentTab.type === "messageDisplay") {
                let displayedMesage = await messenger.messageDisplay.getDisplayedMessage(currentTab.id);
                let messagesDisplayed = [];
                messagesDisplayed.push(displayedMesage);
                console.log("onMenuDelete1");
                await askUserToConfirmDelete(shiftKey, messagesDisplayed);
            } else if( currentTab.type === "mail") {
                let selectedMessages = await messenger.mailTabs.getSelectedMessages();
                console.log("onMenuDelete2");
                await askUserToConfirmDelete(shiftKey, selectedMessages.messages);
            }
        }
       }
    }    
});

// listen on delete from delete menu in a message window
browser.DeleteListener.onWindowMenuDelete.addListener( async (shiftKey) => {
    let currentWindow = await messenger.windows.getCurrent({populate:true});
    if( currentWindow && currentWindow.tabs.length > 0) {
        let message = await browser.messageDisplay.getDisplayedMessage(currentWindow.tabs[0].id);
        let messagesDisplayed = [];
        messagesDisplayed.push(message);
        console.log("onWindowMenuDelete");
        await askUserToConfirmDelete(shiftKey, messagesDisplayed);
    }
});

// listen on folder drag start
browser.DeleteListener.onFolderDragStart.addListener( async (shiftKey) => {
    let foldersLocked = await getPrefInStorage("extensions.confirmbeforedelete.folders.lock");
    if (foldersLocked) {
        alertMessage = messenger.i18n.getMessage("lockedFolder", "Folders are locked by the ConfirmBeforeDelete extension.")
        await showAlert(alertMessage);
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
        if( tab.type === "messageDisplay" || tab.type === "mail" ) {
            console.log(" messenger.tabs.onCreated.addListener");
            messenger.DeleteListener.initTab(tab.id);
        }
    });
    
    messenger.windows.onCreated.addListener((windowCreated) => {
        console.log(" messenger.windows.onCreated.addListener");
        if( windowCreated.type == "normal" ) 
            messenger.DeleteListener.initWindow(windowCreated.id);
        else if(windowCreated.type == "messageDisplay" ) 
            messenger.DeleteListener.initWindowDisplay(windowCreated.id);
    });

    let currentWindow = await messenger.windows.getCurrent();
    messenger.DeleteListener.initWindow(currentWindow.id);
    
    let tabs = await browser.tabs.query({})
    for (let tab of tabs) {
        messenger.DeleteListener.initTab(tab.id);
    }
}

main();
