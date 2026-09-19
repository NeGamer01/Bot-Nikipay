module.exports = {
  command: ['delkata'],
  category: 'group',
  desc: 'Hapus kata kasar',
  isGroup: true,
  isAdmin: true,
  async run({ conn, msg, text, db }) {
    if (!text) return conn.sendMessage(msg.from, { text: '❌ Masukkan kata yang ingin dihapus' }, { quoted: msg.original })
    const group = db.getGroup(msg.from)
    const kataKasar = group.kataKasar || []
    const index = kataKasar.indexOf(text.toLowerCase())
    if (index === -1) {
      return conn.sendMessage(msg.from, { text: '❌ Kata tidak ada di daftar' }, { quoted: msg.original })
    }
    kataKasar.splice(index, 1)
    db.setGroup(msg.from, { kataKasar })
    await conn.sendMessage(msg.from, { text: `✅ Kata "${text}" dihapus dari daftar kata kasar` }, { quoted: msg.original })
  }
}
