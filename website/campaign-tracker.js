/* =========================================================
   Aureline Systems — campaign-tracker.js
   ---------------------------------------------------------
   Detects QR-campaign traffic on page load by reading the
   utm_source and utm_campaign query parameters, then logs
   the visit locally (localStorage) for later review.

   Designed to be:
     - self-contained (no dependency on the rest of script.js)
     - silent (no UI changes, no popups)
     - safe to ship (bounded storage, dedup, try/catch)
     - easy to extend (send to backend, GA, Sheets, etc.)

   Public API (attached to window.AurelineQR):
     AurelineQR.parseCampaignParams()  -> { source, campaign }
     AurelineQR.trackCampaignVisit()   -> record | null
     AurelineQR.getLoggedVisits()      -> Array<record>
     AurelineQR.clearLoggedVisits()    -> void

   To inspect visits from the browser console:
     AurelineQR.getLoggedVisits();
   ========================================================= */

(() => {
  "use strict";

  // ---- Config -----------------------------------------------------
  // Campaign prefixes we actually care about. Everything else is
  // ignored, even if utm_source=qr is present.
  const ALLOWED_PREFIXES = ["oak_harbor", "general"];

  // Expected utm_source for our QR traffic.
  const EXPECTED_SOURCE = "qr";

  // Apps Script web-app URL that receives qualifying QR visits and
  // writes them to the "Visits" tab of the QR Visits spreadsheet.
  // See server/apps-script-qr.gs for the backend + deployment steps.
  // Leave as the placeholder below until the script is deployed;
  // an empty / placeholder URL silently skips the network send.
  const QR_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwuzKToUATEeSIexWmal0PKwj91qhc1Uw4a4zWbyXtEBShjuDA_rOP9zYyR4JySJGG9ZQ/exec";

  // localStorage key that holds the rolling array of visits.
  const STORAGE_KEY = "aureline:qrVisits";

  // sessionStorage key prefix used to dedupe repeat visits of the
  // same campaign within one browser tab session.
  const SESSION_DEDUPE_PREFIX = "aureline:qrSeen:";

  // Cap on how many visit records we retain in localStorage. Prevents
  // unbounded growth if someone leaves the page open or keeps visiting.
  const MAX_STORED_VISITS = 500;

  // In-memory flag: guarantees we only log once per page load, even
  // if trackCampaignVisit() is called by mistake from another place.
  let loggedThisPageLoad = false;

  // ---- Helpers ----------------------------------------------------

  /**
   * Read utm_source and utm_campaign from the current URL.
   * Returns an object with both keys; values are null if absent.
   */
  function parseCampaignParams() {
    try {
      const params = new URLSearchParams(window.location.search);
      const source = params.get("utm_source");
      const campaign = params.get("utm_campaign");
      return {
        source: source ? source.trim().toLowerCase() : null,
        campaign: campaign ? campaign.trim().toLowerCase() : null,
      };
    } catch (_err) {
      return { source: null, campaign: null };
    }
  }

  /**
   * True if `campaign` starts with one of the allowed prefixes
   * AND is either the prefix itself or prefix + "_<something>".
   * This avoids a loose startsWith() matching "oak_harborish".
   */
  function isAllowedCampaign(campaign) {
    if (!campaign) return false;
    return ALLOWED_PREFIXES.some(
      (prefix) => campaign === prefix || campaign.startsWith(prefix + "_")
    );
  }

  /**
   * Extract the high-level campaign type ("oak_harbor" or "general")
   * from a full campaign name like "oak_harbor_flyer".
   */
  function campaignType(campaign) {
    const match = ALLOWED_PREFIXES.find(
      (prefix) => campaign === prefix || campaign.startsWith(prefix + "_")
    );
    return match || null;
  }

  /**
   * Load the full array of previously logged visits from localStorage.
   * Always returns an array — never throws.
   */
  function getLoggedVisits() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_err) {
      return [];
    }
  }

  function clearLoggedVisits() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (_err) {
      // storage blocked; nothing we can do
    }
  }

  /**
   * Append a single visit record to the stored rolling array.
   * Trims to MAX_STORED_VISITS so localStorage never grows unbounded.
   */
  function appendVisit(record) {
    try {
      const existing = getLoggedVisits();
      existing.push(record);
      const trimmed =
        existing.length > MAX_STORED_VISITS
          ? existing.slice(existing.length - MAX_STORED_VISITS)
          : existing;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      return true;
    } catch (_err) {
      // Quota exceeded or storage disabled (private mode on some
      // browsers). Fail quietly — tracking is best-effort.
      return false;
    }
  }

  /**
   * Session-level dedupe: within the same browser tab session, the
   * same campaign is only logged once. Returns true if this is the
   * first time we've seen this campaign in the session.
   */
  function markSeenThisSession(campaign) {
    try {
      const key = SESSION_DEDUPE_PREFIX + campaign;
      if (window.sessionStorage.getItem(key)) return false;
      window.sessionStorage.setItem(key, String(Date.now()));
      return true;
    } catch (_err) {
      // If sessionStorage is unavailable, fall back to logging once
      // per page load (in-memory flag still applies).
      return true;
    }
  }

  // ---- Main -------------------------------------------------------

  /**
   * Inspect the current URL, and if it represents a valid QR
   * campaign visit, log it to localStorage and the console.
   * Returns the record it logged, or null if nothing was logged.
   */
  function trackCampaignVisit() {
    if (loggedThisPageLoad) return null;

    const { source, campaign } = parseCampaignParams();
    if (source !== EXPECTED_SOURCE) return null;
    if (!isAllowedCampaign(campaign)) return null;

    // Same-session dedupe: if this campaign was already logged in
    // this tab session, skip silently.
    if (!markSeenThisSession(campaign)) {
      loggedThisPageLoad = true;
      return null;
    }

    const record = {
      campaign,
      type: campaignType(campaign),
      source,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      referrer: document.referrer || null,
      userAgent: navigator.userAgent || null,
    };

    appendVisit(record);
    loggedThisPageLoad = true;

    // Debug breadcrumb. Safe to leave in production — it's quiet
    // unless a real QR campaign is detected.
    try {
      console.log("QR Campaign detected: " + record.campaign, {
        timestamp: record.timestamp,
        campaign: record.campaign,
        type: record.type,
      });
    } catch (_err) {
      // console not available; ignore
    }

    // Send to the QR Visits Apps Script endpoint (fire-and-forget).
    // `no-cors` avoids a CORS preflight that Apps Script doesn't
    // handle; we can't read the response, but the POST reliably
    // reaches the script. If QR_SCRIPT_URL is blank we skip silently
    // so the tracker still logs to localStorage during development.
    if (QR_SCRIPT_URL && /^https:\/\/script\.google\.com\//.test(QR_SCRIPT_URL)) {
      try {
        const form = new FormData();
        Object.keys(record).forEach((key) => {
          const value = record[key];
          form.append(key, value == null ? "" : String(value));
        });
        fetch(QR_SCRIPT_URL, {
          method: "POST",
          mode: "no-cors",
          body: form,
        }).catch(() => {
          // best-effort; failures are ignored
        });
      } catch (_err) {
        // FormData / fetch unavailable — skip silently
      }
    }

    // -----------------------------------------------------------------
    // OPTIONAL: forward to Google Analytics 4 as a custom event.
    // Only runs if you add the GA4 snippet to index.html later.
    // -----------------------------------------------------------------
    // if (typeof window.gtag === "function") {
    //   window.gtag("event", "qr_campaign_visit", {
    //     campaign_name: record.campaign,
    //     campaign_type: record.type,
    //   });
    // }

    return record;
  }

  // ---- Public API + auto-run -------------------------------------

  window.AurelineQR = {
    parseCampaignParams,
    trackCampaignVisit,
    getLoggedVisits,
    clearLoggedVisits,
  };

  // Run as soon as the DOM is ready. No UI work happens here — this
  // is pure data capture, invisible to the visitor.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", trackCampaignVisit, {
      once: true,
    });
  } else {
    trackCampaignVisit();
  }
})();
