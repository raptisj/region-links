// Load saved export mode on popup open
document.addEventListener('DOMContentLoaded', async () => {
  // Load saved mode from storage
  const result = await chrome.storage.sync.get(['exportMode']);
  if (result.exportMode) {
    const radio = document.querySelector(`input[value="${result.exportMode}"]`);
    if (radio) {
      radio.checked = true;
    }
  }

  // Save mode when changed
  const radioButtons = document.querySelectorAll('input[name="exportMode"]');
  radioButtons.forEach(radio => {
    radio.addEventListener('change', async (e) => {
      await chrome.storage.sync.set({ exportMode: e.target.value });
    });
  });

  // Handle start button click
  const startButton = document.getElementById('startButton');
  const statusMessage = document.getElementById('statusMessage');

  startButton.addEventListener('click', async () => {
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.id) {
        showStatus('error', 'Could not access current tab');
        return;
      }

      // Check if tab URL is accessible
      if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://'))) {
        showStatus('error', 'Cannot run on Chrome internal pages');
        return;
      }

      // Get selected export mode
      const selectedMode = document.querySelector('input[name="exportMode"]:checked').value;

      // Check if content script is already loaded
      let isLoaded = false;
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'PING' });
        isLoaded = true;
      } catch (error) {
        // Content script not loaded yet
        isLoaded = false;
      }

      // Inject content script and styles only if not already loaded
      if (!isLoaded) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });

        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['content.css']
        });
      }

      // Send message to start selection
      await chrome.tabs.sendMessage(tab.id, {
        action: 'START_SELECTION',
        exportMode: selectedMode
      });

      showStatus('success', 'Selection mode activated! Draw a rectangle on the page.');

      // Close popup after a short delay
      setTimeout(() => {
        window.close();
      }, 1000);

    } catch (error) {
      console.error('Error starting selection:', error);
      showStatus('error', 'Failed to start selection. Please try again.');
    }
  });
});

function showStatus(type, message) {
  const statusMessage = document.getElementById('statusMessage');
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;

  if (type === 'success') {
    setTimeout(() => {
      statusMessage.className = 'status-message';
    }, 3000);
  }
}
