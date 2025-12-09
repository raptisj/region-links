// Background service worker for Regional Link Extractor

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Regional Link Extractor installed');

    // Set default export mode
    chrome.storage.sync.set({ exportMode: 'urls' });
  } else if (details.reason === 'update') {
    console.log('Regional Link Extractor updated');
  }
});

// Handle messages from content scripts or popup (if needed in future)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Reserved for future use
  return true;
});
