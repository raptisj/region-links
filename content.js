// Global state - only initialize if not already present
if (typeof window.RLE_STATE === "undefined") {
  window.RLE_STATE = {
    isActive: false,
    exportMode: "urls",
    overlay: null,
    selectionBox: null,
    startX: 0,
    startY: 0,
    extractedLinks: [],
    resultsPanel: null,
  };
}
const state = window.RLE_STATE;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "PING") {
    // Respond to ping to indicate script is loaded
    sendResponse({ loaded: true });
  } else if (message.action === "START_SELECTION") {
    startSelection(message.exportMode);
    sendResponse({ success: true });
  } else if (message.action === "CANCEL_SELECTION") {
    cancelSelection();
    sendResponse({ success: true });
  }
  return true;
});

// Start selection mode
function startSelection(exportMode) {
  if (state.isActive) {
    return;
  }

  state.exportMode = exportMode || "urls";
  state.isActive = true;

  createOverlay();
  attachEventListeners();
}

// Create transparent overlay
function createOverlay() {
  // Remove existing overlay if any
  if (state.overlay) {
    state.overlay.remove();
  }

  state.overlay = document.createElement("div");
  state.overlay.id = "rle-overlay";
  state.overlay.className = "rle-overlay";
  document.body.appendChild(state.overlay);

  // Create selection box
  state.selectionBox = document.createElement("div");
  state.selectionBox.id = "rle-selection-box";
  state.selectionBox.className = "rle-selection-box";
  state.overlay.appendChild(state.selectionBox);

  // Add instruction text with export mode
  const instruction = document.createElement("div");
  instruction.className = "rle-instruction";

  const exportModeNames = {
    urls: "URLs Only",
    "text-url": "Text + URL",
    markdown: "Markdown List",
    csv: "CSV",
  };

  const modeName = exportModeNames[state.exportMode] || "URLs Only";

  instruction.innerHTML = `
    <div class="rle-instruction-main">Click and drag to select a region. Press ESC to cancel.</div>
    <div class="rle-instruction-mode">Export Mode: <strong>${modeName}</strong></div>
  `;
  state.overlay.appendChild(instruction);
}

// Attach event listeners
function attachEventListeners() {
  state.overlay.addEventListener("mousedown", handleMouseDown);
  state.overlay.addEventListener("mousemove", handleMouseMove);
  state.overlay.addEventListener("mouseup", handleMouseUp);
  document.addEventListener("keydown", handleKeyDown);
}

// Remove event listeners
function removeEventListeners() {
  if (state.overlay) {
    state.overlay.removeEventListener("mousedown", handleMouseDown);
    state.overlay.removeEventListener("mousemove", handleMouseMove);
    state.overlay.removeEventListener("mouseup", handleMouseUp);
  }
  document.removeEventListener("keydown", handleKeyDown);
}

// Handle mouse down
function handleMouseDown(e) {
  e.preventDefault();
  e.stopPropagation();

  state.startX = e.clientX;
  state.startY = e.clientY;

  state.selectionBox.style.left = state.startX + "px";
  state.selectionBox.style.top = state.startY + "px";
  state.selectionBox.style.width = "0px";
  state.selectionBox.style.height = "0px";
  state.selectionBox.style.display = "block";
}

// Handle mouse move
function handleMouseMove(e) {
  if (!state.selectionBox || state.selectionBox.style.display !== "block") {
    return;
  }

  e.preventDefault();
  e.stopPropagation();

  const currentX = e.clientX;
  const currentY = e.clientY;

  const width = Math.abs(currentX - state.startX);
  const height = Math.abs(currentY - state.startY);
  const left = Math.min(currentX, state.startX);
  const top = Math.min(currentY, state.startY);

  state.selectionBox.style.left = left + "px";
  state.selectionBox.style.top = top + "px";
  state.selectionBox.style.width = width + "px";
  state.selectionBox.style.height = height + "px";
}

// Handle mouse up
function handleMouseUp(e) {
  if (!state.selectionBox || state.selectionBox.style.display !== "block") {
    return;
  }

  e.preventDefault();
  e.stopPropagation();

  const selectionRect = {
    left: parseFloat(state.selectionBox.style.left),
    top: parseFloat(state.selectionBox.style.top),
    right:
      parseFloat(state.selectionBox.style.left) +
      parseFloat(state.selectionBox.style.width),
    bottom:
      parseFloat(state.selectionBox.style.top) +
      parseFloat(state.selectionBox.style.height),
    width: parseFloat(state.selectionBox.style.width),
    height: parseFloat(state.selectionBox.style.height),
  };

  // Only process if selection has meaningful size
  if (selectionRect.width > 10 && selectionRect.height > 10) {
    extractLinks(selectionRect);
  }

  // Clean up overlay
  removeOverlay();
}

// Handle ESC key
function handleKeyDown(e) {
  if (e.key === "Escape") {
    cancelSelection();
  }
}

// Extract links from selection
function extractLinks(selectionRect) {
  const anchors = document.querySelectorAll("a[href]");
  const extractedLinks = [];

  anchors.forEach((anchor, index) => {
    const rect = anchor.getBoundingClientRect();

    // Check if link intersects with selection
    const intersects = !(
      rect.right < selectionRect.left ||
      rect.left > selectionRect.right ||
      rect.bottom < selectionRect.top ||
      rect.top > selectionRect.bottom
    );

    if (intersects) {
      // Skip hidden elements
      if (rect.width === 0 || rect.height === 0) {
        return;
      }

      const text = (
        anchor.innerText ||
        anchor.textContent ||
        anchor.getAttribute("title") ||
        ""
      ).trim();
      const url = anchor.href;

      extractedLinks.push({
        text: text,
        url: url,
        index: index,
        top: rect.top,
        left: rect.left,
      });
    }
  });

  state.extractedLinks = extractedLinks;

  // Show results panel
  if (extractedLinks.length > 0) {
    showResultsPanel(extractedLinks);
  } else {
    showNoLinksMessage();
  }
}

// Show results panel
function showResultsPanel(links) {
  // Remove existing panel
  if (state.resultsPanel) {
    state.resultsPanel.remove();
  }

  const panel = document.createElement("div");
  panel.className = "rle-results-panel";
  panel.id = "rle-results-panel";

  // Header
  const header = document.createElement("div");
  header.className = "rle-panel-header";

  const title = document.createElement("div");
  title.className = "rle-panel-title";

  const exportModeNames = {
    urls: "URLs Only",
    "text-url": "Text + URL",
    markdown: "Markdown",
    csv: "CSV",
  };
  const modeName = exportModeNames[state.exportMode] || "URLs Only";

  title.innerHTML = `
  <div style="display: flex; gap: 8px; align-items: center;">
    <span class="rle-panel-count">Found ${links.length} link${
    links.length !== 1 ? "s" : ""
  }</span>
    <span class="rle-panel-mode">${modeName}</span>
  </div>
  `;

  const closeBtn = document.createElement("button");
  closeBtn.className = "rle-close-btn";
  closeBtn.textContent = "\u00D7";
  closeBtn.onclick = () => closeResultsPanel();

  header.appendChild(title);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  // Links list
  const linksList = document.createElement("div");
  linksList.className = "rle-links-list";

  links.forEach((link, index) => {
    const linkItem = document.createElement("div");
    linkItem.className = "rle-link-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    checkbox.id = `rle-link-${index}`;
    checkbox.dataset.index = index;

    const label = document.createElement("label");
    label.htmlFor = `rle-link-${index}`;

    const textSpan = document.createElement("span");
    textSpan.className = "rle-link-text";
    textSpan.textContent = link.text || "(no text)";

    const urlSpan = document.createElement("span");
    urlSpan.className = "rle-link-url";
    urlSpan.textContent = link.url;

    label.appendChild(textSpan);
    label.appendChild(urlSpan);

    linkItem.appendChild(checkbox);
    linkItem.appendChild(label);
    linksList.appendChild(linkItem);
  });

  panel.appendChild(linksList);

  // Actions
  const actions = document.createElement("div");
  actions.className = "rle-panel-actions";

  const selectAllBtn = document.createElement("button");
  selectAllBtn.className = "rle-btn rle-btn-secondary";
  selectAllBtn.textContent = "Select All";
  selectAllBtn.onclick = () => toggleAllCheckboxes(true);

  const deselectAllBtn = document.createElement("button");
  deselectAllBtn.className = "rle-btn rle-btn-secondary";
  deselectAllBtn.textContent = "Deselect All";
  deselectAllBtn.onclick = () => toggleAllCheckboxes(false);

  const copyBtn = document.createElement("button");
  copyBtn.className = "rle-btn rle-btn-primary";
  copyBtn.textContent = "Copy to Clipboard";
  copyBtn.onclick = () => copyToClipboard();

  actions.appendChild(selectAllBtn);
  actions.appendChild(deselectAllBtn);
  actions.appendChild(copyBtn);
  panel.appendChild(actions);

  document.body.appendChild(panel);
  state.resultsPanel = panel;
}

// Show no links message
function showNoLinksMessage() {
  const panel = document.createElement("div");
  panel.className = "rle-results-panel rle-no-results";
  panel.id = "rle-results-panel";

  const message = document.createElement("div");
  message.className = "rle-no-results-message";
  message.textContent = "No links found in selected area.";

  const closeBtn = document.createElement("button");
  closeBtn.className = "rle-btn rle-btn-secondary";
  closeBtn.textContent = "Close";
  closeBtn.onclick = () => closeResultsPanel();

  panel.appendChild(message);
  panel.appendChild(closeBtn);

  document.body.appendChild(panel);
  state.resultsPanel = panel;

  // Auto-close after 3 seconds
  setTimeout(() => {
    closeResultsPanel();
  }, 3000);
}

// Toggle all checkboxes
function toggleAllCheckboxes(checked) {
  const checkboxes = document.querySelectorAll(
    '.rle-links-list input[type="checkbox"]'
  );
  checkboxes.forEach((cb) => (cb.checked = checked));
}

// Copy to clipboard
async function copyToClipboard() {
  const checkboxes = document.querySelectorAll(
    '.rle-links-list input[type="checkbox"]:checked'
  );
  const selectedLinks = [];

  checkboxes.forEach((cb) => {
    const index = parseInt(cb.dataset.index);
    selectedLinks.push(state.extractedLinks[index]);
  });

  if (selectedLinks.length === 0) {
    showToast("No links selected", "error");
    return;
  }

  const formattedText = formatLinks(selectedLinks, state.exportMode);

  try {
    await navigator.clipboard.writeText(formattedText);
    showToast(
      `Copied ${selectedLinks.length} link${
        selectedLinks.length !== 1 ? "s" : ""
      }!`,
      "success"
    );

    // Close panel after successful copy
    setTimeout(() => {
      closeResultsPanel();
    }, 1500);
  } catch (error) {
    console.error("Clipboard write failed:", error);
    showFallbackCopyDialog(formattedText);
  }
}

// Format links based on export mode
function formatLinks(links, mode) {
  switch (mode) {
    case "urls":
      return links.map((link) => link.url).join(", ");

    case "text-url":
      return links.map((link) => `${link.text}\t${link.url}`).join("\n");

    case "markdown":
      return links
        .map((link) => `- [${link.text || link.url}](${link.url})`)
        .join("\n");

    case "csv":
      const escapeCsv = (str) => {
        // Always quote fields and escape any quotes in the content
        return `"${str.replace(/"/g, '""')}"`;
      };
      const rows = ['"Text","URL"'];
      links.forEach((link) => {
        rows.push(`${escapeCsv(link.text)},${escapeCsv(link.url)}`);
      });
      return rows.join("\n");

    default:
      return links.map((link) => link.url).join("\n");
  }
}

// Show fallback copy dialog
function showFallbackCopyDialog(text) {
  const dialog = document.createElement("div");
  dialog.className = "rle-fallback-dialog";

  const title = document.createElement("div");
  title.className = "rle-dialog-title";
  title.textContent = "Copy manually";

  const textarea = document.createElement("textarea");
  textarea.className = "rle-dialog-textarea";
  textarea.value = text;
  textarea.readOnly = true;

  const closeBtn = document.createElement("button");
  closeBtn.className = "rle-btn rle-btn-primary";
  closeBtn.textContent = "Close";
  closeBtn.onclick = () => dialog.remove();

  dialog.appendChild(title);
  dialog.appendChild(textarea);
  dialog.appendChild(closeBtn);

  document.body.appendChild(dialog);

  // Select text
  textarea.select();
}

// Show toast notification
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `rle-toast rle-toast-${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add("rle-toast-show"), 10);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove("rle-toast-show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Close results panel
function closeResultsPanel() {
  if (state.resultsPanel) {
    state.resultsPanel.remove();
    state.resultsPanel = null;
  }
  state.extractedLinks = [];
  state.isActive = false;
}

// Remove overlay
function removeOverlay() {
  if (state.overlay) {
    state.overlay.remove();
    state.overlay = null;
    state.selectionBox = null;
  }
  removeEventListeners();
  state.isActive = false;
}

// Cancel selection
function cancelSelection() {
  removeOverlay();
  closeResultsPanel();
  state.isActive = false;
}
