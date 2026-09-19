module.exports = {
  command: ['left'],
  category: 'group',
  desc: 'Toggle left message',
  isGroup: true,
  isAdmin: true,
  async run({ conn, msg, db }) {
    const group = db.getGroup(msg.from)
    const newStatus = !group.left
    db.setGroup(msg.from, { left: newStatus })
    await conn.sendMessage(msg.from, { text: `✅ Left message ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}` }, { quoted: msg.original })
  }
}
