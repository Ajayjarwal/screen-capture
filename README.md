# Screen Capture

A Chrome extension for capturing long pages and published Google Sheets. Current version: **1.3.0**.

## Features

- Full-page capture for long question banks and solutions.
- Published Google Sheets capture, including embedded panels and off-screen columns.
- Fast capture with optional longer waits for slowly loaded content.
- PNG, JPEG, A4 PDF and single tall PDF exports.
- A4 page breaks that favour clear gaps between text lines.
- Export side trimming, local capture history, clipboard and printing.

## Install

1. Select **Code → Download ZIP** on this repository, then extract the ZIP.
2. Open `chrome://extensions` in Google Chrome.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose the extracted folder containing `manifest.json`.
5. Pin **PYQ Capture** from Chrome's extensions menu.

Keep the extracted folder in a permanent location. Chrome loads the extension from that folder.

## Use

Open the question page or published sheet and load the content you want included. Click the extension and choose **Capture full page**. Keep the source tab selected and its Chrome window in front until the preview opens.

For a published spreadsheet, select **Google Sheets · published sheet, all columns**, or use **Auto-detect**. Capture saves the active worksheet; switch worksheet tabs and capture separately for additional sheets.

Open all questions and explanations before starting. The extension does not click quiz answers or “Next”. Review the first and last rows/questions in the preview before exporting.

## Privacy and limits

Screenshots and page title/URL metadata stay in extension-local browser storage. There are no analytics, uploads or remote scripts. Permissions are limited to `activeTab`, `scripting`, `storage`, `downloads` and `clipboardWrite`.

PDFs contain screenshot images, so text is not selectable/searchable. Page-break detection is best effort for continuous images without clear gaps. Editable/private Google Sheets and unrelated cross-origin frames are not supported. Extremely long or wide captures have browser memory and safety limits.

See [full instructions](README.txt) for capture options, limits and troubleshooting, and [verification notes](TESTING.txt) for the tested scenarios.

This is an independent implementation and does not use FireShot branding or code.
