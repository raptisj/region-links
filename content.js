/**
 * RegionLinks Content Script Entry Point
 *
 * This is the main entry point for the RegionLinks content script.
 * All functionality has been modularized into separate files in the modules/ directory.
 *
 * Modules are loaded in dependency order by background.js and popup.js:
 * 1. Core utilities (state, urlUtils, toast)
 * 2. Data processing (formatter, filter)
 * 3. UI components (dialogs, templates, extractor, resultsPanel, overlay)
 * 4. Orchestration (messageHandler)
 * 5. This entry point (content.js)
 *
 * All modules use the window.RLE namespace to avoid global pollution.
 */

(function() {
  'use strict';

  // Initialize the message handler
  // This sets up listeners for messages from background.js and popup.js
  if (window.RLE && window.RLE.messageHandler) {
    window.RLE.messageHandler.init();
  } else {
    console.error('[RegionLinks] Module loading error: RLE.messageHandler not found');
  }
})();
