/**
 * Dialogs Module
 * Handles template save/edit and fallback copy dialogs
 */
(function() {
  'use strict';

  window.RLE = window.RLE || {};
  window.RLE.ui = window.RLE.ui || {};

  /**
   * Check if a template name already exists for the current domain
   * @param {string} name - Template name to check
   * @param {string} [excludeId] - Template ID to exclude from check (for editing)
   * @returns {Promise<boolean>} True if duplicate exists
   */
  async function checkDuplicateTemplateName(name, excludeId) {
    const currentDomain = new URL(window.location.href).hostname;
    const result = await chrome.storage.local.get(["templates"]);
    const templates = result.templates || [];

    return templates.some(function(t) {
      return t.domain === currentDomain &&
        t.name.toLowerCase() === name.toLowerCase() &&
        t.id !== excludeId;
    });
  }

  /**
   * Show template save/edit dialog
   */
  window.RLE.ui.showTemplateSaveDialog = function() {
    const state = window.RLE.state.get();
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
      : new URL(window.location.href).hostname + " Links";

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

    // Use full list checkbox
    const useContainerLabel = document.createElement("label");
    useContainerLabel.className = "rle-template-checkbox-label";

    const useContainerCheckbox = document.createElement("input");
    useContainerCheckbox.type = "checkbox";
    useContainerCheckbox.id = "rle-template-use-container";
    useContainerCheckbox.checked = isEditing ? (state.currentTemplate.useContainerInsteadOfViewport || false) : false;

    const useContainerText = document.createElement("span");
    useContainerText.textContent = "Use full list (entire container) instead of visible area";

    useContainerLabel.appendChild(useContainerCheckbox);
    useContainerLabel.appendChild(useContainerText);

    // Container selector display (read-only, for info)
    const containerInfo = document.createElement("div");
    containerInfo.className = "rle-template-info";
    containerInfo.style.display = "none";
    containerInfo.id = "rle-container-info";

    // Multi-page checkbox
    const multiPageLabel = document.createElement("label");
    multiPageLabel.className = "rle-template-checkbox-label";

    const multiPageCheckbox = document.createElement("input");
    multiPageCheckbox.type = "checkbox";
    multiPageCheckbox.id = "rle-template-multipage";
    multiPageCheckbox.checked = isEditing ? (state.currentTemplate.multiPage || false) : false;

    const multiPageText = document.createElement("span");
    multiPageText.textContent = "Enable multi-page extraction";

    multiPageLabel.appendChild(multiPageCheckbox);
    multiPageLabel.appendChild(multiPageText);

    // Multi-page settings container
    const multiPageSettings = document.createElement("div");
    multiPageSettings.className = "rle-multipage-settings";
    multiPageSettings.id = "rle-multipage-settings";
    multiPageSettings.style.display = multiPageCheckbox.checked ? "block" : "none";

    // Max pages dropdown
    const maxPagesLabel = document.createElement("label");
    maxPagesLabel.className = "rle-template-label";
    maxPagesLabel.textContent = "Max pages:";
    maxPagesLabel.style.marginTop = "8px";

    const maxPagesSelect = document.createElement("select");
    maxPagesSelect.className = "rle-template-select";
    maxPagesSelect.id = "rle-template-maxpages";

    // Add "List" option for unlimited extraction
    const listOption = document.createElement("option");
    listOption.value = "list";
    listOption.textContent = "List (extract all available)";
    maxPagesSelect.appendChild(listOption);

    const maxPagesOptions = [2, 3, 5, 10, 15, 20];
    maxPagesOptions.forEach(function(val) {
      const option = document.createElement("option");
      option.value = val;
      option.textContent = val + " pages";
      if (isEditing && state.currentTemplate.maxPages === val) {
        option.selected = true;
      } else if (!isEditing && val === 5) {
        option.selected = true;
      }
      maxPagesSelect.appendChild(option);
    });

    // Select "List" if editing and maxPages is high
    if (isEditing && state.currentTemplate.maxPages >= 50) {
      listOption.selected = true;
    }

    // Pagination selector
    const paginationLabel = document.createElement("label");
    paginationLabel.className = "rle-template-label";
    paginationLabel.textContent = "Next Page Button:";
    paginationLabel.style.marginTop = "8px";

    const paginationContainer = document.createElement("div");
    paginationContainer.className = "rle-pagination-container";

    const paginationInput = document.createElement("input");
    paginationInput.type = "text";
    paginationInput.className = "rle-template-input rle-pagination-input";
    paginationInput.placeholder = "CSS selector (optional)";
    paginationInput.id = "rle-template-pagination-selector";
    paginationInput.value = isEditing ? (state.currentTemplate.paginationSelector || '') : '';

    const markButton = document.createElement("button");
    markButton.className = "rle-btn rle-btn-secondary rle-mark-btn";
    markButton.textContent = "Mark Button";
    markButton.type = "button";

    paginationContainer.appendChild(paginationInput);
    paginationContainer.appendChild(markButton);

    multiPageSettings.appendChild(maxPagesLabel);
    multiPageSettings.appendChild(maxPagesSelect);
    multiPageSettings.appendChild(paginationLabel);
    multiPageSettings.appendChild(paginationContainer);

    // Toggle multi-page settings visibility
    multiPageCheckbox.onchange = function() {
      multiPageSettings.style.display = multiPageCheckbox.checked ? "block" : "none";
    };

    // Mark button click handler
    markButton.onclick = function() {
      // Temporarily hide the dialog to allow element selection
      dialog.style.display = 'none';

      // Start element picker
      if (window.RLE.ui.elementPicker) {
        window.RLE.ui.elementPicker.start(function(selector) {
          // Show dialog again
          if (document.body.contains(dialog)) {
            dialog.style.display = 'block';
          } else {
            console.error('[RegionLinks] Dialog was removed from DOM! Re-appending...');
            document.body.appendChild(dialog);
            dialog.style.display = 'block';
          }

          if (selector) {
            paginationInput.value = selector;
            window.RLE.ui.showToast("Pagination button marked: " + selector, "success");
          } else {
            window.RLE.ui.showToast("No element selected", "info");
          }
        });
      } else {
        dialog.style.display = 'block';
        console.error('[RegionLinks] Element picker not loaded');
        window.RLE.ui.showToast("Element picker not loaded", "error");
      }
    };

    const buttons = document.createElement("div");
    buttons.className = "rle-template-buttons";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "rle-btn rle-btn-secondary";
    cancelBtn.textContent = "Cancel";
    cancelBtn.onclick = function() {
      dialog.remove();
    };

    const saveBtn = document.createElement("button");
    saveBtn.className = "rle-btn rle-btn-primary";
    saveBtn.textContent = isEditing ? "Update Template" : "Save Template";
    saveBtn.onclick = async function() {
      const templateName = nameInput.value.trim();
      if (!templateName) {
        window.RLE.ui.showToast("Please enter a template name", "error");
        return;
      }

      // Check for duplicate names
      const isDuplicate = await checkDuplicateTemplateName(
        templateName,
        isEditing ? state.currentTemplate.id : null
      );

      if (isDuplicate) {
        window.RLE.ui.showToast("A template with this name already exists", "error");
        return;
      }

      // Collect multi-page settings
      const maxPagesValue = maxPagesSelect.value === 'list' ? 999 : parseInt(maxPagesSelect.value, 10);
      const multiPageSettings = {
        multiPage: multiPageCheckbox.checked,
        maxPages: maxPagesValue,
        paginationSelector: paginationInput.value.trim() || null,
        useContainerInsteadOfViewport: useContainerCheckbox.checked,
        containerSelector: null, // Will be detected on save
        autoScroll: false, // Default for now
        maxScrollSteps: 10 // Default
      };

      // Detect container if "use full list" is enabled
      if (useContainerCheckbox.checked && state.lastSelectionRect) {
        const linkElements = window.RLE.links.extractLinkElements(state.lastSelectionRect);
        if (linkElements && linkElements.length > 0) {
          const containerSelector = window.RLE.links.detectContainer(linkElements);
          if (containerSelector) {
            multiPageSettings.containerSelector = containerSelector;
            console.log("[RegionLinks] Detected container:", containerSelector);
          } else {
            window.RLE.ui.showToast("Could not detect container - will use region selection", "warning");
          }
        }
      }

      if (isEditing) {
        await window.RLE.templates.updateTemplate(state.currentTemplate.id, templateName, autoRunCheckbox.checked, multiPageSettings);
        window.RLE.ui.showToast("Template updated successfully!", "success");
      } else {
        await window.RLE.templates.saveTemplate(templateName, autoRunCheckbox.checked, multiPageSettings);
        window.RLE.ui.showToast("Template saved successfully!", "success");
      }

      // If "Use full list" was enabled and container was detected, re-extract and update results panel
      if (useContainerCheckbox.checked && multiPageSettings.containerSelector) {
        console.log("[RegionLinks] Re-extracting with container after save:", multiPageSettings.containerSelector);

        // Get current template from state (it was just saved/updated)
        const currentTemplate = window.RLE.state.get('currentTemplate');

        // Extract from container
        const links = window.RLE.links.extractFromContainer(
          multiPageSettings.containerSelector,
          currentTemplate || {
            cleanUrls: state.cleanUrls,
            currentFilter: state.currentFilter,
            customFilterValue: state.customFilterValue
          }
        );

        if (links.length > 0) {
          // Apply filters
          const currentPageDomain = new URL(window.location.href).hostname;
          const filteredLinks = window.RLE.links.filterLinks(
            links,
            state.currentFilter || 'all',
            state.customFilterValue || '',
            currentPageDomain
          );

          // Close existing panel first
          window.RLE.ui.closeResultsPanel();

          // Then update state and show new results panel
          window.RLE.state.set({ extractedLinks: filteredLinks });
          window.RLE.ui.showResultsPanel(filteredLinks);

          console.log("[RegionLinks] Results panel updated with", filteredLinks.length, "links from container");
        } else {
          window.RLE.ui.showToast("No links found in container", "warning");
        }
      }

      dialog.remove();
    };

    buttons.appendChild(cancelBtn);
    buttons.appendChild(saveBtn);

    dialog.appendChild(title);
    dialog.appendChild(nameLabel);
    dialog.appendChild(nameInput);
    dialog.appendChild(autoRunLabel);
    dialog.appendChild(useContainerLabel);
    dialog.appendChild(containerInfo);
    dialog.appendChild(multiPageLabel);
    dialog.appendChild(multiPageSettings);
    dialog.appendChild(buttons);

    document.body.appendChild(dialog);
    nameInput.focus();
    nameInput.select();
  };

  /**
   * Show fallback copy dialog when clipboard API fails
   * @param {string} text - Text to display for manual copying
   */
  window.RLE.ui.showFallbackCopyDialog = function(text) {
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
    closeBtn.onclick = function() {
      dialog.remove();
    };

    dialog.appendChild(title);
    dialog.appendChild(textarea);
    dialog.appendChild(closeBtn);

    document.body.appendChild(dialog);

    textarea.select();
  };
})();
