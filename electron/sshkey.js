const fs = require('fs')
const path = require('path')
const os = require('os')

function getDefaultKeyPath() {
  for (const name of ['id_ed25519', 'id_rsa', 'id_ecdsa']) {
    const p = path.join(os.homedir(), '.ssh', name)
    if (fs.existsSync(p)) return p
  }
  return null
}

module.exports = { getDefaultKeyPath }
