/**
 * Container Detector Module
 * Finds common ancestor containers for link extraction
 */
(function() {
  'use strict';

  window.RLE = window.RLE || {};
  window.RLE.links = window.RLE.links || {};

  /**
   * Detect the container element for a collection of link elements
   * @param {Array<HTMLElement>} linkElements - Array of anchor elements
   * @returns {string|null} CSS selector for the container, or null if not found
   */
  window.RLE.links.detectContainer = function(linkElements) {
    if (!linkElements || linkElements.length === 0) {
      return null;
    }

    // Single link - walk up a few levels from the link
    if (linkElements.length === 1) {
      return findContainerForSingleLink(linkElements[0]);
    }

    // Multiple links: find the repeating "item" containers, then find their parent
    const itemContainers = findRepeatingItemContainers(linkElements);

    if (itemContainers.length === 0) {
      return null;
    }

    // Find the common parent of all item containers
    let container = itemContainers[0].parentElement;

    for (let i = 1; i < itemContainers.length; i++) {
      container = findCommonAncestor(container, itemContainers[i]);
      if (!container) {
        return null;
      }
    }

    // Verify this container has all the links
    const containerLinks = container.querySelectorAll('a[href]').length;

    if (containerLinks >= linkElements.length) {
      return generateCssSelector(container);
    }

    return null;
  };

  /**
   * Find container for a single link by walking up
   * @param {HTMLElement} link - The link element
   * @returns {string|null} CSS selector for container
   */
  function findContainerForSingleLink(link) {
    let current = link.parentElement;
    let depth = 0;
    const MAX_DEPTH = 3;

    // Walk up 2-3 levels to find a good container
    while (current && depth < MAX_DEPTH) {
      depth++;
      current = current.parentElement;
    }

    return current ? generateCssSelector(current) : null;
  }

  /**
   * Find the repeating "item" containers for each link
   * Looks for the parent element that represents one "item" in a list
   * @param {Array<HTMLElement>} linkElements - Array of link elements
   * @returns {Array<HTMLElement>} Array of item container elements
   */
  function findRepeatingItemContainers(linkElements) {
    const itemContainers = [];

    // For each link, walk up and find the item container
    linkElements.forEach(function(link) {
      const itemContainer = findItemContainerForLink(link, linkElements);
      if (itemContainer) {
        itemContainers.push(itemContainer);
      }
    });

    return itemContainers;
  }

  /**
   * Find the "item" container for a single link
   * Walks up from the link and looks for an element that:
   * 1. Contains exactly one link from our selection
   * 2. Has siblings with the same structure
   * @param {HTMLElement} link - The link element
   * @param {Array<HTMLElement>} allLinks - All selected links
   * @returns {HTMLElement|null} The item container
   */
  function findItemContainerForLink(link, allLinks) {
    let current = link.parentElement;
    let previousCandidate = null;
    const MAX_DEPTH = 10;
    let depth = 0;

    while (current && depth < MAX_DEPTH) {
      depth++;

      // Count how many of our selected links are in this element
      let linksInCurrent = 0;
      allLinks.forEach(function(l) {
        if (current.contains(l)) {
          linksInCurrent++;
        }
      });

      // If this contains exactly 1 link, it might be our item container
      if (linksInCurrent === 1) {
        previousCandidate = current;
      } else if (linksInCurrent > 1) {
        // We've gone too far up - the previous level was the item container
        // If previousCandidate is null, it means links are direct siblings with no wrapper
        // In this case, use the link itself as the item
        if (previousCandidate === null) {
          return link;
        }
        return previousCandidate;
      }

      // Stop at body/html
      if (current.tagName === 'BODY' || current.tagName === 'HTML') {
        break;
      }

      current = current.parentElement;
    }

    // If we didn't find a multi-link parent, use the last single-link container
    // If still null, use the link itself
    return previousCandidate || link;
  }

  /**
   * Find common ancestor of two DOM nodes
   * @param {HTMLElement} node1 - First node
   * @param {HTMLElement} node2 - Second node
   * @returns {HTMLElement|null} Common ancestor element
   */
  function findCommonAncestor(node1, node2) {
    // Get all ancestors of node1
    const ancestors1 = [];
    let current = node1;
    while (current) {
      ancestors1.push(current);
      current = current.parentElement;
    }

    // Walk up from node2 until we find common ancestor
    current = node2;
    while (current) {
      if (ancestors1.includes(current)) {
        return current;
      }
      current = current.parentElement;
    }

    return document.body;
  }

  /**
   * Check if an element is a meaningful container
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} True if meaningful container
   */
  function isMeaningfulContainer(element) {
    const tagName = element.tagName.toLowerCase();

    // Semantic list/table containers are best
    const semanticTags = ['ul', 'ol', 'table', 'tbody', 'thead', 'nav', 'article', 'section'];
    if (semanticTags.includes(tagName)) {
      return true;
    }

    // Divs with specific classes are good
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.toLowerCase();
      const goodPatterns = ['list', 'grid', 'items', 'products', 'results', 'table', 'content', 'container', 'wrapper', 'body'];
      if (goodPatterns.some(function(pattern) { return classes.includes(pattern); })) {
        return true;
      }
    }

    // Has ID with specific patterns (but not generic ones like "main", "app", "root")
    if (element.id) {
      const id = element.id.toLowerCase();
      const goodIdPatterns = ['list', 'grid', 'items', 'products', 'results', 'table', 'content'];
      const badIdPatterns = ['main', 'app', 'root', 'page', 'wrapper', 'container'];

      if (goodIdPatterns.some(function(pattern) { return id.includes(pattern); })) {
        return true;
      }

      // Generic IDs are low priority
      if (!badIdPatterns.some(function(pattern) { return id.includes(pattern); })) {
        return true;
      }
    }

    return false;
  }

  /**
   * Score a container's specificity (higher = more specific/better)
   * @param {HTMLElement} element - Element to score
   * @returns {number} Score (0-20)
   */
  function getContainerScore(element) {
    const tagName = element.tagName.toLowerCase();
    let score = 0;

    // Semantic list/table containers get highest score
    if (['ul', 'ol', 'table', 'tbody'].includes(tagName)) {
      score += 15;
    } else if (['nav', 'article', 'section'].includes(tagName)) {
      score += 10;
    }

    // Good class patterns
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.toLowerCase();
      const veryGoodPatterns = ['list', 'grid', 'items', 'products', 'results'];
      const goodPatterns = ['table', 'content', 'container', 'wrapper'];

      if (veryGoodPatterns.some(function(pattern) { return classes.includes(pattern); })) {
        score += 12;
      } else if (goodPatterns.some(function(pattern) { return classes.includes(pattern); })) {
        score += 8;
      }
    }

    // Good ID patterns
    if (element.id) {
      const id = element.id.toLowerCase();
      const veryGoodIdPatterns = ['list', 'grid', 'items', 'products', 'results'];
      const badIdPatterns = ['main', 'app', 'root', 'page', 'wrapper', 'container'];

      if (veryGoodIdPatterns.some(function(pattern) { return id.includes(pattern); })) {
        score += 10;
      } else if (badIdPatterns.some(function(pattern) { return id.includes(pattern); })) {
        score -= 5; // Penalize generic IDs
      } else {
        score += 3; // Other IDs get small bonus
      }
    }

    return score;
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
        return !c.startsWith('rle-');
      });
      if (classes.length > 0) {
        const selector = element.tagName.toLowerCase() + '.' + classes.map(function(c) {
          return CSS.escape(c);
        }).join('.');
        const matches = document.querySelectorAll(selector);

        if (matches.length === 1) {
          return selector;
        }

        // If multiple matches, try adding parent context for uniqueness
        if (matches.length > 1 && element.parentElement) {
          const parentSelector = getSimpleSelector(element.parentElement);
          if (parentSelector) {
            const contextSelector = parentSelector + ' > ' + selector;
            const contextMatches = document.querySelectorAll(contextSelector);

            if (contextMatches.length === 1) {
              return contextSelector;
            }
          }
        }
      }
    }

    // Fallback: build path from parent
    return buildPathSelector(element);
  }

  /**
   * Get a simple selector for an element (ID or classes)
   * @param {HTMLElement} element - Element to get selector for
   * @returns {string|null} Simple selector or null
   */
  function getSimpleSelector(element) {
    if (element.id) {
      return '#' + CSS.escape(element.id);
    }
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.trim().split(/\s+/).filter(function(c) {
        return !c.startsWith('rle-');
      });
      if (classes.length > 0) {
        return element.tagName.toLowerCase() + '.' + classes.map(function(c) {
          return CSS.escape(c);
        }).join('.');
      }
    }
    return null;
  }

  /**
   * Build a CSS selector path for an element
   * @param {HTMLElement} element - Element to build path for
   * @returns {string} CSS selector path
   */
  function buildPathSelector(element) {
    const path = [];
    let current = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector = '#' + CSS.escape(current.id);
        path.unshift(selector);
        break;
      }

      // Add class names if available
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\s+/).filter(function(c) {
          return !c.startsWith('rle-');
        });
        if (classes.length > 0) {
          selector += '.' + classes.map(function(c) {
            return CSS.escape(c);
          }).join('.');
        }
      }

      // Add nth-of-type for uniqueness if needed
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(function(c) {
          return c.tagName === current.tagName;
        });
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += ':nth-of-type(' + index + ')';
        }
      }

      path.unshift(selector);
      current = parent;
    }

    return path.join(' > ');
  }

  // Export for testing/debugging
  window.RLE.links._containerDetectorHelpers = {
    findCommonAncestor: findCommonAncestor,
    isMeaningfulContainer: isMeaningfulContainer,
    getContainerScore: getContainerScore,
    generateCssSelector: generateCssSelector,
    buildPathSelector: buildPathSelector
  };
})();
