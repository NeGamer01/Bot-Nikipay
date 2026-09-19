module.exports = {
  command: ['listkata'],
  category: 'group',
  desc: 'List kata kasar',
  isGroup: true,
  isAdmin: true,
  async run({ conn, msg, db }) {
    const group = db.getGroup(msg.from)
    const kataKasar = group.kataKasar || []
    if (kataKasar.length === 0) {
      return conn.sendMessage(msg.from, { text: '❌ Belum ada kata kasar di daftar' }, { quoted: msg.original })
    }
    let text = '╭─❒ *Daftar Kata Kasar*\n│\n'
    kataKasar.forEach((kata, i) => { text += `│ ${i + 1}. ${kata}\n` })
    text += '╰─────────────'
    await conn.sendMessage(msg.from, { text }, { quoted: msg.original })
  }
}
