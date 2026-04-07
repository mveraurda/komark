# KoMark

Mac desktop app (Electron) that connects to a jailbroken Kindle running KOReader via WiFi/SFTP and displays reading statistics.

## Stack

- **Electron 24.8.8** — app shell (NOT electron-builder, use electron-packager)
- **React + Vite** — renderer/UI
- **sql.js** (WASM) — reads KOReader's statistics.sqlite3
- **ssh2-sftp-client** — SFTP connection to Kindle SSH server
- **TailwindCSS directives present but unused** — styling is CSS custom properties + utility classes in index.css

## Build

```bash
npm run build        # full build + package + DMG
npm run build-renderer  # vite build only
npm run build-main      # copies electron/ to dist-electron/
```

The build script packages with electron-packager and creates a DMG via `scripts/make-dmg.js`.

After building, install manually:
```bash
rm -rf /Applications/KoMark.app
cp -r release/KoMark-darwin-arm64/KoMark.app /Applications/KoMark.app
```

## Project Structure

```
electron/
  main.js       — IPC handlers, sync timer, app lifecycle
  preload.js    — contextBridge API exposed to renderer
  sftp.js       — SFTP sync, cover extraction, annotations, vocab
  db.js         — sql.js queries for stats DB; Node native SQLite for vocab
src/
  App.jsx       — root, data loading, sync coordination, toast system
  components/
    Sidebar.jsx   — nav + sync button with stage labels
    HeatMap.jsx   — reading activity heatmap
    BookCover.jsx — shared cover component (card/detail/small sizes)
  views/
    Welcome.jsx    — onboarding screen shown on first launch (no host configured)
    Today.jsx      — streak, current book, daily stats
    Library.jsx    — book grid with search, detail view, highlights, sessions chart
    Stats.jsx      — heatmap, monthly bars, day-of-week bars, top books
    Vocabulary.jsx — looked-up words with context + Merriam-Webster lookup
    Settings.jsx   — device IP, SSH credentials, SSH key path, Find Kindle
assets/
  icon.icns         — app icon (transparent bg, generated from icon_1024x1024.png)
  icon_1024x1024.png — source icon with transparent background
```

## Kindle Connection

- **SSH port:** 2222
- **Username:** root
- **Password:** none (uses SSH key `~/.ssh/id_ed25519`)
- **Key auto-detection order:** id_ed25519 → id_rsa → id_ecdsa (or custom path via Settings)
- **Key must be in** `/mnt/us/koreader/settings/SSH/authorized_keys` on Kindle
- **Stats DB path:** `/mnt/us/koreader/settings/statistics.sqlite3`
- **Vocab DB path:** `/mnt/us/koreader/settings/vocabulary_builder.sqlite3`
- **Book files:** `/mnt/us/books/` (organized in subfolders)
- **Covers cache:** `~/Library/Application Support/KoMark/covers/{md5}.jpg`
- **Annotations:** `~/Library/Application Support/KoMark/annotations.json`

The Kindle may be on a different subnet than the Mac (e.g. Mac on 192.168.86.x, Kindle on 10.0.0.x). The Find Kindle scanner checks multiple subnets including 10.0.0.x, 172.16.x.x ranges and sends `kindle:scanning` events with the current subnet for UI feedback.

## KOReader Data

**statistics.sqlite3** schema:
- `book` table: id, title, authors, md5, pages, total_read_time, total_read_pages, last_open, highlights, notes
- `page_stat_data` table: id_book, page, start_time, **duration** (NOT period), total_pages

**Junk book filter:** `WHERE authors != 'N/A' AND pages >= 3 AND pages <= 10000`

**Finished book threshold:** 90% pages read (KOReader never reaches exactly 100%)

**WAL files:** Both sqlite3 DBs use WAL mode. The vocab DB requires Node's native `DatabaseSync` (not sql.js) to read WAL-pending data. Stats DB is read with sql.js directly.

**Annotations** are in `.sdr/metadata.epub.lua` files per book. Real highlights have `pos0`/`pos1` fields. Bookmarks only have `"in Chapter X"` text — filter those out.

## CSS / Styling

No Tailwind config — the `@tailwind` directives in index.css are dead. Styling uses:
- CSS custom properties (--cream, --amber, --ink-*) defined in `:root`
- Utility classes in index.css: `.page`, `.page--wide`, `.page--full`, `.page--narrow`, `.label`, `.label--no-mb`, `.muted`, `.muted--sm`, `.serif-value`, `.pill`, `.pill.active`, `.back-btn`, `.toast`, `.toast--error`, `.toast--success`

## Tooltips

All chart tooltips use `position:absolute` inside a `position:relative` container. Coordinates are computed via `getBoundingClientRect()` relative to the container element — NOT `clientX/Y` or `position:fixed`, which breaks on external monitors due to Electron's display scaling.

## Known Issues / History

- `electron-builder` has symlink issues on macOS — use `electron-packager` only
- `build-main` must `rm -rf dist-electron` first or stale files persist
- ssh2-sftp-client needs explicit `privateKey` — it doesn't auto-load SSH keys
- sql.js ignores WAL files — use Node native `DatabaseSync` for vocab
- Electron 24 ships Node 18 which lacks `node:sqlite` — spawn system node at `/opt/homebrew/bin/node` for vocab queries
- Cover extraction from epubs: use `isValidImage()` check, pick largest image candidate
- Dictionary (Webster's 1913) installed at `/mnt/us/koreader/data/dict/webster1913/`
- App icon must have transparent background — macOS applies squircle mask itself
- Red X closes window but keeps process alive (correct macOS behavior) — dock icon click re-creates window via `createWindow()`
- WPM estimate: 300 words/page (publishing standard), uses total_pages for finished books, total_read_pages for in-progress
