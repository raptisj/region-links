# RegionLinks

A Chrome extension that allows you to select a rectangular region on any web page and extract all links within that region. Export the links in multiple formats: URLs only, Text + URL, Markdown list, or CSV.

## Features

- **Visual Region Selection**: Click and drag to select any rectangular area on a web page
- **Multiple Export Formats**:
  - URLs only (one per line)
  - Text + URL (tab-separated)
  - Markdown list format
  - CSV format (with proper escaping)
- **Interactive Results Panel**: Review and deselect links before copying
- **Keyboard Support**: Press ESC to cancel selection at any time
- **Settings Persistence**: Your preferred export format is remembered
- **Clean UI**: Minimal, intuitive interface that doesn't interfere with web pages

## Installation & Testing

### Method 1: Load Unpacked Extension (For Local Testing)

1. **Clone or download this repository** to your local machine

2. **Generate high-quality icons** (optional, for better appearance):

   The extension includes placeholder icons, but for best quality:

   - Open `icons/convert-svg-to-png.html` in your browser
   - Click "Download All Icons"
   - Replace the placeholder PNG files in the `icons/` folder

   This converts the SVG icon to properly sized PNGs for the toolbar and extensions page.

3. **Open Chrome Extensions Page**:

   - Open Chrome browser
   - Navigate to `chrome://extensions/`
   - Or click the three-dot menu → More Tools → Extensions

4. **Enable Developer Mode**:

   - Toggle the "Developer mode" switch in the top-right corner

5. **Load the Extension**:

   - Click "Load unpacked" button
   - Navigate to and select the `region_link_extract` folder
   - The extension should now appear in your extensions list

6. **Test the Extension**:
   - Navigate to any web page with links (e.g., news sites, GitHub, Wikipedia)
   - Click the extension icon in your Chrome toolbar
   - Select your preferred export format
   - Click "Start Region Selection"
   - Draw a rectangle over an area containing links
   - Review the extracted links in the results panel
   - Click "Copy to Clipboard" to copy the links

### Method 2: Keyboard Shortcut (Optional)

You can assign a keyboard shortcut to quickly activate the extension:

1. Go to `chrome://extensions/shortcuts`
2. Find "RegionLinks"
3. Click the pencil icon and assign a shortcut (e.g., `Ctrl+Shift+L` or `Cmd+Shift+L`)

## How to Use

### Basic Usage

1. **Click the extension icon** in your Chrome toolbar
2. **Choose your export format** (URLs only, Text + URL, Markdown, or CSV)
3. **Click "Start Region Selection"**
4. **Draw a rectangle** by clicking and dragging on the web page
5. **Review the extracted links** in the results panel
6. **Copy to clipboard** or adjust your selection

### Export Format Examples

**URLs Only (comma-separated):**

```
https://example.com/page1, https://example.com/page2, https://example.com/page3
```

**Text + URL (tab-separated):**

```
Link Text 1    https://example.com/page1
Link Text 2    https://example.com/page2
Link Text 3    https://example.com/page3
```

**Markdown List:**

```markdown
- [Link Text 1](https://example.com/page1)
- [Link Text 2](https://example.com/page2)
- [Link Text 3](https://example.com/page3)
```

**CSV:**

```csv
"Text","URL"
"Link Text 1","https://example.com/page1"
"Link Text 2","https://example.com/page2"
"Link Text 3","https://example.com/page3"
```

### Tips

- Press **ESC** at any time to cancel the selection
- Use **Select All** / **Deselect All** buttons to quickly manage your selection
- The extension remembers your preferred export format
- Links are detected based on their visual position on the page
- Hidden links (display: none) are automatically filtered out

## Limitations

- **Chrome Internal Pages**: The extension cannot run on Chrome's internal pages (chrome://, chrome-extension://)
- **Iframes**: Links inside iframes are not detected in the current version
- **Dynamic Content**: Content loaded after page load might require a new selection

## File Structure

```
region_link_extract/
├── manifest.json           # Extension configuration
├── background.js           # Background service worker
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic and messaging
├── content.js             # Main content script (selection & extraction)
├── content.css            # Styles for overlay and results panel
├── icons/                 # Extension icons
│   ├── icon16.png         # 16x16 toolbar icon
│   ├── icon48.png         # 48x48 extensions page icon
│   ├── icon128.png        # 128x128 web store icon
│   ├── icon.svg           # Source SVG file
├── instructions.md        # Development plan
└── README.md             # This file
```

## Development

### Technologies Used

- **Manifest V3**: Latest Chrome extension format
- **Vanilla JavaScript**: No external dependencies
- **CSS3**: Modern styling with flexbox
- **Chrome APIs**: storage, scripting, tabs, runtime

### Key Components

1. **Popup** (`popup.html`, `popup.js`):

   - User interface for selecting export mode
   - Triggers content script injection

2. **Content Script** (`content.js`, `content.css`):

   - Creates overlay for region selection
   - Detects link intersections using `getBoundingClientRect()`
   - Manages results panel
   - Handles clipboard operations

3. **Background Worker** (`background.js`):
   - Minimal service worker for extension lifecycle
   - Sets default preferences on install

### How Link Detection Works

1. User draws a rectangle on the page
2. Get all `<a>` elements with `href` attributes
3. For each link, get its bounding rectangle via `getBoundingClientRect()`
4. Check if the link's rectangle intersects with the selection rectangle
5. Filter out hidden elements (zero width/height)
6. Extract link text and URL
7. Display results in a floating panel

## Publishing to Chrome Web Store

To publish this extension to the Chrome Web Store:

1. **Create a Chrome Web Store Developer Account**:

   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Pay the one-time $5 registration fee

2. **Prepare Your Extension Package**:

   - Ensure all files are finalized
   - Test thoroughly on different websites
   - Create high-quality icons (use the provided generators)
   - Prepare promotional images:
     - Small promo tile: 440x280 pixels
     - Large promo tile: 920x680 pixels (optional)
     - Marquee promo tile: 1400x560 pixels (optional)
     - Screenshots: 1280x800 or 640x400 pixels

3. **Create a ZIP Package**:

   ```bash
   cd region_link_extract
   zip -r regionlinks.zip . -x "*.git*" -x "*.DS_Store" -x "instructions.md"
   ```

4. **Upload to Chrome Web Store**:

   - Go to the Developer Dashboard
   - Click "New Item"
   - Upload the ZIP file
   - Fill in the required fields:
     - Description
     - Category: Productivity
     - Language: English
     - Screenshots
     - Privacy policy (if collecting data)
   - Set pricing (free or paid)
   - Select target countries/regions

5. **Submit for Review**:

   - Review all information
   - Click "Submit for review"
   - Wait for Chrome Web Store review (typically 1-3 days)

6. **Post-Publication**:
   - Monitor reviews and user feedback
   - Respond to user questions
   - Update the extension as needed (users get automatic updates)

### Privacy Policy Note

This extension:

- Does NOT collect any user data
- Does NOT send any information to external servers
- Only uses `chrome.storage.sync` to save user preferences locally
- Only accesses page content when explicitly activated by the user

You should include this information in your Chrome Web Store listing.

## Troubleshooting

### Extension doesn't appear in toolbar

- Go to `chrome://extensions/` and verify the extension is enabled
- Click the puzzle icon in the toolbar and pin "RegionLinks"

### "Could not access current tab" error

- Make sure you're not on a Chrome internal page (chrome://, chrome-extension://)
- Try refreshing the web page

### Selection doesn't start

- Make sure the extension has loaded properly
- Check the browser console for errors (F12 → Console)
- Try reloading the extension from `chrome://extensions/`

### Links not detected

- Ensure the links are visible on the page (not hidden)
- Try making your selection area larger
- Some links might be inside iframes (not currently supported)

### Clipboard copy fails

- Grant clipboard permissions when prompted
- If automatic copy fails, a fallback dialog will appear with the text to copy manually

## Future Enhancements

Potential features for future versions:

- Support for links inside iframes
- Advanced filtering (by domain, file type, etc.)
- Sorting options (visual order, alphabetical, etc.)
- URL normalization (strip tracking parameters, etc.)
- Highlight detected links on the page
- Export to file (instead of just clipboard)
- Batch processing multiple selections
- Custom keyboard shortcuts
- Dark mode
- Internationalization (i18n)

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - Feel free to use, modify, and distribute this extension.

## Support

If you encounter any issues or have suggestions:

1. Check the Troubleshooting section above
2. Open an issue on GitHub
3. Provide details about your Chrome version and the website where you encountered the issue

## Acknowledgments

Built following Chrome Extension Manifest V3 best practices and the specifications outlined in `instructions.md`.

---

**Version**: 1.0.0
**Last Updated**: December 2025
**Compatible With**: Chrome 88+
