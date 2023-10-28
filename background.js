messenger.WindowListener.registerChromeUrl([ 
  ["content",  "confirmbeforedelete",           "chrome/content/"],
  ["resource", "confirmbeforedelete",           "chrome/skin/"]
]);

messenger.WindowListener.registerWindow(
	"chrome://messenger/content/messenger.xhtml",
	"chrome://confirmbeforedelete/content/confirmbeforedelete/messenger.js");

messenger.WindowListener.registerWindow(
	"chrome://messenger/content/SearchDialog.xhtml",
	"chrome://confirmbeforedelete/content/confirmbeforedelete/searchWindowOverlay.js");
       
messenger.WindowListener.registerWindow(
	"chrome://messenger/content/messageWindow.xhtml",
	"chrome://confirmbeforedelete/content/confirmbeforedelete/newwindow.js");
    
messenger.WindowListener.startListening();
