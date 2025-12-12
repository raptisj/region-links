# RegionLinks Technical Documentation

## Architecture Overview

RegionLinks is a Chrome extension built with Manifest V3 that allows users to visually select a region on any webpage and extract links within that region. The extension has been refactored into a modular architecture for maintainability and extensibility.

## Technology Stack

- **Chrome Extension Manifest V3** - Modern extension platform
- **Vanilla JavaScript** - No frameworks, pure JS with IIFE module pattern
- **Chrome Storage API** - For persisting user preferences and templates
- **Chrome Scripting API** - For dynamically injecting content scripts

## Directory Structure

```
region-links/
├── manifest.json           - Extension manifest (Manifest V3)
├── background.js           - Background service worker
├── popup.js                - Popup UI script
├── popup.html              - Popup UI markup
├── content.js              - Content script entry point
├── content.css             - Content script styles
├── README.md               - User-facing documentation
├── DOCS.md                 - This file (technical docs)
├── instructions.md         - Additional instructions
├── icons/                  - Extension icons
└── modules/
    ├── state.js            - State management
    ├── urlUtils.js         - URL normalization
    ├── messageHandler.js   - Message routing
    ├── templates.js        - Template CRUD and multi-page orchestration
    ├── ui/
    │   ├── overlay.js            - Selection overlay
    │   ├── resultsPanel.js       - Results display
    │   ├── dialogs.js            - Modal dialogs (with multi-page settings)
    │   ├── toast.js              - Toast notifications
    │   ├── elementPicker.js      - Pagination button picker (NEW)
    │   └── multiPageProgress.js  - Progress overlay for multi-page (NEW)
    ├── links/
    │   ├── extractor.js          - Link extraction logic
    │   ├── filter.js             - Link filtering
    │   ├── formatter.js          - Export format generation
    │   └── containerDetector.js  - Container detection (NEW)
    └── multiPage/
        └── navigationHandler.js  - Navigation continuation (NEW)
```

## Module System

### Why IIFE Pattern?

Chrome extensions loaded via `chrome.scripting.executeScript` don't support ES6 modules (`import`/`export`). To maintain modularity without a build step, we use:

- **IIFE (Immediately Invoked Function Expressions)** - Encapsulate code to avoid global pollution
- **Namespaced globals** - All modules export to `window.RLE` namespace
- **Dependency order loading** - Files loaded sequentially to ensure dependencies are available

### Module Pattern Example

```javascript
// modules/example.js
(function() {
  'use strict';

  window.RLE = window.RLE || {};
  window.RLE.example = {};

  window.RLE.example.doSomething = function(param) {
    // Implementation
  };
})();
```

## Module Descriptions

### Core Modules

#### `modules/state.js` - State Management
- **Purpose**: Centralized state storage
- **Dependencies**: None
- **Exports**: `RLE.state.get(key)`, `RLE.state.set(updates)`, `RLE.state.reset()`
- **State Properties**:
  - `isActive` - Whether selection mode is active
  - `exportMode` - Current export format (urls, text-url, markdown, csv)
  - `cleanUrls` - Whether URL cleaning is enabled
  - `overlay` - Reference to overlay DOM element
  - `selectionBox` - Reference to selection box DOM element
  - `startX`, `startY` - Selection start coordinates
  - `extractedLinks` - Array of extracted link objects
  - `resultsPanel` - Reference to results panel DOM element
  - `currentFilter` - Active filter type (all, internal, external, custom)
  - `customFilterValue` - Custom filter search value
  - `lastSelectionRect` - Last selection rectangle coordinates
  - `currentTemplate` - Currently running template object
  - `isAutoRun` - Whether template is auto-running

#### `modules/urlUtils.js` - URL Utilities
- **Purpose**: URL normalization and cleaning
- **Dependencies**: None
- **Exports**: `RLE.urlUtils.normalize(rawUrl, cleanUrls)`
- **Features**:
  - Strips 70+ tracking parameters (UTM, Google, Facebook, etc.)
  - Removes trailing slashes
  - Handles malformed URLs gracefully

#### `modules/ui/toast.js` - Toast Notifications
- **Purpose**: Display temporary notifications
- **Dependencies**: None
- **Exports**: `RLE.ui.showToast(message, type)`
- **Types**: `info`, `success`, `error`
- **Duration**: 3 seconds

### Data Processing Modules

#### `modules/links/formatter.js` - Link Formatter
- **Purpose**: Format links for export
- **Dependencies**: None (pure function)
- **Exports**: `RLE.links.formatLinks(links, mode, sourcePage)`
- **Formats**:
  - `urls` - Comma-separated URLs
  - `text-url` - Text and URL pairs
  - `markdown` - Markdown list format
  - `csv` - CSV with name, url, source_page columns

#### `modules/links/filter.js` - Link Filter
- **Purpose**: Filter links by criteria
- **Dependencies**: None (pure function)
- **Exports**: `RLE.links.filterLinks(links, filterType, customValue, currentDomain)`
- **Filter Types**:
  - `all` - Show all links
  - `internal` - Same domain only
  - `external` - Different domains only
  - `custom` - Keyword/domain search

### UI Component Modules

#### `modules/ui/dialogs.js` - Dialogs
- **Purpose**: Modal dialogs for templates and clipboard fallback
- **Dependencies**: `toast`, `state`, `templates`
- **Exports**:
  - `RLE.ui.showTemplateSaveDialog()` - Save/edit template dialog
  - `RLE.ui.showFallbackCopyDialog(text)` - Manual copy dialog
- **Features**:
  - Template name validation
  - Duplicate name checking
  - Auto-run toggle

#### `modules/templates.js` - Template Management
- **Purpose**: CRUD operations for extraction templates
- **Dependencies**: `state`, `ui.showToast`
- **Exports**:
  - `RLE.templates.saveTemplate(name, autoRun)` - Create new template
  - `RLE.templates.updateTemplate(id, name, autoRun)` - Update existing
  - `RLE.templates.getTemplatesForDomain(domain)` - Retrieve templates
  - `RLE.templates.runTemplate(template, isAutoRunning)` - Execute template
- **Storage**: Chrome local storage (`chrome.storage.local`)
- **Template Structure**:
  ```javascript
  {
    id: "timestamp",
    name: "Template Name",
    domain: "example.com",
    autoRun: false,
    selectionRect: { left, top, right, bottom, width, height },
    exportMode: "csv",
    cleanUrls: true,
    currentFilter: "external",
    customFilterValue: "linkedin",
    createdAt: "ISO date",
    updatedAt: "ISO date"
  }
  ```

#### `modules/links/extractor.js` - Link Extractor
- **Purpose**: Extract links from selected region
- **Dependencies**: `urlUtils`, `filter`, `formatter`, `toast`, `state`, `ui.showResultsPanel`
- **Exports**: `RLE.links.extractLinks(selectionRect)`
- **Algorithm**:
  1. Query all `<a>` tags on page
  2. Check bounding box intersection with selection
  3. Extract text from multiple sources (innerText, aria-label, img alt, svg title)
  4. Normalize URLs with `urlUtils`
  5. Remove duplicates
  6. Apply filters if auto-run mode
  7. Show results panel or store for popup

#### `modules/ui/resultsPanel.js` - Results Panel
- **Purpose**: Display extracted links with controls
- **Dependencies**: `state`, `filter`, `formatter`, `toast`, `dialogs`
- **Exports**:
  - `RLE.ui.showResultsPanel(links)` - Display panel
  - `RLE.ui.closeResultsPanel()` - Remove panel
  - `RLE.ui.updateFilteredDisplay()` - Refresh filtered view
- **Features**:
  - Checkbox selection
  - Filter controls (all/internal/external/custom)
  - Toggle select/deselect all button
  - Copy to clipboard
  - Save/edit template buttons

#### `modules/ui/overlay.js` - Selection Overlay
- **Purpose**: Visual selection interface
- **Dependencies**: `state`, `links.extractLinks`, `ui.resultsPanel`, `ui.closeResultsPanel`
- **Exports**:
  - `RLE.ui.createOverlay()` - Show overlay
  - `RLE.ui.removeOverlay()` - Remove overlay
  - `RLE.ui.cancelSelection()` - Cancel and cleanup
- **Event Handlers**:
  - `mousedown` - Start selection
  - `mousemove` - Update selection box
  - `mouseup` - Complete selection and extract
  - `keydown (ESC)` - Cancel selection

### Multi-Page Extraction Modules (NEW)

#### `modules/links/containerDetector.js` - Container Detector
- **Purpose**: Detect common ancestor container for links
- **Dependencies**: None (pure functions)
- **Exports**: `RLE.links.detectContainer(linkElements)`
- **Algorithm**:
  1. Find common ancestor of all link elements
  2. Walk up DOM tree to find meaningful container (semantic tags or divs with meaningful classes)
  3. Generate robust CSS selector for container
  4. Prioritizes: main, article, section, nav, ul, ol, table, or divs with classes like "list", "grid", "items"
- **Use Case**: Enable "full list" extraction that works on entire container instead of viewport

#### `modules/ui/elementPicker.js` - Element Picker
- **Purpose**: Visual element picker for pagination buttons
- **Dependencies**: None (standalone)
- **Exports**:
  - `RLE.ui.elementPicker.start(callback)` - Start picker mode
  - `RLE.ui.elementPicker.stop()` - Stop picker mode
- **Features**:
  - Hover highlighting with blue outline
  - Element info tooltip showing tag, classes, text
  - Click to select element
  - ESC to cancel
  - Robust CSS selector generation (ID → class → aria-label → path)
- **Usage**: Called from template save dialog to mark pagination buttons

#### `modules/ui/multiPageProgress.js` - Multi-Page Progress
- **Purpose**: Show progress overlay during multi-page extraction
- **Dependencies**: `state`, `ui.showToast`
- **Exports**:
  - `RLE.ui.showMultiPageProgress(page, maxPages, linkCount)` - Show overlay
  - `RLE.ui.updateMultiPageProgress(page, maxPages, linkCount)` - Update progress
  - `RLE.ui.hideMultiPageProgress()` - Hide overlay
- **Features**:
  - Shows current page number and max pages
  - Displays total links collected so far
  - Animated progress bar
  - Cancel button (clears session state)

#### `modules/multiPage/navigationHandler.js` - Navigation Handler
- **Purpose**: Handle state persistence across page navigations
- **Dependencies**: `templates`, `ui.showToast`, `ui.hideMultiPageProgress`
- **Exports**:
  - `RLE.multiPage.setupNavigationContinuation()` - Prepare for navigation
  - `RLE.multiPage.resetNavigation()` - Reset state
- **Features**:
  - Auto-initializes on page load
  - Checks for pending multi-page state in `chrome.storage.local` (key: `rle_multiPageState`)
  - Resumes extraction on new page after navigation
  - Waits for content to stabilize (loading indicators, document.readyState)
- **Storage**: Uses `chrome.storage.local` to persist state across navigations (chrome.storage.session not available in content scripts)

#### Extended: `modules/templates.js` - Template Management
- **Updated Purpose**: CRUD operations + multi-page orchestration
- **New Dependencies**: Added `links.extractFromContainer`, `ui.showMultiPageProgress`, `ui.hideMultiPageProgress`, `multiPage.setupNavigationContinuation`
- **New Exports**:
  - `RLE.templates.runMultiPageTemplate(template, isAutoRunning)` - Multi-page orchestrator
  - `RLE.templates.extractCurrentPage(template, multiPageState)` - Extract single page
  - `RLE.templates.normalizeTemplate(template)` - Backward compatibility helper
- **Enhanced Template Structure**:
  ```javascript
  {
    // ... existing fields ...
    multiPage: false,                          // Enable multi-page extraction
    maxPages: 5,                               // Max pages to extract
    paginationSelector: null,                  // CSS selector for next button
    useContainerInsteadOfViewport: false,      // Full container extraction
    containerSelector: null,                   // CSS selector for container
    autoScroll: false,                         // Infinite scroll (future)
    maxScrollSteps: 10                         // Scroll limit (future)
  }
  ```
- **Multi-Page Flow**:
  1. Initialize state in `chrome.storage.session`
  2. Show progress overlay
  3. Extract from current page (container or region-based)
  4. Find and click "Next" button (saved selector or auto-detect)
  5. Wait for navigation to complete
  6. Resume extraction on new page
  7. Repeat until max pages or no next button
  8. Deduplicate and finalize results

#### Extended: `modules/links/extractor.js` - Link Extractor
- **New Exports**:
  - `RLE.links.extractFromContainer(containerSelector, template)` - Extract from container
  - `RLE.links.extractLinkElements(selectionRect)` - Extract DOM elements (for container detection)
- **Container Extraction**:
  - Queries all links within container element
  - Skips hidden links (offsetParent === null)
  - Uses same text extraction logic as region-based
  - Returns array of link objects

#### Extended: `modules/ui/dialogs.js` - Dialogs
- **New Features in Save Template Dialog**:
  - "Use full list" checkbox
  - "Enable multi-page extraction" checkbox
  - Max pages dropdown (2-20, default 5)
  - Pagination selector input
  - "Mark Button" to launch element picker
  - Container detection on save (when "use full list" enabled)
- **Container Detection**:
  - Extracts link DOM elements from last selection
  - Calls `RLE.links.detectContainer()`
  - Stores `containerSelector` in template
  - Shows warning if detection fails

### Orchestration Modules

#### `modules/messageHandler.js` - Message Handler
- **Purpose**: Route Chrome extension messages
- **Dependencies**: `state`, `ui.createOverlay`, `ui.cancelSelection`, `templates`
- **Exports**: `RLE.messageHandler.init()`
- **Messages**:
  - `PING` - Check if content script loaded
  - `START_SELECTION` - Begin manual selection
  - `CANCEL_SELECTION` - Cancel current selection
  - `RUN_TEMPLATE` - Execute saved template
  - `GET_TEMPLATES` - Retrieve templates for domain

#### `content.js` - Entry Point
- **Purpose**: Initialize content script
- **Dependencies**: All modules (loaded before this)
- **Action**: Calls `RLE.messageHandler.init()`

## Script Loading Order

Modules must be loaded in dependency order. Both `background.js` and `popup.js` load scripts using this sequence:

```javascript
const moduleFiles = [
  // Core utilities (no dependencies)
  "modules/state.js",
  "modules/urlUtils.js",
  "modules/ui/toast.js",

  // Data processing (depends on core)
  "modules/links/formatter.js",
  "modules/links/filter.js",
  "modules/links/containerDetector.js",        // NEW

  // UI components (depends on utilities)
  "modules/ui/dialogs.js",
  "modules/templates.js",
  "modules/links/extractor.js",
  "modules/ui/resultsPanel.js",
  "modules/ui/overlay.js",
  "modules/ui/elementPicker.js",               // NEW
  "modules/ui/multiPageProgress.js",           // NEW

  // Multi-page logic (depends on templates and UI)
  "modules/multiPage/navigationHandler.js",    // NEW

  // Orchestration (depends on everything)
  "modules/messageHandler.js",

  // Entry point (initializes everything)
  "content.js"
];

await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  files: moduleFiles
});
```

## Data Flow

### Manual Selection Flow

1. User clicks extension icon → `popup.html` opens
2. User configures settings and clicks "Start Selection"
3. `popup.js` loads modules into page via `chrome.scripting.executeScript`
4. `popup.js` sends `START_SELECTION` message to content script
5. `messageHandler` receives message, calls `ui.createOverlay()`
6. User draws selection rectangle on page
7. On mouse up, `overlay` calls `links.extractLinks()`
8. `extractor` finds intersecting links, calls `ui.showResultsPanel()`
9. User reviews, filters, and clicks "Copy to Clipboard"
10. `resultsPanel` calls `formatter`, copies to clipboard, shows toast

### Template Flow (Auto-run)

1. User saves template with auto-run enabled
2. On subsequent visit, user clicks template in popup
3. `popup.js` sends `RUN_TEMPLATE` message with `autoRun: true`
4. `templates.runTemplate()` sets `isAutoRun: true` in state
5. `links.extractLinks()` detects auto-run mode
6. Links are filtered and formatted automatically
7. Formatted text stored in `chrome.storage.local.pendingAutoCopy`
8. `popup.js` polls for `pendingAutoCopy`, copies to clipboard
9. Popup shows success message and closes

### Template Flow (Manual)

1. User clicks template without auto-run
2. Same flow as auto-run but `isAutoRun: false`
3. Results panel is shown for user review
4. User can filter, select, and copy manually

### Multi-Page Extraction Flow (NEW)

1. User saves template with multi-page enabled (checkbox + max pages)
2. Optionally marks pagination button using element picker
3. Template stores: `multiPage: true`, `maxPages`, `paginationSelector`, `useContainerInsteadOfViewport`, `containerSelector`
4. On template run, `runTemplate()` detects `multiPage: true`
5. Calls `runMultiPageTemplate()` instead of `extractLinks()`
6. **Page 1**:
   - Initialize `multiPageState` in `chrome.storage.local` (key: `rle_multiPageState`)
   - Show progress overlay (page 1 of N)
   - Extract links (container or region-based)
   - Add to `allResults` array
   - Find pagination button (saved selector or auto-detect)
7. **Navigation**:
   - Click "Next" button
   - Store updated `multiPageState` in local storage
   - Wait for page load
8. **Page 2-N**:
   - `navigationHandler` detects pending `rle_multiPageState` on load
   - Waits for content to stabilize
   - Loads template from storage
   - Calls `extractCurrentPage()` with accumulated `multiPageState`
   - Updates progress overlay
   - Repeats steps 7-8 until max pages or no next button
9. **Finalization**:
   - Deduplicate links by URL (across all pages)
   - Apply filters
   - Format results
   - Clear `rle_multiPageState` from local storage
   - Hide progress overlay
   - Show results panel or copy (depending on auto-run)

**Cancel Flow**:
- User clicks Cancel button in progress overlay
- Clears `rle_multiPageState` from local storage
- Hides overlay
- Shows toast "Multi-page extraction cancelled"
- Does not navigate further

## Storage

### Chrome Sync Storage (`chrome.storage.sync`)
- `exportMode` - User's preferred export format
- `cleanUrls` - User's URL cleaning preference

### Chrome Local Storage (`chrome.storage.local`)
- `templates` - Array of saved templates (with multi-page settings)
- `pendingAutoCopy` - Temporary storage for auto-run results

### Multi-Page State Storage (NEW)
- `rle_multiPageState` - Temporary state for multi-page extraction (stored in `chrome.storage.local`)
  - `templateId` - ID of template being run
  - `currentPage` - Current page number
  - `maxPages` - Maximum pages to extract
  - `allResults` - Accumulated links from all pages
  - `isRunning` - Whether extraction is active
  - `isAutoRunning` - Whether this is auto-run mode
- **Storage Location**: `chrome.storage.local` (not `chrome.storage.session` - that's not accessible from content scripts)
- **Lifetime**: Persists across page navigations, manually cleared on completion or cancel
- **Purpose**: Enable state continuity during multi-page navigation

## Extension Components

### `manifest.json` - Extension Manifest
- Manifest version: 3
- Permissions: `activeTab`, `scripting`, `storage`, `clipboardWrite`
- Host permissions: `<all_urls>`
- Keyboard command: `Alt+Shift+S` (start selection)

### `background.js` - Service Worker
- Handles extension installation
- Listens for keyboard command (`Alt+Shift+S`)
- Loads content scripts and starts selection

### `popup.js` - Popup Script
- Manages popup UI state
- Loads templates for current domain
- Handles start selection button
- Handles template clicks (manual and auto-run)
- Polls for auto-run results

### `popup.html` - Popup UI
- Export format radio buttons
- Clean URLs checkbox
- Start selection button
- Templates list (dynamic)

### `content.css` - Content Styles
- Styles for overlay, selection box, results panel
- Styles for dialogs, toasts, filter controls
- Uses CSS classes prefixed with `rle-`

## Development Guide

### Adding a New Export Format

1. Update `modules/links/formatter.js`:
   - Add new case in `formatLinks()` switch statement
2. Update `popup.html`:
   - Add new radio button option
3. Update `modules/ui/overlay.js` and `modules/ui/resultsPanel.js`:
   - Add format name to `exportModeNames` object

### Adding a New Filter Type

1. Update `modules/links/filter.js`:
   - Add new case in `filterLinks()` switch statement
2. Update `modules/ui/resultsPanel.js`:
   - Add filter button in `showResultsPanel()`

### Adding a New Module

1. Create module file in appropriate directory
2. Use IIFE pattern and export to `window.RLE` namespace
3. Update loading order in `background.js` and `popup.js`
4. Ensure dependencies are loaded before your module

### Debugging

- All modules preserve `console.log` statements for debugging
- Check browser console for `[RegionLinks]` prefixed messages
- Use Chrome DevTools to inspect injected content scripts
- Test in Chrome's Extensions page with "Developer mode" enabled

### Testing Checklist

**Basic Features:**
- [ ] Region selection works
- [ ] All export formats work (urls, text-url, markdown, csv)
- [ ] All filter types work (all, internal, external, custom)
- [ ] URL cleaning removes tracking parameters
- [ ] Duplicate URLs are removed
- [ ] Template save/edit works
- [ ] Template delete works
- [ ] Auto-run templates extract and copy automatically
- [ ] Manual templates show results panel
- [ ] Keyboard shortcut (Alt+Shift+S) works
- [ ] Extension works on various websites
- [ ] No errors in console

**Multi-Page Features (NEW):**
- [ ] "Use full list" checkbox detects container correctly
- [ ] Container extraction works (extracts all links in container)
- [ ] Element picker launches and highlights elements on hover
- [ ] Element picker captures pagination button selector on click
- [ ] ESC cancels element picker
- [ ] Multi-page checkbox toggles settings visibility
- [ ] Max pages dropdown saves correctly
- [ ] Templates save with multi-page settings
- [ ] Multi-page extraction shows progress overlay
- [ ] Progress overlay updates (page count, link count, progress bar)
- [ ] Auto-detect finds "Next" button on common pagination styles
- [ ] Manual pagination selector works (saved selector is used)
- [ ] Extraction continues across page navigation (2-3 pages)
- [ ] Links are deduplicated across all pages
- [ ] Cancel button stops multi-page extraction
- [ ] Session state clears after completion
- [ ] Session state clears after cancel
- [ ] Multi-page works with auto-run templates
- [ ] Multi-page works with manual templates
- [ ] Container + multi-page combination works
- [ ] Error handling when pagination button not found
- [ ] Error handling when container not found (fallback to region)

## Browser Compatibility

- **Chrome**: 88+ (Manifest V3 support)
- **Edge**: 88+ (Chromium-based)
- **Brave**: Latest version (Chromium-based)
- **Opera**: Latest version (Chromium-based)

**Not compatible with Firefox** (uses different extension API and manifest structure)

## Security Considerations

- **Content Security**: Content scripts run in isolated world, cannot access page variables
- **Permissions**: Minimal required permissions (`activeTab`, `scripting`, `storage`, `clipboardWrite`)
- **Input Validation**: Template names validated for duplicates
- **URL Handling**: Malformed URLs handled gracefully with try-catch
- **XSS Protection**: No `innerHTML` with user input, only with sanitized static strings

## Performance Considerations

- **Lazy Loading**: Content scripts loaded only when needed
- **Event Delegation**: Minimal event listeners, cleaned up after use
- **DOM Queries**: Efficient selectors, minimal reflows
- **Storage**: Local storage for templates, sync storage for preferences
- **Duplicate Removal**: Uses Set for O(n) complexity

## Known Limitations

- Cannot run on `chrome://` or `chrome-extension://` pages (browser restriction)
- Links must be visible (non-zero dimensions) to be detected
- Very large pages (1000+ links) may take a moment to process
- Template coordinates are viewport-relative, may need adjustment if page layout changes
- Auto-run templates don't show progress for single-page extraction, may seem unresponsive on slow pages

### Multi-Page Specific Limitations:

- **Rate Limiting**: Some sites may detect and block rapid page navigation
- **Dynamic Pagination**: Sites with JavaScript-heavy pagination may not work reliably
- **Container Detection**: May not find optimal container for complex DOM structures
- **Navigation Timing**: Fixed wait times (500ms) may not be enough for very slow pages
- **Session State**: Multi-page state lost if user closes/refreshes tab during extraction
- **URL Changes**: Pagination that changes URL parameters works better than hash-based navigation
- **Maximum Pages**: Hard limit of 20 pages to prevent infinite loops and excessive resource use

## Future Enhancements

- **Auto-scroll for infinite scroll pages** (currently planned, not yet implemented)
- Export to file (JSON, CSV download)
- Import/export templates
- Template sharing
- Link preview on hover
- Screenshot of selected region
- Multi-region selection
- Regex-based filtering
- Custom export format templates
- Link metadata extraction (title, description)
- Configurable wait times for multi-page navigation
- Smart pagination detection improvements
- URL tracking to detect circular pagination

## Contributing

When contributing to this codebase:

1. Maintain the IIFE module pattern
2. Export public APIs to `window.RLE` namespace
3. Update loading order if adding new dependencies
4. Preserve all `console.log` debugging statements
5. Keep CSS classes prefixed with `rle-`
6. Update this documentation for major changes
7. Test thoroughly across different websites
8. Ensure no breaking changes to existing functionality

## License

See LICENSE file for details.

## Support

For issues, feature requests, or questions:
- GitHub Issues: [Repository URL]
- Documentation: This file and README.md
