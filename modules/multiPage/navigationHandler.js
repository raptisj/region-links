/**
 * Navigation Handler Module
 * Manages state persistence and continuation across page navigations
 */
(function() {
  'use strict';

  window.RLE = window.RLE || {};
  window.RLE.multiPage = window.RLE.multiPage || {};

  let isNavigating = false;

  /**
   * Initialize navigation handler on page load
   */
  async function init() {
    // Check if we have pending multi-page state
    const result = await chrome.storage.local.get('rle_multiPageState');
    const multiPageState = result.rle_multiPageState;

    if (multiPageState && multiPageState.isRunning) {
      console.log('[RegionLinks] Found pending multi-page state, resuming extraction');
      // Wait for content to stabilize
      await waitForContent();

      // Load template
      const templatesResult = await chrome.storage.local.get('templates');
      const template = templatesResult.templates?.find(function(t) {
        return t.id === multiPageState.templateId;
      });

      if (!template) {
        console.warn('[RegionLinks] Template not found for multi-page continuation (likely deleted) - cleaning up state');
        await chrome.storage.local.remove('rle_multiPageState');
        // Don't show error toast or hide progress - this is normal if template was deleted
        return;
      }

      // Continue extraction on new page
      console.log('[RegionLinks] Continuing multi-page extraction for template:', template.name);
      await window.RLE.templates.extractCurrentPage(template, multiPageState);
    }
  }

  /**
   * Wait for page content to stabilize
   */
  async function waitForContent() {
    // Initial wait
    await sleep(500);

    // Additional wait if content is still loading
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      const isLoading = document.querySelector('[aria-busy="true"], .loading, .spinner, [data-loading="true"]');
      if (!isLoading && document.readyState === 'complete') {
        break;
      }
      await sleep(300);
      attempts++;
    }
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds to sleep
   */
  function sleep(ms) {
    return new Promise(function(resolve) {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Setup navigation continuation
   * Called before clicking next button
   */
  window.RLE.multiPage.setupNavigationContinuation = function() {
    if (isNavigating) {
      console.warn('[RegionLinks] Already navigating');
      return;
    }

    isNavigating = true;

    // We rely on the init function being called on the new page
    // The state is stored in chrome.storage.local, which persists across navigations
  };

  /**
   * Reset navigation state
   */
  window.RLE.multiPage.resetNavigation = function() {
    isNavigating = false;
  };

  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded
    init();
  }

  // Export for testing
  window.RLE.multiPage._navigationHelpers = {
    waitForContent: waitForContent,
    sleep: sleep
  };
})();
