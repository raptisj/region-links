document.addEventListener("DOMContentLoaded", async () => {
  const result = await chrome.storage.sync.get(["exportMode"]);
  if (result.exportMode) {
    const radio = document.querySelector(`input[value="${result.exportMode}"]`);
    if (radio) {
      radio.checked = true;
    }
  }

  const radioButtons = document.querySelectorAll('input[name="exportMode"]');
  radioButtons.forEach((radio) => {
    radio.addEventListener("change", async (e) => {
      await chrome.storage.sync.set({ exportMode: e.target.value });
    });
  });

  const startButton = document.getElementById("startButton");

  startButton.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab || !tab.id) {
        showStatus("error", "Could not access current tab");
        return;
      }

      if (
        tab.url &&
        (tab.url.startsWith("chrome://") ||
          tab.url.startsWith("chrome-extension://"))
      ) {
        showStatus("error", "Cannot run on Chrome internal pages");
        return;
      }

      const selectedMode = document.querySelector(
        'input[name="exportMode"]:checked'
      ).value;

      let isLoaded = false;
      try {
        await chrome.tabs.sendMessage(tab.id, { action: "PING" });
        isLoaded = true;
      } catch (error) {
        isLoaded = false;
      }

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

      await chrome.tabs.sendMessage(tab.id, {
        action: "START_SELECTION",
        exportMode: selectedMode,
      });

      showStatus(
        "success",
        "Selection mode activated! Draw a rectangle on the page."
      );

      setTimeout(() => {
        window.close();
      }, 1000);
    } catch (error) {
      console.error("Error starting selection:", error);
      showStatus("error", "Failed to start selection. Please try again.");
    }
  });
});

function showStatus(type, message) {
  const statusMessage = document.getElementById("statusMessage");
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;

  if (type === "success") {
    setTimeout(() => {
      statusMessage.className = "status-message";
    }, 3000);
  }
}
