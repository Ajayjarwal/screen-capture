PYQ CAPTURE 1.3 - recreated 23 November 2026

INSTALL
1. Extract PYQ-Capture.zip. Keep the extracted folder somewhere permanent.
2. Open chrome://extensions in Google Chrome.
3. Turn on Developer mode.
4. Click Load unpacked and choose the PYQ-Capture folder containing manifest.json.
5. Pin PYQ Capture from Chrome's puzzle-piece menu.

Do not delete or move the extracted folder after installation. Chrome loads
the extension from that location. The ZIP can be kept as a backup.

USE WITH DR. SHIVIN PYQS
Open https://www.drshivin.com/prelims_pyq_practice and navigate to your quiz
summary. Open all questions and explanations first. Click the extension,
select Fast for already-loaded questions, and click Capture full page.
Keep the source tab selected and its Chrome window in front. Do not scroll,
resize, zoom, or navigate during capture. The preview opens when finished.
Select A4 PDF (breaks between text lines), a single tall PDF, PNG, or JPEG.

PUBLISHED GOOGLE SHEETS
Open the published Google Sheets link in Chrome. Auto-detect recognizes
Google's embedded published-sheet panel. You may also explicitly choose
Google Sheets - published sheet, all columns. Capture includes the active
sheet's full width and height, including columns outside the visible window.
Select another worksheet tab and capture again to save that worksheet.
The embedded frame must have loaded before capture. Private/editable Sheets
and unrelated cross-origin frames are not supported by this mode.
Very wide sheets are easier to review as PNG or a tall PDF with zoom.
Use side trimming to remove unused blank columns from the exports.

FEATURES
- Full page, automatic scrolling-panel detection, CSS selector panel, visible area.
- Fast, Balanced, Careful, and Slow connection modes with identical image quality.
- Loading waits for visible images and bottom-of-page content.
- Optional hiding of fixed/sticky bars, with scroll and style restoration.
- Local capture history, stop and retain progress, side trimming for exports.
- A4 pagination favouring clear gaps, also for printing and older captures.
- Long PNG/JPEG exports split into numbered parts. Clipboard for smaller images.

LIMITS
Capture includes rendered content only. It does not click Next, answer quiz
questions, open collapsed explanations, or bypass access restrictions.
Cross-origin iframe interiors, PDF viewers, Chrome internal pages, the Chrome
Web Store, and some unusual virtualized layouts are not supported.
Ordinary webpages capture visible columns only. Published Google Sheets mode
captures all columns. For exceptionally wide sheets, zoom out before capture
if the browser reports a width or memory limit.
A4 breaks are best effort for diagrams or overlapping text with no clear gap;
the export reports detected no-gap boundaries. Long questions can continue
on the next page. Single tall PDF avoids physical page breaks.
PDFs contain screenshot images: text is not searchable/selectable.
Image parts are at most 12,000 pixels high or 24 million pixels each.
Safety limits: 600 sections, 1,500 screenshots, 500,000 page pixels, or
300 MB of PNG sections. Full-width sheet strips are limited to 24 million
pixels and 32,760 pixels wide; zoom out before capture if needed.
Browser storage may impose a lower limit. Partial captures can be exported.
If the preview closes unexpectedly, temporary page changes clear after about
30 seconds while the source tab runs, or on reloading the source.
For local HTML, enable Allow access to file URLs in extension details.

PRIVACY
No account, uploads, analytics, remote code, or external library is required.
Screenshots and title/URL metadata stay in extension-local browser storage.
Permissions: activeTab, scripting, storage, downloads, clipboardWrite.
The website itself may load images and questions normally while scrolling.

This recreation restores the extension functionality, not deleted captures
or PDFs. It is independent of FireShot and has no GIF, cloud-upload, email,
OneNote delivery, or annotation tools.
