// options.js

// DOM elements
const wordmapEditor = document.getElementById('wordmapEditor');
const saveButton = document.getElementById('saveButton');
const resetButton = document.getElementById('resetButton');
const statusEl = document.getElementById('status');

// Initialize options page
document.addEventListener('DOMContentLoaded', async () => {
  // Load current wordmap
  loadCurrentWordmap();
  
  // Set up event listeners
  saveButton.addEventListener('click', saveWordmap);
  resetButton.addEventListener('click', resetToDefaults);
});

// Load current wordmap from storage
async function loadCurrentWordmap() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['wordmap'], (result) => {
      if (result.wordmap) {
        wordmapEditor.value = JSON.stringify(result.wordmap, null, 2);
      } else {
        // Load default wordmap
        fetch(chrome.runtime.getURL('data/wordmap.json'))
          .then(response => response.json())
          .then(data => {
            wordmapEditor.value = JSON.stringify(data, null, 2);
            resolve(data);
          })
          .catch(() => {
            wordmapEditor.value = '{}';
            resolve({});
          });
      }
    });
  });
}

// Save wordmap to storage
async function saveWordmap() {
  try {
    const wordmap = JSON.parse(wordmapEditor.value);
    
    chrome.storage.local.set({ wordmap }, () => {
      showStatus('Word map saved successfully!', 'success');
    });
  } catch (error) {
    showStatus(`Invalid JSON: ${error.message}`, 'error');
  }
}

// Reset to default wordmap
async function resetToDefaults() {
  try {
    // Load default wordmap
    const response = await fetch(chrome.runtime.getURL('data/wordmap.json'));
    const defaultWordmap = await response.json();
    
    // Update editor
    wordmapEditor.value = JSON.stringify(defaultWordmap, null, 2);
    
    // Save to storage
    chrome.storage.local.set({ wordmap: defaultWordmap }, () => {
      showStatus('Reset to defaults successfully!', 'success');
    });
  } catch (error) {
    showStatus(`Error resetting to defaults: ${error.message}`, 'error');
  }
}

// Show status message
function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = type;
}


