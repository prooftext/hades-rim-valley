console.log("Hello from the CONTENT!");

class AppLoader {
    version = 0.01;
    url = document.URL;
    inDocs = false;
    keylogger;

    constructor() {
        this.keylogger = new KeyLogger();

        this.versionControl();
        this.detectContext();

        // if (inDocs) {
        //    getTextContentsViaClipboard();
        // }
        console.log("AppLoader initialized.");
    }

    versionControl() {
        if (this.keylogger.keylog === null || this.keylogger.keylog.version !== this.version) {
            this.keylogger.keylog = {
                version: this.version,
                log: [],
            };
            console.log("Initialized new keylog for version ", this.version);
        } else {
            console.log("Existing keylog found for version ", this.version);
        }
    }

    detectContext() {
        if (this.url.includes("https://docs.google.com/document/d/")) {
            console.log("Google Docs detected!");
            this.inDocs = true;

            // getTextContentsViaClipboard();

        //     const mainContentArea = document.getElementsByClassName('kix-appview-editor')[0];

        //   if (mainContentArea) {
        //     console.log("Document content area found, adding features...");
        //     console.log(mainContentArea);
        //     // Add buttons, change styles, or observe changes (using MutationObserver) here
        //     // const myNewButton = document.createElement('button');
        //     // myNewButton.textContent = 'My Feature';
        //     // myNewButton.onclick = () => {
        //     //   alert('Feature activated!');
        //     // };
        //     // Append it to a suitable location in the UI
        //     // Note: Finding a stable location in the UI can be tricky due to Google Docs' complex DOM.
        //   } else {
        //     console.log("Could not find content area.");
        //   }
        }
    }

    async getTextContentsViaClipboard() {
        try {
            // 1. Select all the text in the document using a built-in browser command
            const editableDiv = document.getElementById("that-div");
            const range = document.createRange();
            range.selectNode(editableDiv);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            
            // 2. Read the selected text using the modern Clipboard API
            // This requires the 'clipboardRead' permission in the manifest
            const fullText = await navigator.clipboard.readText();
            
            // 3. Clear the selection so the user doesn't see everything selected
            window.getSelection().removeAllRanges();

            console.log("--- DOCUMENT TEXT CONTENTS (via Clipboard API) ---");
            console.log(fullText);
            console.log("--- END OF DOCUMENT TEXT CONTENTS ---");
            return fullText;
            
        } catch (err) {
            console.error('Failed to read document text via clipboard API:', err);
            // Fallback if clipboard access fails for some reason
            return getTextContents(); // Fallback to DOM traversal
        }
    }
}

class KeyLogger {
    storageId = `keylog-${document.URL}`;
    keylog = JSON.parse(localStorage.getItem(this.storageId));

    constructor() {
        window.addEventListener("keydown", this.logKeystroke, {capture: true});
    }

    logKeystroke = (event) => {
        let kl = {
            key: event.key,
            time: new Date().toISOString(),
        };
        this.keylog.log.push(kl);
        console.log(this.keylog);
        localStorage.setItem(this.storageId, JSON.stringify(this.keylog));
    }
}

let clientdata = JSON.parse(`{
    "installed": {
        "client_id": "1049671897311-fgfbplse7k1cpjofh0hi66kqa4ass9qs.apps.googleusercontent.com",
        "project_id": "imposing-league-484406-b8",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
    }
}`);

let loader = new AppLoader();

/**
 * Keystroke Structure:
 {
  "eventType": "keypress",
  "key": "a",
  "keyCode": 65,
  "pressTime": "2025-12-13T16:11:23.123456Z",
  "releaseTime": "2025-12-13T16:11:23.198234Z",
  "dwellTimeMicros": 74778, releaseTime - pressTime
  "flightTimeMicros": 46889, pressTime - previous releaseTime
  "cursorPosition": 42, text cursor position at keypress
  "modifiers": {
    "shift": false,
    "ctrl": false,
    "alt": false
  }
}
 */

/**
 * Event Structure:
{
  "eventType": "paste",
  "timestamp": "2025-12-13T16:11:25.456789Z",
  "pastedText": "Some content",
  "pastedLength": 12,
  "clipboardSource": "external",
  "cursorPosition": 45
}
 */


/**
 * Session Metrics:
{
  "totalKeystrokes": 245,
  "avgDwellTimeMicros": 71500,
  "avgFlightTimeMicros": 52300,
  "wpm": 45, // how many 
  "pasteEvents": 2,
  "copyEvents": 1,
  "backspaceCount": 12,
  "deleteCount": 3,
  "formatChanges": 5,
  "navigationKeys": 8,
  "pausesOver2Sec": 3,
  "longestPauseMs": 5430,
  "aiLikelihoodScore": 0.15
}
 */

/**
 * Session Types:
 * 1. Typing from scratch
 * 2. Editing existing text
 * 3. Copy-pasting large sections
 * 4. Formatting and layout adjustments
 * 5. Research and reference insertion
 * 6. Collaborative editing sessions
 * 7. Proofreading and revisions
 * 8. Mixed activity sessions
 * 9. AI-assisted writing sessions
 * 10. Brainstorming and idea generation
 * 11. Outlining and structuring content
 * 12. Final review and polishing
 * 13. Data entry or transcription
 */

//three randome words: banana, elephant, guitar
//three more: computer, mountain, river
//last three: sunshine, library, ocean
//three short words: cat, dog, sun
//three more short words: hat, pen, cup
//final three short words: bed, car, map

// we will use this github licence because we want people to read and contribute security fixes but not use the code outside of our company:
// MIT License