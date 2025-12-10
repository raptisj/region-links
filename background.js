chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("RegionLinks installed");

    chrome.storage.sync.set({ exportMode: "urls" });
  } else if (details.reason === "update") {
    console.log("RegionLinks updated");
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  return true;
});

// Listen for keyboard command
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "start-selection") {
    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab || !tab.id) {
        console.error("Could not access current tab");
        return;
      }

      // Skip Chrome internal pages
      if (
        tab.url &&
        (tab.url.startsWith("chrome://") ||
          tab.url.startsWith("chrome-extension://"))
      ) {
        console.error("Cannot run on Chrome internal pages");
        return;
      }

      // Get user settings
      const result = await chrome.storage.sync.get(["exportMode", "cleanUrls"]);
      const exportMode = result.exportMode || "urls";
      const cleanUrls = result.cleanUrls || false;

      // Check if content script is already loaded
      let isLoaded = false;
      try {
        await chrome.tabs.sendMessage(tab.id, { action: "PING" });
        isLoaded = true;
      } catch (error) {
        isLoaded = false;
      }

      // Load content script if needed
      if (!isLoaded) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"],
        });

        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ["content.css"],
        });
      }

      // Start selection with user's preferred settings
      await chrome.tabs.sendMessage(tab.id, {
        action: "START_SELECTION",
        exportMode: exportMode,
        cleanUrls: cleanUrls,
      });
    } catch (error) {
      console.error("Error starting selection:", error);
    }
  }
});
