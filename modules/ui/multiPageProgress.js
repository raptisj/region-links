/**
 * Multi-Page Progress Module
 * Shows progress overlay during multi-page extraction
 */
(function() {
  'use strict';

  window.RLE = window.RLE || {};
  window.RLE.ui = window.RLE.ui || {};

  let progressOverlay = null;

  /**
   * Show multi-page progress overlay
   * @param {number} currentPage - Current page number
   * @param {number} maxPages - Maximum pages to extract
   * @param {number} linkCount - Number of links collected so far
   */
  window.RLE.ui.showMultiPageProgress = function(currentPage, maxPages, linkCount) {
    // Remove existing overlay if any
    if (progressOverlay) {
      progressOverlay.remove();
    }

    progressOverlay = document.createElement('div');
    progressOverlay.id = 'rle-multipage-progress';
    progressOverlay.className = 'rle-multipage-overlay';

    // Check if this is "List" mode (maxPages >= 999)
    const isListMode = maxPages >= 999;

    let title, statusText, progressBarHtml;

    if (isListMode) {
      title = 'List Extraction';
      statusText = 'Extracting items from list';
      // For list mode, show indeterminate progress (animated bar)
      progressBarHtml = `
        <div class="rle-progress-bar">
          <div class="rle-progress-fill rle-progress-indeterminate"></div>
        </div>
      `;
    } else {
      title = 'Multi-Page Extraction';
      statusText = `Extracting page <strong>${currentPage}</strong> of <strong>${maxPages}</strong>`;
      const progressPercent = (currentPage / maxPages) * 100;
      progressBarHtml = `
        <div class="rle-progress-bar">
          <div class="rle-progress-fill" style="width: ${progressPercent}%"></div>
        </div>
      `;
    }

    progressOverlay.innerHTML = `
      <div class="rle-progress-card">
        <div class="rle-progress-title">${title}</div>
        <div class="rle-progress-status">
          ${statusText}
        </div>
        <div class="rle-progress-count">
          Collected <strong>${linkCount}</strong> link${linkCount !== 1 ? 's' : ''} so far
        </div>
        ${progressBarHtml}
        <button class="rle-btn rle-btn-secondary rle-cancel-btn" id="rle-cancel-multipage">Cancel</button>
      </div>
    `;

    document.body.appendChild(progressOverlay);

    // Handle cancel button
    const cancelBtn = document.getElementById('rle-cancel-multipage');
    if (cancelBtn) {
      cancelBtn.onclick = async function(event) {
        // Prevent any event bubbling
        event.stopPropagation();
        event.preventDefault();

        console.log('[RegionLinks] Multi-page extraction cancelled by user (button clicked)');
        await chrome.storage.local.remove('rle_multiPageState');
        window.RLE.ui.hideMultiPageProgress();
        window.RLE.ui.showToast('Multi-page extraction cancelled', 'info');
      };
    }
  };

  /**
   * Update multi-page progress overlay
   * @param {number} currentPage - Current page number
   * @param {number} maxPages - Maximum pages to extract
   * @param {number} linkCount - Number of links collected so far
   */
  window.RLE.ui.updateMultiPageProgress = function(currentPage, maxPages, linkCount) {
    if (!progressOverlay) {
      return;
    }

    // Check if this is "List" mode
    const isListMode = maxPages >= 999;

    const statusElement = progressOverlay.querySelector('.rle-progress-status');
    if (statusElement && !isListMode) {
      // Only update page count in multi-page mode
      statusElement.innerHTML = `Extracting page <strong>${currentPage}</strong> of <strong>${maxPages}</strong>`;
    }

    const countElement = progressOverlay.querySelector('.rle-progress-count');
    if (countElement) {
      countElement.innerHTML = `Collected <strong>${linkCount}</strong> link${linkCount !== 1 ? 's' : ''} so far`;
    }

    const fillElement = progressOverlay.querySelector('.rle-progress-fill');
    if (fillElement && !isListMode) {
      // Only update progress bar width in multi-page mode
      const progressPercent = (currentPage / maxPages) * 100;
      fillElement.style.width = progressPercent + '%';
    }
  };

  /**
   * Hide multi-page progress overlay
   */
  window.RLE.ui.hideMultiPageProgress = function() {
    if (progressOverlay) {
      progressOverlay.remove();
      progressOverlay = null;
    }
  };
})();
