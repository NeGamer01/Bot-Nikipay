module.exports = {
  command: ['antikasar'],
  category: 'group',
  desc: 'Toggle anti kata kasar',
  isGroup: true,
  isAdmin: true,
  async run({ conn, msg, db }) {
    const group = db.getGroup(msg.from)
    const newStatus = !group.antikasarr
    db.setGroup(msg.from, { antikasarr: newStatus })
    await conn.sendMessage(msg.from, { text: `✅ Anti kata kasar ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}` }, { quoted: msg.original })
  }
}
