/**
 * Message Handler Module
 * Handles Chrome extension messages and orchestrates actions
 */
(function() {
  'use strict';

  window.RLE = window.RLE || {};
  window.RLE.messageHandler = {};

  /**
   * Start selection mode
   * @param {string} exportMode - Export mode to use
   * @param {boolean} cleanUrls - Whether to clean URLs
   */
  function startSelection(exportMode, cleanUrls) {
    const state = window.RLE.state.get();

    if (state.isActive) {
      return;
    }

    window.RLE.state.set({
      exportMode: exportMode || "urls",
      cleanUrls: cleanUrls || false,
      currentTemplate: null, // Reset template when starting manual selection
      isActive: true
    });

    window.RLE.ui.createOverlay();
  }

  /**
   * Initialize the message handler
   */
  window.RLE.messageHandler.init = function() {
    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
      if (message.action === "PING") {
        sendResponse({ loaded: true });
      } else if (message.action === "START_SELECTION") {
        startSelection(message.exportMode, message.cleanUrls);
        sendResponse({ success: true });
      } else if (message.action === "CANCEL_SELECTION") {
        window.RLE.ui.cancelSelection();
        sendResponse({ success: true });
      } else if (message.action === "RUN_TEMPLATE") {
        window.RLE.templates.runTemplate(message.template, message.template.autoRun);
        sendResponse({ success: true });
      } else if (message.action === "GET_TEMPLATES") {
        window.RLE.templates.getTemplatesForDomain(message.domain).then(function(templates) {
          sendResponse({ templates: templates });
        });
        return true; // Keep channel open for async response
      }
      return true;
    });
  };
})();
