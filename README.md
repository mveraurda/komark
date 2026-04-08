# KoMark

A macOS desktop app that connects to any device running [KOReader](https://koreader.rocks) over WiFi and brings your reading life to your Mac — stats, highlights, vocabulary, and more.

Works with **Kindle**, **Kobo**, **PocketBook**, and any other device supported by KOReader.

## Features

- **Today** — daily reading time, current streak, currently reading book with progress
- **Library** — full book grid with cover art, search, filter by status, reading sessions chart, highlights viewer
- **Statistics** — yearly heatmap, monthly breakdown, day-of-week patterns, top books
- **Vocabulary** — every word you've looked up in KOReader with context sentence and one-click Merriam-Webster lookup
- **Auto-sync** — syncs stats, covers, annotations, and vocabulary on a configurable interval
- **SSH key auth** — uses your existing `~/.ssh` keys; auto-detects id_ed25519, id_rsa, id_ecdsa

## Installation

Download the latest `KoMark.dmg` from [Releases](../../releases), open it, and drag KoMark to your Applications folder.

## Setup

### 1. Enable SSH on your KOReader device

**Menu → Tools (⚙) → Network → SSH Server**

Note the IP address shown.

### 2. Copy your SSH public key to the device

```
ssh-copy-id -p 2222 root@YOUR_DEVICE_IP
```

Or if your device has a password, enter it in KoMark's Advanced settings instead.

### 3. Open KoMark → Settings

Enter your device's IP address and tap **Test Connection**.

> **Tip:** Use **Find Device** to auto-discover your device on the network.

## Notes

- **Finished books** are detected at 90% completion — KOReader never reports exactly 100%
- **Vocabulary** requires the KOReader Vocabulary Builder plugin to be active
- **Covers** are extracted from epub files on your device — mobi/azw books won't have covers

## Tech Stack

- [Electron](https://electronjs.org) 24 · [React](https://react.dev) · [Vite](https://vitejs.dev)
- [sql.js](https://sql.js.org) — SQLite in WebAssembly
- [ssh2-sftp-client](https://github.com/theophilusx/ssh2-sftp-client)

## License

MIT
