module.exports = {
  command: ['antispam'],
  category: 'group',
  desc: 'Toggle anti spam',
  isGroup: true,
  isAdmin: true,
  async run({ conn, msg, db }) {
    const group = db.getGroup(msg.from)
    const newStatus = !group.antispam
    db.setGroup(msg.from, { antispam: newStatus })
    await conn.sendMessage(msg.from, { text: `✅ Anti spam ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}` }, { quoted: msg.original })
  }
}
