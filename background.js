chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("RegionLinks installed");

    chrome.storage.sync.set({
      exportMode: "urls",
      ignoreNestedAnchors: true
    });
  } else if (details.reason === "update") {
    console.log("RegionLinks updated");
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  return true;
});

// Track which tabs have been processed to avoid duplicate injections
const processedNavigations = new Map();

// Clean up old navigation tracking entries every 30 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of processedNavigations.entries()) {
    if (now - timestamp > 10000) { // Remove entries older than 10 seconds
      processedNavigations.delete(key);
    }
  }
}, 30000);

// Handle navigation continuation
async function handleNavigation(details, eventType) {
  console.log('[RegionLinks Background] Navigation event:', eventType, 'on tab', details.tabId);

  // Check if there's pending multi-page state
  const result = await chrome.storage.local.get('rle_multiPageState');
  const multiPageState = result.rle_multiPageState;

  if (multiPageState && multiPageState.isRunning) {
    // Prevent duplicate injections for the same navigation
    const navKey = `${details.tabId}-${details.url}`;
    const lastProcessed = processedNavigations.get(navKey);
    if (lastProcessed && Date.now() - lastProcessed < 2000) {
      console.log('[RegionLinks Background] Skipping duplicate navigation event');
      return;
    }
    processedNavigations.set(navKey, Date.now());

    console.log('[RegionLinks Background] Navigation detected with pending multi-page state, injecting content scripts');
    console.log('[RegionLinks Background] Tab:', details.tabId, 'URL:', details.url);

    try {
      // Check if content script is already loaded
      let isLoaded = false;
      try {
        await chrome.tabs.sendMessage(details.tabId, { action: "PING" });
        isLoaded = true;
      } catch (error) {
        isLoaded = false;
      }

      // Load content scripts if not already loaded
      if (!isLoaded) {
        console.log('[RegionLinks Background] Injecting content scripts...');
        await chrome.scripting.executeScript({
          target: { tabId: details.tabId },
          files: [
            // Core utilities (no dependencies)
            "modules/state.js",
            "modules/urlUtils.js",
            "modules/ui/toast.js",
            // Data processing (depends on core)
            "modules/links/formatter.js",
            "modules/links/filter.js",
            "modules/links/containerDetector.js",
            // UI components (depends on utilities)
            "modules/ui/dialogs.js",
            "modules/templates.js",
            "modules/links/extractor.js",
            "modules/ui/resultsPanel.js",
            "modules/ui/overlay.js",
            "modules/ui/elementPicker.js",
            "modules/ui/multiPageProgress.js",
            // Multi-page logic (depends on templates and UI)
            "modules/multiPage/navigationHandler.js",
            // Orchestration (depends on everything)
            "modules/messageHandler.js",
            // Entry point (initializes everything)
            "content.js"
          ],
        });

        await chrome.scripting.insertCSS({
          target: { tabId: details.tabId },
          files: ["content.css"],
        });

        console.log('[RegionLinks Background] Content scripts injected successfully');
      } else {
        console.log('[RegionLinks Background] Content scripts already loaded, manually triggering init');
        // Manually trigger the navigation handler init
        await chrome.tabs.sendMessage(details.tabId, {
          action: "RESUME_MULTIPAGE"
        });
      }
    } catch (error) {
      console.error('[RegionLinks Background] Error handling navigation:', error);
      // Clean up state on error
      await chrome.storage.local.remove('rle_multiPageState');
    }
  }
}

// Listen for full page navigations
chrome.webNavigation.onCompleted.addListener(async (details) => {
  // Only handle main frame navigations (not iframes)
  if (details.frameId !== 0) {
    return;
  }
  await handleNavigation(details, 'onCompleted');
});

// IMPORTANT: Also listen for client-side navigation (pushState/replaceState)
// This is needed for sites like LinkedIn that use SPA navigation
chrome.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
  // Only handle main frame navigations (not iframes)
  if (details.frameId !== 0) {
    return;
  }
  await handleNavigation(details, 'onHistoryStateUpdated');
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
      const result = await chrome.storage.sync.get(["exportMode", "cleanUrls", "ignoreNestedAnchors"]);
      const exportMode = result.exportMode || "urls";
      const cleanUrls = result.cleanUrls || false;
      const ignoreNestedAnchors = result.ignoreNestedAnchors !== false;

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
        // Load all modules in dependency order
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: [
            // Core utilities (no dependencies)
            "modules/state.js",
            "modules/urlUtils.js",
            "modules/ui/toast.js",
            // Data processing (depends on core)
            "modules/links/formatter.js",
            "modules/links/filter.js",
            "modules/links/containerDetector.js",
            // UI components (depends on utilities)
            "modules/ui/dialogs.js",
            "modules/templates.js",
            "modules/links/extractor.js",
            "modules/ui/resultsPanel.js",
            "modules/ui/overlay.js",
            "modules/ui/elementPicker.js",
            "modules/ui/multiPageProgress.js",
            // Multi-page logic (depends on templates and UI)
            "modules/multiPage/navigationHandler.js",
            // Orchestration (depends on everything)
            "modules/messageHandler.js",
            // Entry point (initializes everything)
            "content.js"
          ],
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
        ignoreNestedAnchors: ignoreNestedAnchors,
      });
    } catch (error) {
      console.error("Error starting selection:", error);
    }
  }
});
