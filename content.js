/**
 * Google Docs Tab State Persist
 *
 * Confirmed against live Docs markup (2026-08):
 * - The whole tabs sidebar is the single `[role="tree"]` on the page.
 * - Every tab row is a `[role="treeitem"]`, in constant document order —
 *   collapsed tabs' children stay in the DOM (just visually hidden), so a
 *   tab's index in that flat list is stable across refreshes.
 * - Each row carries its OWN toggle button as a descendant:
 *   `.chapterItemArrowContainer[role="button"]`. Every row has one, even
 *   leaf tabs — but leaf tabs' buttons are non-interactive
 *   (`aria-hidden="true"`, `display:none`), while real parent tabs' buttons
 *   are visible (`aria-hidden="false"`). That's the real "is collapsible"
 *   signal — `aria-expanded` alone is not, since it's present on both.
 * - Parent/child DOM containment is NOT reliable (a header's row does not
 *   contain its children — Docs renders them as siblings elsewhere), so we
 *   don't try to compute a real hierarchy. We don't need to: toggling a
 *   header's own button is enough, and Docs' own code handles cascading
 *   the visual show/hide of descendants.
 *
 * If a future Docs update changes this markup, flip DEBUG to true, reload,
 * and paste the console output back for a selector update.
 */
(function () {
  "use strict";

  const DEBUG = false; // set true + reload doc + open console to troubleshoot detection
  const RECONCILE_DEBOUNCE_MS = 250;
  const CLICK_SETTLE_MS = 180;
  const ARROW_SELECTOR = '.chapterItemArrowContainer[role="button"]';

  function log(...args) {
    if (DEBUG) console.log("[TabPersist]", ...args);
  }

  function getDocId() {
    const m = window.location.pathname.match(/\/document\/d\/([^/]+)/);
    return m ? m[1] : null;
  }

  function storageKeyFor(docId) {
    return `tabState:${docId}`;
  }

  async function loadState(docId) {
    const key = storageKeyFor(docId);
    const result = await chrome.storage.local.get(key);
    return result[key] || {};
  }

  async function saveState(docId, state) {
    const key = storageKeyFor(docId);
    await chrome.storage.local.set({ [key]: state });
  }

  // ---- Tree detection ----------------------------------------------------

  function pickTabTree() {
    const trees = Array.from(document.querySelectorAll('[role="tree"]'));
    if (trees.length === 0) return null;
    if (trees.length === 1) return trees[0];

    const labeled = trees.find((t) => {
      const label = (
        t.getAttribute("aria-label") ||
        t.getAttribute("aria-labelledby") ||
        ""
      ).toLowerCase();
      return label.includes("tab");
    });
    if (labeled) return labeled;

    let best = null;
    let bestScore = -1;
    for (const t of trees) {
      const items = t.querySelectorAll(ARROW_SELECTOR);
      if (items.length > bestScore) {
        bestScore = items.length;
        best = t;
      }
    }
    return best;
  }

  function getTitle(item) {
    const label = item.getAttribute("aria-label");
    if (label && label.trim()) return label.trim();
    const text = item.textContent || "";
    return text.trim().slice(0, 120);
  }

  function getAllTreeitems(tree) {
    return Array.from(tree.querySelectorAll('[role="treeitem"]'));
  }

  // The toggle button that belongs to this row, if it's actually
  // interactive (real parent tab) rather than the hidden dummy every leaf
  // tab also carries.
  function getOwnToggleButton(item) {
    const btn = item.querySelector(ARROW_SELECTOR);
    if (!btn) return null;
    if (btn.getAttribute("aria-hidden") === "true") return null;
    return btn;
  }

  function isExpanded(btn) {
    return btn.getAttribute("aria-expanded") === "true";
  }

  // Stable key: position in the constant-order flat list + title. Position
  // alone would survive renames; title alone would survive reorders. Both
  // together survive a plain refresh, which is the case we're fixing.
  function getKey(item, allItems) {
    const idx = allItems.indexOf(item);
    return `${idx}:${getTitle(item)}`;
  }

  function clickToggle(btn) {
    const rect = btn.getBoundingClientRect();
    const opts = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    };
    btn.dispatchEvent(new MouseEvent("mousedown", opts));
    btn.dispatchEvent(new MouseEvent("mouseup", opts));
    btn.dispatchEvent(new MouseEvent("click", opts));
  }

  // ---- Core reconcile loop ------------------------------------------------

  let currentDocId = null;
  let savedState = {};
  let reconcileTimer = null;
  let applying = false; // guards against our own synthetic clicks re-triggering saves
  let initialSyncDone = false;

  async function init() {
    const docId = getDocId();
    if (!docId) return;
    currentDocId = docId;
    savedState = await loadState(docId);
    log("Loaded saved state for doc", docId, savedState);

    const observer = new MutationObserver(() => scheduleReconcile());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-expanded"],
    });

    document.addEventListener(
      "click",
      (e) => {
        if (applying) return;
        const btn = e.target.closest && e.target.closest(ARROW_SELECTOR);
        if (btn) {
          const item = btn.closest('[role="treeitem"]');
          if (item) setTimeout(() => recordItemState(item, btn), CLICK_SETTLE_MS);
        }
      },
      true
    );

    scheduleReconcile();
  }

  function scheduleReconcile() {
    if (reconcileTimer) clearTimeout(reconcileTimer);
    reconcileTimer = setTimeout(reconcile, RECONCILE_DEBOUNCE_MS);
  }

  async function recordItemState(item, btn) {
    if (!currentDocId) return;
    const tree = pickTabTree();
    if (!tree) return;
    const allItems = getAllTreeitems(tree);
    const key = getKey(item, allItems);
    const expanded = isExpanded(btn);
    savedState[key] = expanded;
    await saveState(currentDocId, savedState);
    log("Recorded", key, "->", expanded);
  }

  async function reconcile() {
    if (!currentDocId) return;
    const tree = pickTabTree();
    if (!tree) {
      log("No tab tree found yet");
      return;
    }
    const allItems = getAllTreeitems(tree);
    if (allItems.length === 0) return;

    let changed = false;
    applying = true;
    for (const item of allItems) {
      const btn = getOwnToggleButton(item);
      if (!btn) continue; // leaf tab, nothing to collapse

      const key = getKey(item, allItems);
      const desired = savedState[key];
      const actual = isExpanded(btn);

      if (desired === undefined) {
        // First time we've seen this tab: adopt current state as baseline
        // (unless it's the very first sync, where "expanded" is just
        // Google's default and not a real user choice — skip recording
        // defaults on first run so we don't lock in "everything open").
        if (initialSyncDone) {
          savedState[key] = actual;
          changed = true;
        }
        continue;
      }
      if (desired !== actual) {
        log("Correcting", key, "actual:", actual, "-> desired:", desired);
        clickToggle(btn);
        changed = true;
        // Only correct one at a time per pass to avoid racing Docs' own
        // re-render; remaining mismatches get caught on the next mutation.
        break;
      }
    }
    applying = false;
    initialSyncDone = true;
    if (changed) await saveState(currentDocId, savedState);
  }

  init();
})();
