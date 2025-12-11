/**
 * Link Filter Module
 * Filters links based on internal/external/custom criteria
 */
(function() {
  'use strict';

  window.RLE = window.RLE || {};
  window.RLE.links = window.RLE.links || {};

  /**
   * Filter links based on criteria
   * @param {Array} links - Array of link objects to filter
   * @param {string} filterType - Filter type (all, internal, external, custom)
   * @param {string} customValue - Custom filter value (for custom filter type)
   * @param {string} currentDomain - Current page domain
   * @returns {Array} Filtered array of links
   */
  window.RLE.links.filterLinks = function(links, filterType, customValue, currentDomain) {
    return links.filter(function(link) {
      try {
        const linkDomain = new URL(link.url).hostname;

        switch (filterType) {
          case "all":
            return true;

          case "internal":
            return linkDomain === currentDomain;

          case "external":
            return linkDomain !== currentDomain;

          case "custom":
            if (!customValue) return true;
            const searchValue = customValue.toLowerCase();
            return (
              link.url.toLowerCase().includes(searchValue) ||
              link.text.toLowerCase().includes(searchValue)
            );

          default:
            return true;
        }
      } catch (e) {
        // If URL parsing fails, include the link in "all" filter
        return filterType === "all" || filterType === "custom";
      }
    });
  };
})();
