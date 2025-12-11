/**
 * Toast Notifications Module
 * Displays temporary toast messages to the user
 */
(function() {
  'use strict';

  window.RLE = window.RLE || {};
  window.RLE.ui = window.RLE.ui || {};

  /**
   * Show a toast notification
   * @param {string} message - The message to display
   * @param {string} [type="info"] - The toast type (info, success, error)
   */
  window.RLE.ui.showToast = function(message, type) {
    type = type || "info";

    const toast = document.createElement("div");
    toast.className = "rle-toast rle-toast-" + type;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(function() {
      toast.classList.add("rle-toast-show");
    }, 10);

    setTimeout(function() {
      toast.classList.remove("rle-toast-show");
      setTimeout(function() {
        toast.remove();
      }, 300);
    }, 3000);
  };
})();
