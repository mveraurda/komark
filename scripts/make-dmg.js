#!/usr/bin/env node
// Builds a DMG with an Applications symlink using macOS built-ins.
const { execSync } = require('child_process')
const fs   = require('fs')
const path = require('path')

const APP_NAME = 'KoMark'
const APP_PATH = path.resolve(__dirname, '../release/KoMark-darwin-arm64/KoMark.app')
const OUT_DIR  = path.resolve(__dirname, '../release')
const DMG_PATH = path.join(OUT_DIR, `${APP_NAME}.dmg`)
const STAGING  = path.join(OUT_DIR, 'dmg-staging')

if (!fs.existsSync(APP_PATH)) {
  console.error('KoMark.app not found — run electron-packager first'); process.exit(1)
}

// Clean up previous DMG and staging
if (fs.existsSync(DMG_PATH))  fs.unlinkSync(DMG_PATH)
if (fs.existsSync(STAGING))   fs.rmSync(STAGING, { recursive: true })
fs.mkdirSync(STAGING)

console.log('Staging DMG contents...')

// Copy .app into staging folder
execSync(`cp -r "${APP_PATH}" "${STAGING}/"`)

// Add /Applications symlink
fs.symlinkSync('/Applications', path.join(STAGING, 'Applications'))

console.log('Creating DMG (auto-sized)...')

// hdiutil srcfolder auto-calculates size and creates compressed DMG directly
execSync(
  `hdiutil create -volname "${APP_NAME}" -srcfolder "${STAGING}" -ov -format UDZO "${DMG_PATH}"`,
  { stdio: 'inherit' }
)

// Clean staging
fs.rmSync(STAGING, { recursive: true })

console.log(`\n✓ DMG ready: ${DMG_PATH}`)

// Style the opened DMG window via AppleScript (optional, non-fatal)
try {
  execSync(`hdiutil attach "${DMG_PATH}" -mountpoint "/Volumes/${APP_NAME}" -nobrowse`, { stdio:'pipe' })
  const script = `
tell application "Finder"
  tell disk "${APP_NAME}"
    open
    set current view of container window to icon view
    set toolbar visible of container window to false
    set statusbar visible of container window to false
    set bounds of container window to {400, 100, 900, 400}
    set theViewOptions to the icon view options of container window
    set arrangement of theViewOptions to not arranged
    set icon size of theViewOptions to 80
    set position of item "${APP_NAME}.app" of container window to {130, 150}
    set position of item "Applications" of container window to {370, 150}
    close
    open
    update without registering applications
    delay 1
    close
  end tell
end tell`
  execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, { stdio:'pipe' })
  execSync(`hdiutil detach "/Volumes/${APP_NAME}" -force`, { stdio:'pipe' })
  // Re-compress after styling
  const styled = DMG_PATH.replace('.dmg', '-styled.dmg')
  execSync(`hdiutil convert "${DMG_PATH}" -format UDZO -o "${styled}" -ov`, { stdio:'pipe' })
  fs.renameSync(styled, DMG_PATH)
} catch (e) {
  // Styling is cosmetic only — DMG still works without it
  try { execSync(`hdiutil detach "/Volumes/${APP_NAME}" -force 2>/dev/null`, { stdio:'pipe' }) } catch {}
  console.log('(window styling skipped — DMG is still valid)')
}

console.log(`✓ Done: ${DMG_PATH}`)
