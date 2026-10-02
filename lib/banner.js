// lib/banner.js — Banner startup NikiStore
// Dipanggil dari index.js saat bot pertama kali jalan.
const figlet = require('figlet')
const gradient = require('gradient-string').default
const chalk = require('chalk')

const G = gradient(['#00E5FF', '#7C4DFF', '#FF4081'])

/**
 * Tampilkan banner NikiStore ke console.
 * @param {object} opts { title, creator, wa, group, version, plugins }
 */
function showBanner({ title = 'NIKISTORE', creator = 'Bagas', wa = '085171502270', group = 'https://bit.ly/NikiStore', version = null, plugins = null } = {}) {
  const art = figlet.textSync(title, { font: 'Standard', horizontalLayout: 'fitted', verticalLayout: 'fitted' })
  const line = '═'.repeat(Math.max(art.split('\n')[0].length - 1, 56))

  console.log()
  console.log(chalk.hex('#00E5FF')(line))
  console.log(G.multiline(art))
  console.log(chalk.hex('#FF4081')('                     ✦ W H A T S A P P   B O T ✦'))
  console.log(chalk.hex('#00E5FF')(line))

  const rows = [
    ['👤 Creator', creator],
    ['📱 WhatsApp', wa],
    ['🔗 Grup', group]
  ]
  if (version) rows.push(['🟢 WhatsApp', `v${version.join('.')}`])
  if (plugins !== null) rows.push(['🧩 Plugins', `${plugins} command loaded`])

  for (const [label, value] of rows) {
    console.log(`${chalk.hex('#7C4DFF').bold(label)}  ${chalk.white(value)}`)
  }

  console.log(chalk.hex('#00E5FF')(line))
  console.log(chalk.hex('#8C8C8C').italic('   Terima kasih sudah memakai NikiStore bot ✨'))
  console.log()
}

module.exports = { showBanner }
