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

      if (isEditing) {
        await window.RLE.templates.updateTemplate(state.currentTemplate.id, templateName, autoRunCheckbox.checked);
        window.RLE.ui.showToast("Template updated successfully!", "success");
      } else {
        await window.RLE.templates.saveTemplate(templateName, autoRunCheckbox.checked);
        window.RLE.ui.showToast("Template saved successfully!", "success");
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
