/**
 * Element Picker Module
 * Allows users to visually select elements on the page
 */
(function() {
  'use strict';

  window.RLE = window.RLE || {};
  window.RLE.ui = window.RLE.ui || {};

  let isActive = false;
  let currentHighlight = null;
  let callback = null;
  let pickerOverlay = null;
  let tooltip = null;

  /**
   * Handle mouse over event
   */
  function handleMouseOver(e) {
    if (!isActive) return;

    e.preventDefault();
    e.stopPropagation();

    // Remove previous highlight
    if (currentHighlight && currentHighlight !== e.target) {
      currentHighlight.classList.remove('rle-element-highlight');
    }

    // Add highlight to target (but not to our own overlay)
    if (!e.target.classList.contains('rle-picker-overlay') &&
        !e.target.classList.contains('rle-picker-tooltip')) {
      e.target.classList.add('rle-element-highlight');
      currentHighlight = e.target;

      // Show tooltip with element info
      showTooltip(e.target, e.clientX, e.clientY);
    }
  }

  /**
   * Handle click event
   */
  function handleClick(e) {
    if (!isActive) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const target = e.target;

    // Don't select our own UI elements
    if (target.classList.contains('rle-picker-overlay') ||
        target.classList.contains('rle-picker-tooltip')) {
      return;
    }

    // Generate CSS selector
    const selector = generateCssSelector(target);

    // Save callback before stopping (stop() sets callback to null)
    const savedCallback = callback;

    // Stop picker
    stop();

    // Call callback with selector
    if (savedCallback) {
      // Use setTimeout to ensure callback runs after click event fully completes
      setTimeout(function() {
        savedCallback(selector);
      }, 50);
    } else {
      console.warn("[RegionLinks] No callback registered");
    }
  }

  /**
   * Handle keydown event
   */
  function handleKeyDown(e) {
    if (e.key === 'Escape' && isActive) {
      e.preventDefault();
      stop();
      if (callback) {
        callback(null); // Cancelled
      }
    }
  }

  /**
   * Show tooltip near cursor
   */
  function showTooltip(element, x, y) {
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'rle-picker-tooltip';
      document.body.appendChild(tooltip);
    }

    const tagName = element.tagName.toLowerCase();
    const classes = element.className ? '.' + element.className.split(/\s+/).filter(function(c) {
      return c && !c.startsWith('rle-');
    }).join('.') : '';
    const id = element.id ? '#' + element.id : '';
    const text = (element.innerText || element.textContent || '').substring(0, 30);

    tooltip.textContent = tagName + id + classes + (text ? ' - "' + text + '"' : '');
    tooltip.style.left = (x + 15) + 'px';
    tooltip.style.top = (y + 15) + 'px';
    tooltip.style.display = 'block';
  }

  /**
   * Hide tooltip
   */
  function hideTooltip() {
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  /**
   * Show picker overlay with instructions
   */
  function showPickerOverlay() {
    pickerOverlay = document.createElement('div');
    pickerOverlay.className = 'rle-picker-overlay';
    pickerOverlay.innerHTML = `
      <div class="rle-picker-instructions">
        Click on the Next Page button (Press ESC to cancel)
      </div>
    `;
    document.body.appendChild(pickerOverlay);
  }

  /**
   * Hide picker overlay
   */
  function hidePickerOverlay() {
    if (pickerOverlay) {
      pickerOverlay.remove();
      pickerOverlay = null;
    }
  }

  /**
   * Generate a CSS selector for an element
   * @param {HTMLElement} element - Element to generate selector for
   * @returns {string} CSS selector
   */
  function generateCssSelector(element) {
    // Check for ID
    if (element.id) {
      return '#' + CSS.escape(element.id);
    }

    // Check for unique class combination
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.trim().split(/\s+/).filter(function(c) {
        return c && !c.startsWith('rle-');
      });
      if (classes.length > 0) {
        const selector = element.tagName.toLowerCase() + '.' + classes.map(function(c) {
          return CSS.escape(c);
        }).join('.');
        if (document.querySelectorAll(selector).length === 1) {
          return selector;
        }
      }
    }

    // Check for aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      const selector = '[aria-label="' + ariaLabel.replace(/"/g, '\\"') + '"]';
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
    }

    // Check for common pagination attributes
    const rel = element.getAttribute('rel');
    if (rel === 'next') {
      return 'a[rel="next"]';
    }

    // Fallback: build path from parent
    return buildPathSelector(element);
  }

  /**
   * Build a CSS selector path for an element
   * @param {HTMLElement} element - Element to build path for
   * @returns {string} CSS selector path
   */
  function buildPathSelector(element) {
    const path = [];
    let current = element;
    let depth = 0;
    const maxDepth = 5; // Limit depth to keep selector manageable

    while (current && current !== document.body && depth < maxDepth) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector = '#' + CSS.escape(current.id);
        path.unshift(selector);
        break;
      }

      // Add class if available
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\s+/).filter(function(c) {
          return c && !c.startsWith('rle-');
        });
        if (classes.length > 0) {
          selector += '.' + classes.map(function(c) {
            return CSS.escape(c);
          }).slice(0, 2).join('.'); // Use max 2 classes
        }
      }

      // Add nth-child if needed for uniqueness
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(function(c) {
          return c.tagName === current.tagName;
        });
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += ':nth-child(' + index + ')';
        }
      }

      path.unshift(selector);
      current = parent;
      depth++;
    }

    return path.join(' > ');
  }

  /**
   * Start element picker
   * @param {Function} cb - Callback function that receives the selector
   */
  function start(cb) {
    if (isActive) {
      console.warn('[RegionLinks] Element picker already active');
      return;
    }

    isActive = true;
    callback = cb;

    // Add event listeners with capture to get events before page handlers
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);

    // Show instruction overlay
    showPickerOverlay();
  }

  /**
   * Stop element picker
   */
  function stop() {
    if (!isActive) return;

    isActive = false;
    callback = null;

    // Remove event listeners
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKeyDown, true);

    // Clean up UI
    if (currentHighlight) {
      currentHighlight.classList.remove('rle-element-highlight');
      currentHighlight = null;
    }
    hidePickerOverlay();
    hideTooltip();
  }

  // Export public API
  window.RLE.ui.elementPicker = {
    start: start,
    stop: stop
  };

  // Export helpers for testing
  window.RLE.ui._elementPickerHelpers = {
    generateCssSelector: generateCssSelector,
    buildPathSelector: buildPathSelector
  };
})();
