/**
 * Link Extractor Module
 * Extracts links from a selected region on the page
 */
(function() {
  'use strict';

  window.RLE = window.RLE || {};
  window.RLE.links = window.RLE.links || {};

  /**
   * Show a "no links" message panel
   */
  function showNoLinksMessage() {
    const panel = document.createElement("div");
    panel.className = "rle-results-panel rle-no-results";
    panel.id = "rle-results-panel";

    const message = document.createElement("div");
    message.className = "rle-no-results-message";
    message.textContent = "No links found in selected area.";

    const closeBtn = document.createElement("button");
    closeBtn.className = "rle-btn rle-btn-secondary";
    closeBtn.textContent = "Close";
    closeBtn.onclick = function() {
      window.RLE.ui.closeResultsPanel();
    };

    panel.appendChild(message);
    panel.appendChild(closeBtn);

    document.body.appendChild(panel);
    window.RLE.state.set({ resultsPanel: panel });

    setTimeout(function() {
      window.RLE.ui.closeResultsPanel();
    }, 3000);
  }

  /**
   * Extract links from a selected region
   * @param {Object} selectionRect - Rectangle coordinates {left, top, right, bottom, width, height}
   */
  window.RLE.links.extractLinks = function(selectionRect) {
    const state = window.RLE.state.get();

    console.log("[RegionLinks] extractLinks called, state.isAutoRun:", state.isAutoRun);

    // Validate selectionRect
    if (!selectionRect || typeof selectionRect.left === 'undefined') {
      console.error("Invalid selectionRect:", selectionRect);
      window.RLE.ui.showToast("Error: Invalid selection area", "error");
      return;
    }

    const anchors = document.querySelectorAll("a[href]");
    const extractedLinks = [];

    anchors.forEach(function(anchor, index) {
      const rect = anchor.getBoundingClientRect();

      const intersects = !(
        rect.right < selectionRect.left ||
        rect.left > selectionRect.right ||
        rect.bottom < selectionRect.top ||
        rect.top > selectionRect.bottom
      );

      if (intersects) {
        if (rect.width === 0 || rect.height === 0) {
          return;
        }

        let text = (anchor.innerText || anchor.textContent || "").trim();

        // Check for aria-label and title on the anchor
        if (!text) {
          text =
            anchor.getAttribute("aria-label") ||
            anchor.getAttribute("title") ||
            "";
        }

        // Check for image alt/title text
        if (!text) {
          const img = anchor.querySelector("img");
          if (img) {
            text = img.getAttribute("alt") || img.getAttribute("title") || "";
          }
        }

        // Check for SVG title element
        if (!text) {
          const svg = anchor.querySelector("svg");
          if (svg) {
            const titleElement = svg.querySelector("title");
            if (titleElement) {
              text = titleElement.textContent || "";
            }
            if (!text) {
              text = svg.getAttribute("aria-label") || "";
            }
          }
        }

        // Fallback: extract meaningful part from URL
        if (!text) {
          try {
            const urlObj = new URL(anchor.href);
            const hostname = urlObj.hostname.replace(/^www\./, "");
            const pathParts = urlObj.pathname.split("/").filter(function(p) {
              return p;
            });

            // Capitalize and format domain name nicely
            const domainParts = hostname.split(".");
            const mainDomain =
              domainParts.length > 1
                ? domainParts[domainParts.length - 2]
                : domainParts[0];
            const capitalizedDomain =
              mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);

            // Use domain + first meaningful path segment if available
            if (pathParts.length > 0) {
              const pathLabel = pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1);
              text = capitalizedDomain + " - " + pathLabel;
            } else {
              text = capitalizedDomain;
            }
          } catch (e) {
            text = "Link";
          }
        }

        text = text.trim();
        const url = window.RLE.urlUtils.normalize(anchor.href, state.cleanUrls);

        extractedLinks.push({
          text: text,
          url: url,
          index: index,
          top: rect.top,
          left: rect.left,
        });
      }
    });

    // Remove duplicate URLs, keeping only the first occurrence
    const uniqueLinks = [];
    const seenUrls = new Set();

    extractedLinks.forEach(function(link) {
      if (!seenUrls.has(link.url)) {
        seenUrls.add(link.url);
        uniqueLinks.push(link);
      }
    });

    window.RLE.state.set({ extractedLinks: uniqueLinks });

    if (uniqueLinks.length > 0) {
      // If auto-run, return links for popup to copy
      if (state.isAutoRun) {
        console.log("[RegionLinks] Auto-run extraction complete, storing for popup");

        // Apply filters
        const currentPageDomain = new URL(window.location.href).hostname;
        const filteredLinks = window.RLE.links.filterLinks(
          uniqueLinks,
          state.currentFilter,
          state.customFilterValue,
          currentPageDomain
        );
        console.log("[RegionLinks] Filtered to", filteredLinks.length, "links");

        if (filteredLinks.length === 0) {
          console.log("[RegionLinks] No links after filtering");
          window.RLE.ui.showToast("No links match current filters", "error");
          window.RLE.state.set({ isAutoRun: false });
          return;
        }

        const formattedText = window.RLE.links.formatLinks(filteredLinks, state.exportMode);

        // Store for popup to retrieve and copy
        chrome.storage.local.set({
          pendingAutoCopy: {
            text: formattedText,
            count: filteredLinks.length,
            timestamp: Date.now()
          }
        });
        console.log("[RegionLinks] Stored", filteredLinks.length, "links in pendingAutoCopy");
        window.RLE.state.set({ isAutoRun: false });
      } else {
        window.RLE.ui.showResultsPanel(uniqueLinks);
      }
    } else {
      if (state.isAutoRun) {
        window.RLE.ui.showToast("No links found in saved region", "error");
        window.RLE.state.set({ isAutoRun: false });
      } else {
        showNoLinksMessage();
      }
    }
  };
})();
