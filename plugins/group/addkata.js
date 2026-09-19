module.exports = {
  command: ['addkata'],
  category: 'group',
  desc: 'Tambah kata kasar',
  isGroup: true,
  isAdmin: true,
  async run({ conn, msg, text, db }) {
    if (!text) return conn.sendMessage(msg.from, { text: '❌ Masukkan kata yang ingin ditambahkan' }, { quoted: msg.original })
    const group = db.getGroup(msg.from)
    const kataKasar = group.kataKasar || []
    if (kataKasar.includes(text.toLowerCase())) {
      return conn.sendMessage(msg.from, { text: '❌ Kata sudah ada di daftar' }, { quoted: msg.original })
    }
    kataKasar.push(text.toLowerCase())
    db.setGroup(msg.from, { kataKasar })
    await conn.sendMessage(msg.from, { text: `✅ Kata "${text}" ditambahkan ke daftar kata kasar` }, { quoted: msg.original })
  }
}
