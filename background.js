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
         function handleCommands(messageCmd, sender) {
             const { command } = messageCmd;
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
             url: "prompt4Confirm/prompt.html?message="+message,
             height: 180,
             width: 600
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
            url: "alert/alert.html?message="+alertMessage,
            height: 360,
            width: 600
        });
     });
}

async function confirmbeforedelete(type, parameter) {
    return await prompt4Confirm(messenger.i18n.getMessage(type, parameter));
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
        let confirmDeleteInTrash = await getPrefInStorage("extensions.confirmbeforedelete.delete.enable");
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
browser.DeleteListener.onSupprPressed.addListener( async (shiftKey, foldertree) => {
    if( !foldertree ) {
        let selectedMessages = await messenger.mailTabs.getSelectedMessages();
        await askUserToConfirmDelete(shiftKey, selectedMessages.messages);
    } else {
        let mailTab = await messenger.mailTabs.getCurrent();
        let folderDisplayed = mailTab.displayedFolder;
        let confirmDeleteInTrash = await getPrefInStorage("extensions.confirmbeforedelete.moveFoldersToTrash.enable");
        if( confirmDeleteInTrash ) {
            let deleteFolder = await confirmbeforedelete('gotrashfolder', folderDisplayed.name);
            if( deleteFolder) {
                await messenger.folders.delete(folderDisplayed);
            }
        } else {
            await messenger.folders.delete(folderDisplayed);
        }
    }
});

// listen on suppr key in a MessageDisplayed in a window
browser.DeleteListener.onWindowSupprPressed.addListener( async (shiftKey) => {
    let currentWindow = await messenger.windows.getCurrent({populate:true});
    if( currentWindow && currentWindow.tabs.length > 0) {
        let message = await browser.messageDisplay.getDisplayedMessage(currentWindow.tabs[0].id);
        let messagesDisplayed = [];
        messagesDisplayed.push(message);
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
            await askUserToConfirmDelete(shiftKey, messagesDisplayed);
        }
       }
   }
});


// listen on delete button on unified toolbar
browser.DeleteListener.onToolBarButtonDeleteClick.addListener( async (shiftKey) => {
    let selectedMessages = await messenger.mailTabs.getSelectedMessages();
    await askUserToConfirmDelete(shiftKey, selectedMessages.messages);
});

// listen on delete button on window message toolbar
browser.DeleteListener.onWindowToolBarButtonDeleteClick.addListener( async (shiftKey) => {
    let currentWindow = await messenger.windows.getCurrent({populate:true});
    if( currentWindow && currentWindow.tabs.length > 0) {
        let message = await browser.messageDisplay.getDisplayedMessage(currentWindow.tabs[0].id);
        let messagesDisplayed = [];
        messagesDisplayed.push(message);
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
            await askUserToConfirmDelete(shiftKey, messagesDisplayed);
        }
       }
   }
});

// listen on delete button
browser.DeleteListener.onButtonDeleteClick.addListener( async (shiftKey) => {
    let selectedMessages = await messenger.mailTabs.getSelectedMessages();
    await askUserToConfirmDelete(shiftKey, selectedMessages.messages);
});

// listen on delete from context menu in message tree
browser.DeleteListener.onContextMenu.addListener( async (shiftKey) => {
    let selectedMessages = await messenger.mailTabs.getSelectedMessages();
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
        await askUserToConfirmDelete(shiftKey, messagesDisplayed);
    }
});


// listen on delete from delete menu in main window
browser.DeleteListener.onMenuDelete.addListener( async (shiftKey, isFolder) => {
    if( isFolder ) {
        let mailTab = await messenger.mailTabs.getCurrent();
        let folderDisplayed = mailTab.displayedFolder;
        let confirmDeleteInTrash = await getPrefInStorage("extensions.confirmbeforedelete.moveFoldersToTrash.enable");
        if( confirmDeleteInTrash ) {
            let deleteFolder = await confirmbeforedelete('gotrashfolder', folderDisplayed.name);
            if( deleteFolder) {
                await messenger.folders.delete(folderDisplayed);
            }
        } else {
            await messenger.folders.delete(folderDisplayed);
        }
    } else {
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
                        await askUserToConfirmDelete(shiftKey, messagesDisplayed);
                    } else if( currentTab.type === "mail") {
                        let selectedMessages = await messenger.mailTabs.getSelectedMessages();
                        await askUserToConfirmDelete(shiftKey, selectedMessages.messages);
                    }
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

// listen on drop on folderTree
browser.DeleteListener.onDrop.addListener( async (shiftKey, Msgarray, isFolder) => {
    if( isFolder ) {
        let mailTab = await messenger.mailTabs.getCurrent();
        let folderDisplayed = mailTab.displayedFolder;
        let confirmDeleteInTrash = await getPrefInStorage("extensions.confirmbeforedelete.moveFoldersToTrash.enable");
        if( confirmDeleteInTrash ) {
            let deleteFolder = await confirmbeforedelete('gotrashfolder', folderDisplayed.name);
            if( deleteFolder) {
                await messenger.folders.delete(folderDisplayed);
            }
        } else {
            await messenger.folders.delete(folderDisplayed);
        }
    } else {
        let selectedMessages = await messenger.mailTabs.getSelectedMessages();
        await askUserToConfirmDelete(shiftKey, selectedMessages.messages);
    }
});

// listen on folderTree context Menu
browser.DeleteListener.onFolderContextMenu.addListener( async (shiftKey) => {
    let mailTab = await messenger.mailTabs.getCurrent();
    let folderDisplayed = mailTab.displayedFolder;
    let confirmDeleteInTrash = await getPrefInStorage("extensions.confirmbeforedelete.moveFoldersToTrash.enable");
    if( confirmDeleteInTrash ) {
        let deleteFolder = await confirmbeforedelete('gotrashfolder', folderDisplayed.name);
        if( deleteFolder) {
            await messenger.folders.delete(folderDisplayed);
        }
    } else {
        await messenger.folders.delete(folderDisplayed);
    }

});

// listen on empty trash event
browser.DeleteListener.onEmptyTrash.addListener( async (shiftKey) => {
    let mailTab = await messenger.mailTabs.getCurrent();
    let folderDisplayed = mailTab.displayedFolder;
    let trashFolder = null;
    if( folderDisplayed.type == "trash" ) {
       trashFolder = folderDisplayed;
    } else { // find trash folder
        let mailAccount = await messenger.accounts.get(folderDisplayed.accountId,true);
        if( mailAccount.folders) {
            let i = 0;
            for(; i< mailAccount.folders.length; i++) {
                if(mailAccount.folders[i].type == "trash" )
                    break;
            }
            if( i < mailAccount.folders.length) {
                trashFolder = mailAccount.folders[i];
            }
        }
    }
    if( trashFolder ) {
        let messageList = await messenger.messages.list(trashFolder);
        if( messageList?.messages?.length > 0 ) {
            let emptyTrash = true;
            let askConfirmEmptyTrash = await getPrefInStorage("extensions.confirmbeforedelete.emptytrash.enable");
            if( askConfirmEmptyTrash) {
                let addGreatThan = '';
                if( messageList.id )
                    addGreatThan = '> ';
                emptyTrash = await confirmbeforedelete('emptytrash', addGreatThan + messageList.messages.length);
            }
            if( emptyTrash) {
                let messageIds = [];
                for(let i =0; i< messageList.messages.length; i++) {
                    messageIds.push(messageList.messages[i].id);
                }
                messenger.messages.delete(messageIds, true);
                
                while (messageList.id) {
                    messageList = await messenger.messages.continueList(messageList.id);
                    messageIds = [];
                    for(let i =0; i< messageList.messages.length; i++) {
                        messageIds.push(messageList.messages[i].id);
                    }
                    messenger.messages.delete(messageIds, true);
                }
            }
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
        await moveToStorage("extensions.confirmbeforedelete.emptytrash.enable", true);
        await moveToStorage("extensions.confirmbeforedelete.shiftcanc.enable", true);
        await moveToStorage("extensions.confirmbeforedelete.delete.enable", true);
        await moveToStorage("extensions.confirmbeforedelete.default.cancel", true);
        await moveToStorage("extensions.confirmbeforedelete.calendar.enable", true);
        await moveToStorage("extensions.confirmbeforedelete.gotrash.enable", true);
        await moveToStorage("extensions.confirmbeforedelete.folders.lock", false);
        await moveToStorage("extensions.confirmbeforedelete.delete.lock", false);
        await moveToStorage("extensions.confirmbeforedelete.protect.enable", false);
        await moveToStorage("extensions.confirmbeforedelete.moveFoldersToTrash.enable", false);
        await moveToStorage("extensions.confirmbeforedelete.protect.tag", "$label1");
        //await setPrefInStorage("CBDMigrated", true);
    }


    messenger.tabs.onCreated.addListener((tab) => {
        if( tab.type === "messageDisplay" || tab.type === "mail" ) {
            messenger.DeleteListener.initTab(tab.id, (tab.type === "mail"));
        }
    });
    
    messenger.windows.onCreated.addListener((windowCreated) => {
        if( windowCreated.type == "normal" ) {
            messenger.DeleteListener.initWindow(windowCreated.id);
        } else if(windowCreated.type == "messageDisplay" ) 
            messenger.DeleteListener.initWindowDisplay(windowCreated.id);
    });

    let currentWindow = await messenger.windows.getCurrent();
    messenger.DeleteListener.initWindow(currentWindow.id);
    
    let tabs = await browser.tabs.query({})
    for (let tab of tabs) {
        messenger.DeleteListener.initTab(tab.id, (tab.type === "mail"));
    }
    
    messenger.tabs.onActivated.addListener(async (activeInfo) => {
        let isAndDropFolders = await getPrefInStorage("extensions.confirmbeforedelete.folders.lock");
        messenger.DeleteListener.disableDragAndDropFolder(isAndDropFolders);
        // update value on expirement API side ( calendars not yet available on webextension-api ) 
        let isConfirmCalendarDelete = await getPrefInStorage("extensions.confirmbeforedelete.calendar.enable");
        messenger.DeleteListener.setIsConfirmCalendar(isConfirmCalendarDelete);
    });
    let isAndDropFolders = await getPrefInStorage("extensions.confirmbeforedelete.folders.lock");
    messenger.DeleteListener.disableDragAndDropFolder(isAndDropFolders);
    
    // update values on expirement API side ( calendars not yet available on webextension-api )
    let calendarConfirmMessage = messenger.i18n.getMessage('deleteCalendar', "Do you want to permanently delete this item?");
    messenger.DeleteListener.setConfirmCalendarMessage(calendarConfirmMessage);
    
    let isConfirmCalendarDelete = await getPrefInStorage("extensions.confirmbeforedelete.calendar.enable");
    messenger.DeleteListener.setIsConfirmCalendar(isConfirmCalendarDelete);
}

main();
