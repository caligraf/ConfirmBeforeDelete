async function getPrefInStorage(prefName) {
    let prefObj = await browser.storage.local.get(prefName);
    return prefObj[prefName];
}

async function setPrefInStorage(prefName, prefValue) {
    let prefObj = {};
    prefObj[prefName] = prefValue;
    await browser.storage.local.set(prefObj);
}

function toggleDeleteLock(checked) {
    if (checked) {
        document.getElementById("CBDConfirmShiftDel").setAttribute("disabled", "true");
        document.getElementById("CBDMsgInTrashConfirmation").setAttribute("disabled", "true");
        document.getElementById("CBDMovetoTrash").setAttribute("disabled", "true");
        document.getElementById("CBDMsgTag").setAttribute("disabled", "true");
        document.getElementById("CBDMoveFoldertoTrash").setAttribute("disabled", "true");
        document.getElementById("CBDcheckFolderInTrash").setAttribute("disabled", "true");
        document.getElementById("CBDtags").setAttribute("disabled", "true");
    } else {
        document.getElementById("CBDConfirmShiftDel").removeAttribute("disabled");
        document.getElementById("CBDMsgInTrashConfirmation").removeAttribute("disabled");
        document.getElementById("CBDMovetoTrash").removeAttribute("disabled");
        document.getElementById("CBDMsgTag").removeAttribute("disabled");
        document.getElementById("CBDMoveFoldertoTrash").removeAttribute("disabled");
        document.getElementById("CBDcheckFolderInTrash").removeAttribute("disabled");
        if (document.getElementById("CBDMsgTag").checked) {
            document.getElementById("CBDtags").removeAttribute("disabled");
        }
    }
}

function toggleFolderLock(checked) {
    let confirmDeleteFolder = document.getElementById("CBDMoveFoldertoTrash");
    let confirmDeleteFolderInTrash = document.getElementById("CBDcheckFolderInTrash");
    if (checked) {
        confirmDeleteFolder.setAttribute("disabled", "true");
        confirmDeleteFolderInTrash.setAttribute("disabled", "true");
    } else {
        confirmDeleteFolder.removeAttribute("disabled");
        confirmDeleteFolderInTrash.removeAttribute("disabled");
    }
}

function toggleTag(checked) {
    let taglist = document.getElementById("CBDtags");
    if (checked) {
        taglist.removeAttribute("disabled");
    } else {
        taglist.setAttribute("disabled", "true");
    }
}


async function InitCheckBox() {
    if (document.getElementById("CBDBlockMsgDeletion").checked) {
        document.getElementById("CBDConfirmShiftDel").setAttribute("disabled", "true");
        document.getElementById("CBDMsgInTrashConfirmation").setAttribute("disabled", "true");
        document.getElementById("CBDMovetoTrash").setAttribute("disabled", "true");
    }

    if (document.getElementById("CBDLockFolders").checked) {
        document.getElementById("CBDMoveFoldertoTrash").setAttribute("disabled", "true");
        document.getElementById("CBDcheckFolderInTrash").setAttribute("disabled", "true");
    }
    
    let messageTags = await messenger.messages.listTags();
    let selectElt = document.getElementById('CBDtags');
    let tagKey = await getPrefInStorage("extensions.confirmbeforedelete.protect.tag");
    for (let i = 0; i < messageTags.length; i++){
        let opt = document.createElement('option');
        opt.value = messageTags[i].key;
        opt.style.color = messageTags[i].color;
        opt.textContent = messageTags[i].tag;
        if( messageTags[i].key == tagKey )
            opt.selected = true;
        selectElt.appendChild(opt);
    }
    
    if (!document.getElementById("CBDMsgTag").checked) {
        let taglist = document.getElementById("CBDtags");
        taglist.setAttribute("disabled", "true");
    }
}

async function loadPref(prefElement) {
    let type = prefElement.dataset.type || prefElement.getAttribute("type") || prefElement.tagName;
    let name = prefElement.dataset.preference;
    let value = await getPrefInStorage(`${name}`);
    switch (type) {
    case "checkbox":
        if (prefElement.dataset.preference === "extensions.confirmbeforedelete.default.cancel" || prefElement.dataset.preference === "mailnews.emptyTrash.dontAskAgain" )
            value = !value;
        prefElement.checked = value;
        prefElement.addEventListener("change", () => savePref(prefElement));
        break;
    case "select":
        let selectedElement = prefElement.querySelector(`input[type="option"][value="${value}"]`)
        if (selectedElement) {
            selectedElement.selected = true;
        }
        prefElement.addEventListener("change", () => savePref(prefElement));
        break;
    }
}

async function savePref(prefElement) {
    let type = prefElement.dataset.type || prefElement.getAttribute("type") || prefElement.tagName;
    let name = prefElement.dataset.preference;
    switch (type) {
    case "checkbox":
        let value = !!prefElement.checked;
        if (prefElement.dataset.preference === "extensions.confirmbeforedelete.default.cancel" || prefElement.dataset.preference === "mailnews.emptyTrash.dontAskAgain" )
            value = !value;
        await setPrefInStorage(`${name}`, value);
        if (prefElement.dataset.preference === "extensions.confirmbeforedelete.delete.lock")
            toggleDeleteLock(value);
        else if (prefElement.dataset.preference === "extensions.confirmbeforedelete.folders.lock")
            toggleFolderLock(value);
        else if (prefElement.dataset.preference === "extensions.confirmbeforedelete.protect.enable")
            toggleTag(value);
        break;
    case "select":
        let selectedElement = prefElement.querySelector(`input[type="option"]:selected`)
        if (selectedElement) {
            await setPrefInStorage(`${name}`, selectedElement.value);
        }
        break;
    }
}

async function loadOptions() {
    //Load preferences and attach onchange listeners for auto save.
    let prefElements = document.querySelectorAll("*[data-preference]");
    for (let prefElement of prefElements) {
        await loadPref(prefElement);
    }
    await InitCheckBox();
}

document.addEventListener('DOMContentLoaded', () => {
    i18n.updateDocument();
    loadOptions();
}, {
    once: true
});
