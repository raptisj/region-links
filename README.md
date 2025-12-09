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

---

**Version**: 1.0.0
**Last Updated**: December 2025
**Compatible With**: Chrome 88+
