document.addEventListener("DOMContentLoaded", async () => {

  const result = await chrome.storage.sync.get(["exportMode", "cleanUrls"]);
  if (result.exportMode) {
    const radio = document.querySelector(`input[value="${result.exportMode}"]`);
    if (radio) {
      radio.checked = true;
    }
  }

  const cleanUrlsCheckbox = document.getElementById("cleanUrlsCheckbox");
  if (cleanUrlsCheckbox) {
    cleanUrlsCheckbox.checked = result.cleanUrls || false;
  }

  const radioButtons = document.querySelectorAll('input[name="exportMode"]');
  radioButtons.forEach((radio) => {
    radio.addEventListener("change", async (e) => {
      await chrome.storage.sync.set({ exportMode: e.target.value });
    });
  });

  if (cleanUrlsCheckbox) {
    cleanUrlsCheckbox.addEventListener("change", async (e) => {
      await chrome.storage.sync.set({ cleanUrls: e.target.checked });
    });
  }

  // Load templates for current domain
  await loadTemplates();

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

      const cleanUrlsCheckbox = document.getElementById("cleanUrlsCheckbox");
      const cleanUrls = cleanUrlsCheckbox ? cleanUrlsCheckbox.checked : false;

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
        cleanUrls: cleanUrls,
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
  const startButton = document.getElementById("startButton");

  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  startButton.style.display = "none";

  // Auto-hide status after 3 seconds for success and error, keep info visible
  if (type === "success" || type === "error") {
    setTimeout(() => {
      statusMessage.className = "status-message";
      startButton.style.display = "block";
    }, 3000);
  }
}

async function loadTemplates() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!tab || !tab.url) return;

  try {
    const url = new URL(tab.url);
    const domain = url.hostname;

    const result = await chrome.storage.local.get(["templates"]);
    const allTemplates = result.templates || [];
    const templates = allTemplates.filter((t) => t.domain === domain);

    if (templates.length === 0) {
      document.getElementById("templatesSection").style.display = "none";
      return;
    }

    document.getElementById("templatesSection").style.display = "block";
    const templatesList = document.getElementById("templatesList");
    templatesList.innerHTML = "";

    templates.forEach((template) => {
      const item = document.createElement("div");
      item.className = "template-item";

      const nameSpan = document.createElement("span");
      nameSpan.className = "template-name";
      nameSpan.textContent = template.name;

      if (template.autoRun) {
        const autoSpan = document.createElement("span");
        autoSpan.className = "template-auto";
        autoSpan.textContent = "AUTO";
        item.appendChild(autoSpan);
      }

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "template-delete";
      deleteBtn.textContent = "×";
      deleteBtn.onclick = async (e) => {
        e.stopPropagation();
        await deleteTemplate(template.id);
        await loadTemplates();
      };

      item.appendChild(nameSpan);
      item.appendChild(deleteBtn);

      item.onclick = async () => {
        await runTemplateFromPopup(tab.id, template);
      };

      templatesList.appendChild(item);
    });
  } catch (error) {
    console.error("Error loading templates:", error);
  }
}

async function deleteTemplate(templateId) {
  const result = await chrome.storage.local.get(["templates"]);
  const templates = result.templates || [];
  const filtered = templates.filter((t) => t.id !== templateId);
  await chrome.storage.local.set({ templates: filtered });
}

async function runTemplateFromPopup(tabId, template) {
  try {
    // Check if content script is already loaded
    let isLoaded = false;
    try {
      await chrome.tabs.sendMessage(tabId, { action: "PING" });
      isLoaded = true;
    } catch (error) {
      isLoaded = false;
    }

    // Load content script if needed
    if (!isLoaded) {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ["content.js"],
      });

      await chrome.scripting.insertCSS({
        target: { tabId: tabId },
        files: ["content.css"],
      });
    }

    // Run the template
    await chrome.tabs.sendMessage(tabId, {
      action: "RUN_TEMPLATE",
      template: template,
    });

    // If auto-run template, wait for extraction and copy immediately
    if (template.autoRun) {
      console.log("[RegionLinks Popup] Auto-run template, waiting for extraction...");
      showStatus("info", "Extracting links...");

      // Wait for extraction to complete (poll for pendingAutoCopy)
      let attempts = 0;
      while (attempts < 30) { // Increased from 20 to 30 attempts (6 seconds)
        await new Promise(resolve => setTimeout(resolve, 200));
        const { pendingAutoCopy } = await chrome.storage.local.get(["pendingAutoCopy"]);

        console.log("[RegionLinks Popup] Poll attempt", attempts + 1, "pendingAutoCopy:", pendingAutoCopy ? "found" : "not found");

        if (pendingAutoCopy) {
          try {
            await navigator.clipboard.writeText(pendingAutoCopy.text);
            console.log("[RegionLinks Popup] Auto-copied from popup!");

            showStatus("success", `Copied ${pendingAutoCopy.count} link${pendingAutoCopy.count !== 1 ? 's' : ''} to clipboard!`);

            // Clear the pending copy
            await chrome.storage.local.remove("pendingAutoCopy");

            setTimeout(() => {
              window.close();
            }, 800);
            return;
          } catch (error) {
            console.error("[RegionLinks Popup] Failed to copy:", error.name, error.message);
            showStatus("error", "Failed to copy to clipboard");
            return;
          }
        }
        attempts++;
      }

      console.error("[RegionLinks Popup] Extraction timed out after", attempts, "attempts");
      showStatus("error", "Extraction timed out");
    } else {
      // Manual template - show results panel
      showStatus("success", `Running template: ${template.name}`);

      setTimeout(() => {
        window.close();
      }, 1000);
    }
  } catch (error) {
    console.error("Error running template:", error);
    showStatus("error", "Failed to run template. Please try again.");
  }
}
