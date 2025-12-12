# Multi-Page & Non-Technical Pagination – Implementation Plan

## 1. Update Template Schema

Extend your existing template object(this is an example, some fields might not match exacly):

````ts
type Template = {
  id: string;
  name: string;
  domain: string;

  // existing:
  region: { topPct: number; leftPct: number; widthPct: number; heightPct: number };
  exportMode: string;
  cleanUrls: boolean;
  filters: { type: "all" | "internal" | "external"; keyword: string };
  sortMode: "dom" | "visual";

  // new:
  multiPage: boolean;            // enable/disable multi-page
  maxPages: number;              // safety limit (e.g. 5–20)
  paginationSelector?: string;   // CSS selector to the "Next" button
  useContainerInsteadOfViewport: boolean; // full-list extraction
  autoScroll: boolean;           // infinite scroll support (optional)
  maxScrollSteps: number;        // safety for auto-scroll
};

Store in chrome.storage.local as before.

---


## 2. UX Changes in “Save as Template” Flow

When user clicks **Save as Template** in the results panel:

1. Show dialog with:
    - Template name(exists already)
    - Auto-run(exists already)
    - Checkbox: **Use full list (entire container) instead of visible area**
    - Checkbox: **Enable multi-page extraction**
    - Input: **Max pages** (default: 5)
    - Buttons:
        - **Mark Next Page Button** (opens marking mode)
2. On **Save**, persist template with all fields.



---

## 3. “Mark Next Page Button” Implementation

When user clicks **Mark Next Page Button**:

1. Enter **element pick mode** in content script:
    - Add global mouseover/mouseout listeners.
    - On hover, add a temporary highlight class: `.rle-pagination-highlight`.
    - User should be able to scroll the page to choose the element.
2. On click in pick mode:
    - Prevent default navigation.
    - Compute a CSS selector for the clicked element:
        - Use a helper like `getCssPath(el)` that prefers `id`, `class`, and position.
    - Send selector back to the popup / results panel (via `chrome.runtime.sendMessage`).
    - Exit pick mode (remove listeners and highlight).
3. Save the returned selector into `template.paginationSelector`.


Note: Mind that I might not have a next button in a table, but also a "show more" type of button that shows more items. We should support that too.

---


## 4. Full-Container Extraction (Use Entire List, Not Viewport)

When saving a template with **Use full list** enabled:

1. During that extraction run, you already have:
    - The selection rectangle.
    - The list of matching links.
2. To infer the container:
    - For all extracted links, find their **common ancestor**:

      ```jsx
      function getCommonAncestor(nodes) { /* DOM walk up; intersect paths */ }
      ```

   - Use the highest meaningful ancestor that:
        - Contains all extracted links.
        - Is not `body` or `html`.
3. Store this container selector in the template instead of the raw region:
    - Either:

        ```tsx
        containerSelector: string;

        ```

    - Or reuse `region` but add:

        ```tsx
        containerSelector?: string;

        ```

4. On future runs:
    - If `containerSelector` exists:
        - Select container: `const container = document.querySelector(containerSelector);`
        - Extract **all** `<a>` inside container (apply filters, etc.), ignoring viewport.



---

## 5. Multi-Page Execution Flow (Template Run)

When a template is run (manual or auto-run):

1. Initialize multi-page state (in background or content script):
    - `currentPage = 1`
    - `allResults = []`
    - `maxPages = template.maxPages`
2. On each page:
    1. If `containerSelector` exists:
        - Extract links from that container.
    2. Else:
        - Use region-based extraction as now.
    3. Normalize, filter, and push into `allResults` (no formatting yet).
3. If `template.multiPage` is **false**:
    - Finish here → format and output `allResults`.
4. If `template.multiPage` is **true**:
    - Check `currentPage < maxPages`.
    - Find pagination element:

        ```jsx
        const nextEl = template.paginationSelector
          ? document.querySelector(template.paginationSelector)
          : autoDetectNextButton();
        ```

   - If `!nextEl` → stop and output.
   - Otherwise:
      - Set a flag in `chrome.storage.session` or background:

      `pendingTemplateRun = { templateId, currentPage: currentPage + 1, allResults }`

  - Trigger navigation: `nextEl.click()`.
5. On navigation complete (`chrome.tabs.onUpdated` or `window.onload` in content script):
    - Check if `pendingTemplateRun` exists.
    - Re-run extraction on the new page with updated `currentPage` and accumulated `allResults`.
6. When done:
    - Deduplicate `allResults` by normalized URL.
    - Apply final filters/sorting.
    - Format (CSV, Markdown, etc.).
    - For manual templates → show results panel.
    - For auto-run templates → copy to clipboard directly.



---

## 6. Optional: Auto-Scroll Support (Infinite Scroll)

If `template.autoScroll` is enabled and there is **no** pagination element:

1. Run loop:

    ```jsx
    let steps = 0;
    let prevHeight = 0;
    while (steps < template.maxScrollSteps) {
      window.scrollBy(0, 1000);
      await sleep(300);
      const newHeight = document.documentElement.scrollHeight;
      if (newHeight === prevHeight) break; // no more content
      prevHeight = newHeight;
      steps++;
    }

    ```

2. After scrolling:
    - Run container/region extraction once on the fully loaded content.
3. Continue with normal dedupe/filter/format/output.


---


## 7. UX Feedback & Safety

- Show small overlay/progress:
    - “Extracting page 2 of 5…”
    - “Collected 134 links so far…”
- Provide a **Cancel** button to abort multi-page run.
- Always respect `maxPages` and `maxScrollSteps`.

---

## 8. Implementation Order

1. Extend template schema (storage + types).
2. Implement full-container detection + extraction.
3. Implement “Mark Next Page Button” picker + selector storage.
4. Implement single-page template re-run using container/region.
5. Implement multi-page loop (click next → wait → continue).
6. Add auto-scroll as fallback for pages with no pagination.
7. Add progress UI + cancel support.
````
