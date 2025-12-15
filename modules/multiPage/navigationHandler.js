/**
 * Navigation Handler Module
 * Manages state persistence and continuation across page navigations
 */
(function() {
  'use strict';

  window.RLE = window.RLE || {};
  window.RLE.multiPage = window.RLE.multiPage || {};

  let isNavigating = false;
  let isInitializing = false;

  /**
   * Initialize navigation handler on page load
   */
  async function init() {
    // Prevent multiple simultaneous initializations
    if (isInitializing) {
      console.log('[RegionLinks] Already initializing, skipping duplicate init call');
      return;
    }

    isInitializing = true;

    try {
      // Check if we have pending multi-page state
      const result = await chrome.storage.local.get('rle_multiPageState');
      const multiPageState = result.rle_multiPageState;

      if (multiPageState && multiPageState.isRunning) {
        console.log('[RegionLinks] Found pending multi-page state, resuming extraction');

        // Recreate progress overlay immediately (it was destroyed by navigation)
        console.log('[RegionLinks] Recreating progress overlay on new page');
        window.RLE.ui.showMultiPageProgress(
          multiPageState.currentPage,
          multiPageState.maxPages,
          multiPageState.allResults?.length || 0
        );

        // Wait for content to stabilize
        await waitForContent();

        // Scroll to a consistent position (important for rectangle-based extraction)
        console.log('[RegionLinks] Scrolling to ensure consistent content positioning...');
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        await sleep(500); // Wait for scroll to complete and content to settle

        // Load template
        const templatesResult = await chrome.storage.local.get('templates');
        const template = templatesResult.templates?.find(function(t) {
          return t.id === multiPageState.templateId;
        });

        if (!template) {
          console.warn('[RegionLinks] Template not found for multi-page continuation (likely deleted) - cleaning up state');
          await chrome.storage.local.remove('rle_multiPageState');
          window.RLE.ui.hideMultiPageProgress();
          // Don't show error toast - this is normal if template was deleted
          return;
        }

        // Normalize template for backward compatibility
        const normalizedTemplate = window.RLE.templates.normalizeTemplate(template);

        // Continue extraction on new page
        console.log('[RegionLinks] Continuing multi-page extraction for template:', template.name);
        try {
          await window.RLE.templates.extractCurrentPage(normalizedTemplate, multiPageState);
        } catch (error) {
          console.error('[RegionLinks] Error during page extraction:', error);
          await chrome.storage.local.remove('rle_multiPageState');
          window.RLE.ui.hideMultiPageProgress();
          window.RLE.ui.showToast('Multi-page extraction failed: ' + error.message, 'error');
        }
      }
    } finally {
      isInitializing = false;
    }
  }

  /**
   * Wait for page content to stabilize
   */
  async function waitForContent() {
    // Initial wait
    await sleep(1000);

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

    // Additional wait for content to settle (especially for SPA navigation)
    console.log('[RegionLinks] Waiting additional time for content to settle after navigation...');
    await sleep(1500);
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

  /**
   * Manually resume extraction (for client-side navigation)
   */
  window.RLE.multiPage.resumeExtraction = function() {
    console.log('[RegionLinks] Manual resume triggered');
    init();
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
