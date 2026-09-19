module.exports = {
  command: ['antilink'],
  category: 'group',
  desc: 'Toggle anti link',
  isGroup: true,
  isAdmin: true,
  async run({ conn, msg, db }) {
    const group = db.getGroup(msg.from)
    const newStatus = !group.antilink
    db.setGroup(msg.from, { antilink: newStatus })
    await conn.sendMessage(msg.from, { text: `✅ Anti link ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}` }, { quoted: msg.original })
  }
}
