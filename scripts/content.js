class AppLoader {
    url = document.URL;

    logger;

    constructor() {
        this.logger = new EventLogger();
        console.log("AppLoader complete in Context", this.url);
    }

    async getAuthToken() {
        const response = await chrome.runtime.sendMessage({ action: "login" });
        this.token = response.token;
        this.userdata = response.data;
        console.log("Received token from background:", response);
    }
}

class EventLogger {
    constructor() {
        window.addEventListener("keydown", this.logKeyDown, { capture: true });
        window.addEventListener("keyup", this.logKeyUp, { capture: true });
        window.addEventListener("pointerdown", this.logPointerDown);
        window.addEventListener("paste", this.pasteHandler);

        let frames = document.getElementsByTagName("iframe");
        frames = Array.from(frames);
        frames.forEach((frame) => {
            try {
                const frameDoc = frame.contentDocument || frame.contentWindow?.document;
                if (frameDoc) {
                    console.log("Adding paste listener to iframe document");
                    frameDoc.addEventListener("paste", this.pasteHandler);
                }
            } catch (e) { }
        });
    }


    logKeyDown = (event) => {
        chrome.runtime.sendMessage({
            action: "keydown_detected",
            key: event.key,
            keyCode: event.keyCode,
            altKey: event.altKey,
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            metaKey: event.metaKey,
            sourceUrl: this.url,
            timestamp: new Date().toISOString(),
        });
    }

    logKeyUp = (event) => {
        chrome.runtime.sendMessage({
            action: "keyup_detected",
            key: event.key,
            sourceUrl: this.url,
            timestamp: new Date().toISOString(),
        });
    }

    logPointerDown = (event) => {
        chrome.runtime.sendMessage({
            action: "pointerdown_detected",
            sourceUrl: this.url,
            timestamp: new Date().toISOString(),
        });
    }

    pasteHandler = (event) => {
        console.log("Paste event detected");
        const pastedText = (event.clipboardData || window.clipboardData).getData('text');
        chrome.runtime.sendMessage({
            action: "paste_detected",
            pastedText: pastedText,
            sourceUrl: this.url,
            timestamp: new Date().toISOString(),
        });
    }
}

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
    "longestPauseMicros": 5430000,
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