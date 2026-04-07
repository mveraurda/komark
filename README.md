# KoMark

A macOS desktop app that connects to a jailbroken Kindle running [KOReader](https://koreader.rocks) over WiFi and brings your reading life to your Mac — stats, highlights, vocabulary, and more.

![KoMark Screenshot](assets/screenshot.png)

## Features

- **Today** — daily reading time, current streak, currently reading book with progress
- **Library** — full book grid with cover art, search, filter by status, reading sessions chart, highlights viewer
- **Statistics** — yearly heatmap, monthly breakdown, day-of-week patterns, top books
- **Vocabulary** — every word you've looked up in KOReader with context sentence and one-click Merriam-Webster lookup
- **Auto-sync** — syncs stats, covers, annotations, and vocabulary on a configurable interval

## Requirements

- macOS (Apple Silicon or Intel)
- A Kindle with [KOReader](https://koreader.rocks) installed
- KOReader's SSH server enabled

## Installation

### Download

Grab the latest `.dmg` from [Releases](../../releases) and drag KoMark to your Applications folder.

### Build from source

```bash
git clone https://github.com/yourusername/komark
cd komark
npm install
npm run build
```

The DMG will be at `release/KoMark.dmg`.

## Setup

### 1. Enable SSH on your Kindle

In KOReader: **Menu → Tools (⚙) → Network → SSH Server**

Note the IP address shown — you'll need it in the next step.

### 2. Set up SSH key authentication

On your Mac, copy your public key to the Kindle:

```bash
# Connect once with a password if needed, or use sftp
sftp -P 2222 root@<kindle-ip>
# Then put your key:
put ~/.ssh/id_ed25519.pub /mnt/us/koreader/settings/SSH/authorized_keys
```

If you don't have an SSH key, generate one first:
```bash
ssh-keygen -t ed25519
```

### 3. Configure KoMark

Open KoMark → **Settings**, enter your Kindle's IP address, and tap **Test Connection**. Or use **Find Kindle** to auto-discover it on your network.

## How It Works

KoMark connects to your Kindle over SFTP and downloads:
- `statistics.sqlite3` — reading session data
- Cover images extracted from epub files
- `.sdr/metadata.lua` files — highlights and notes
- `vocabulary_builder.sqlite3` — looked-up words

All data is stored locally in `~/Library/Application Support/KoMark/`.

## Notes

- **Finished books** are detected at 90% completion — KOReader never reports exactly 100%
- **Vocabulary** requires the KOReader Vocabulary Builder plugin to be active
- **Dictionary** — install Webster's 1913 StarDict on your Kindle for better word lookups in KOReader
- **SSH key path** can be customized in Settings if your key is in a non-standard location

## Tech Stack

- [Electron](https://electronjs.org) 24
- [React](https://react.dev) + [Vite](https://vitejs.dev)
- [sql.js](https://sql.js.org) — SQLite in WebAssembly
- [ssh2-sftp-client](https://github.com/theophilusx/ssh2-sftp-client)

## License

MIT
