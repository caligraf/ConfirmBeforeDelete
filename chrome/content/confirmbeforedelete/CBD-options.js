  var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
  var TB3;
  var nativeShiftDelete;

  function CBDinitpanel()  {
	try {
		var Cal = opener.document.getElementById("urn:mozilla:item:{e2fda1a4-762b-4020-b5ad-a41df1933103}");
		if (! Cal || Cal.getAttribute("isDisabled") == "true")
			document.getElementById("CBDoption6").setAttribute("disabled", "true");
		else
			document.getElementById("CBDoption6").removeAttribute("disabled");
	}
	catch(e) {
		document.getElementById("CBDoption6").removeAttribute("disabled");
	}
		
 	document.getElementById("CBDoption1").checked = prefs.getBoolPref("confirmbeforedelete.addressbook.enable");
	
	if (prefs.getPrefType("mail.warn_on_shift_delete") > 0) {	
		nativeShiftDelete = true;
		document.getElementById("CBDoption3").checked = prefs.getBoolPref("mail.warn_on_shift_delete");
	}
	else {
		document.getElementById("CBDoption3").checked = prefs.getBoolPref("confirmbeforedelete.shiftcanc.enable");
		nativeShiftDelete = false;
	}
	document.getElementById("CBDoption4").checked = prefs.getBoolPref("confirmbeforedelete.delete.enable");
	document.getElementById("CBDoption5").checked = ! prefs.getBoolPref("confirmbeforedelete.default.cancel");
	document.getElementById("CBDoption6").checked = prefs.getBoolPref("confirmbeforedelete.calendar.enable");
	document.getElementById("CBDoption7").checked = prefs.getBoolPref("confirmbeforedelete.folders.lock");
	document.getElementById("CBDoption8").checked = prefs.getBoolPref("confirmbeforedelete.gotrash.enable");
	document.getElementById("CBDoption9").checked = prefs.getBoolPref("confirmbeforedelete.delete.lock");

	var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
            .getService(Components.interfaces.nsIXULAppInfo);
	var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
             .getService(Components.interfaces.nsIVersionComparator);
	if (versionChecker.compare(appInfo.version, "2.9") >= 0) {
		document.getElementById("CBDoption2").checked = ! (prefs.getBoolPref("mailnews.emptyTrash.dontAskAgain"));
		TB3 = true;
	}
	else {
		document.getElementById("CBDoption2").checked = prefs.getBoolPref("confirmbeforedelete.emptytrash.enable");
		TB3 = false;
	}
    }
    
    function toggleDeleteLock(el) {
	if (el.checked) {
		document.getElementById("CBDoption3").setAttribute("disabled", "true");
		document.getElementById("CBDoption8").setAttribute("disabled", "true");
	}
	else {
		document.getElementById("CBDoption3").removeAttribute("disabled");
		document.getElementById("CBDoption8").removeAttribute("disabled");
	}
    }

    function CBDsavePrefs() {
 	prefs.setBoolPref("confirmbeforedelete.addressbook.enable", document.getElementById("CBDoption1").checked);
	if (TB3)
		prefs.setBoolPref("mail.emptyTrash.dontAskAgain", ! (document.getElementById("CBDoption2").checked));
	else
		prefs.setBoolPref("confirmbeforedelete.emptytrash.enable", document.getElementById("CBDoption2").checked);
	if (nativeShiftDelete)
		prefs.setBoolPref("mail.warn_on_shift_delete", document.getElementById("CBDoption3").checked);
	else
		prefs.setBoolPref("confirmbeforedelete.shiftcanc.enable", document.getElementById("CBDoption3").checked);
	prefs.setBoolPref("confirmbeforedelete.delete.enable", document.getElementById("CBDoption4").checked);
	prefs.setBoolPref("confirmbeforedelete.default.cancel", ! document.getElementById("CBDoption5").checked);
	prefs.setBoolPref("confirmbeforedelete.calendar.enable", document.getElementById("CBDoption6").checked);
	prefs.setBoolPref("confirmbeforedelete.folders.lock", document.getElementById("CBDoption7").checked);	
	prefs.setBoolPref("confirmbeforedelete.gotrash.enable", document.getElementById("CBDoption8").checked);
	prefs.setBoolPref("confirmbeforedelete.delete.lock", document.getElementById("CBDoption9").checked);
    }

