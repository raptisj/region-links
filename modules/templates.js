/**
 * Templates Module
 * Manages template CRUD operations
 */
(function() {
  'use strict';

  window.RLE = window.RLE || {};
  window.RLE.templates = {};

  /**
   * Save a new template
   * @param {string} templateName - Name for the template
   * @param {boolean} autoRun - Whether to auto-run this template
   */
  window.RLE.templates.saveTemplate = async function(templateName, autoRun) {
    const state = window.RLE.state.get();

    // Validate we have a valid selection to save
    if (!state.lastSelectionRect || typeof state.lastSelectionRect.left === 'undefined') {
      console.error("Cannot save template: no valid selection area");
      window.RLE.ui.showToast("Error: No valid selection area to save", "error");
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
    await chrome.storage.local.set({ templates: templates });

    // Update current template reference
    window.RLE.state.set({ currentTemplate: template });
  };

  /**
   * Update an existing template
   * @param {string} templateId - ID of template to update
   * @param {string} templateName - New name for the template
   * @param {boolean} autoRun - Whether to auto-run this template
   */
  window.RLE.templates.updateTemplate = async function(templateId, templateName, autoRun) {
    const state = window.RLE.state.get();
    const result = await chrome.storage.local.get(["templates"]);
    const templates = result.templates || [];

    const templateIndex = templates.findIndex(function(t) {
      return t.id === templateId;
    });

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
      await chrome.storage.local.set({ templates: templates });

      // Update current template reference
      window.RLE.state.set({ currentTemplate: templates[templateIndex] });
    }
  };

  /**
   * Get all templates for a specific domain
   * @param {string} domain - Domain to filter templates by
   * @returns {Promise<Array>} Array of templates for the domain
   */
  window.RLE.templates.getTemplatesForDomain = async function(domain) {
    const result = await chrome.storage.local.get(["templates"]);
    const templates = result.templates || [];
    return templates.filter(function(t) {
      return t.domain === domain;
    });
  };

  /**
   * Run a saved template
   * @param {Object} template - Template object to run
   * @param {boolean} [isAutoRunning=false] - Whether this is an auto-run
   */
  window.RLE.templates.runTemplate = async function(template, isAutoRunning) {
    isAutoRunning = isAutoRunning || false;

    console.log("[RegionLinks] runTemplate called, isAutoRunning:", isAutoRunning, "template.autoRun:", template.autoRun);

    // Validate template has a valid selectionRect
    if (!template.selectionRect || typeof template.selectionRect.left === 'undefined') {
      console.error("Template missing valid selectionRect:", template);
      window.RLE.ui.showToast("Error: This template has invalid selection data. Please recreate it.", "error");
      return;
    }

    window.RLE.state.set({
      exportMode: template.exportMode,
      cleanUrls: template.cleanUrls,
      currentFilter: template.currentFilter || "all",
      customFilterValue: template.customFilterValue || "",
      currentTemplate: template,
      isAutoRun: isAutoRunning
    });

    console.log("[RegionLinks] State updated, state.isAutoRun:", window.RLE.state.get('isAutoRun'));
    console.log("[RegionLinks] Calling extractLinks with rect:", template.selectionRect);

    window.RLE.links.extractLinks(template.selectionRect);
  };
})();
