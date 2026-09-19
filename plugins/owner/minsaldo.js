const { ubahSaldo } = require('../../lib/saldoAdmin')

module.exports = {
  command: ['minsaldo', 'kurangsaldo'],
  category: 'owner',
  desc: 'Kurangi saldo user (@user / nomor / diri sendiri)',
  isOwner: true,
  async run(ctx) { return ubahSaldo({ ...ctx, mode: 'min' }) }
}
