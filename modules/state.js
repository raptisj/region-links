/**
 * State Management Module
 * Centralized state management for RegionLinks extension
 */
(function() {
  'use strict';

  window.RLE = window.RLE || {};

  // Initialize state
  const state = {
    isActive: false,
    exportMode: "urls",
    cleanUrls: false,
    ignoreNestedAnchors: true,
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

  window.RLE.state = {
    /**
     * Get the current state or a specific property
     * @param {string} [key] - Optional key to get specific property
     * @returns {*} The entire state object or specific property value
     */
    get: function(key) {
      if (key) {
        return state[key];
      }
      return state;
    },

    /**
     * Update state with new values
     * @param {Object} updates - Object with properties to update
     */
    set: function(updates) {
      Object.keys(updates).forEach(function(key) {
        if (state.hasOwnProperty(key)) {
          state[key] = updates[key];
        }
      });
    },

    /**
     * Reset state to initial values
     */
    reset: function() {
      state.isActive = false;
      state.exportMode = "urls";
      state.cleanUrls = false;
      state.ignoreNestedAnchors = true;
      state.overlay = null;
      state.selectionBox = null;
      state.startX = 0;
      state.startY = 0;
      state.extractedLinks = [];
      state.resultsPanel = null;
      state.currentFilter = "all";
      state.customFilterValue = "";
      state.lastSelectionRect = null;
      state.currentTemplate = null;
      state.isAutoRun = false;
    }
  };
})();
