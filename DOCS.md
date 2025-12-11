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
    ├── templates.js        - Template CRUD operations
    ├── ui/
    │   ├── overlay.js      - Selection overlay
    │   ├── resultsPanel.js - Results display
    │   ├── dialogs.js      - Modal dialogs
    │   └── toast.js        - Toast notifications
    └── links/
        ├── extractor.js    - Link extraction logic
        ├── filter.js       - Link filtering
        └── formatter.js    - Export format generation
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

  // UI components (depends on utilities)
  "modules/ui/dialogs.js",
  "modules/templates.js",
  "modules/links/extractor.js",
  "modules/ui/resultsPanel.js",
  "modules/ui/overlay.js",

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

## Storage

### Chrome Sync Storage (`chrome.storage.sync`)
- `exportMode` - User's preferred export format
- `cleanUrls` - User's URL cleaning preference

### Chrome Local Storage (`chrome.storage.local`)
- `templates` - Array of saved templates
- `pendingAutoCopy` - Temporary storage for auto-run results

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
- Auto-run templates don't show progress, may seem unresponsive on slow pages

## Future Enhancements

- Export to file (JSON, CSV download)
- Import/export templates
- Template sharing
- Link preview on hover
- Screenshot of selected region
- Multi-region selection
- Regex-based filtering
- Custom export format templates
- Link metadata extraction (title, description)

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
