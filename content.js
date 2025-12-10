if (typeof window.RLE_STATE === "undefined") {
  window.RLE_STATE = {
    isActive: false,
    exportMode: "urls",
    cleanUrls: false,
    overlay: null,
    selectionBox: null,
    startX: 0,
    startY: 0,
    extractedLinks: [],
    resultsPanel: null,
    currentFilter: "all",
    customFilterValue: "",
    lastSelectionRect: null,
    currentTemplate: null,
    isAutoRun: false,
  };
}
const state = window.RLE_STATE;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "PING") {
    sendResponse({ loaded: true });
  } else if (message.action === "START_SELECTION") {
    startSelection(message.exportMode, message.cleanUrls);
    sendResponse({ success: true });
  } else if (message.action === "CANCEL_SELECTION") {
    cancelSelection();
    sendResponse({ success: true });
  } else if (message.action === "RUN_TEMPLATE") {
    runTemplate(message.template, message.template.autoRun);
    sendResponse({ success: true });
  } else if (message.action === "GET_TEMPLATES") {
    getTemplatesForDomain(message.domain).then((templates) => {
      sendResponse({ templates });
    });
    return true; // Keep channel open for async response
  }
  return true;
});

function startSelection(exportMode, cleanUrls) {
  if (state.isActive) {
    return;
  }

  state.exportMode = exportMode || "urls";
  state.cleanUrls = cleanUrls || false;
  state.currentTemplate = null; // Reset template when starting manual selection
  state.isActive = true;

  createOverlay();
  attachEventListeners();
}

function createOverlay() {
  if (state.overlay) {
    state.overlay.remove();
  }

  state.overlay = document.createElement("div");
  state.overlay.id = "rle-overlay";
  state.overlay.className = "rle-overlay";
  document.body.appendChild(state.overlay);

  state.selectionBox = document.createElement("div");
  state.selectionBox.id = "rle-selection-box";
  state.selectionBox.className = "rle-selection-box";
  state.overlay.appendChild(state.selectionBox);

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

function attachEventListeners() {
  state.overlay.addEventListener("mousedown", handleMouseDown);
  state.overlay.addEventListener("mousemove", handleMouseMove);
  state.overlay.addEventListener("mouseup", handleMouseUp);
  document.addEventListener("keydown", handleKeyDown);
}

function removeEventListeners() {
  if (state.overlay) {
    state.overlay.removeEventListener("mousedown", handleMouseDown);
    state.overlay.removeEventListener("mousemove", handleMouseMove);
    state.overlay.removeEventListener("mouseup", handleMouseUp);
  }
  document.removeEventListener("keydown", handleKeyDown);
}

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

  if (selectionRect.width > 10 && selectionRect.height > 10) {
    state.lastSelectionRect = selectionRect;
    extractLinks(selectionRect);
  }

  removeOverlay();
}

function handleKeyDown(e) {
  if (e.key === "Escape") {
    cancelSelection();
  }
}

function normalizeUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    // strip tracking params if enabled
    if (state.cleanUrls) {
      const paramsToStrip = [
        // UTM parameters (Google Analytics, standard marketing)
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content",
        "utm_id",
        "utm_source_platform",
        "utm_creative_format",
        "utm_marketing_tactic",

        // Google Ads & Analytics
        "gclid",
        "gclsrc",
        "dclid",
        "gbraid",
        "wbraid",
        "_ga",
        "_gl",

        // Facebook/Meta
        "fbclid",
        "fb_action_ids",
        "fb_action_types",
        "fb_source",
        "fb_ref",

        // Microsoft/Bing
        "msclkid",
        "mscrid",

        // TikTok
        "ttclid",

        // Twitter/X
        "twclid",

        // LinkedIn
        "li_fat_id",
        "li_source_id",

        // Instagram
        "igshid",
        "igsh",

        // HubSpot
        "_hsenc",
        "_hsmi",
        "__hssc",
        "__hstc",
        "__hsfp",
        "hsCtaTracking",

        // Marketo
        "mkt_tok",

        // Adobe/Omniture
        "s_cid",

        // Mailchimp
        "mc_cid",
        "mc_eid",

        // Campaign Monitor
        "vero_id",
        "vero_conv",

        // Drip
        "__s",

        // Klaviyo
        "_kx",

        // Omnisend
        "omnisendContactID",

        // General tracking
        "ref",
        "referer",
        "referrer",
        "source",
        "campaign",

        // Email tracking
        "oly_anon_id",
        "oly_enc_id",
        "wickedid",

        // Other ad platforms
        "zanpid",
        "spm",
        "scm",
        "scm_id",

        // Affiliate tracking
        "aff_id",
        "affiliate_id",
        "click_id",
        "clickid",

        // Session/tracking IDs
        "sid",
        "ssid",
        "iesrc",
      ];
      paramsToStrip.forEach((p) => url.searchParams.delete(p));
    }
    // Optional: remove trailing slash from path
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

function extractLinks(selectionRect) {
  console.log("[RegionLinks] extractLinks called, state.isAutoRun:", state.isAutoRun);

  // Validate selectionRect
  if (!selectionRect || typeof selectionRect.left === 'undefined') {
    console.error("Invalid selectionRect:", selectionRect);
    showToast("Error: Invalid selection area", "error");
    return;
  }

  const anchors = document.querySelectorAll("a[href]");
  const extractedLinks = [];

  anchors.forEach((anchor, index) => {
    const rect = anchor.getBoundingClientRect();

    const intersects = !(
      rect.right < selectionRect.left ||
      rect.left > selectionRect.right ||
      rect.bottom < selectionRect.top ||
      rect.top > selectionRect.bottom
    );

    if (intersects) {
      if (rect.width === 0 || rect.height === 0) {
        return;
      }

      let text = (anchor.innerText || anchor.textContent || "").trim();

      // Check for aria-label and title on the anchor
      if (!text) {
        text =
          anchor.getAttribute("aria-label") ||
          anchor.getAttribute("title") ||
          "";
      }

      // Check for image alt/title text
      if (!text) {
        const img = anchor.querySelector("img");
        if (img) {
          text = img.getAttribute("alt") || img.getAttribute("title") || "";
        }
      }

      // Check for SVG title element
      if (!text) {
        const svg = anchor.querySelector("svg");
        if (svg) {
          const titleElement = svg.querySelector("title");
          if (titleElement) {
            text = titleElement.textContent || "";
          }
          if (!text) {
            text = svg.getAttribute("aria-label") || "";
          }
        }
      }

      // Fallback: extract meaningful part from URL
      if (!text) {
        try {
          const urlObj = new URL(anchor.href);
          const hostname = urlObj.hostname.replace(/^www\./, "");
          const pathParts = urlObj.pathname.split("/").filter((p) => p);

          // Capitalize and format domain name nicely
          const domainParts = hostname.split(".");
          const mainDomain =
            domainParts.length > 1
              ? domainParts[domainParts.length - 2]
              : domainParts[0];
          const capitalizedDomain =
            mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);

          // Use domain + first meaningful path segment if available
          if (pathParts.length > 0) {
            const pathLabel = pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1);
            text = `${capitalizedDomain} - ${pathLabel}`;
          } else {
            text = capitalizedDomain;
          }
        } catch (e) {
          text = "Link";
        }
      }

      text = text.trim();
      const url = normalizeUrl(anchor.href);

      extractedLinks.push({
        text: text,
        url: url,
        index: index,
        top: rect.top,
        left: rect.left,
      });
    }
  });

  // Remove duplicate URLs, keeping only the first occurrence
  const uniqueLinks = [];
  const seenUrls = new Set();

  extractedLinks.forEach((link) => {
    if (!seenUrls.has(link.url)) {
      seenUrls.add(link.url);
      uniqueLinks.push(link);
    }
  });

  state.extractedLinks = uniqueLinks;

  if (uniqueLinks.length > 0) {
    // If auto-run, return links for popup to copy
    if (state.isAutoRun) {
      console.log("[RegionLinks] Auto-run extraction complete, storing for popup");

      // Apply filters
      const filteredLinks = getFilteredLinks();
      console.log("[RegionLinks] Filtered to", filteredLinks.length, "links");

      if (filteredLinks.length === 0) {
        console.log("[RegionLinks] No links after filtering");
        showToast("No links match current filters", "error");
        state.isAutoRun = false;
        return;
      }

      const formattedText = formatLinks(filteredLinks, state.exportMode);

      // Store for popup to retrieve and copy
      chrome.storage.local.set({
        pendingAutoCopy: {
          text: formattedText,
          count: filteredLinks.length,
          timestamp: Date.now()
        }
      });
      console.log("[RegionLinks] Stored", filteredLinks.length, "links in pendingAutoCopy");
      state.isAutoRun = false;
    } else {
      showResultsPanel(uniqueLinks);
    }
  } else {
    if (state.isAutoRun) {
      showToast("No links found in saved region", "error");
      state.isAutoRun = false;
    } else {
      showNoLinksMessage();
    }
  }
}

function getFilteredLinks() {
  const currentPageDomain = new URL(window.location.href).hostname;

  return state.extractedLinks.filter((link) => {
    try {
      const linkDomain = new URL(link.url).hostname;

      switch (state.currentFilter) {
        case "all":
          return true;

        case "internal":
          return linkDomain === currentPageDomain;

        case "external":
          return linkDomain !== currentPageDomain;

        case "custom":
          if (!state.customFilterValue) return true;
          const searchValue = state.customFilterValue.toLowerCase();
          return (
            link.url.toLowerCase().includes(searchValue) ||
            link.text.toLowerCase().includes(searchValue)
          );

        default:
          return true;
      }
    } catch (e) {
      // If URL parsing fails, include the link in "all" filter
      return state.currentFilter === "all" || state.currentFilter === "custom";
    }
  });
}

function updateFilterButtons() {
  const filterBtns = document.querySelectorAll(".rle-filter-btn");
  filterBtns.forEach((btn) => {
    btn.classList.remove("active");
    const btnText = btn.textContent.toLowerCase();
    if (btnText === state.currentFilter) {
      btn.classList.add("active");
    }
  });

  // If custom filter, don't highlight buttons
  if (state.currentFilter === "custom") {
    filterBtns.forEach((btn) => btn.classList.remove("active"));
  }
}

function updateFilteredDisplay() {
  const filteredLinks = getFilteredLinks();
  const linksList = document.querySelector(".rle-links-list");
  const countElement = document.querySelector(".rle-panel-count");

  if (!linksList || !countElement) return;

  // Update count
  if (state.currentFilter === "all") {
    countElement.textContent = `Found ${filteredLinks.length} link${
      filteredLinks.length !== 1 ? "s" : ""
    }`;
  } else {
    countElement.textContent = `${filteredLinks.length} link${
      filteredLinks.length !== 1 ? "s" : ""
    } (${state.extractedLinks.length} total)`;
  }

  // Clear and rebuild list
  linksList.innerHTML = "";

  filteredLinks.forEach((link, index) => {
    const linkItem = document.createElement("div");
    linkItem.className = "rle-link-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    checkbox.id = `rle-link-${index}`;
    checkbox.dataset.url = link.url;

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
}

function showResultsPanel(links) {
  if (state.resultsPanel) {
    state.resultsPanel.remove();
  }

  const panel = document.createElement("div");
  panel.className = "rle-results-panel";
  panel.id = "rle-results-panel";

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

  // Filter section
  const filterSection = document.createElement("div");
  filterSection.className = "rle-filter-section";

  const filterLabel = document.createElement("span");
  filterLabel.className = "rle-filter-label";
  filterLabel.textContent = "Filter Links";

  const filterControls = document.createElement("div");
  filterControls.className = "rle-filter-controls";

  // All button
  const allBtn = document.createElement("button");
  allBtn.className = "rle-filter-btn" + (state.currentFilter === "all" ? " active" : "");
  allBtn.textContent = "All";
  allBtn.onclick = () => {
    state.currentFilter = "all";
    updateFilterButtons();
    updateFilteredDisplay();
  };

  // Internal button
  const internalBtn = document.createElement("button");
  internalBtn.className = "rle-filter-btn" + (state.currentFilter === "internal" ? " active" : "");
  internalBtn.textContent = "Internal";
  internalBtn.onclick = () => {
    state.currentFilter = "internal";
    updateFilterButtons();
    updateFilteredDisplay();
  };

  // External button
  const externalBtn = document.createElement("button");
  externalBtn.className = "rle-filter-btn" + (state.currentFilter === "external" ? " active" : "");
  externalBtn.textContent = "External";
  externalBtn.onclick = () => {
    state.currentFilter = "external";
    updateFilterButtons();
    updateFilteredDisplay();
  };

  // Custom filter input
  const customInput = document.createElement("input");
  customInput.type = "text";
  customInput.className = "rle-filter-input";
  customInput.placeholder = "Filter by domain or keyword...";
  customInput.value = state.customFilterValue;
  customInput.oninput = (e) => {
    state.customFilterValue = e.target.value;
    state.currentFilter = "custom";
    updateFilterButtons();
    updateFilteredDisplay();
  };

  filterControls.appendChild(allBtn);
  filterControls.appendChild(internalBtn);
  filterControls.appendChild(externalBtn);
  filterControls.appendChild(customInput);

  // Selection controls (Select All / Deselect All)
  const selectionControls = document.createElement("div");
  selectionControls.className = "rle-selection-controls";

  const selectAllBtn = document.createElement("button");
  selectAllBtn.className = "rle-selection-btn";
  selectAllBtn.textContent = "Select All";
  selectAllBtn.onclick = () => toggleAllCheckboxes(true);

  const deselectAllBtn = document.createElement("button");
  deselectAllBtn.className = "rle-selection-btn";
  deselectAllBtn.textContent = "Deselect All";
  deselectAllBtn.onclick = () => toggleAllCheckboxes(false);

  selectionControls.appendChild(selectAllBtn);
  selectionControls.appendChild(deselectAllBtn);

  filterSection.appendChild(filterLabel);
  filterSection.appendChild(filterControls);
  filterSection.appendChild(selectionControls);
  panel.appendChild(filterSection);

  const linksList = document.createElement("div");
  linksList.className = "rle-links-list";

  links.forEach((link, index) => {
    const linkItem = document.createElement("div");
    linkItem.className = "rle-link-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    checkbox.id = `rle-link-${index}`;
    checkbox.dataset.url = link.url;

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

  const actions = document.createElement("div");
  actions.className = "rle-panel-actions";

  const copyBtn = document.createElement("button");
  copyBtn.className = "rle-btn rle-btn-primary";
  copyBtn.textContent = "Copy to Clipboard";
  copyBtn.onclick = () => copyToClipboard();

  const saveTemplateBtn = document.createElement("button");
  saveTemplateBtn.className = "rle-btn rle-btn-template";
  saveTemplateBtn.textContent = state.currentTemplate ? "Edit Template" : "Save as Template";
  saveTemplateBtn.onclick = () => showTemplateSaveDialog();

  actions.appendChild(copyBtn);
  actions.appendChild(saveTemplateBtn);
  panel.appendChild(actions);

  document.body.appendChild(panel);
  state.resultsPanel = panel;
}

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

  setTimeout(() => {
    closeResultsPanel();
  }, 3000);
}

function toggleAllCheckboxes(checked) {
  const checkboxes = document.querySelectorAll(
    '.rle-links-list input[type="checkbox"]'
  );
  checkboxes.forEach((cb) => (cb.checked = checked));
}

async function copyToClipboard() {
  const checkboxes = document.querySelectorAll(
    '.rle-links-list input[type="checkbox"]:checked'
  );
  const selectedLinks = [];

  checkboxes.forEach((cb) => {
    const url = cb.dataset.url;
    // Find the link in extractedLinks by URL
    const link = state.extractedLinks.find((l) => l.url === url);
    if (link) {
      selectedLinks.push(link);
    }
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

    setTimeout(() => {
      closeResultsPanel();
    }, 1500);
  } catch (error) {
    console.error("Clipboard write failed:", error);
    showFallbackCopyDialog(formattedText);
  }
}

function formatLinks(links, mode) {
  switch (mode) {
    case "urls":
      return links.map((link) => link.url).join(", ");

    case "text-url":
      return links.map((link) => {
        // Normalize whitespace: replace newlines and multiple spaces with single space
        const normalizedText = link.text.replace(/\s+/g, ' ').trim();
        return `${normalizedText} - ${link.url}`;
      }).join("\n");

    case "markdown":
      return links
        .map((link) => {
          // Normalize whitespace: replace newlines and multiple spaces with single space
          const normalizedText = link.text ? link.text.replace(/\s+/g, ' ').trim() : link.url;
          return `- [${normalizedText}](${link.url})`;
        })
        .join("\n");

    case "csv":
      const sourcePage = window.location.href;
      const rows = ["name,url,source_page"];
      links.forEach((link) => {
        // Normalize whitespace: replace newlines and multiple spaces with single space
        const normalizedText = link.text.replace(/\s+/g, ' ').trim();
        // Escape commas and quotes in values
        const escapedText = normalizedText.replace(/"/g, '""');
        const escapedUrl = link.url.replace(/"/g, '""');
        const escapedSource = sourcePage.replace(/"/g, '""');

        // Only quote fields that contain commas, quotes, or newlines
        const nameField = (normalizedText.includes(',') || normalizedText.includes('"'))
          ? `"${escapedText}"`
          : normalizedText;
        const urlField = (link.url.includes(',') || link.url.includes('"'))
          ? `"${escapedUrl}"`
          : link.url;
        const sourceField = (sourcePage.includes(',') || sourcePage.includes('"'))
          ? `"${escapedSource}"`
          : sourcePage;

        rows.push(`${nameField},${urlField},${sourceField}`);
      });
      return rows.join("\n");

    default:
      return links.map((link) => link.url).join("\n");
  }
}

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

  textarea.select();
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `rle-toast rle-toast-${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("rle-toast-show"), 10);

  setTimeout(() => {
    toast.classList.remove("rle-toast-show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showTemplateSaveDialog() {
  const isEditing = !!state.currentTemplate;
  const dialog = document.createElement("div");
  dialog.className = "rle-template-dialog";

  const title = document.createElement("div");
  title.className = "rle-dialog-title";
  title.textContent = isEditing ? "Edit Extraction Template" : "Save Extraction Template";

  const nameLabel = document.createElement("label");
  nameLabel.className = "rle-template-label";
  nameLabel.textContent = "Template Name:";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "rle-template-input";
  nameInput.placeholder = "e.g., Company Directory Extract";
  nameInput.value = isEditing
    ? state.currentTemplate.name
    : `${new URL(window.location.href).hostname} Links`;

  const autoRunLabel = document.createElement("label");
  autoRunLabel.className = "rle-template-checkbox-label";

  const autoRunCheckbox = document.createElement("input");
  autoRunCheckbox.type = "checkbox";
  autoRunCheckbox.id = "rle-template-autorun";
  autoRunCheckbox.checked = isEditing ? state.currentTemplate.autoRun : false;

  const autoRunText = document.createElement("span");
  autoRunText.textContent = "Auto-run this template when I visit this site";

  autoRunLabel.appendChild(autoRunCheckbox);
  autoRunLabel.appendChild(autoRunText);

  const buttons = document.createElement("div");
  buttons.className = "rle-template-buttons";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "rle-btn rle-btn-secondary";
  cancelBtn.textContent = "Cancel";
  cancelBtn.onclick = () => dialog.remove();

  const saveBtn = document.createElement("button");
  saveBtn.className = "rle-btn rle-btn-primary";
  saveBtn.textContent = isEditing ? "Update Template" : "Save Template";
  saveBtn.onclick = async () => {
    const templateName = nameInput.value.trim();
    if (!templateName) {
      showToast("Please enter a template name", "error");
      return;
    }

    // Check for duplicate names
    const isDuplicate = await checkDuplicateTemplateName(
      templateName,
      isEditing ? state.currentTemplate.id : null
    );

    if (isDuplicate) {
      showToast("A template with this name already exists", "error");
      return;
    }

    if (isEditing) {
      await updateTemplate(state.currentTemplate.id, templateName, autoRunCheckbox.checked);
      showToast("Template updated successfully!", "success");
    } else {
      await saveTemplate(templateName, autoRunCheckbox.checked);
      showToast("Template saved successfully!", "success");
    }

    dialog.remove();
  };

  buttons.appendChild(cancelBtn);
  buttons.appendChild(saveBtn);

  dialog.appendChild(title);
  dialog.appendChild(nameLabel);
  dialog.appendChild(nameInput);
  dialog.appendChild(autoRunLabel);
  dialog.appendChild(buttons);

  document.body.appendChild(dialog);
  nameInput.focus();
  nameInput.select();
}

async function checkDuplicateTemplateName(name, excludeId = null) {
  const currentDomain = new URL(window.location.href).hostname;
  const result = await chrome.storage.local.get(["templates"]);
  const templates = result.templates || [];

  return templates.some(
    (t) =>
      t.domain === currentDomain &&
      t.name.toLowerCase() === name.toLowerCase() &&
      t.id !== excludeId
  );
}

async function saveTemplate(templateName, autoRun) {
  // Validate we have a valid selection to save
  if (!state.lastSelectionRect || typeof state.lastSelectionRect.left === 'undefined') {
    console.error("Cannot save template: no valid selection area");
    showToast("Error: No valid selection area to save", "error");
    return;
  }

  const currentDomain = new URL(window.location.href).hostname;

  const template = {
    id: Date.now().toString(),
    name: templateName,
    domain: currentDomain,
    autoRun: autoRun,
    selectionRect: state.lastSelectionRect,
    exportMode: state.exportMode,
    cleanUrls: state.cleanUrls,
    currentFilter: state.currentFilter,
    customFilterValue: state.customFilterValue,
    createdAt: new Date().toISOString(),
  };

  // Get existing templates
  const result = await chrome.storage.local.get(["templates"]);
  const templates = result.templates || [];

  // Add new template
  templates.push(template);

  // Save back to storage
  await chrome.storage.local.set({ templates });

  // Update current template reference
  state.currentTemplate = template;
}

async function updateTemplate(templateId, templateName, autoRun) {
  const result = await chrome.storage.local.get(["templates"]);
  const templates = result.templates || [];

  const templateIndex = templates.findIndex((t) => t.id === templateId);

  if (templateIndex !== -1) {
    // Update template properties
    templates[templateIndex].name = templateName;
    templates[templateIndex].autoRun = autoRun;

    // Only update selectionRect if a new selection was made
    // Otherwise preserve the existing one
    if (state.lastSelectionRect && typeof state.lastSelectionRect.left !== 'undefined') {
      templates[templateIndex].selectionRect = state.lastSelectionRect;
    }

    // Update other settings
    templates[templateIndex].exportMode = state.exportMode;
    templates[templateIndex].cleanUrls = state.cleanUrls;
    templates[templateIndex].currentFilter = state.currentFilter;
    templates[templateIndex].customFilterValue = state.customFilterValue;
    templates[templateIndex].updatedAt = new Date().toISOString();

    // Save back to storage
    await chrome.storage.local.set({ templates });

    // Update current template reference
    state.currentTemplate = templates[templateIndex];
  }
}

async function getTemplatesForDomain(domain) {
  const result = await chrome.storage.local.get(["templates"]);
  const templates = result.templates || [];
  return templates.filter((t) => t.domain === domain);
}

async function runTemplate(template, isAutoRunning = false) {
  console.log("[RegionLinks] runTemplate called, isAutoRunning:", isAutoRunning, "template.autoRun:", template.autoRun);

  // Validate template has a valid selectionRect
  if (!template.selectionRect || typeof template.selectionRect.left === 'undefined') {
    console.error("Template missing valid selectionRect:", template);
    showToast("Error: This template has invalid selection data. Please recreate it.", "error");
    return;
  }

  state.exportMode = template.exportMode;
  state.cleanUrls = template.cleanUrls;
  state.currentFilter = template.currentFilter || "all";
  state.customFilterValue = template.customFilterValue || "";
  state.currentTemplate = template;
  state.isAutoRun = isAutoRunning;

  console.log("[RegionLinks] State updated, state.isAutoRun:", state.isAutoRun);
  console.log("[RegionLinks] Calling extractLinks with rect:", template.selectionRect);

  extractLinks(template.selectionRect);
}

function closeResultsPanel() {
  if (state.resultsPanel) {
    state.resultsPanel.remove();
    state.resultsPanel = null;
  }
  state.extractedLinks = [];
  state.currentFilter = "all";
  state.customFilterValue = "";
  state.currentTemplate = null;
  state.isAutoRun = false;
  state.isActive = false;
}

function removeOverlay() {
  if (state.overlay) {
    state.overlay.remove();
    state.overlay = null;
    state.selectionBox = null;
  }
  removeEventListeners();
  state.isActive = false;
}

function cancelSelection() {
  removeOverlay();
  closeResultsPanel();
  state.isActive = false;
}
