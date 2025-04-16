"use strict";

// Using a closure to not leak anything but the API to the outside world.
(function (exports) {

  // Get various parts of the WebExtension framework that we need.
  var { ExtensionCommon } = ChromeUtils.importESModule("resource://gre/modules/ExtensionCommon.sys.mjs");
  var { MailServices } = ChromeUtils.importESModule("resource:///modules/MailServices.sys.mjs");
  
  const listenerThreadPanes = new Set();
  const listenerMailMessageTab = new Set();
  const listenerWindow1 = new Set();
  const listenerWindow2 = new Set();
  const listenerToolbar = new Set();
  const messageListListener = new ExtensionCommon.EventEmitter();
  var isDisableDragAndDropFolder = false;
  var calendarConfirmMessage = '';
  var isConfirmCalendar = false;
  
  
  
  class DeleteListener extends ExtensionCommon.ExtensionAPI {
    onStartup() {
      //console.log("CBD: DeleteListener Init")
    }

    onShutdown(isAppShutdown) {
      if (isAppShutdown) {
        return; // the application gets unloaded anyway
      }
      for (const about3PaneWindow of listenerThreadPanes.values()) {
        about3PaneWindow.removeEventListener("click", onButtonDeleteClick, true);
        about3PaneWindow.removeEventListener("keydown", onSupprPressed, true);
        if( about3PaneWindow.mailContextMenu?._menupopup )
            about3PaneWindow.mailContextMenu._menupopup.removeEventListener("command", onContextMenu, true);
        if( about3PaneWindow.folderTree ) {
            about3PaneWindow.folderTree.removeEventListener("dragstart", onFolderDragStart, true);
            about3PaneWindow.folderTree.removeEventListener("drop", onDrop, true);
        }
      }
      for (const mailMessageTab of listenerMailMessageTab.values()) {
        mailMessageTab.removeEventListener("click", onMailMessageToolBarButtonDeleteClick, true);
        mailMessageTab.removeEventListener("keydown", onMailMessageSupprPressed, true);
         if( mailMessageTab.mailContextMenu?._menupopup)
             mailMessageTab.mailContextMenu._menupopup.removeEventListener("command", onMailMessageContextMenu, true);
      }
      for (const toolbarListened of listenerToolbar.values()) {
        toolbarListened.removeEventListener("click", onToolBarButtonDeleteClick, true);
      }
      for (const windowListened of listenerWindow1.values()) {
        windowListened.removeEventListener("command", onMenuDelete, true);
      }
      for (const windowListened of listenerWindow2.values()) {
        windowListened.removeEventListener("click", onWindowToolBarButtonDeleteClick, true);
        windowListened.removeEventListener("keydown", onWindowSupprPressed, true);
        windowListened.removeEventListener("command", onWindowMenuDelete, true);
        if( windowListened.mailContextMenu?._menupopup)
                windowListened.mailContextMenu._menupopup.removeEventListener("command", onWindowContextMenu, true);
      }

      // Flush all caches
      Services.obs.notifyObservers(null, "startupcache-invalidate");
    }
    
    async sleep(delay) {
        let timer = Components.classes["@mozilla.org/timer;1"].createInstance(
            Components.interfaces.nsITimer
        );
        return new Promise(function (resolve, reject) {
            let event = {
                notify: function (timer) {
                resolve();
                },
            };
            timer.initWithCallback(
                event,
                delay,
                Components.interfaces.nsITimer.TYPE_ONE_SHOT
            );
        });
    }
    
    confirmPopup(self, string){
            var prompts = Components.classes["@mozilla.org/prompter;1"].getService(Components.interfaces.nsIPromptService);
            var canceldefault = true;//CBD.prefs.getBoolPref("extensions.confirmbeforedelete.default.cancel");
            if (canceldefault)
                // This is the prompt with "Cancel" as default
                var flags = prompts.BUTTON_TITLE_OK * prompts.BUTTON_POS_0 +
                    prompts.BUTTON_TITLE_CANCEL * prompts.BUTTON_POS_1 + prompts.BUTTON_POS_1_DEFAULT;
            else
                // This is the prompt with "OK" as default
                var flags = prompts.BUTTON_TITLE_OK * prompts.BUTTON_POS_0 +
                    prompts.BUTTON_TITLE_CANCEL * prompts.BUTTON_POS_1;
            //var wintitle = CBD.bundle.GetStringFromName("wintitle");
            var button = prompts.confirmEx(self.window, "confirm", string, flags, "Button 0", "Button 1", "", null, {});
            if (button == 1)
                return false;
            else
                return true;
          }

    getAPI(context) {
         let self = this;

      return {
        DeleteListener: {
          onButtonDeleteClick: new ExtensionCommon.EventManager({
            context,
            name: "DeleteListener.onButtonDeleteClick",
            register(fire) {
              function callback(event, shiftKey) {
                return fire.async(shiftKey);
              }
              messageListListener.on("messagelist-clicked", callback);
              return function () {
                messageListListener.off("messagelist-clicked", callback);
              };
            },
          }).api(),
          
          onToolBarButtonDeleteClick: new ExtensionCommon.EventManager({
            context,
            name: "DeleteListener.onToolBarButtonDeleteClick",
            register(fire) {
              function callback(event, shiftKey) {
                return fire.async(shiftKey);
              }
              messageListListener.on("messagelist-toolbarclicked", callback);
              return function () {
                messageListListener.off("messagelist-toolbarclicked", callback);
              };
            },
          }).api(),
          
          onWindowToolBarButtonDeleteClick: new ExtensionCommon.EventManager({
            context,
            name: "DeleteListener.onWindowToolBarButtonDeleteClick",
            register(fire) {
              function callback(event, shiftKey) {
                return fire.async(shiftKey);
              }
              messageListListener.on("messagelist-windowtoolbarclicked", callback);
              return function () {
                messageListListener.off("messagelist-windowtoolbarclicked", callback);
              };
            },
          }).api(),
          
          onMailMessageToolBarButtonDeleteClick: new ExtensionCommon.EventManager({
            context,
            name: "DeleteListener.onMailMessageToolBarButtonDeleteClick",
            register(fire) {
              function callback(event, shiftKey) {
                return fire.async(shiftKey);
              }
              messageListListener.on("messagelist-mailmessagetoolbarclicked", callback);
              return function () {
                messageListListener.off("messagelist-mailmessagetoolbarclicked", callback);
              };
            },
          }).api(),
          
          onSupprPressed: new ExtensionCommon.EventManager({
            context,
            name: "DeleteListener.onSupprPressed",
            register(fire) {
              function callback(event, shiftKey, foldertree) {
                return fire.async(shiftKey, foldertree);
              }
              messageListListener.on("messagelist-keypressed", callback);
              return function () {
                messageListListener.off("messagelist-keypressed", callback);
              };
            },
          }).api(),
          
          onContextMenu: new ExtensionCommon.EventManager({
            context,
            name: "DeleteListener.onContextMenu",
            register(fire) {
              function callback(event, shiftKey) {
                return fire.async(shiftKey);
              }
              messageListListener.on("messagelist-contextmenu", callback);
              return function () {
                messageListListener.off("messagelist-contextmenu", callback);
              };
            },
          }).api(),
          
          onFolderContextMenu: new ExtensionCommon.EventManager({
            context,
            name: "DeleteListener.onFolderContextMenu",
            register(fire) {
              function callback(event, shiftKey) {
                return fire.async(shiftKey);
              }
              messageListListener.on("messagelist-foldercontextmenu", callback);
              return function () {
                messageListListener.off("messagelist-foldercontextmenu", callback);
              };
            },
          }).api(),
          
          onEmptyTrash: new ExtensionCommon.EventManager({
            context,
            name: "DeleteListener.onEmptyTrash",
            register(fire) {
              function callback(event, shiftKey) {
                return fire.async(shiftKey);
              }
              messageListListener.on("messagelist-emptytrash", callback);
              return function () {
                messageListListener.off("messagelist-emptytrash", callback);
              };
            },
          }).api(),
          
          onMailMessageContextMenu: new ExtensionCommon.EventManager({
            context,
            name: "DeleteListener.onMailMessageContextMenu",
            register(fire) {
              function callback(event, shiftKey) {
                return fire.async(shiftKey);
              }
              messageListListener.on("messagelist-mailmessagecontextmenu", callback);
              return function () {
                messageListListener.off("messagelist-mailmessagecontextmenu", callback);
              };
            },
          }).api(),
          
          onWindowContextMenu: new ExtensionCommon.EventManager({
            context,
            name: "DeleteListener.onWindowContextMenu",
            register(fire) {
              function callback(event, shiftKey) {
                return fire.async(shiftKey);
              }
              messageListListener.on("messagelist-windowcontextmenu", callback);
              return function () {
                messageListListener.off("messagelist-windowcontextmenu", callback);
              };
            },
          }).api(),
          
          onWindowSupprPressed: new ExtensionCommon.EventManager({
            context,
            name: "DeleteListener.onWindowSupprPressed",
            register(fire) {
              function callback(event, shiftKey) {
                return fire.async(shiftKey);
              }
              messageListListener.on("messagelist-windowkeypressed", callback);
              return function () {
                messageListListener.off("messagelist-windowkeypressed", callback);
              };
            },
          }).api(),

          onMailMessageSupprPressed: new ExtensionCommon.EventManager({
            context,
            name: "DeleteListener.onMailMessageSupprPressed",
            register(fire) {
              function callback(event, shiftKey) {
                return fire.async(shiftKey);
              }
              messageListListener.on("messagelist-mailmessagekeypressed", callback);
              return function () {
                messageListListener.off("messagelist-mailmessagekeypressed", callback);
              };
            },
          }).api(),
          
          onMenuDelete: new ExtensionCommon.EventManager({
            context,
            name: "DeleteListener.onMenuDelete",
            register(fire) {
              function callback(event, shiftKey, isFolder) {
                return fire.async(shiftKey, isFolder);
              }
              messageListListener.on("messagelist-menudelete", callback);
              return function () {
                messageListListener.off("messagelist-menudelete", callback);
              };
            },
          }).api(),

          onWindowMenuDelete: new ExtensionCommon.EventManager({
            context,
            name: "DeleteListener.onWindowMenuDelete",
            register(fire) {
              function callback(event, shiftKey) {
                return fire.async(shiftKey);
              }
              messageListListener.on("messagelist-windowmenudelete", callback);
              return function () {
                messageListListener.off("messagelist-windowmenudelete", callback);
              };
            },
          }).api(),
          
          onFolderDragStart: new ExtensionCommon.EventManager({
            context,
            name: "DeleteListener.onFolderDragStart",
            register(fire) {
              function callback(event, shiftKey) {
                return fire.async(shiftKey);
              }
              messageListListener.on("messagelist-folderdragstart", callback);
              return function () {
                messageListListener.off("messagelist-folderdragstart", callback);
              };
            },
          }).api(),
          
          onDrop: new ExtensionCommon.EventManager({
            context,
            name: "DeleteListener.onDrop",
            register(fire) {
              function callback(event, shiftKey, array, isFolder, subFolderOfTrash, nbMsg, firstMessageId) {
                return fire.async(shiftKey, array, isFolder, subFolderOfTrash, nbMsg, firstMessageId);
              }
              messageListListener.on("messagelist-drop", callback);
              return function () {
                messageListListener.off("messagelist-drop", callback);
              };
            },
          }).api(),
          
          initTab: async function (tabId, isMail) {
            let { nativeTab } = context.extension.tabManager.get(tabId);
            let about3PaneWindow = getAbout3PaneWindow(nativeTab);
            if (about3PaneWindow) {
                about3PaneWindow.addEventListener("click", onButtonDeleteClick, true);
                listenerThreadPanes.add(about3PaneWindow);
                about3PaneWindow.addEventListener("keydown", onSupprPressed, true);
                if( about3PaneWindow.mailContextMenu?._menupopup)               
                    about3PaneWindow.mailContextMenu._menupopup.addEventListener("command", onContextMenu, true);
                else {
                     about3PaneWindow.addEventListener("contextmenu", function (event) {
                         about3PaneWindow.mailContextMenu._menupopup.addEventListener("command", onContextMenu, true);
                     }, {
                        once: true
                    }, false);
                }
                
                if (isMail) {
                    if( about3PaneWindow.folderTree ) {
                        about3PaneWindow.folderTree.addEventListener("dragstart", onFolderDragStart, true);
                        about3PaneWindow.folderTree.addEventListener("drop", onDrop, true);
                    } else {
                        
                        // folderTree is not loaded, waiting 20 x 50 ms
                        for (let i = 0; i < 20; i++) {
                            await self.sleep(50);
                            if (about3PaneWindow.folderTree) {
                                break;
                            }
                        }
                        if( about3PaneWindow.folderTree) { // it is possible that folderTree is still not loaded
                            about3PaneWindow.folderTree.addEventListener("dragstart", onFolderDragStart, true);
                            about3PaneWindow.folderTree.addEventListener("drop", onDrop, true);
                        }
                    }
                }
            } else {
                let mailMessageTab = getMailMessageTab(nativeTab);
                if( !mailMessageTab) {
                    return;
                }
                mailMessageTab.addEventListener("click", onMailMessageToolBarButtonDeleteClick, true);
                listenerMailMessageTab.add(mailMessageTab);
                mailMessageTab.addEventListener("keydown", onMailMessageSupprPressed, true);
                if( mailMessageTab.mailContextMenu?._menupopup)               
                    mailMessageTab.mailContextMenu._menupopup.addEventListener("command", onMailMessageContextMenu, true);
            }
          },
          
          initWindow: async function (windowId) {
            let nativeWindow = context.extension.windowManager.get(windowId, context).window;
            if( !nativeWindow ) {
                return
            }
            let toolbar = nativeWindow.document.querySelector("unified-toolbar");
            if( toolbar ) {
                toolbar.addEventListener("click", onToolBarButtonDeleteClick, true);
                listenerToolbar.add(toolbar);
            }
            nativeWindow.addEventListener("command", onMenuDelete, true);
            listenerWindow1.add(nativeWindow);
            
            // calendar
            if (typeof nativeWindow.calendarViewController != "undefined" && typeof calendarViewControllerDeleteOccurrencesOrig == "undefined") {
                var calendarViewControllerDeleteOccurrencesOrig = nativeWindow.calendarViewController.deleteOccurrences;
                nativeWindow.calendarViewController.deleteOccurrences = async function (aCount, aUseParentItems, aDoNotConfirm) {
                    if (!isConfirmCalendar || self.confirmPopup(self, calendarConfirmMessage))
                        calendarViewControllerDeleteOccurrencesOrig.apply(this, arguments);
                };
            }
          },
          
          setConfirmCalendarMessage: function (messageConfirm ) {
              calendarConfirmMessage = messageConfirm;
          },
          
          setIsConfirmCalendar: function (isConfirm ) {
              isConfirmCalendar = isConfirm;
          },
          
          initWindowDisplay: async function (windowId) {
            let nativeWindow = context.extension.windowManager.get(windowId, context).window;
            if( !nativeWindow ) {
                return
            }
            nativeWindow.addEventListener("click", onWindowToolBarButtonDeleteClick, true);
            nativeWindow.addEventListener("keydown", onWindowSupprPressed, true);
            nativeWindow.addEventListener("command", onWindowMenuDelete, true);
            listenerWindow2.add(nativeWindow);
            // if( nativeWindow.mailContextMenu?._menupopup)
                // nativeWindow.mailContextMenu._menupopup.addEventListener("command", onWindowContextMenu, true);
          },
          
          disableDragAndDropFolder: async function (disable) {
              isDisableDragAndDropFolder = disable;
          }

        },
      };
    }
  };

  function getAbout3PaneWindow(nativeTab) {
    if (nativeTab.mode && nativeTab.mode.name == "mail3PaneTab" ) {
      return nativeTab.chromeBrowser.contentWindow
    }
    return null;
  }
  
  function getMailMessageTab(nativeTab) {
    if (nativeTab.mode && nativeTab.mode.name == "mailMessageTab") {
      return nativeTab.chromeBrowser.contentWindow
    }
    return null;
  }
  
  function onToolBarButtonDeleteClick(event) {
    if (event?.target?.attributes['is']?.nodeValue == "delete-button") {
        event.preventDefault();
        event.stopPropagation();
        messageListListener.emit("messagelist-toolbarclicked", event.shiftKey);
    }
  }
  
  function onWindowToolBarButtonDeleteClick(event) {
    if (event?.target?.id == "hdrTrashButton" ) { //|| event?.target?.id == "mailContext-delete"
        event.preventDefault();
        event.stopPropagation();
        messageListListener.emit("messagelist-windowtoolbarclicked", event.shiftKey);
    }
  }

  function onMailMessageToolBarButtonDeleteClick(event) {
    if (event?.target?.id == "hdrTrashButton" ) {
        event.preventDefault();
        event.stopPropagation();
        messageListListener.emit("messagelist-mailmessagetoolbarclicked", event.shiftKey);
    }
  }
  
  function onButtonDeleteClick(event) {
    if (event?.target?.id == "hdrTrashButton") {
        event.preventDefault();
        event.stopPropagation();
        messageListListener.emit("messagelist-clicked", event.shiftKey);
    }
  }

  function onSupprPressed(event) {
    if (event.key == "Delete") {
        event.preventDefault();
        let foldertree = false;
        if( event.target.id === "folderTree" )  {
            foldertree = true;
            let folderName = event.target.closest("ul")._selectedRow._folderName;
        }
        messageListListener.emit("messagelist-keypressed", event.shiftKey, foldertree);
    }
  }
  
  function onWindowSupprPressed(event) {
    if (event.key == "Delete") {
        event.preventDefault();
        messageListListener.emit("messagelist-windowkeypressed", event.shiftKey);
    }
  }
  
  function onMailMessageSupprPressed(event) {
    if (event.key == "Delete") {
        event.preventDefault();
        messageListListener.emit("messagelist-mailmessagekeypressed", event.shiftKey);
    }
  }
  
  function onContextMenu(event) {
    if (event?.target?.id == "mailContext-delete") {
        event.preventDefault();
        event.stopPropagation();
        messageListListener.emit("messagelist-contextmenu", event.shiftKey);
    }
  }
  
  function onMailMessageContextMenu(event) {
    if (event?.target?.id == "mailContext-delete") {
        event.preventDefault();
        event.stopPropagation();
        messageListListener.emit("messagelist-mailmessagecontextmenu", event.shiftKey);
    }
  }
  
  function onMenuDelete(event) {
    if (event?.target?.id == "cmd_delete" || event?.target?.id == "mailContext-delete") {
        
        let menuDelete = this.window.document.getElementById("menu_delete");
        let value = menuDelete.getAttribute("data-l10n-id");
        let isFolder = false;
        if( value === "menu-edit-delete-folder" )
            isFolder = true;
        event.preventDefault();
        event.stopPropagation();
        messageListListener.emit("messagelist-menudelete", event.shiftKey, isFolder);
        
    } else if( event?.target?.id == "folderPaneContext-remove" ) {
        event.preventDefault();
        event.stopPropagation();
        messageListListener.emit("messagelist-foldercontextmenu", event.shiftKey);
    } else if (event?.target?.id == "folderPaneContext-emptyTrash" || event?.target?.id == "cmd_emptyTrash" ) {
        event.preventDefault();
        event.stopPropagation();
        messageListListener.emit("messagelist-emptytrash", event.shiftKey);
    }
  }
  
  function onWindowMenuDelete(event) {
    if (event?.target?.id == "cmd_delete" || event?.target?.id == "mailContext-delete") {
        event.preventDefault();
        event.stopPropagation();
        messageListListener.emit("messagelist-windowmenudelete", event.shiftKey);
    }
  }
  
  function onFolderDragStart(event) {
      if (isDisableDragAndDropFolder && event.target.id != "folderTree") {
          event.preventDefault();
          messageListListener.emit("messagelist-folderdragstart", event.shiftKey);
      }
  }

  function onDrop(event) {
      let row = event.target.closest("li");
      if (!row) {
          return;
      }
      let folderURI = row.uri;
      let targetFolder = MailServices.folderLookup.getFolderForURL(folderURI);
      let isFolderTrash = (targetFolder.flags & 0x00000100);
      let targetFolderName = '';
      let subFolderOfTrash = false;
      while(!isFolderTrash) {
          
          let lastSlashIndex = folderURI.lastIndexOf("/");
          // have parent?
          if (lastSlashIndex <= 0)
            break;

          if( targetFolderName == '' )
              targetFolderName = folderURI.substring(lastSlashIndex + 1, folderURI.length);
          let parentURI = folderURI.substring(0, lastSlashIndex);
          let parentfolder = MailServices.folderLookup.getFolderForURL(parentURI);
          if( !parentfolder ) 
              break;
          isFolderTrash = (parentfolder.flags & 0x00000100);
          if( isFolderTrash)
              subFolderOfTrash = true;
          folderURI = parentURI;
      }
      if (isFolderTrash) {
        const dt = event.dataTransfer;
        // we only lock drag of messages
        const isMessageMovement = dt.types.indexOf('text/x-moz-message') !== -1;
        const isFolderMovement = dt.types.includes("text/x-moz-folder") !== -1;
        
        if (isMessageMovement) {                                  
            const nbMsg = dt.mozItemCount;
            let firstMessageId = null;
            let messenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger);
            if( nbMsg == 1) {
                let msgHdr = messenger.msgHdrFromURI(dt.mozGetDataAt("text/x-moz-message", 0));
                firstMessageId = msgHdr.messageId;
            }
            // for (let i = 0; i < nbMsg; i++) {
                // let msgHdr = messenger.msgHdrFromURI(dt.mozGetDataAt("text/x-moz-message", i));
                // array[i] = msgHdr.messageId;
            // }
            
            
             // trash is kept selected if drag indicator is not removed
            const dragIndicator = event.view.document.getElementById("folder-drag-indicator")
            if (dragIndicator) {
                dragIndicator.style.display = "none";
            }
            
            Array.from(event.view.document.querySelectorAll('.total.drop-target')).forEach(
                (el) => el.classList.remove('drop-target')
            );
            
            Array.from(event.view.document.querySelectorAll('.drop-target')).forEach(
                (el) => el.classList.remove('drop-target')
            );
            
            event.preventDefault();
            event.stopPropagation(); 
            messageListListener.emit("messagelist-drop", event.shiftKey, targetFolderName, false, subFolderOfTrash, nbMsg, firstMessageId);
        } else if( isFolderMovement) {
            let sourceFolder = dt.mozGetDataAt("text/x-moz-folder", 0).QueryInterface(Ci.nsIMsgFolder);
            
             // trash is kept selected if drag indicator is not removed
            const dragIndicator = event.view.document.getElementById("folder-drag-indicator")
            if (dragIndicator) {
                dragIndicator.style.display = "none";
            }
            
            Array.from(event.view.document.querySelectorAll('.total.drop-target')).forEach(
                (el) => el.classList.remove('drop-target')
            );
            
            Array.from(event.view.document.querySelectorAll('.drop-target')).forEach(
                (el) => el.classList.remove('drop-target')
            );

            event.preventDefault();
            event.stopPropagation(); // issue trash is kept selected if stop propagation
            messageListListener.emit("messagelist-drop", event.shiftKey, targetFolderName, true, subFolderOfTrash, 0, null);
        }
      }
  }
    
  function onWindowContextMenu(event) {
      if (event?.target?.id == "mailContext-delete") {
        event.preventDefault();
        event.stopPropagation();
        messageListListener.emit("messagelist-windowcontextmenu", event.shiftKey);
    }
  }
  
  // Export the api by assigning in to the exports parameter of the anonymous closure
  // function, which is the global this.
  exports.DeleteListener = DeleteListener;

})(this)