# Webcomic Tracker (Reread)

A small browser extension to track the last-read chapter of webcomics locally.

## Usage

- Click the extension icon to open the popup.
- Add a series title and chapter, optionally an URL.
- Use Export to download a `.json` backup and Import to load a backup (merge rules: newer entries by `updatedAt` win).

## Notes

- Data is stored using `chrome.storage.local` and never sent to any server.
- This repo uses a simple TypeScript + esbuild setup for fast builds.

## Future Ideas

- Chapter increment/decrement button 
- Better UI 
- Parsing URLs so series name and current chapter can be automatically added
    - Adaptation from multiple sources/websites 
