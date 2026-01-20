let content = document.getElementById('content');

async function fetchExportData() {
    let response = await chrome.runtime.sendMessage({ action: "requestExportData" });
    if (response && response.data) {
        return response.data;
    } else {
        return null;
    }
}

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
    });
});

document.getElementById('testButton').addEventListener('click', function() {
    console.log("request start");
    chrome.runtime.sendMessage({ action: "postKeystroke" }).then(response => {
        console.log("response received", response)
        content.innerHTML = JSON.stringify(response, null, 2);
    });
});
