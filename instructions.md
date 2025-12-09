# MVP Plan: “Regional Link Extractor” Chrome Extension

## 1. Goal and Scope

**Goal:**

Let the user select a rectangular region on a web page and copy all
links in that region, with an option to export basic structured
data (e.g., link text + URL).

## 2. Core User Stories (MVP)

1. As a user, I can toggle a “selection mode” and draw a rectangle over the page.
2. As a user, I can see a list of all links (`<a>` elements) that intersect the selection.
3. As a user, I can copy:
   - just URLs
   - or simple structured data: `[link text, URL]`
4. As a user, I can export the structured data as:
   - Clipboard (plain text)
   - CSV or Markdown table (download as file or copy)

## 3. UX Flow

### 3.1 Activation

- User clicks the extension icon in the Chrome toolbar.
- Popup shows a simple UI:
  - Button: “Start Region Selection”
  - Option (radio/select): “Copy mode”
    - `URLs only`
    - `Text + URL`
    - `Markdown list`
    - `CSV`

### 3.2 Region Selection

- On clicking “Start Region Selection”:
  - Content script injects a full-page transparent overlay.
  - Mouse interactions on overlay:
    - `mousedown` → start point
    - `mousemove` → draw rectangle
    - `mouseup` → finalize rectangle
  - Drawn rectangle is visually highlighted (semi-transparent box, border).

### 3.3 Extraction and Preview

- On `mouseup`:
  - Content script:
    - Calculates bounding box of selection.
    - Finds all `<a>` elements on the page.
    - Gets each link’s bounding rectangle via `getBoundingClientRect()`.
    - Filters links whose rectangles intersect the selected region.
    - Builds a list with:
      - Text content (trimmed)
      - `href` (normalized absolute URL if possible)
  - Small floating panel near selection or bottom-right:
    - Shows number of links found.
    - “View details” button.
- On “View details”:
  - Panel expands (or popup opens) to show:
    - Table-like list:
      - Column 1: link text
      - Column 2: URL
    - Checkboxes per row (default: all selected).
    - Button(s):
      - “Copy to clipboard”
      - “Copy as CSV”
      - “Copy as Markdown list”
      - (or one primary button based on pre-selected mode)

### 3.4 Copy / Export

- When user clicks copy/export:
  - Data is formatted according to selected export mode.
  - Copy to clipboard using `navigator.clipboard.writeText`.
  - Optionally show small confirmation toast: “Copied X items”.

## 4. Technical Architecture

### 4.1 Components

- **Manifest (v3 recommended)**
  - Permissions:
    - `"scripting"`, `"activeTab"`, `"storage"`, `"clipboardWrite"`
  - `"action"` (toolbar icon with popup)
- **Background Service Worker**
  - Handles:
    - Basic lifecycle
    - Message routing if needed
  - For MVP, logic can be minimal; most logic lives in content script + popup.
- **Popup UI**
  - HTML/JS for:
    - Toggle “Start Region Selection”
    - Export mode selection
    - Possibly display last extraction summary
- **Content Script**
  - Injected into active tab on demand.
  - Responsibilities:
    - Draw/remove overlay.
    - Handle mouse events.
    - Compute selection rectangle.
    - Identify intersecting links.
    - Create and manage floating result panel.
    - Perform formatting and clipboard copy (or send data back to popup).

### 4.2 Messaging

- Popup → Content script:
  - `START_SELECTION`
  - `CANCEL_SELECTION`
  - Optional: `SET_EXPORT_MODE`
- Content script → Popup (optional):
  - `SELECTION_RESULT` with extracted link data.
  - For MVP, results can be managed only in-page via floating panel; no need to return to popup unless desired.

## 5. Data Extraction Logic

### 5.1 Link Detection

Algorithm:

1. Get selection rect (`selRect`):
   - From overlay coordinates mapped to viewport coordinates.
2. Get all links:

   ```jsx
   const anchors = document.querySelectorAll("a[href]");
   ```

3. For each a:

Get bounding rect:

const r = anchor.getBoundingClientRect();

Check intersection with selRect:

Intersection if:

r.right >= selRect.left

r.left <= selRect.right

r.bottom >= selRect.top

r.top <= selRect.bottom

1. Collect:

text = anchor.innerText.trim() || anchor.getAttribute('title') || ''

href = anchor.href (browser-normalized absolute URL)

1. De-duplicate by URL + maybe text (optional).

### 5.2 Basic Structured Data

Internal representation (per link):

type ExtractedLink = {
text: string;
url: string;
index: number; // order in DOM
top: number; // r.top for optional sorting
left: number; // r.left for optional sorting
};

## 6. Output Formatting

### 6.1 URLs Only

One URL per line:

https://example.com/foohttps://example.com/bar

### 6.2 Text + URL (plain text)

Tab or pipe separated:

Link text 1 https://example.com/1
Link text 2 https://example.com/2

### 6.3 CSV

Escape quotes and commas:

"text","url"
"Some link","https://example.com/1"
"Other, link","https://example.com/2"

### 6.4 Markdown List

Bullet list with link markdown:

- [Some link](https://example.com/1)
- [Other link](https://example.com/2)

---

## 7. Settings (Minimal)

Stored via chrome.storage.sync:

Default export mode (urls | text+url | csv | markdown).

Option: sort links by:

DOM order (default)

top-to-bottom, left-to-right (optional)

Popup allows user to choose and saves on change.

---

## 8. Edge Cases and Handling

1. No links in region

Show message in panel: “No links found in selected area.”

Offer to expand selection or retry.

2. Hidden or overlapped links

We rely on DOM/rect; if links are off-screen or hidden, they might still be included.

Optional: skip elements with offsetParent === null or zero width/height.

3. Fixed-position headers/footers

Overlay should cover entire viewport including fixed elements.

Works naturally with getBoundingClientRect().

4. Iframes

MVP: ignore links inside iframes.

Future: optional support via per-frame injection.

5. Very large pages (performance)

querySelectorAll('a[href]') is usually fine.

If needed, guard with try/catch and simple logging; no heavy processing.

---

## 9. Basic Implementation Milestones

1. Skeleton Extension

Manifest v3 with action + popup + content script wiring.

2. Overlay + Region Selection

Implement overlay div.

Implement rectangle drawing via mouse events.

Capture final rectangle coordinates.

3. Link Intersection + Extraction

Implement intersection logic.

Collect and log extracted links (console) for debugging.

4. Floating Panel UI

Show count of links.

Display simple list.

Add “Copy to clipboard” for URLs only.

5. Structured Data Export

Add modes: URLs, Text+URL, Markdown, CSV.

Implement formatting and clipboard copy.

6. Popup + Settings

Let user choose default export mode.

Store in chrome.storage.sync.

Pass mode to content script on “Start Region Selection”.

7. Polish and Hardening

Clean overlay and panel on escape key or click “Cancel”.

Minimal, clear styling.

Basic error handling and user feedback.

---

Additional items worth including in an MVP plan, all low-cost and high-impact:

1. Robust selection cancellation
   Allow ESC key to instantly remove overlay.
   Allow clicking outside selection or on “X” icon to exit cleanly.

2. Accessibility and keyboard support
   Optional keyboard shortcut to start selection (configurable).
   Arrow-key nudging of the selection box (optional but easy).

3. Visual link highlighting
   After selection is complete, briefly highlight the detected links on-page (outline or glow).
   Helps user validate correctness before copying.

4. Sorting options
   Sort by DOM order (default).
   Sort visually: top→bottom, then left→right.
   Useful for pages with grid layouts.

5. URL normalization rules
   Strip tracking parameters (optional).
   Convert relative → absolute.
   Remove duplicate trailing slashes.

6. Basic filtering options
   Toggle internal links vs external links.
   Filter by file type (e.g., only .pdf, .jpg links).
   Filter by substring/domain.

7. Minimal error reporting
   If clipboard copy fails, fallback to showing a text box the user can manually copy from.
   Handle sandboxed iframes gracefully with a message.

8. Simple telemetry (local only, opt-in)
   Track count of extractions per site to guide future improvements.
   No network activity; stored only locally unless the user opts in.

9. Code structure considerations
   Isolate selection overlay code, extraction logic, and formatting functions into separate modules for maintainability.
   Consider using a small build pipeline (e.g., Vite) for clean bundling.

10. Security considerations
    Keep permissions minimal (activeTab, scripting, clipboardWrite).
    Only inject code on user action.
    No persistent background listeners for page content.

---

Add in an markdown file instructions on how to test locally and how to deploy so people can use it.
