const { toRupiah } = require('../../lib/digiflazz')

module.exports = {
  command: ['saldo', 'balance', 'bal'],
  category: 'payment',
  desc: 'Cek saldo kamu',
  async run({ conn, msg, db, config }) {
    const user = db.getUser(msg.sender)
    const saldo = user.saldo || 0
    await conn.sendMessage(msg.from, {
      text: `💰 *Saldo Kamu*\n\nRp ${toRupiah(saldo)}\n\n_${config.botName}_`
    }, { quoted: msg.original })
  }
}
