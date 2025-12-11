/**
 * Link Formatter Module
 * Formats extracted links into various export formats
 */
(function() {
  'use strict';

  window.RLE = window.RLE || {};
  window.RLE.links = window.RLE.links || {};

  /**
   * Format links for export in various modes
   * @param {Array} links - Array of link objects {text, url}
   * @param {string} mode - Export mode (urls, text-url, markdown, csv)
   * @param {string} [sourcePage] - Source page URL (required for CSV mode)
   * @returns {string} Formatted text ready for export
   */
  window.RLE.links.formatLinks = function(links, mode, sourcePage) {
    switch (mode) {
      case "urls":
        return links.map(function(link) {
          return link.url;
        }).join(", ");

      case "text-url":
        return links.map(function(link) {
          // Normalize whitespace: replace newlines and multiple spaces with single space
          const normalizedText = link.text.replace(/\s+/g, ' ').trim();
          return normalizedText + " - " + link.url;
        }).join("\n");

      case "markdown":
        return links.map(function(link) {
          // Normalize whitespace: replace newlines and multiple spaces with single space
          const normalizedText = link.text ? link.text.replace(/\s+/g, ' ').trim() : link.url;
          return "- [" + normalizedText + "](" + link.url + ")";
        }).join("\n");

      case "csv":
        sourcePage = sourcePage || window.location.href;
        const rows = ["name,url,source_page"];
        links.forEach(function(link) {
          // Normalize whitespace: replace newlines and multiple spaces with single space
          const normalizedText = link.text.replace(/\s+/g, ' ').trim();
          // Escape commas and quotes in values
          const escapedText = normalizedText.replace(/"/g, '""');
          const escapedUrl = link.url.replace(/"/g, '""');
          const escapedSource = sourcePage.replace(/"/g, '""');

          // Only quote fields that contain commas, quotes, or newlines
          const nameField = (normalizedText.includes(',') || normalizedText.includes('"'))
            ? '"' + escapedText + '"'
            : normalizedText;
          const urlField = (link.url.includes(',') || link.url.includes('"'))
            ? '"' + escapedUrl + '"'
            : link.url;
          const sourceField = (sourcePage.includes(',') || sourcePage.includes('"'))
            ? '"' + escapedSource + '"'
            : sourcePage;

          rows.push(nameField + "," + urlField + "," + sourceField);
        });
        return rows.join("\n");

      default:
        return links.map(function(link) {
          return link.url;
        }).join("\n");
    }
  };
})();
