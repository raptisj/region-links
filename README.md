# RegionLinks

A Chrome extension that allows you to select a rectangular region on any web page and extract all links within that region. Perfect for sales prospecting, research, and content curation. Export links in multiple formats optimized for CRMs, emails, and documentation.

**NEW: Saved Extraction Templates** - Save your extraction settings per website. Auto-run templates extract and copy with one click (no results panel). Manual templates show results for review. Transform 30-second workflows into 2 seconds!

## Examples

### URLs only
https://github.com/user-attachments/assets/5231cbdf-70b5-4095-bcb1-683efe0b149a

### Text + URL
https://github.com/user-attachments/assets/355c381c-c9cd-45a9-8fc2-a07c67da5eca

### Markdown
https://github.com/user-attachments/assets/0dee52b6-9b62-49a1-9a1f-464208cc352a

### CSV
https://github.com/user-attachments/assets/50a4a85a-b768-4e4d-853c-e83324067240


## Features

- **Visual Region Selection**: Click and drag to select any rectangular area on a web page
- **Multiple Export Formats**:
  - URLs only (comma-separated)
  - Text + URL (dash-separated, ideal for quick emails)
  - Markdown list format (perfect for documentation)
  - CSV format (CRM-ready with name, url, source_page columns)
- **URL Normalization**: Optional feature to strip tracking parameters (utm\_\*, gclid, fbclid, etc.) for cleaner URLs
- **Smart Filtering**: Filter extracted links by internal/external domains or custom keywords
- **Saved Extraction Templates**: Save your extraction settings and auto-run them on future visits (Premium feature)
- **Interactive Results Panel**: Review, filter, and deselect links before copying
- **Keyboard Shortcuts**: Press Alt+Shift+S to instantly start selection, ESC to cancel
- **Settings Persistence**: Your preferred export format and settings are remembered
- **Clean UI**: Minimal, intuitive interface that doesn't interfere with web pages

## How to Use

### Basic Usage

1. **Click the extension icon** in your Chrome toolbar
2. **Choose your export format** (URLs only, Text + URL, Markdown, or CSV)
3. **(Optional) Enable "Clean URLs"** to strip tracking parameters
4. **Click "Start Region Selection"**
5. **Draw a rectangle** by clicking and dragging on the web page
6. **Review the extracted links** in the results panel
7. **(Optional) Apply filters** to show only internal, external, or specific links
8. **(Optional) Save as Template** to reuse this extraction on future visits
9. **Copy to clipboard** or adjust your selection

### Keyboard Shortcut

For power users, press **Alt+Shift+S** (or **Option+Shift+S** on Mac) to instantly start selection mode on the current page. The extension will:
- Use your last selected export format
- Apply your "Clean URLs" setting if enabled
- Start selection immediately without opening the popup

This is perfect for rapid workflow when extracting links from multiple pages.

### Clean URLs Feature

When enabled, the "Clean URLs" setting automatically removes common tracking parameters from extracted links:

- **UTM parameters**: utm_source, utm_medium, utm_campaign, utm_term, utm_content, utm_id, and extended UTM parameters
- **Google**: gclid, gclsrc, dclid, gbraid, wbraid, \_ga, \_gl
- **Facebook/Meta**: fbclid, fb_action_ids, fb_action_types, fb_source, fb_ref
- **Microsoft/Bing**: msclkid, mscrid
- **Social Media**: ttclid (TikTok), twclid (Twitter/X), igshid (Instagram), li_fat_id/li_source_id (LinkedIn)
- **Marketing Automation**: HubSpot (\_hsenc, \_hsmi, **hssc, **hstc, \_\_hsfp), Marketo (mkt_tok), Adobe (s_cid)
- **Email Marketing**: Mailchimp (mc_cid, mc_eid), Klaviyo (\_kx), Omnisend, Campaign Monitor, Drip
- **Affiliate Tracking**: aff_id, affiliate_id, click_id, clickid, zanpid
- **General**: ref, referrer, source, campaign, sid, ssid
- **URL formatting**: Removes trailing slashes from paths

This feature covers 70+ tracking parameters from major platforms and is useful for:

- Creating cleaner link collections for documentation
- Deduplicating links that differ only by tracking parameters
- Sharing links without exposing marketing campaign data

### Link Filtering

After extracting links, you can filter them in the results panel:

- **All**: Show all extracted links (default)
- **Internal**: Show only links to the same domain as the current page
- **External**: Show only links to different domains
- **Custom Filter**: Type any keyword or domain to filter links by text or URL

This is perfect for:
- **Sales/Prospecting**: Extract only external partner/vendor links from a company's website
- **SEO Analysis**: Quickly identify internal vs external link distribution
- **Research**: Filter by specific domains (e.g., "linkedin.com" to find all LinkedIn profiles)
- **Content Curation**: Find links matching specific topics or keywords

The count updates dynamically to show filtered results vs. total extracted links.

### Saved Extraction Templates (Power Feature)

Save time by creating reusable extraction templates. This feature is perfect for repetitive link extraction tasks.

#### How It Works:

1. **Extract links once** using region selection
2. **Apply your filters** (internal/external/custom keywords)
3. **Click "Save as Template"** in the results panel
4. **Name your template** (e.g., "Company Directory Extract", "LinkedIn Search Results")
5. **Enable auto-run** (optional) to automatically extract on future visits

#### What Gets Saved:

- Selected region coordinates
- Export format (CSV, Markdown, Text+URL, etc.)
- URL cleaning settings
- Applied filters (internal/external/custom)
- Current page domain

#### Using Templates:

**Manual Run:**
- Open the extension popup on the same website
- See your saved templates listed
- Click any template to run it instantly
- After running, click "Edit Template" to modify settings (including enabling auto-run)

**Auto-Run (Premium):**
- Enable "Auto-run this template when I visit this site" when saving
- Open extension popup → click template → links extract and copy automatically (no results panel!)
- One-click workflow: open popup → click template → done (copied to clipboard)
- Manual templates still show results panel for review/filtering
- Perfect for rapid data collection workflows

**Editing Templates:**
- Run any template manually from the popup
- In the results panel, click "Edit Template" (instead of "Save as Template")
- Update the name or toggle auto-run on/off
- Click "Update Template" to save changes
- Template names must be unique per domain

#### Perfect For:

- **Sales Prospecting**: Save templates for company directories, vendor lists, partner pages
- **Recruiting**: Extract LinkedIn profiles, job boards, company team pages
- **Research**: Automated data collection from regularly updated sources
- **SEO/Link Building**: Monitor competitor backlinks, directory listings
- **Content Curation**: Collect links from news sites, blogs, resource pages

**Example Workflow:**
1. Visit a company's partner directory page
2. Extract all partner company links (review the results)
3. Save as "Acme Partners Template" (without auto-run initially to test)
4. Test the template by clicking it in the popup
5. Click "Edit Template" → enable auto-run → update
6. Next time you visit that page:
   - Open extension popup
   - Click "Acme Partners Template"
   - Links copy to clipboard instantly (no results panel)
7. Paste directly into your CRM!

**Converting Manual to Auto-Run:**
Already have templates saved? Just run them from the popup, then click "Edit Template" to enable auto-run. No need to recreate them!

**The Power of Auto-Run:**
With auto-run enabled, clicking a template in the popup instantly extracts and copies links without showing the results panel. This transforms a 30-second manual task (open extension → start selection → drag rectangle → review → copy) into a **2-second workflow** (open popup → click template → done)!

### Export Format Examples

**URLs Only (comma-separated):**

```
https://example.com/page1, https://example.com/page2, https://example.com/page3
```

**Text + URL (dash-separated):**

```
Link Text 1 - https://example.com/page1
Link Text 2 - https://example.com/page2
Link Text 3 - https://example.com/page3
```

**Markdown List:**

```markdown
- [Link Text 1](https://example.com/page1)
- [Link Text 2](https://example.com/page2)
- [Link Text 3](https://example.com/page3)
```

**CSV (CRM-ready format):**

```csv
name,url,source_page
Link Text 1,https://example.com/page1,https://example.com/source-page
Link Text 2,https://example.com/page2,https://example.com/source-page
Link Text 3,https://example.com/page3,https://example.com/source-page
```

Perfect for importing into CRMs, spreadsheets, and outreach tools. The `source_page` column automatically captures where the links were extracted from.

### Tips

- Press **Alt+Shift+S** to quickly start selection mode without opening the popup
- Press **ESC** at any time to cancel the selection
- **Save templates** for sites you visit regularly to automate link extraction
- **Edit templates** by running them from the popup, then click "Edit Template" to modify settings
- Enable **auto-run** on templates for instant extraction and copy (no results panel)
- **Auto-run templates** copy directly when clicked - manual templates show results panel
- Template names must be **unique per domain** to avoid confusion
- Use **Smart Filtering** to narrow down results by internal/external links or custom keywords
- Use the **Select All / Deselect All** toggle button to quickly manage your selection
- The extension remembers your preferred export format and settings
- Enable **"Clean URLs"** to automatically strip 70+ tracking parameters from Google, Facebook, email marketing platforms, and more
- Links are detected based on their visual position on the page
- Hidden links (display: none) are automatically filtered out
- Duplicate URLs are automatically removed from results
- Click the **×** next to any template in the popup to delete it

---

**Version**: 1.0.0
**Last Updated**: December 2025
**Compatible With**: Chrome 88+
