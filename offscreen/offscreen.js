// offscreen.js

let recorder;
let data = [];
let backendUrl = "http://localhost:8080";
let activeStream = null;

// Utility: Convert Uint8Array -> base64
function uint8ToBase64(u8) {
    let binary = "";
    const len = u8.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(u8[i]);
    return btoa(binary);
}

async function sendChunkToBackend(blob) {
    try {
        const buf = await blob.arrayBuffer();
        const b64 = uint8ToBase64(new Uint8Array(buf));

        const resp = await fetch(`${backendUrl}/transcribe`, {
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

        // Send text back to background to forward to content script
        if (text) {
            try {
                chrome.runtime.sendMessage({
                    type: "captions_text_update",
                    text: text
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.warn("Failed to send message to background:", chrome.runtime.lastError.message);
                    }
                });
            } catch (err) {
                console.warn("Error sending message to background:", err);
            }
        }
    } catch (e) {
        console.warn("Transcription error:", e.message);
    }
}

chrome.runtime.onMessage.addListener(async (msg) => {
    if (msg.type === 'start_capture') {
        backendUrl = msg.backendUrl || backendUrl;
        const streamId = msg.streamId;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    mandatory: {
                        chromeMediaSource: 'tab',
                        chromeMediaSourceId: streamId
                    }
                },
                video: false
            });

            activeStream = stream;
            console.log("Offscreen capture started");

            // Loop to record chunks
            (async () => {
                while (activeStream) {
                    try {
                        let chunkRecorder;
                        try {
                            chunkRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
                        } catch (e) {
                            chunkRecorder = new MediaRecorder(stream);
                        }

                        const chunkPromise = new Promise(resolve => {
                            chunkRecorder.ondataavailable = (e) => resolve(e.data);
                        });

                        chunkRecorder.start();

                        // Record for 5 seconds
                        await new Promise(r => setTimeout(r, 5000));

                        if (chunkRecorder.state !== 'inactive') {
                            chunkRecorder.stop();
                        }

                        const blob = await chunkPromise;
                        if (blob && blob.size > 0) {
                            // Don't await sending, let it happen in background
                            sendChunkToBackend(blob);
                        }
                    } catch (err) {
                        console.error("Error in recording loop:", err);
                        // Avoid tight loop if error occurs
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }
            })();

        } catch (err) {
            console.error("Error starting capture in offscreen:", err);
        }
    } else if (msg.type === 'stop_capture') {
        activeStream = null; // This stops the loop
        // Stop tracks
        // Note: we don't need to stop 'recorder' because the loop handles it
        console.log("Offscreen capture stopped");
    }
});
