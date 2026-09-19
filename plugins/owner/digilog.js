const { readDigiLog, cekSaldoDigi } = require('../../lib/digiflazz')

module.exports = {
  command: ['digilog', 'logdigi'],
  category: 'owner',
  desc: 'Lihat log request/respons Digiflazz terakhir (default 15 baris)',
  isOwner: true,
  async run({ conn, msg, args }) {
    const n = Math.min(parseInt(args[0]) || 15, 50)
    const log = readDigiLog(n)
    let saldoInfo = ''
    try {
      const saldo = await cekSaldoDigi()
      saldoInfo = `\n\n💰 Saldo Digiflazz: Rp ${Number(saldo).toLocaleString('id-ID')}`
    } catch (e) {
      saldoInfo = `\n\n⚠️ Cek saldo Digiflazz gagal: ${e.response ? 'HTTP ' + e.response.status : e.message}`
    }
    const text = `📋 *Log Digiflazz (${n} terakhir)*\n▬▬▬▬▬▬▬▬▬▬▬▬▬\n${log ? '```' + log + '```' : '_Belum ada log. Log mulai tercatat setelah update ini._'}${saldoInfo}`
    await conn.sendMessage(msg.from, { text }, { quoted: msg.original })
  }
}
