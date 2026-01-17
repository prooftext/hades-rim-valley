class Authorizor {
    constructor() {
        this.clientId = '1049671897311-fgfbplse7k1cpjofh0hi66kqa4ass9qs.apps.googleusercontent.com';
        this.scopes = [
            'https://www.googleapis.com/auth/documents.readonly',
            'https://www.googleapis.com/auth/userinfo.profile'
        ];
        
        // 1. Listen for clicks on the extension icon to start auth
        chrome.action.onClicked.addListener(() => {
          console.log("Extension icon clicked, starting auth...");
          this.getAuthToken();
        });

        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
          if (request.action === "login") {
            this.getAuthToken().then(data => sendResponse(data));
            return true; // Keeps the message channel open for async response
          } else if (request.action === "keydown_detected") {
            console.log(`User pressed: ${request.key} at ${request.timestamp} from ${request.sourceUrl}`);
            // You can now trigger your Google Docs API calls or other logic here
          } else if (request.action === "keyup_detected") {
            console.log(`User released: ${request.key} at ${request.timestamp} from ${request.sourceUrl}`);
            // You can now trigger your Google Docs API calls or other logic here
          } else if (request.action === "pointerdown_detected") {
            console.log(`Pointer down detected at ${request.timestamp} from ${request.sourceUrl}`);
            // You can now trigger your Google Docs API calls or other logic here
          } else if (request.action === "paste_detected") {
            console.log(`User pasted: "${request.pastedText}" at ${request.timestamp} from ${request.sourceUrl}`);
            // You can now trigger your Google Docs API calls or other logic here
          }
        });

        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
          console.log("Tab updated:", tab.url);
          // Check if the URL is loaded and matches the Google Docs pattern
          if (changeInfo.status === 'complete' && tab.url?.includes('docs.google.com')) {
            const docId = tab.url.split('/d/')[1].split('/')[0];
            console.log("Google Doc detected! ID:", docId);
            
            // Trigger your API call or logic here
            this.handleDocDetected(docId);
          }
        });
        
        chrome.tabs.onActivated.addListener(activeInfo => {
          chrome.tabs.get(activeInfo.tabId, tab => {
            console.log("Tab activated:", tab.url);
            // Check if the URL matches the Google Docs pattern
            if (tab.url?.includes('docs.google.com')) {
              const docId = tab.url.split('/d/')[1].split('/')[0];
              console.log("Google Doc detected on activation! ID:", docId);
            }
          })
        });
    }

    async getAuthToken() {
      try {
        // interactive: true will show the Google login popup to the user
        const result = await chrome.identity.getAuthToken({ interactive: true });
        console.log("Token acquired:", result.token);
        
        // Call your Google Cloud API
        const data = await this.fetchCloudData(result.token, 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json');
        console.log("User Data 2:", data);
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
      const token = await chrome.identity.getAuthToken({ interactive: false });
      
      const response = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
        headers: { 'Authorization': `Bearer ${token.token}` }
      });
      
      const docData = await response.json();
      console.log("Document Title:", docData);

      console.log("Full Document Text:", this.extractTextFromDoc(docData));

      // this.getDocHistory(docId);
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
}


class AppLoader {
    version = 0.01;
    storageId = `default-keylog`;
    //`keylog-${document.URL}`;
    keylog;

    constructor() {
        // this.keylog = JSON.parse(localStorage.getItem(this.storageId));
        this.keylog = {
            version: this.version,
            log: [],
        };
        console.log("KeyLogger initialized:", this.storageId);
    }

    logKeystroke = (event) => {
        let kl = {
            key: event.key,
            time: new Date().toISOString(),
        };
        this.keylog.log.push(kl);
        console.log(this.storageId, this.keylog);
        // localStorage.setItem(this.storageId, JSON.stringify(this.keylog));
    }
}

let authorizor = new Authorizor();
new AppLoader();