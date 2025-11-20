// popup.js

// DOM elements
const selectedTextEl = document.getElementById('selectedText');
const tokenizationModeEl = document.getElementById('tokenizationMode');
const previewListEl = document.getElementById('previewList');
const backendUrlEl = document.getElementById('backendUrl');
const generateButton = document.getElementById('generateButton');
const downloadLink = document.getElementById('downloadLink');
const videoPlayer = document.getElementById('videoPlayer');
const statusEl = document.getElementById('status');

let wordmap = {};
let fallbackUrl = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  // Load selected text from storage
  chrome.storage.local.get(['selectedText'], (result) => {
    if (result.selectedText) {
      selectedTextEl.value = result.selectedText;
      updatePreview();
    }
  });

  // Load wordmap from storage or default
  const storedWordmap = await loadWordmap();
  wordmap = storedWordmap || {};

  console.log('Wordmap loaded with', Object.keys(wordmap).length, 'entries');
  console.log('Sample words:', Object.keys(wordmap).slice(0, 10));

  // Extract fallback URL if present
  if (wordmap._fallback) {
    fallbackUrl = wordmap._fallback;
  }

  // Set up event listeners
  selectedTextEl.addEventListener('input', updatePreview);
  tokenizationModeEl.addEventListener('change', updatePreview);
  generateButton.addEventListener('click', generateVideo);

  const startBtn = document.getElementById('startCaptionsBtn');
  const stopBtn = document.getElementById('stopCaptionsBtn');
  startBtn.addEventListener('click', async () => {
    const backendUrl = backendUrlEl.value.trim();
    showStatus('Starting captions...', '');

    try {
      chrome.runtime.sendMessage({ type: 'start_captions', backendUrl }, (resp) => {
        if (chrome.runtime.lastError) {
          showStatus(`Connection error: ${chrome.runtime.lastError.message}`, 'error');
          return;
        }
        if (resp && resp.ok) {
          showStatus('Captions started. Play audio on this tab.', 'success');
        } else {
          showStatus(`Could not start captions: ${resp && resp.error ? resp.error : 'Unknown error'}`, 'error');
        }
      });
    } catch (err) {
      showStatus(`Error: ${err.message}`, 'error');
    }
  });

  stopBtn.addEventListener('click', async () => {
    try {
      chrome.runtime.sendMessage({ type: 'stop_captions' }, (resp) => {
        if (chrome.runtime.lastError) {
          showStatus(`Connection error: ${chrome.runtime.lastError.message}`, 'error');
          return;
        }
        if (resp && resp.ok) {
          showStatus('Captions stopped.', 'success');
        }
      });
    } catch (err) {
      showStatus(`Error: ${err.message}`, 'error');
    }
  });

  // Initial preview update
  updatePreview();
});

// Load wordmap from storage or fetch default
async function loadWordmap() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['wordmap'], (result) => {
      if (result.wordmap) {
        resolve(result.wordmap);
      } else {
        // Fetch default wordmap
        fetch(chrome.runtime.getURL('data/wordmap.json'))
          .then(response => response.json())
          .then(data => {
            resolve(data);
          })
          .catch(() => {
            resolve({});
          });
      }
    });
  });
}

// Tokenize text based on mode
function tokenize(text, mode) {
  if (mode === 'character') {
    return text.split('').filter(char => char.trim() !== '');
  } else {
    return text.split(/\s+/).filter(word => word.trim() !== '');
  }
}

// Update preview list
function updatePreview() {
  const text = selectedTextEl.value;
  const mode = tokenizationModeEl.value;
  const tokens = tokenize(text, mode);

  // Clear preview
  previewListEl.innerHTML = '';

  // Add tokens to preview
  tokens.forEach(token => {
    const tokenItem = document.createElement('div');
    tokenItem.className = 'token-item';

    const tokenEl = document.createElement('div');
    tokenEl.textContent = token;
    tokenEl.style.fontWeight = 'bold';

    const urlEl = document.createElement('div');
    urlEl.className = 'token-url';
    const videoUrl = getVideoUrl(token.toLowerCase());
    if (videoUrl && videoUrl.startsWith('text:')) {
      urlEl.textContent = `📝 text overlay: ${decodeURIComponent(videoUrl.slice(5))}`;
      urlEl.style.color = '#03a9f4';
    } else if (videoUrl) {
      urlEl.textContent = videoUrl;
    } else {
      urlEl.textContent = '❌ (no video available)';
      urlEl.style.color = '#f44336';
    }

    tokenItem.appendChild(tokenEl);
    tokenItem.appendChild(urlEl);
    previewListEl.appendChild(tokenItem);
  });
}

// Generate video from tokens
async function generateVideo() {
  const text = selectedTextEl.value;
  const mode = tokenizationModeEl.value;
  const backendUrl = backendUrlEl.value;

  if (!text.trim()) {
    showStatus('Please enter some text', 'error');
    return;
  }

  // Tokenize and get URLs
  const tokens = tokenize(text, mode);
  console.log('Tokens:', tokens);

  const clips = tokens
    .map(token => {
      const url = getVideoUrl(token.toLowerCase());
      console.log(`Token "${token}" -> URL: ${url}`);
      return url;
    })
    .filter(url => url !== null && url !== undefined);

  console.log('Total clips to stitch:', clips.length);
  console.log('Clips:', clips);

  if (clips.length === 0) {
    showStatus('No valid clips found for the tokens', 'error');
    return;
  }

  // Disable button during request
  generateButton.disabled = true;
  generateButton.textContent = 'Generating...';

  try {
    // Send request to backend
    const response = await fetch(`${backendUrl}/stitch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ clips })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend error: ${response.status} - ${errorText}`);
    }

    // Check if some clips failed
    const failedClipsHeader = response.headers.get('X-Failed-Clips');
    if (failedClipsHeader) {
      try {
        const failedClips = JSON.parse(failedClipsHeader);
        if (failedClips.length > 0) {
          showStatus(`Video generated with ${failedClips.length} failed clips. See console for details.`, 'error');
          console.log('Failed clips:', failedClips);
        }
      } catch (e) {
        console.log('Could not parse failed clips header');
      }
    } else {
      showStatus('Video generated successfully! Playing video...', 'success');
    }

    // Create video blob and play it directly in the popup
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    // Set up video player
    videoPlayer.src = objectUrl;
    videoPlayer.style.display = 'block';
    videoPlayer.load();
    videoPlayer.play().catch(e => console.log('Auto-play prevented:', e));

    // Also provide download link
    downloadLink.href = objectUrl;
    downloadLink.style.display = 'block';
  } catch (error) {
    console.error('Error generating video:', error);
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    // Re-enable button
    generateButton.disabled = false;
    generateButton.textContent = 'Generate Video';
  }
}

// Get video URL with fallback support
function getVideoUrl(token) {
  // Direct match in wordmap
  const videoUrl = wordmap[token];
  if (videoUrl) return videoUrl;

  // If not found, request a text overlay clip from backend
  return `text:${encodeURIComponent(token)}`;
}

// Show status message
function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = type;
}