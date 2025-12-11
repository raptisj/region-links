/**
 * URL Utilities Module
 * Handles URL normalization and cleaning
 */
(function() {
  'use strict';

  window.RLE = window.RLE || {};

  window.RLE.urlUtils = {
    /**
     * Normalize URL by optionally stripping tracking parameters
     * @param {string} rawUrl - The URL to normalize
     * @param {boolean} cleanUrls - Whether to strip tracking parameters
     * @returns {string} The normalized URL
     */
    normalize: function(rawUrl, cleanUrls) {
      try {
        const url = new URL(rawUrl);
        // strip tracking params if enabled
        if (cleanUrls) {
          const paramsToStrip = [
            // UTM parameters (Google Analytics, standard marketing)
            "utm_source",
            "utm_medium",
            "utm_campaign",
            "utm_term",
            "utm_content",
            "utm_id",
            "utm_source_platform",
            "utm_creative_format",
            "utm_marketing_tactic",

            // Google Ads & Analytics
            "gclid",
            "gclsrc",
            "dclid",
            "gbraid",
            "wbraid",
            "_ga",
            "_gl",

            // Facebook/Meta
            "fbclid",
            "fb_action_ids",
            "fb_action_types",
            "fb_source",
            "fb_ref",

            // Microsoft/Bing
            "msclkid",
            "mscrid",

            // TikTok
            "ttclid",

            // Twitter/X
            "twclid",

            // LinkedIn
            "li_fat_id",
            "li_source_id",

            // Instagram
            "igshid",
            "igsh",

            // HubSpot
            "_hsenc",
            "_hsmi",
            "__hssc",
            "__hstc",
            "__hsfp",
            "hsCtaTracking",

            // Marketo
            "mkt_tok",

            // Adobe/Omniture
            "s_cid",

            // Mailchimp
            "mc_cid",
            "mc_eid",

            // Campaign Monitor
            "vero_id",
            "vero_conv",

            // Drip
            "__s",

            // Klaviyo
            "_kx",

            // Omnisend
            "omnisendContactID",

            // General tracking
            "ref",
            "referer",
            "referrer",
            "source",
            "campaign",

            // Email tracking
            "oly_anon_id",
            "oly_enc_id",
            "wickedid",

            // Other ad platforms
            "zanpid",
            "spm",
            "scm",
            "scm_id",

            // Affiliate tracking
            "aff_id",
            "affiliate_id",
            "click_id",
            "clickid",

            // Session/tracking IDs
            "sid",
            "ssid",
            "iesrc",
          ];
          paramsToStrip.forEach(function(p) {
            url.searchParams.delete(p);
          });
        }
        // Optional: remove trailing slash from path
        if (url.pathname !== "/" && url.pathname.endsWith("/")) {
          url.pathname = url.pathname.slice(0, -1);
        }
        return url.toString();
      } catch (e) {
        return rawUrl;
      }
    }
  };
})();
