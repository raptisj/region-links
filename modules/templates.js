/**
 * Templates Module
 * Manages template CRUD operations
 */
(function() {
  'use strict';

  window.RLE = window.RLE || {};
  window.RLE.templates = {};

  /**
   * Normalize template with defaults for backward compatibility
   * @param {Object} template - Template object
   * @returns {Object} Normalized template
   */
  function normalizeTemplate(template) {
    return {
      ...template,
      multiPage: template.multiPage !== undefined ? template.multiPage : false,
      maxPages: template.maxPages || 999,
      paginationSelector: template.paginationSelector || null,
      useContainerInsteadOfViewport: template.useContainerInsteadOfViewport !== undefined ? template.useContainerInsteadOfViewport : false,
      containerSelector: template.containerSelector || null,
      autoScroll: template.autoScroll !== undefined ? template.autoScroll : false,
      maxScrollSteps: template.maxScrollSteps || 10,
      ignoreNestedAnchors: template.ignoreNestedAnchors !== false
    };
  }

  /**
   * Save a new template
   * @param {string} templateName - Name for the template
   * @param {boolean} autoRun - Whether to auto-run this template
   * @param {Object} [multiPageSettings] - Optional multi-page settings
   */
  window.RLE.templates.saveTemplate = async function(templateName, autoRun, multiPageSettings) {
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
      ignoreNestedAnchors: state.ignoreNestedAnchors,
      currentFilter: state.currentFilter,
      customFilterValue: state.customFilterValue,
      createdAt: new Date().toISOString(),
      // Multi-page fields
      multiPage: multiPageSettings?.multiPage || false,
      maxPages: multiPageSettings?.maxPages || 999,
      paginationSelector: multiPageSettings?.paginationSelector || null,
      useContainerInsteadOfViewport: multiPageSettings?.useContainerInsteadOfViewport || false,
      containerSelector: multiPageSettings?.containerSelector || null,
      autoScroll: multiPageSettings?.autoScroll || false,
      maxScrollSteps: multiPageSettings?.maxScrollSteps || 10
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
   * @param {Object} [multiPageSettings] - Optional multi-page settings
   */
  window.RLE.templates.updateTemplate = async function(templateId, templateName, autoRun, multiPageSettings) {
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
      templates[templateIndex].ignoreNestedAnchors = state.ignoreNestedAnchors;
      templates[templateIndex].currentFilter = state.currentFilter;
      templates[templateIndex].customFilterValue = state.customFilterValue;
      templates[templateIndex].updatedAt = new Date().toISOString();

      // Update multi-page settings if provided
      if (multiPageSettings) {
        templates[templateIndex].multiPage = multiPageSettings.multiPage !== undefined ? multiPageSettings.multiPage : templates[templateIndex].multiPage;
        templates[templateIndex].maxPages = multiPageSettings.maxPages !== undefined ? multiPageSettings.maxPages : templates[templateIndex].maxPages;
        templates[templateIndex].paginationSelector = multiPageSettings.paginationSelector !== undefined ? multiPageSettings.paginationSelector : templates[templateIndex].paginationSelector;
        templates[templateIndex].useContainerInsteadOfViewport = multiPageSettings.useContainerInsteadOfViewport !== undefined ? multiPageSettings.useContainerInsteadOfViewport : templates[templateIndex].useContainerInsteadOfViewport;
        templates[templateIndex].containerSelector = multiPageSettings.containerSelector !== undefined ? multiPageSettings.containerSelector : templates[templateIndex].containerSelector;
        templates[templateIndex].autoScroll = multiPageSettings.autoScroll !== undefined ? multiPageSettings.autoScroll : templates[templateIndex].autoScroll;
        templates[templateIndex].maxScrollSteps = multiPageSettings.maxScrollSteps !== undefined ? multiPageSettings.maxScrollSteps : templates[templateIndex].maxScrollSteps;
      }

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

    // Normalize template for backward compatibility
    template = normalizeTemplate(template);

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
      ignoreNestedAnchors: template.ignoreNestedAnchors,
      currentFilter: template.currentFilter || "all",
      customFilterValue: template.customFilterValue || "",
      currentTemplate: template,
      isAutoRun: isAutoRunning
    });

    console.log("[RegionLinks] State updated, state.isAutoRun:", window.RLE.state.get('isAutoRun'));
    console.log("[RegionLinks] Template settings - multiPage:", template.multiPage, "useContainer:", template.useContainerInsteadOfViewport);

    // Check if multi-page extraction is enabled
    if (template.multiPage) {
      window.RLE.templates.runMultiPageTemplate(template, isAutoRunning);
    } else if (template.useContainerInsteadOfViewport && template.containerSelector) {
      // Single page container extraction
      console.log("[RegionLinks] Using single-page container extraction:", template.containerSelector);
      const links = window.RLE.links.extractFromContainer(template.containerSelector, template);

      if (links.length > 0) {
        // Apply filters
        const currentPageDomain = new URL(window.location.href).hostname;
        const filteredLinks = window.RLE.links.filterLinks(
          links,
          template.currentFilter || 'all',
          template.customFilterValue || '',
          currentPageDomain
        );

        // Store extracted links in state
        window.RLE.state.set({ extractedLinks: filteredLinks });

        // Show results or auto-copy
        if (isAutoRunning) {
          const formattedText = window.RLE.links.formatLinks(filteredLinks, template.exportMode, window.location.href);
          chrome.storage.local.set({
            pendingAutoCopy: {
              text: formattedText,
              count: filteredLinks.length,
              timestamp: Date.now()
            }
          });
          console.log('[RegionLinks] Stored', filteredLinks.length, 'links for auto-copy');
        } else {
          window.RLE.ui.showResultsPanel(filteredLinks);
        }
      } else {
        window.RLE.ui.showToast("No links found in container", "error");
      }
    } else {
      // Regular region-based extraction
      console.log("[RegionLinks] Using region extraction with rect:", template.selectionRect);
      window.RLE.links.extractLinks(template.selectionRect);
    }
  };

  /**
   * Run multi-page template extraction
   * @param {Object} template - Template object with multi-page settings
   * @param {boolean} isAutoRunning - Whether this is an auto-run
   */
  window.RLE.templates.runMultiPageTemplate = async function(template, isAutoRunning) {
    const isListMode = template.maxPages >= 999;
    console.log('[RegionLinks] Starting', isListMode ? 'list' : 'multi-page', 'extraction:', template.name);

    // Initialize multi-page state
    const multiPageState = {
      templateId: template.id,
      currentPage: 1,
      maxPages: template.maxPages || 5,
      allResults: [],
      isRunning: true,
      isAutoRunning: isAutoRunning
    };

    // Store state in local storage (chrome.storage.session not available in content scripts)
    await chrome.storage.local.set({ rle_multiPageState: multiPageState });

    // Show progress overlay
    window.RLE.ui.showMultiPageProgress(1, multiPageState.maxPages, 0);

    // Extract from current page
    await window.RLE.templates.extractCurrentPage(template, multiPageState);
  };

  /**
   * Helper function to extract links from a selection rectangle
   * @param {Object} selectionRect - Rectangle coordinates
   * @param {Object} template - Template object
   * @returns {Array} Array of extracted links
   */
  function extractLinksFromRect(selectionRect, template) {
    console.log('[RegionLinks] extractLinksFromRect called with:', selectionRect);

    const anchors = document.querySelectorAll('a[href]');
    console.log('[RegionLinks] Total anchors on page:', anchors.length);

    const extractedLinks = [];
    let intersectingAnchors = 0;
    let visibleIntersectingAnchors = 0;

    anchors.forEach(function(anchor, index) {
      const rect = anchor.getBoundingClientRect();

      const intersects = !(
        rect.right < selectionRect.left ||
        rect.left > selectionRect.right ||
        rect.bottom < selectionRect.top ||
        rect.top > selectionRect.bottom
      );

      if (intersects) {
        intersectingAnchors++;
        if (rect.width > 0 && rect.height > 0) {
          visibleIntersectingAnchors++;
        }
      }

      if (intersects && rect.width > 0 && rect.height > 0) {
        // Skip nested anchors if the setting is enabled
        const ignoreNestedAnchors = template.ignoreNestedAnchors !== false;
        if (ignoreNestedAnchors && window.RLE.links.isNestedAnchor(anchor)) {
          return;
        }

        let text = (anchor.innerText || anchor.textContent || '').trim();

        if (!text) {
          text = anchor.getAttribute('aria-label') || anchor.getAttribute('title') || '';
        }

        if (!text) {
          const img = anchor.querySelector('img');
          if (img) {
            text = img.getAttribute('alt') || img.getAttribute('title') || '';
          }
        }

        if (!text) {
          const svg = anchor.querySelector('svg');
          if (svg) {
            const titleElement = svg.querySelector('title');
            if (titleElement) {
              text = titleElement.textContent || '';
            }
            if (!text) {
              text = svg.getAttribute('aria-label') || '';
            }
          }
        }

        if (!text) {
          try {
            const urlObj = new URL(anchor.href);
            const hostname = urlObj.hostname.replace(/^www\./, '');
            const pathParts = urlObj.pathname.split('/').filter(function(p) { return p; });
            const domainParts = hostname.split('.');
            const mainDomain = domainParts.length > 1 ? domainParts[domainParts.length - 2] : domainParts[0];
            const capitalizedDomain = mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
            text = pathParts.length > 0
              ? capitalizedDomain + ' - ' + (pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1))
              : capitalizedDomain;
          } catch (e) {
            text = 'Link';
          }
        }

        text = text.trim();
        const url = window.RLE.urlUtils.normalize(anchor.href, template.cleanUrls);

        extractedLinks.push({
          text: text,
          url: url,
          index: index,
          top: rect.top,
          left: rect.left
        });
      }
    });

    console.log('[RegionLinks] Extraction results:', {
      totalAnchors: anchors.length,
      intersectingAnchors: intersectingAnchors,
      visibleIntersectingAnchors: visibleIntersectingAnchors,
      extracted: extractedLinks.length
    });

    // If we found 0 links, let's check if there are links visible on screen
    if (extractedLinks.length === 0 && anchors.length > 0) {
      console.log('[RegionLinks] No links in rectangle. Checking first few anchor positions:');
      for (let i = 0; i < Math.min(5, anchors.length); i++) {
        const anchor = anchors[i];
        const rect = anchor.getBoundingClientRect();
        console.log(`Anchor ${i}:`, {
          href: anchor.href,
          text: anchor.textContent?.substring(0, 30),
          rect: { top: rect.top, left: rect.left, bottom: rect.bottom, right: rect.right },
          visible: rect.width > 0 && rect.height > 0
        });
      }
    }

    return extractedLinks;
  }

  /**
   * Extract links from current page during multi-page extraction
   * @param {Object} template - Template object
   * @param {Object} multiPageState - Multi-page state object
   */
  window.RLE.templates.extractCurrentPage = async function(template, multiPageState) {
    console.log('[RegionLinks] === EXTRACTING PAGE ===');
    console.log('[RegionLinks] Our page counter:', multiPageState.currentPage);
    console.log('[RegionLinks] Current URL:', window.location.href);
    console.log('[RegionLinks] Current state:', JSON.stringify({
      currentPage: multiPageState.currentPage,
      maxPages: multiPageState.maxPages,
      resultsSoFar: multiPageState.allResults?.length || 0,
      isRunning: multiPageState.isRunning
    }));

    // Try to detect actual page number from LinkedIn's UI
    try {
      const pageIndicator = document.querySelector('[aria-label*="Page"]') ||
                           document.querySelector('.artdeco-pagination__indicator--number.active') ||
                           document.querySelector('.active-page');
      if (pageIndicator) {
        console.log('[RegionLinks] LinkedIn page indicator text:', pageIndicator.textContent.trim());
      } else {
        console.log('[RegionLinks] No LinkedIn page indicator found in DOM');
      }
    } catch (e) {
      console.log('[RegionLinks] Could not detect page indicator:', e.message);
    }

    // Extract links based on template settings
    let links = [];

    if (template.useContainerInsteadOfViewport && template.containerSelector) {
      // Container-based extraction
      console.log('[RegionLinks] Using container extraction:', template.containerSelector);
      links = window.RLE.links.extractFromContainer(template.containerSelector, template);

      // Fallback: if container not found or no links, try using the selection rectangle
      if (links.length === 0 && template.selectionRect) {
        console.log('[RegionLinks] Container extraction failed, falling back to selection rectangle');
        links = extractLinksFromRect(template.selectionRect, template);
      }
    } else {
      // Region-based extraction
      console.log('[RegionLinks] Using region extraction');
      links = extractLinksFromRect(template.selectionRect, template);
    }

    // Ensure allResults is initialized
    if (!multiPageState.allResults) {
      console.warn('[RegionLinks] allResults was undefined, initializing to empty array');
      multiPageState.allResults = [];
    }

    // Ensure links is an array
    if (!links || !Array.isArray(links)) {
      console.warn('[RegionLinks] links is not an array, using empty array. Value:', links);
      links = [];
    }

    // Add to accumulated results
    multiPageState.allResults = multiPageState.allResults.concat(links);

    console.log('[RegionLinks] Extracted', links.length, 'links, total:', multiPageState.allResults.length);

    // Update progress
    window.RLE.ui.updateMultiPageProgress(
      multiPageState.currentPage,
      multiPageState.maxPages,
      multiPageState.allResults.length
    );

    // Check if we should continue to next page
    if (multiPageState.currentPage >= multiPageState.maxPages) {
      console.log('[RegionLinks] Reached max pages, finalizing');
      await finalizeMultiPageResults(template, multiPageState);
      return;
    }

    // Find next page button
    console.log('[RegionLinks] Looking for next button with selector:', template.paginationSelector);
    let nextButton = findNextPageButton(template.paginationSelector);

    if (!nextButton) {
      console.log('[RegionLinks] ✓ No more pages available - extraction complete');
      console.log('[RegionLinks] Extracted content from', multiPageState.currentPage, 'page(s)');
      await finalizeMultiPageResults(template, multiPageState);
      return;
    }

    console.log('[RegionLinks] ✓ Found next button:', nextButton);
    console.log('[RegionLinks] Button element:', nextButton.tagName, nextButton.className, nextButton.textContent);

    // Prepare for navigation or dynamic loading
    multiPageState.currentPage++;
    console.log('[RegionLinks] Incrementing to page', multiPageState.currentPage);
    await chrome.storage.local.set({ rle_multiPageState: multiPageState });
    console.log('[RegionLinks] State saved, about to click button for page', multiPageState.currentPage);

    // Detect if this is a navigation or dynamic content loading
    const currentUrl = window.location.href;
    let navigationOccurred = false;

    // Set up navigation listener
    const navigationListener = function() {
      navigationOccurred = true;
    };
    window.addEventListener('beforeunload', navigationListener, { once: true });

    // Set progress overlay to not interfere with clicks (but keep it visible)
    const progressOverlay = document.getElementById('rle-multipage-progress');
    if (progressOverlay) {
      progressOverlay.style.pointerEvents = 'none';
    }

    // Scroll button into view
    try {
      nextButton.scrollIntoView({ behavior: 'instant', block: 'center' });
    } catch (e) {
      console.warn('[RegionLinks] Could not scroll button:', e);
    }

    // Try to find clickable parent (might be wrapped)
    let clickableElement = nextButton;
    let current = nextButton.parentElement;
    let depth = 0;
    while (current && depth < 3) {
      const role = current.getAttribute('role');
      const clickHandler = current.onclick !== null;
      const cursor = window.getComputedStyle(current).cursor;

      if (role === 'button' || clickHandler || cursor === 'pointer') {
        clickableElement = current;
        break;
      }

      current = current.parentElement;
      depth++;
    }

    if (clickableElement !== nextButton) {
      nextButton = clickableElement;
    }

    // Try multiple click methods (pointer, mouse, touch, direct click, keyboard)
    try {
      const rect = nextButton.getBoundingClientRect();

      console.log('[RegionLinks] >>> CLICKING NEXT BUTTON <<<');
      console.log('[RegionLinks] Button rect:', rect);

      // Just use the simple click method to avoid potential double-clicks
      nextButton.click();
      console.log('[RegionLinks] Click event dispatched');

      /* COMMENTED OUT - too many events might cause multiple navigations
      // Pointer events
      nextButton.dispatchEvent(new PointerEvent('pointerdown', {
        view: window, bubbles: true, cancelable: true,
        clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2
      }));
      nextButton.dispatchEvent(new PointerEvent('pointerup', {
        view: window, bubbles: true, cancelable: true,
        clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2
      }));

      // Mouse events
      nextButton.dispatchEvent(new MouseEvent('mousedown', {
        view: window, bubbles: true, cancelable: true,
        clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2
      }));
      nextButton.dispatchEvent(new MouseEvent('mouseup', {
        view: window, bubbles: true, cancelable: true,
        clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2
      }));
      nextButton.dispatchEvent(new MouseEvent('click', {
        view: window, bubbles: true, cancelable: true,
        clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2
      }));

      // Touch events
      const touch = new Touch({
        identifier: Date.now(), target: nextButton,
        clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2,
        radiusX: 2.5, radiusY: 2.5, rotationAngle: 0, force: 1
      });
      nextButton.dispatchEvent(new TouchEvent('touchstart', {
        bubbles: true, cancelable: true,
        touches: [touch], targetTouches: [touch], changedTouches: [touch]
      }));
      nextButton.dispatchEvent(new TouchEvent('touchend', {
        bubbles: true, cancelable: true,
        touches: [], targetTouches: [], changedTouches: [touch]
      }));

      // Direct click
      nextButton.click();

      // Keyboard event
      nextButton.focus();
      nextButton.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true
      }));
      */
    } catch (e) {
      console.warn('[RegionLinks] Click attempt failed:', e);
    }

    await sleep(300);

    if (progressOverlay) {
      progressOverlay.style.pointerEvents = 'auto';
    }

    window.removeEventListener('beforeunload', navigationListener);

    if (navigationOccurred || window.location.href !== currentUrl) {
      console.log('[RegionLinks] Navigation detected - continuing on new page');
      console.log('[RegionLinks] Previous URL:', currentUrl);
      console.log('[RegionLinks] Current URL:', window.location.href);
      console.log('[RegionLinks] State will be resumed by navigationHandler on new page');
      window.RLE.multiPage.setupNavigationContinuation();
      // Don't call extractCurrentPage here - let the navigationHandler do it on the new page
    } else {
      console.log('[RegionLinks] Dynamic content loading detected (no navigation)');
      await waitForDynamicContent(template);
      // Reload state in case it was updated
      const reloadedState = await chrome.storage.local.get('rle_multiPageState');
      await window.RLE.templates.extractCurrentPage(template, reloadedState.rle_multiPageState);
    }
  };

  /**
   * Wait for dynamic content to load after clicking Show More
   * @param {Object} template - Template object
   */
  async function waitForDynamicContent(template) {
    if (template.containerSelector) {
      const container = document.querySelector(template.containerSelector);
      if (container) {
        await waitForContainerUpdate(container);
        return;
      }
    }
    await waitForAnyDOMChanges();
  }

  /**
   * Wait for any DOM changes (fallback)
   */
  async function waitForAnyDOMChanges() {
    return new Promise(function(resolve) {
      let mutationDetected = false;
      let attempts = 0;
      const maxAttempts = 15;

      const observer = new MutationObserver(function(mutations) {
        if (mutations.length > 0 && !mutationDetected) {
          mutationDetected = true;
        }
      });

      try {
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: false
        });
      } catch (e) {
        console.warn('[RegionLinks] Could not start MutationObserver:', e);
      }

      const checkInterval = setInterval(function() {
        attempts++;

        if (mutationDetected) {
          clearInterval(checkInterval);
          observer.disconnect();
          setTimeout(resolve, 1000);
          return;
        }

        if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          observer.disconnect();
          resolve();
        }
      }, 500);
    });
  }

  /**
   * Wait for container to update with new content
   * @param {HTMLElement} container - Container element to watch
   */
  function waitForContainerUpdate(container) {
    return new Promise(function(resolve) {
      const initialChildCount = container.querySelectorAll('a[href]').length;
      const initialHTML = container.innerHTML.length;

      let attempts = 0;
      const maxAttempts = 15;
      let mutationDetected = false;

      const observer = new MutationObserver(function(mutations) {
        if (!mutationDetected && mutations.length > 0) {
          mutationDetected = true;
        }
      });

      try {
        observer.observe(container, {
          childList: true,
          subtree: true,
          attributes: false
        });
      } catch (e) {
        console.warn('[RegionLinks] Could not start MutationObserver:', e);
      }

      const checkInterval = setInterval(function() {
        const currentChildCount = container.querySelectorAll('a[href]').length;
        const currentHTML = container.innerHTML.length;
        attempts++;

        const linksChanged = currentChildCount > initialChildCount;
        const htmlChanged = currentHTML > initialHTML;

        if (linksChanged || htmlChanged) {
          console.log('[RegionLinks] New content detected:', currentChildCount - initialChildCount, 'additional links');
          clearInterval(checkInterval);
          observer.disconnect();
          setTimeout(resolve, 1000);
          return;
        }

        if (mutationDetected && attempts < maxAttempts) {
          return;
        }

        if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          observer.disconnect();
          setTimeout(resolve, 1500);
        }
      }, 500);
    });
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds to sleep
   */
  function sleep(ms) {
    return new Promise(function(resolve) {
      setTimeout(resolve, ms);
    });
  };

  /**
   * Find next page button
   * @param {string} paginationSelector - Saved CSS selector
   * @returns {HTMLElement|null} Next button element
   */
  function findNextPageButton(paginationSelector) {
    if (paginationSelector) {
      const button = document.querySelector(paginationSelector);

      if (button) {
        if (button.offsetWidth === 0 || button.offsetHeight === 0) {
          try {
            button.scrollIntoView({ behavior: 'instant', block: 'center' });
          } catch (e) {
            console.warn('[RegionLinks] Could not scroll to button:', e);
          }
        }

        const enabled = isButtonEnabled(button);

        if (enabled) {
          return button;
        } else if (button.offsetWidth > 0 || button.offsetHeight > 0 || button.click) {
          return button;
        }
      }
    }

    return autoDetectNextButton();
  }

  /**
   * Auto-detect next page button
   * @returns {HTMLElement|null} Next button element
   */
  function autoDetectNextButton() {
    const patterns = [
      'a[rel="next"]',
      'a[aria-label*="next" i]',
      'button[aria-label*="next" i]',
      '.pagination .next:not(.disabled)',
      '.pagination a:not(.disabled):last-of-type',
      'a[title*="next" i]',
      'button[title*="next" i]'
    ];

    for (let i = 0; i < patterns.length; i++) {
      const button = document.querySelector(patterns[i]);
      if (button && isButtonEnabled(button)) {
        return button;
      }
    }

    const links = document.querySelectorAll('a, button');
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const text = (link.innerText || link.textContent || '').trim().toLowerCase();
      if ((text === 'next' || text === '›' || text === '→' || text === 'next page') && isButtonEnabled(link)) {
        return link;
      }
    }

    return null;
  }

  /**
   * Check if button is enabled
   * @param {HTMLElement} button - Button element
   * @returns {boolean} True if button is clickable
   */
  function isButtonEnabled(button) {
    const disabled = button.disabled;
    const hasDisabledClass = button.classList.contains('disabled');
    const ariaDisabled = button.hasAttribute('aria-disabled');
    const hasOffsetParent = button.offsetParent !== null;
    const isVisible = button.offsetWidth > 0 && button.offsetHeight > 0;

    if (button.tagName.toLowerCase() !== 'button' && button.tagName.toLowerCase() !== 'a') {
      return isVisible && !hasDisabledClass && !ariaDisabled;
    }

    return !disabled && !hasDisabledClass && !ariaDisabled && hasOffsetParent;
  }

  /**
   * Finalize multi-page results
   * @param {Object} template - Template object
   * @param {Object} multiPageState - Multi-page state
   */
  async function finalizeMultiPageResults(template, multiPageState) {
    console.log('[RegionLinks] Finalizing multi-page results');

    // Deduplicate by URL
    const uniqueLinks = deduplicateLinks(multiPageState.allResults);
    console.log('[RegionLinks] Deduplicated to', uniqueLinks.length, 'unique links');

    // Apply filters
    const currentPageDomain = new URL(window.location.href).hostname;
    const filteredLinks = window.RLE.links.filterLinks(
      uniqueLinks,
      template.currentFilter || 'all',
      template.customFilterValue || '',
      currentPageDomain
    );
    console.log('[RegionLinks] Filtered to', filteredLinks.length, 'links');

    // Clear multi-page state from local storage
    await chrome.storage.local.remove('rle_multiPageState');

    // Hide progress overlay
    window.RLE.ui.hideMultiPageProgress();

    // Output results
    if (multiPageState.isAutoRunning) {
      // Auto-run: format and store for clipboard
      const formattedText = window.RLE.links.formatLinks(filteredLinks, template.exportMode, window.location.href);
      await chrome.storage.local.set({
        pendingAutoCopy: {
          text: formattedText,
          count: filteredLinks.length,
          timestamp: Date.now()
        }
      });
      console.log('[RegionLinks] Stored', filteredLinks.length, 'links for auto-copy');
    } else {
      // Manual: show results panel
      window.RLE.state.set({ extractedLinks: filteredLinks });
      window.RLE.ui.showResultsPanel(filteredLinks);
    }
  }

  /**
   * Deduplicate links by URL
   * @param {Array} links - Array of link objects
   * @returns {Array} Deduplicated links
   */
  function deduplicateLinks(links) {
    const seen = new Set();
    const unique = [];

    links.forEach(function(link) {
      if (!seen.has(link.url)) {
        seen.add(link.url);
        unique.push(link);
      }
    });

    return unique;
  }

  // Export normalizeTemplate for use in other modules
  window.RLE.templates.normalizeTemplate = normalizeTemplate;

  // Export helpers for testing
  window.RLE.templates._helpers = {
    findNextPageButton: findNextPageButton,
    autoDetectNextButton: autoDetectNextButton,
    isButtonEnabled: isButtonEnabled,
    deduplicateLinks: deduplicateLinks
  };
})();
