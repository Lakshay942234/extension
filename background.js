// background.js
// --- Context menu: generate sign video from selected text ---
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "signVideoBuilder",
    title: "Generate sign video from selection",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "signVideoBuilder") {
    chrome.storage.local.set({ selectedText: info.selectionText }, () => {
      chrome.action.openPopup();
    });
  }
});

// --- Capture state ---
let captureState = {
  stream: null,
  recorder: null,
  activeTabId: null,
  backendUrl: "http://localhost:8080",
  running: false,
};

// --- Utility: Convert Uint8Array → base64 ---
function uint8ToBase64(u8) {
  let binary = "";
  const len = u8.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(u8[i]);
  return btoa(binary);
}

// --- Send audio chunk to backend for transcription ---
async function sendChunkToBackend(blob) {
  try {
    const buf = await blob.arrayBuffer();
    const b64 = uint8ToBase64(new Uint8Array(buf));

    const resp = await fetch(`${captureState.backendUrl}/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audioBase64: b64,
        mimeType: blob.type || "audio/webm",
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`Transcribe failed: ${resp.status} ${t}`);
    }

    const data = await resp.json();
    const text = data?.text || "";
    if (text && captureState.activeTabId) {
      chrome.tabs.sendMessage(captureState.activeTabId, {
        type: "captions_update",
        text,
      });
    }
  } catch (e) {
    // Optional: log error for debugging
    console.warn("Transcription error:", e.message);
  }
}

// --- Stop capture and cleanup ---
// --- Offscreen Document Helper ---
async function setupOffscreenDocument(path) {
  // Check if offscreen document already exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });

  if (existingContexts.length > 0) {
    return;
  }

  // Create offscreen document
  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: path,
      reasons: ['USER_MEDIA'],
      justification: 'Recording tab audio for transcription'
    });
    await creating;
    creating = null;
  }
}

let creating; // Promise keeper for offscreen creation

// --- Stop capture and cleanup ---
function stopCaptureInternal() {
  chrome.runtime.sendMessage({ type: 'stop_capture' }).catch(() => { });

  // We can close the offscreen document to save resources, or keep it open.
  // For now, let's keep it simple and just stop recording.
  // If we wanted to close it: chrome.offscreen.closeDocument();

  captureState.running = false;

  if (captureState.activeTabId) {
    chrome.tabs.sendMessage(captureState.activeTabId, {
      type: "captions_hide",
    });
  }
}

// --- Start capturing audio from current tab ---
async function startCapture(backendUrl) {
  if (captureState.running) return { ok: true };

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs || !tabs[0]) return { ok: false, error: "No active tab" };
  captureState.activeTabId = tabs[0].id;

  if (backendUrl) captureState.backendUrl = backendUrl;

  try {
    await setupOffscreenDocument('offscreen/offscreen.html');

    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: captureState.activeTabId
    });

    // Send streamId to offscreen document
    chrome.runtime.sendMessage({
      type: 'start_capture',
      streamId: streamId,
      backendUrl: captureState.backendUrl
    });

    captureState.running = true;

    chrome.tabs.sendMessage(captureState.activeTabId, {
      type: "captions_show",
      text: "",
    });

    console.log("Started tab audio capture via offscreen document.");
    return { ok: true };

  } catch (err) {
    console.error("Error starting capture:", err);
    return { ok: false, error: err.message };
  }
}

// --- Unified message handler for all message types ---
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (!msg || !msg.type) {
      sendResponse({ ok: false, error: "Missing message type" });
      return;
    }

    switch (msg.type) {
      case "captions_text_update":
        // Forward text updates from offscreen to content script
        if (captureState.activeTabId) {
          chrome.tabs.sendMessage(captureState.activeTabId, {
            type: "captions_update",
            text: msg.text,
          }).catch(err => {
            console.warn("Failed to send captions to tab:", err);
          });
        }
        sendResponse({ ok: true });
        break;

      case "start_captions":
        const startResult = await startCapture(msg.backendUrl);
        sendResponse(startResult);
        break;

      case "stop_captions":
        stopCaptureInternal();
        sendResponse({ ok: true });
        break;

      default:
        console.warn("Unknown message type:", msg.type);
        sendResponse({ ok: false, error: "Unknown message type" });
    }
  })();

  return true; // keep sendResponse alive for async
});
