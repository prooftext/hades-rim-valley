let content = document.getElementById('content');

const STATES = {
    RECORDING: false,
    HUMAN_ESTIMATE: 1,
    HUMAN_ESTIMATE_STR: "",
    DOC_ID: '000',
    LAST_UPDATE: '000',
    SESSION_ID: '00',

}

function updateState(newStates) {
    console.log('update', newStates);
    if (newStates) {
        STATES.RECORDING = newStates.RECORDING;
        STATES.HUMAN_ESTIMATE = newStates.HUMAN_ESTIMATE;
        STATES.HUMAN_ESTIMATE_STR = newStates.HUMAN_ESTIMATE_STR;
        STATES.DOC_ID = newStates.DOC_ID;
        STATES.LAST_UPDATE = newStates.LAST_UPDATE;
        STATES.SESSION_ID = newStates.SESSION_ID;
    }
    let recordingEl = document.getElementById("RecordingState");
    let estimateEl = document.getElementById('EstimateState');
    let estimateStrEl = document.getElementById('EstimateStateString');
    let lastUpdateEl = document.getElementById('LastUpdateTime');
    let docIdEl = document.getElementById('docId');

    recordingEl.innerText = STATES.RECORDING ? 'ACTIVE' : 'INACTIVE';
    estimateEl.innerText = Math.round(STATES.HUMAN_ESTIMATE * 100) + "%";
    estimateStrEl.innerText = STATES.HUMAN_ESTIMATE_STR;
    lastUpdateEl.innerText = STATES.LAST_UPDATE;
    docIdEl.innerText = 'DocId: ' + STATES.DOC_ID + ' : ' + STATES.SESSION_ID;
}

async function fetchState() {
    console.log('fetch');
    let response = await chrome.runtime.sendMessage({ action: "fetchState"});
    console.log('get', response)
    if (response && response.data) {
        updateState(response.data);
        return response.data;
    } else {
        return null;
    }
}

async function fetchExportData() {
    let response = await chrome.runtime.sendMessage({ action: "requestExportData" });
    if (response && response.data) {
        return response.data;
    } else {
        return null;
    }
}

async function checkText(text) {
    let response = await (chrome.runtime.sendMessage({ action: "checkText", text }));
    if (response && response.data) {
        return response.data;
    } else {
        return null;
    }
}

document.getElementById('debugButton').addEventListener('click', function() {
    let debugControlsElement = document.getElementById('debugControls');
    if (debugControlsElement.style.display === 'none') {
        // chrome.action.setBadgeText({ text: 'DBG'});
        // chrome.action.setBadgeBackgroundColor({ color: '#FF0000'});
        debugControlsElement.style.display = 'block';
    } else {
        chrome.action.setBadgeText({ text: ''});
        // chrome.action.setBadgeBackgroundColor({ color: '#000000'});
        debugControlsElement.style.display = 'none';
    }
});

document.getElementById('loginButton').addEventListener('click', function() {
    console.log("Login Button Clicked");
    chrome.runtime.sendMessage({ action: "login" }).then(response => {
        content.innerText = "Log In Complete! " + JSON.stringify(response);
    });
});

document.getElementById('docButton').addEventListener('click', function() {
    console.log("Document Fetch Begin");
    chrome.runtime.sendMessage({ action: "getDocData" }).then(response => {
        content.innerText = JSON.stringify(response);
    });
});

document.getElementById('historyButton').addEventListener('click', function() {
    console.log("History Fetch Begin");
    chrome.runtime.sendMessage({ action: "getDocHistory" }).then(response => {
        content.innerText = JSON.stringify(response);
    });
});

document.getElementById('printButton').addEventListener('click', async function() {
    console.log("Print content button clicked");
    let data = await fetchExportData();
    console.log("Log data received in popup:", data);

    if (data) {
        content.innerText = JSON.stringify(data, null, 2);
    } else {
        content.innerText = "No log data available.";
    }
});

document.getElementById('copyButton').addEventListener('click', async function() {
    let data = await fetchExportData();

    if (data) {
        navigator.clipboard.writeText(JSON.stringify(data, null, 2));
        content.innerHTML = "Data copied to clipboard.";
    } else {
        content.innerText = "No log data available.";
    }
});

document.getElementById('sendButton').addEventListener('click', function() {
    console.log("requesting");
    chrome.runtime.sendMessage({ action: "postLastLog" }).then(response => {
        console.log("response received", response);
        content.innerHTML = JSON.stringify(response, null, 2);
        fetchState();
    });
});

document.getElementById('testButton').addEventListener('click', function() {
    console.log("request start");
    chrome.runtime.sendMessage({ action: "postKeystroke" }).then(response => {
        console.log("response received", response)
        content.innerHTML = JSON.stringify(response, null, 2);
    });
});

fetchState();