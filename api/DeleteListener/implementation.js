"use strict";

// Using a closure to not leak anything but the API to the outside world.
(function (exports) {

  // Get various parts of the WebExtension framework that we need.
  var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");

  const listenerThreadPanes = new Set();
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
      //removing previously set onClick listeners
      // for (const threadPane of listenerThreadPanes.values()) {
        // if (threadPane) {
          // threadPane.removeEventListener("click", onButtonDeleteClick, true);
        // }
      // }
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

          initTab: async function (tabId) {
            let { nativeTab } = context.extension.tabManager.get(tabId);
            let about3PaneWindow = getAbout3PaneWindow(nativeTab);
            if (!about3PaneWindow) {
              return
            }
            about3PaneWindow.addEventListener("click", onButtonDeleteClick, true);
            listenerThreadPanes.add(about3PaneWindow);
            about3PaneWindow.addEventListener("keydown", onSupprPressed, true);
            
            // let threadPane = about3PaneWindow.threadPane
            // if (threadPane) {
              // threadPane.addEventListener("click", onButtonDeleteClick, true);
              // listenerThreadPanes.add(threadPane);
            // }
          },
          
          initWindow: async function (windowId) {
            let nativeWindow = context.extension.windowManager.get(windowId, context).window;
            if( !nativeWindow ) {
                return
            }
            let toolbar = nativeWindow.document.querySelector("unified-toolbar");
            toolbar.addEventListener("click", onToolBarButtonDeleteClick, true);
            listenerThreadPanes.add(nativeWindow);
          }
        },
      };
    }
  };

  function getAbout3PaneWindow(nativeTab) {
    if (nativeTab.mode && nativeTab.mode.name == "mail3PaneTab") {
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
  // Export the api by assigning in to the exports parameter of the anonymous closure
  // function, which is the global this.
  exports.DeleteListener = DeleteListener;

})(this)