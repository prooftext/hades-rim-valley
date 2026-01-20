const VERSION = '0.03';
let testResponse;

class AppLoader {
  authorizer;
  keylog;

  constructor() {
    this.authorizer = new Authorizer();
    this.keylog = new KeyLogger();
    console.log("AppLoader initialized");

      chrome.runtime.onMessage.addListener(this.processRequest);
  }

  processRequest = (request, sender, sendResponse) => {
    switch(request.action) {
      case "login":
        this.authorizer.getAuthData().then(data => sendResponse(data));
        return true; // Keeps the message channel open for async response
      case "postLastLog":
        this.authorizer.postData("https://red-spire-data.onrender.com/api/v1/keystroke/collect", this.keylog.assembleExportFromLastLog())
          .then(response => sendResponse(response));
        return true;
      case "postKeystroke":
        this.authorizer.postData("https://red-spire-data.onrender.com/api/v1/keystroke/verify", { document_text: "A" })
          .then(response => sendResponse(response));
        return true;
      case "getDocData":
        if (this.keylog.isdocs) {
          this.authorizer.handleDocDetected(this.keylog.docId)
            .then(response => sendResponse(response));
          return true;
        } else {
          sendResponse("Google Doc not detected.");
          return;
        }
      case "getDocHistory":
        if (this.keylog.isdocs) {
          this.authorizer.getDocHistory(this.keylog.docId)
            .then(response => sendResponse(response));
          return true;
        } else {
          sendResponse("Google Doc not detected.");
          return;
        }      
      default:
        return this.keylog.processMessage(request, sender, sendResponse);
    }
  }
}

class Authorizer {
  clientId = '1049671897311-fgfbplse7k1cpjofh0hi66kqa4ass9qs.apps.googleusercontent.com';
  scopes = [
        'https://www.googleapis.com/auth/documents.readonly',
        'https://www.googleapis.com/auth/userinfo.profile'
    ];

  constructor() {
    // 1. Listen for clicks on the extension icon to start auth
    chrome.action.onClicked.addListener(() => {
      console.log("Extension icon clicked, starting auth...");
      this.getAuthData();
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      console.log("Tab updated:", tab.url);
      // Check if the URL is loaded and matches the Google Docs pattern
      if (changeInfo.status === 'complete' && tab.url?.includes('docs.google.com')) {
        const docId = tab.url.split('/d/')[1].split('/')[0];
        console.log("Google Doc detected! ID:", docId);
        appLoader.keylog.updateDoc(docId);
      } else {
        appLoader.keylog.updateUrl(tab.url);
      }
    });
    
    chrome.tabs.onActivated.addListener(activeInfo => {
      chrome.tabs.get(activeInfo.tabId, tab => {
        console.log("Tab activated:", tab.url);
        if (tab.url?.includes('docs.google.com')) {
          const docId = tab.url.split('/d/')[1].split('/')[0];
          console.log("Google Doc detected! ID:", docId);
          appLoader.keylog.updateDoc(docId);
        } else {
          appLoader.keylog.updateUrl(tab.url);
        }
      });
    });
  }

  async getAuthData() {
    try {
      // interactive: true will show the Google login popup to the user
      const result = await chrome.identity.getAuthToken({ interactive: true });
      console.log("Token acquired:", result.token);
      
      // Call your Google Cloud API
      const data = await this.fetchCloudData(result.token, 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json');
      return {token: result.token, data};
    } catch (error) {
      console.error("Auth Error:", error);
    }
  }

  async fetchCloudData(token, url) {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    console.log("User Data:", data);
    return data;
  }

  async handleDocDetected(docId) {
    console.log("doc request begins", docId);
    const token = await chrome.identity.getAuthToken({ interactive: false });

    console.log("token received", token);
    
    const response = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
      headers: { 'Authorization': `Bearer ${token.token}` }
    });

    console.log("response received", response);
    
    const docData = await response.json();
    console.log("Document Received:", response, docData);

    let title = docData.title;
    let content = this.extractTextFromDoc(docData);

    return { title, content };
  }

  async getDocHistory(docId) {
    const tokenObj = await chrome.identity.getAuthToken({ interactive: false });
    const url = 'https://driveactivity.googleapis.com/v2/activity:query';

    if (!tokenObj || !tokenObj.token) {
      console.error("No valid token for Drive Activity API");
      return;
    }

    // const requestBody = {
    //   // Target the specific Google Doc
    //   itemName: `items/${docId}`,
    //   // Optional: Only return a specific number of recent activities
    //   pageSize: 10,
    //   // Optional: Consolidation groups similar events (e.g. multiple edits) together
    //   consolidationStrategy: { legacy: {} }
    // };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenObj.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({itemName: `items/${docId}`}),
      });

      const data = await response.json();
      this.processHistory(data.activities);
      return data;
    } catch (error) {
      console.error("History Poll Failed:", error);
    }
  }

  processHistory = (activities) => {
    console.log(activities);
  }

  extractTextFromDoc(doc) {
    let fullText = "";

    // Helper to process structural elements (paragraphs, tables, etc.)
    const processElements = (elements) => {
      elements.forEach(element => {
        if (element.paragraph) {
          element.paragraph.elements.forEach(e => {
            if (e.textRun) fullText += e.textRun.content;
          });
        } else if (element.table) {
          element.table.tableRows.forEach(row => {
            row.tableCells.forEach(cell => {
              processElements(cell.content);
            });
          });
        } else if (element.tableOfContents) {
          processElements(element.tableOfContents.content);
        }
      });
    };

    // 2026 Check: Handle documents with multiple tabs
    if (doc.tabs) {
      doc.tabs.forEach(tab => {
        if (tab.documentTab && tab.documentTab.body) {
          processElements(tab.documentTab.body.content);
        }
      });
    } else if (doc.body) {
      // Fallback for single-tab/legacy format
      processElements(doc.body.content);
    }

    return fullText;
  }

  async postData(target, body) {
    
    if (body) {
      body = JSON.stringify(body);
      let content = { method: "POST", headers: { "Content-Type": "application/json" }, body };
      console.log("post attempt", content);
      let response = await fetch(target, content);
      console.log("post sent", response);
      testResponse = response;

      let raw = await response.text();

      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        data = raw;
      }

      if (!response.ok) {
        console.log('not OK');
        return {
          status: response.status,
          message: response.statusText,
          body: data,
        };
      } else {
        console.log('ok');
        return response;
      }
    } else {
      console.log('no data to post');
      return null;
    }
  }
}

class KeyLogger {
  docId = "";
  storageId = "";
  isdocs = false;
  lastLog;

  pendingKeystrokes = [];
  
  constructor() {
    console.log("KeyLogger initialized");
  }

  async processMessage(request, sender, sendResponse) {
    switch (request.action) {
      case "keydown_detected":
        this.onKeyDown(request);
        break;
      case "keyup_detected":
        this.onKeyUp(request);
        break;
        // You can now trigger your Google Docs API calls or other logic here
      case "pointerdown_detected":
        console.log(`Pointer down detected at ${request.timestamp} from ${request.sourceUrl}`);
        break;
        // You can now trigger your Google Docs API calls or other logic here
      case "paste_detected":
        console.log(`User pasted: "${request.pastedText}" at ${request.timestamp} from ${request.sourceUrl}`);
        break;
        // You can now trigger your Google Docs API calls or other logic here
      case "fetchLastLog":
        sendResponse({ token: "dummy-token", data: this.lastLog });
        break;
      case "calculateMetrics":
      // console.log("Calculating metrics for log:", log);
      // if (log) {
        let metrics = this.calculateSessionMetrics(this.lastLog.log);
        if (!metrics) metrics = this.calculateMetrics(this.lastLog.log);
        console.log("Calculated metrics:", metrics);
        sendResponse({ token: "dummy-token", data: metrics });
        break;
      case "requestExportData":
        let data = this.assembleExportFromLastLog();
        sendResponse({ token: "dummy-token", data });
        break;
    }
  }

  updateUrl(newUrl) {
    this.docId = "";
    this.isdocs = false;
    this.storageId = 'keylog_' +newUrl;

    chrome.storage.local.get(this.storageId).then(loadData => {
      if (loadData) {
        this.lastLog = loadData[this.storageId];
      }
      console.log("data loaded", this.lastLog);
    });
  }

  updateDoc(docId) {
    this.docId = docId;
    this.isdocs = true;
    this.storageId = 'keylog_doc_' +docId;

    chrome.storage.local.get(this.storageId).then(loadData => {
      if (loadData) {
        this.lastLog = loadData[this.storageId];
      }
      console.log("data loaded", this.lastLog);
    });
  }

  onKeyDown = (event) => {
    let eventType = 'keypress';
    switch(event.key) {
      case "Backspace":
      case "Delete":
        eventType = 'keydeletion';
        break;
      case "Shift":
      case "Control":
      case "Alt":
      case "Meta":
        return; // Ignore modifier-only presses
      case "CapsLock":
        return; // Ignore CapsLock presses
      case "Tab":
        return; // Ignore Tab presses
      case "Escape":
        return; // Ignore Escape presses
      case "Enter":
        return; // Ignore Enter presses
      case "ArrowUp":
      case "ArrowDown":
      case "ArrowLeft":
      case "ArrowRight":
      case "Home":
      case "End":
      case "PageUp":
      case "PageDown":
        eventType = 'navigation';
        break;
      case "Insert": case "PrintScreen": case "ScrollLock": case "Pause":
      case "NumLock": case "ContextMenu": case "F1": case "F2": case "F3":
      case "F4": case "F5": case "F6": case "F7": case "F8": case "F9":
      case "F10": case "F11": case "F12":
        return; // Ignore function and other special keys
    }

    let pending = {
      eventType,
      key: event.key,
      keyCode: event.keyCode,
      pressTime: new Date().toISOString(),
      modifiers: {
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        metaKey: event.metaKey,
      },
    }
    this.pendingKeystrokes.push(pending);

    //       "timestamp": "2026-01-19T17:45:48.292Z", // for non-key events
    //       "sequence": 0, // for other event types
    //       "cursorPosition": 0, // can't get
    //       "pastedLength": 0, // for paste events
    //       "deletedLength": 0, // for longer delete events
    //       "formatAction": "string", // for formatting
    //       "selectedRange": { // for selection stuff
    //         "additionalProp1": {}
    //       },
  }

  onKeyUp = (event) => {
    let pending = this.pendingKeystrokes.find(keystroke => keystroke.key === event.key);
    if (pending) {
      pending.releaseTime = new Date().toISOString();
    } else {
      return; // No matching keydown found
    }
    this.pendingKeystrokes.splice(this.pendingKeystrokes.indexOf(pending), 1);
    this.logKeystroke(pending);
  }

  logKeystroke = async (kl) => {
    let log;
    let loadData = await chrome.storage.local.get(this.storageId);
    console.log(this.storageId, loadData)
    if (loadData) {
      log = loadData[this.storageId];
      if (!log || !log.log || log.version !== VERSION) {
        log = {
          version: VERSION,
          log: [],
          isdocs: this.isdocs,
          source: this.storageId,
        };
      }
    } else {
      log = {
        version: VERSION,
        log: [],
        isdocs: this.isdocs,
        source: this.storageId,
      };
    }

    kl.dwellTimeMicros = new Date(kl.releaseTime) - new Date(kl.pressTime);

    let lastKl = log.log[log.log.length - 1];
    if (lastKl) {
      kl.flightTimeMicros = new Date(kl.pressTime) - new Date(lastKl.releaseTime);
    } else {
      kl.flightTimeMicros = null;
    }

    kl.session = lastKl ? kl.flightTimeMicros < 300000 ? lastKl.session : lastKl.session + 1 : 0; // New session if >5min gap
    kl.timestamp = kl.pressTime;
    kl.sequence = log.log.length;
    console.log("Keystroke logged:", kl);

    log.log.push(kl);
    this.lastLog = log;
    chrome.storage.local.set({ [this.storageId]: log });
  }

  calculateMetrics = (log, session) => {
    if (log.length === 0) {
      return {
        session: (session || session === 0) ? session : 'full',
      }
    }
    let totalKeystrokes = log.length;
    let dwellTimes = log.filter(kl => kl.eventType === 'keypress').map(kl => kl.dwellTimeMicros);
    let flightTimes = log.filter(kl => kl.eventType === 'keypress' && kl.flightTimeMicros !== null).map(kl => kl.flightTimeMicros);

    let avgDwellTimeMicros = dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length;
    let stdDwellTimeMicros = Math.sqrt(dwellTimes.map(x => Math.pow(x - avgDwellTimeMicros, 2)).reduce((a, b) => a + b, 0) / dwellTimes.length);

    let avgFlightTimeMicros = flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length;
    let stdFlightTimeMicros = Math.sqrt(flightTimes.map(x => Math.pow(x - avgFlightTimeMicros, 2)).reduce((a, b) => a + b, 0) / flightTimes.length);

    let wordsTyped = log.filter(kl => kl.eventType === 'keypress' && kl.key.length === 1).length / 5;
    let totalTimeMinutes = (new Date(log[log.length - 1].releaseTime) - new Date(log[0].pressTime)) / 60000;
    let wpm = wordsTyped / totalTimeMinutes;

    let backspaceCount = log.filter(kl => kl.eventType === 'keydeletion' && kl.key === 'Backspace').length;
    let deleteCount = log.filter(kl => kl.eventType === 'keydeletion' && kl.key === 'Delete').length;

    let pausesOver2Sec = 0;
    let longestPauseMs = 0;
    for (let i = 1; i < log.length; i++) {
      let pause = new Date(log[i].pressTime) - new Date(log[i - 1].releaseTime);
      if (pause > 2000) {
        pausesOver2Sec++;
      }
      if (pause > longestPauseMs) {
        longestPauseMs = pause;
      }
    }

    let pasteEvents = 0; // To be implemented
    let copyEvents = 0; // To be implemented
    let formatChanges = 0; // To be implemented
    let pasteRatio = 0; // To be implemented

    let m = {
      totalKeystrokes,
      avgDwellTimeMicros,
      stdDwellTimeMicros,
      avgFlightTimeMicros,
      stdFlightTimeMicros,
      wpm,
      pasteEvents,
      copyEvents,
      backspaceCount,
      deleteCount,
      formatChanges,
      pausesOver2Sec,
      longestPauseMs,
      pasteRatio
    };

    if (session || session === 0) {
      m.session = session;
    } else {
      m.session = 'full';
    }

    return m;
  }

  calculateSessionMetrics = (log) => {
    let lastSession = log[log.length - 1].session;
    let metrics = [];
    for (let i = 0; i <= lastSession; i++) {
      metrics.push(this.calculateMetrics(log.filter(kl => kl.session === i), i));
    }

    return metrics;
  }

  assembleExportFromLastLog = () => {
    let data = this.lastLog;
    if (!data || !data.log) return null;

    let session = data.log[data.log.length - 1].session;
    let sessionLog = data.log.filter(kl => kl.session === session);
    if (!sessionLog || sessionLog.length === 0) return null;

    let metrics = this.calculateMetrics(sessionLog);
    
    let m = {
      user_id: 'TEST_USER',
      session_id: data.source + '_' + session,
      document_text: 'unknown',
      events: sessionLog,
      metadata: metrics,
    };

    return m;
  }
}

let appLoader = new AppLoader();