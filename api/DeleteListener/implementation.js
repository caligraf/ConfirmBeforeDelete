"use strict";

// Using a closure to not leak anything but the API to the outside world.
(function (exports) {

  // Get various parts of the WebExtension framework that we need.
  var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");

  const listenerThreadPanes = new Set();
  const listenerMailMessageTab = new Set();
  const listenerWindow1 = new Set();
  const listenerWindow2 = new Set();
  const messageListListener = new ExtensionCommon.EventEmitter();

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
      }
      for (const mailMessageTab of listenerMailMessageTab.values()) {
        mailMessageTab.removeEventListener("click", onMailMessageToolBarButtonDeleteClick, true);
        mailMessageTab.removeEventListener("keydown", onMailMessageSupprPressed, true);
      }
      for (const windowListened of listenerWindow1.values()) {
        windowListened.removeEventListener("click", onToolBarButtonDeleteClick, true);
      }
      for (const windowListened of listenerWindow2.values()) {
        windowListened.removeEventListener("click", onWindowToolBarButtonDeleteClick, true);
        windowListened.removeEventListener("keydown", onWindowSupprPressed, true);
      }

      // Flush all caches
      Services.obs.notifyObservers(null, "startupcache-invalidate");
    }


    getAPI(context) {
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
              function callback(event, shiftKey) {
                return fire.async(shiftKey);
              }
              messageListListener.on("messagelist-keypressed", callback);
              return function () {
                messageListListener.off("messagelist-keypressed", callback);
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
          
          initTab: async function (tabId) {
            let { nativeTab } = context.extension.tabManager.get(tabId);
            let about3PaneWindow = getAbout3PaneWindow(nativeTab);
            if (about3PaneWindow) {
                about3PaneWindow.addEventListener("click", onButtonDeleteClick, true);
                listenerThreadPanes.add(about3PaneWindow);
                about3PaneWindow.addEventListener("keydown", onSupprPressed, true);    
            } else {
                let mailMessageTab = getMailMessageTab(nativeTab);
                if( !mailMessageTab) {
                    return;
                }
                mailMessageTab.addEventListener("click", onMailMessageToolBarButtonDeleteClick, true);
                listenerMailMessageTab.add(mailMessageTab);
                mailMessageTab.addEventListener("keydown", onMailMessageSupprPressed, true); 
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
                listenerWindow1.add(toolbar);
            }
          },
          
          initWindowDisplay: async function (windowId) {
            let nativeWindow = context.extension.windowManager.get(windowId, context).window;
            if( !nativeWindow ) {
                return
            }
            nativeWindow.addEventListener("click", onWindowToolBarButtonDeleteClick, true);
            nativeWindow.addEventListener("keydown", onWindowSupprPressed, true);
            listenerWindow2.add(nativeWindow);
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
    if (event?.target?.attributes['is'].nodeValue == "delete-button") {
        event.preventDefault();
        event.stopPropagation();
        messageListListener.emit("messagelist-toolbarclicked", event.shiftKey);
    }
  }
  
  function onWindowToolBarButtonDeleteClick(event) {
    if (event?.target?.id == "hdrTrashButton") {
        event.preventDefault();
        event.stopPropagation();
        messageListListener.emit("messagelist-windowtoolbarclicked", event.shiftKey);
    }
  }

  function onMailMessageToolBarButtonDeleteClick(event) {
    if (event?.target?.id == "hdrTrashButton") {
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
        messageListListener.emit("messagelist-keypressed", event.shiftKey);
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
  // Export the api by assigning in to the exports parameter of the anonymous closure
  // function, which is the global this.
  exports.DeleteListener = DeleteListener;

})(this)