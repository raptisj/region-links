/**
 * Results Panel Module
 * Displays extracted links with filtering and selection controls
 */
(function() {
  'use strict';

  window.RLE = window.RLE || {};
  window.RLE.ui = window.RLE.ui || {};

  /**
   * Toggle all checkboxes in the results panel
   * @param {boolean} checked - Whether to check or uncheck all
   */
  function toggleAllCheckboxes(checked) {
    const checkboxes = document.querySelectorAll('.rle-links-list input[type="checkbox"]');
    checkboxes.forEach(function(cb) {
      cb.checked = checked;
    });
  }

  /**
   * Update filter dropdown and input visibility
   */
  function updateFilterDropdown() {
    const state = window.RLE.state.get();
    const filterSelect = document.querySelector(".rle-filter-select");
    const customInput = document.querySelector(".rle-filter-input");

    if (!filterSelect || !customInput) return;

    filterSelect.value = state.currentFilter;

    // Show/hide custom input based on selection
    if (state.currentFilter === "custom") {
      customInput.style.display = "block";
    } else {
      customInput.style.display = "none";
    }
  }

  /**
   * Update the filtered display of links
   */
  function updateFilteredDisplay() {
    const state = window.RLE.state.get();
    const currentPageDomain = new URL(window.location.href).hostname;
    const filteredLinks = window.RLE.links.filterLinks(
      state.extractedLinks,
      state.currentFilter,
      state.customFilterValue,
      currentPageDomain
    );
    const linksList = document.querySelector(".rle-links-list");
    const countElement = document.querySelector(".rle-panel-count");

    if (!linksList || !countElement) return;

    // Update count
    if (state.currentFilter === "all") {
      countElement.textContent = "Found " + filteredLinks.length + " link" +
        (filteredLinks.length !== 1 ? "s" : "");
    } else {
      countElement.textContent = filteredLinks.length + " link" +
        (filteredLinks.length !== 1 ? "s" : "") + " (" + state.extractedLinks.length + " total)";
    }

    // Clear and rebuild list
    linksList.innerHTML = "";

    filteredLinks.forEach(function(link, index) {
      const linkItem = document.createElement("div");
      linkItem.className = "rle-link-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = true;
      checkbox.id = "rle-link-" + index;
      checkbox.dataset.url = link.url;

      const label = document.createElement("label");
      label.htmlFor = "rle-link-" + index;

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

    // Reset toggle button text (all new checkboxes are checked by default)
    const toggleSelectBtn = document.querySelector(".rle-selection-btn");
    if (toggleSelectBtn) {
      toggleSelectBtn.textContent = "Deselect All";
    }
  }

  /**
   * Copy selected links to clipboard
   */
  async function copyToClipboard() {
    const state = window.RLE.state.get();
    const checkboxes = document.querySelectorAll('.rle-links-list input[type="checkbox"]:checked');
    const selectedLinks = [];

    checkboxes.forEach(function(cb) {
      const url = cb.dataset.url;
      // Find the link in extractedLinks by URL
      const link = state.extractedLinks.find(function(l) {
        return l.url === url;
      });
      if (link) {
        selectedLinks.push(link);
      }
    });

    if (selectedLinks.length === 0) {
      window.RLE.ui.showToast("No links selected", "error");
      return;
    }

    const formattedText = window.RLE.links.formatLinks(selectedLinks, state.exportMode);

    try {
      await navigator.clipboard.writeText(formattedText);
      window.RLE.ui.showToast(
        "Copied " + selectedLinks.length + " link" +
        (selectedLinks.length !== 1 ? "s" : "") + "!",
        "success"
      );

      setTimeout(function() {
        window.RLE.ui.closeResultsPanel();
      }, 1500);
    } catch (error) {
      console.error("Clipboard write failed:", error);
      window.RLE.ui.showFallbackCopyDialog(formattedText);
    }
  }

  /**
   * Show the results panel with extracted links
   * @param {Array} links - Array of extracted link objects
   */
  window.RLE.ui.showResultsPanel = function(links) {
    const state = window.RLE.state.get();

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

    title.innerHTML = '<div style="display: flex; gap: 8px; align-items: center;">' +
      '<span class="rle-panel-count">Found ' + links.length + ' link' +
      (links.length !== 1 ? 's' : '') + '</span>' +
      '<span class="rle-panel-mode">' + modeName + '</span>' +
      '</div>';

    const closeBtn = document.createElement("button");
    closeBtn.className = "rle-close-btn";
    closeBtn.textContent = "\u00D7";
    closeBtn.onclick = function() {
      window.RLE.ui.closeResultsPanel();
    };

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

    // Filter dropdown
    const filterSelect = document.createElement("select");
    filterSelect.className = "rle-filter-select";
    filterSelect.id = "rle-filter-select";
    filterSelect.name = "filter";

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All";

    const internalOption = document.createElement("option");
    internalOption.value = "internal";
    internalOption.textContent = "Internal";

    const externalOption = document.createElement("option");
    externalOption.value = "external";
    externalOption.textContent = "External";

    const customOption = document.createElement("option");
    customOption.value = "custom";
    customOption.textContent = "Domain or Keyword";

    filterSelect.appendChild(allOption);
    filterSelect.appendChild(internalOption);
    filterSelect.appendChild(externalOption);
    filterSelect.appendChild(customOption);

    filterSelect.value = state.currentFilter;
    filterSelect.onchange = function(e) {
      const newFilter = e.target.value;
      window.RLE.state.set({ currentFilter: newFilter });
      updateFilterDropdown();
      updateFilteredDisplay();
    };

    // Custom filter input
    const customInput = document.createElement("input");
    customInput.type = "text";
    customInput.className = "rle-filter-input";
    customInput.id = "rle-filter-input";
    customInput.name = "customFilter";
    customInput.placeholder = "Filter by domain or keyword...";
    customInput.value = state.customFilterValue;
    customInput.style.display = state.currentFilter === "custom" ? "block" : "none";
    customInput.oninput = function(e) {
      window.RLE.state.set({
        customFilterValue: e.target.value
      });
      updateFilteredDisplay();
    };

    // Selection controls (Toggle Select All)
    const toggleSelectBtn = document.createElement("button");
    toggleSelectBtn.className = "rle-selection-btn";
    toggleSelectBtn.textContent = "Deselect All";
    toggleSelectBtn.onclick = function() {
      const checkboxes = document.querySelectorAll('.rle-links-list input[type="checkbox"]');
      const allChecked = Array.from(checkboxes).every(function(cb) {
        return cb.checked;
      });

      // Toggle: if all checked, uncheck all; otherwise check all
      toggleAllCheckboxes(!allChecked);
      toggleSelectBtn.textContent = allChecked ? "Select All" : "Deselect All";
    };

    filterControls.appendChild(filterSelect);
    filterControls.appendChild(customInput);
    filterControls.appendChild(toggleSelectBtn);

    filterSection.appendChild(filterLabel);
    filterSection.appendChild(filterControls);
    panel.appendChild(filterSection);

    const linksList = document.createElement("div");
    linksList.className = "rle-links-list";

    links.forEach(function(link, index) {
      const linkItem = document.createElement("div");
      linkItem.className = "rle-link-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = true;
      checkbox.id = "rle-link-" + index;
      checkbox.dataset.url = link.url;

      const label = document.createElement("label");
      label.htmlFor = "rle-link-" + index;

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
    copyBtn.onclick = copyToClipboard;

    const saveTemplateBtn = document.createElement("button");
    saveTemplateBtn.className = "rle-btn rle-btn-template";
    saveTemplateBtn.textContent = state.currentTemplate ? "Edit Template" : "Save as Template";
    saveTemplateBtn.onclick = function() {
      window.RLE.ui.showTemplateSaveDialog();
    };

    actions.appendChild(copyBtn);
    actions.appendChild(saveTemplateBtn);
    panel.appendChild(actions);

    document.body.appendChild(panel);
    window.RLE.state.set({ resultsPanel: panel });
  };

  /**
   * Close the results panel
   */
  window.RLE.ui.closeResultsPanel = function() {
    const state = window.RLE.state.get();

    if (state.resultsPanel) {
      state.resultsPanel.remove();
      window.RLE.state.set({ resultsPanel: null });
    }
    window.RLE.state.set({
      extractedLinks: [],
      currentFilter: "all",
      customFilterValue: "",
      currentTemplate: null,
      isAutoRun: false,
      isActive: false
    });
  };

  // Export for internal use
  window.RLE.ui.updateFilteredDisplay = updateFilteredDisplay;
})();
