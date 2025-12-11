/**
 * Overlay Module
 * Manages the selection overlay and mouse event handlers
 */
(function() {
  'use strict';

  window.RLE = window.RLE || {};
  window.RLE.ui = window.RLE.ui || {};

  // Event handler functions
  function handleMouseDown(e) {
    const state = window.RLE.state.get();

    e.preventDefault();
    e.stopPropagation();

    window.RLE.state.set({
      startX: e.clientX,
      startY: e.clientY
    });

    state.selectionBox.style.left = e.clientX + "px";
    state.selectionBox.style.top = e.clientY + "px";
    state.selectionBox.style.width = "0px";
    state.selectionBox.style.height = "0px";
    state.selectionBox.style.display = "block";
  }

  function handleMouseMove(e) {
    const state = window.RLE.state.get();

    if (!state.selectionBox || state.selectionBox.style.display !== "block") {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const currentX = e.clientX;
    const currentY = e.clientY;

    const width = Math.abs(currentX - state.startX);
    const height = Math.abs(currentY - state.startY);
    const left = Math.min(currentX, state.startX);
    const top = Math.min(currentY, state.startY);

    state.selectionBox.style.left = left + "px";
    state.selectionBox.style.top = top + "px";
    state.selectionBox.style.width = width + "px";
    state.selectionBox.style.height = height + "px";
  }

  function handleMouseUp(e) {
    const state = window.RLE.state.get();

    if (!state.selectionBox || state.selectionBox.style.display !== "block") {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const selectionRect = {
      left: parseFloat(state.selectionBox.style.left),
      top: parseFloat(state.selectionBox.style.top),
      right:
        parseFloat(state.selectionBox.style.left) +
        parseFloat(state.selectionBox.style.width),
      bottom:
        parseFloat(state.selectionBox.style.top) +
        parseFloat(state.selectionBox.style.height),
      width: parseFloat(state.selectionBox.style.width),
      height: parseFloat(state.selectionBox.style.height),
    };

    if (selectionRect.width > 10 && selectionRect.height > 10) {
      window.RLE.state.set({ lastSelectionRect: selectionRect });
      window.RLE.links.extractLinks(selectionRect);
    }

    window.RLE.ui.removeOverlay();
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      window.RLE.ui.cancelSelection();
    }
  }

  /**
   * Attach event listeners to the overlay
   */
  function attachEventListeners() {
    const state = window.RLE.state.get();

    state.overlay.addEventListener("mousedown", handleMouseDown);
    state.overlay.addEventListener("mousemove", handleMouseMove);
    state.overlay.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keydown", handleKeyDown);
  }

  /**
   * Remove event listeners from the overlay
   */
  function removeEventListeners() {
    const state = window.RLE.state.get();

    if (state.overlay) {
      state.overlay.removeEventListener("mousedown", handleMouseDown);
      state.overlay.removeEventListener("mousemove", handleMouseMove);
      state.overlay.removeEventListener("mouseup", handleMouseUp);
    }
    document.removeEventListener("keydown", handleKeyDown);
  }

  /**
   * Create the overlay and selection box
   */
  window.RLE.ui.createOverlay = function() {
    const state = window.RLE.state.get();

    if (state.overlay) {
      state.overlay.remove();
    }

    const overlay = document.createElement("div");
    overlay.id = "rle-overlay";
    overlay.className = "rle-overlay";
    document.body.appendChild(overlay);

    const selectionBox = document.createElement("div");
    selectionBox.id = "rle-selection-box";
    selectionBox.className = "rle-selection-box";
    overlay.appendChild(selectionBox);

    const instruction = document.createElement("div");
    instruction.className = "rle-instruction";

    const exportModeNames = {
      urls: "URLs Only",
      "text-url": "Text + URL",
      markdown: "Markdown List",
      csv: "CSV",
    };

    const modeName = exportModeNames[state.exportMode] || "URLs Only";

    instruction.innerHTML =
      '<div class="rle-instruction-main">Click and drag to select a region. Press ESC to cancel.</div>' +
      '<div class="rle-instruction-mode">Export Mode: <strong>' + modeName + '</strong></div>';
    overlay.appendChild(instruction);

    window.RLE.state.set({ overlay: overlay, selectionBox: selectionBox });

    attachEventListeners();
  };

  /**
   * Remove the overlay
   */
  window.RLE.ui.removeOverlay = function() {
    const state = window.RLE.state.get();

    if (state.overlay) {
      state.overlay.remove();
      window.RLE.state.set({ overlay: null, selectionBox: null });
    }
    removeEventListeners();
    window.RLE.state.set({ isActive: false });
  };

  /**
   * Cancel selection and cleanup
   */
  window.RLE.ui.cancelSelection = function() {
    window.RLE.ui.removeOverlay();
    window.RLE.ui.closeResultsPanel();
    window.RLE.state.set({ isActive: false });
  };
})();
