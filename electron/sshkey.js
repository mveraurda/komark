const { execSync } = require('child_process')
const { createPublicKey } = require('crypto')
const fs = require('fs')
const path = require('path')

function getKeyPaths(userData) {
  const dir = path.join(userData, 'ssh')
  return {
    dir,
    privateKey: path.join(dir, 'komark_ed25519'),
    publicKey:  path.join(dir, 'komark_ed25519.pub'),
  }
}

function ensureKeyPair(userData) {
  const { dir, privateKey, publicKey } = getKeyPaths(userData)
  if (fs.existsSync(privateKey) && fs.existsSync(publicKey)) {
    return { privateKey: fs.readFileSync(privateKey), publicKey: fs.readFileSync(publicKey, 'utf8') }
  }
  fs.mkdirSync(dir, { recursive: true })
  // Generate OpenSSH-format ed25519 keypair via ssh-keygen (bundled with macOS)
  execSync(`ssh-keygen -t ed25519 -N "" -C "komark" -f "${privateKey}"`, { stdio: 'pipe' })
  fs.chmodSync(privateKey, 0o600)
  const privBuf = fs.readFileSync(privateKey)
  const pubStr  = fs.readFileSync(publicKey, 'utf8').trim() + '\n'
  return { privateKey: privBuf, publicKey: pubStr }
}

module.exports = { ensureKeyPair, getKeyPaths }
