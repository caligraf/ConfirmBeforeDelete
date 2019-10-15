  var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
  var TB3;
  var nativeShiftDelete;

  function CBDinitpanel() {

      document.getElementById("CBDoption1").checked = prefs.getBoolPref("extensions.confirmbeforedelete.addressbook.enable");

      if (prefs.getPrefType("mail.warn_on_shift_delete") > 0) {
          nativeShiftDelete = true;
          document.getElementById("CBDoption3").checked = prefs.getBoolPref("mail.warn_on_shift_delete");
      } else {
          document.getElementById("CBDoption3").checked = prefs.getBoolPref("extensions.confirmbeforedelete.shiftcanc.enable");
          nativeShiftDelete = false;
      }
      document.getElementById("CBDoption4").checked = prefs.getBoolPref("extensions.confirmbeforedelete.delete.enable");
      document.getElementById("CBDoption5").checked = !prefs.getBoolPref("extensions.confirmbeforedelete.default.cancel");
      document.getElementById("CBDoption6").checked = prefs.getBoolPref("extensions.confirmbeforedelete.calendar.enable");
      document.getElementById("CBDoption7").checked = prefs.getBoolPref("extensions.confirmbeforedelete.folders.lock");
      document.getElementById("CBDoption8").checked = prefs.getBoolPref("extensions.confirmbeforedelete.gotrash.enable");
      document.getElementById("CBDoption9").checked = prefs.getBoolPref("extensions.confirmbeforedelete.delete.lock");

      var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
          .getService(Components.interfaces.nsIXULAppInfo);
      var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
          .getService(Components.interfaces.nsIVersionComparator);
      if (versionChecker.compare(appInfo.version, "2.9") >= 0) {
          document.getElementById("CBDoption2").checked = !(prefs.getBoolPref("mailnews.emptyTrash.dontAskAgain"));
          TB3 = true;
      } else {
          document.getElementById("CBDoption2").checked = prefs.getBoolPref("extensions.confirmbeforedelete.emptytrash.enable");
          TB3 = false;
      }
  }

  function toggleDeleteLock(el) {
      if (el.checked) {
          document.getElementById("CBDoption3").setAttribute("disabled", "true");
          document.getElementById("CBDoption8").setAttribute("disabled", "true");
      } else {
          document.getElementById("CBDoption3").removeAttribute("disabled");
          document.getElementById("CBDoption8").removeAttribute("disabled");
      }
  }

  function CBDsavePrefs() {
      prefs.setBoolPref("extensions.confirmbeforedelete.addressbook.enable", document.getElementById("CBDoption1").checked);
      if (TB3)
          prefs.setBoolPref("mail.emptyTrash.dontAskAgain", !(document.getElementById("CBDoption2").checked));
      else
          prefs.setBoolPref("extensions.confirmbeforedelete.emptytrash.enable", document.getElementById("CBDoption2").checked);
      if (nativeShiftDelete)
          prefs.setBoolPref("mail.warn_on_shift_delete", document.getElementById("CBDoption3").checked);
      else
          prefs.setBoolPref("extensions.confirmbeforedelete.shiftcanc.enable", document.getElementById("CBDoption3").checked);
      prefs.setBoolPref("extensions.confirmbeforedelete.delete.enable", document.getElementById("CBDoption4").checked);
      prefs.setBoolPref("extensions.confirmbeforedelete.default.cancel", !document.getElementById("CBDoption5").checked);
      prefs.setBoolPref("extensions.confirmbeforedelete.calendar.enable", document.getElementById("CBDoption6").checked);
      prefs.setBoolPref("extensions.confirmbeforedelete.folders.lock", document.getElementById("CBDoption7").checked);
      prefs.setBoolPref("extensions.confirmbeforedelete.gotrash.enable", document.getElementById("CBDoption8").checked);
      prefs.setBoolPref("extensions.confirmbeforedelete.delete.lock", document.getElementById("CBDoption9").checked);
  }