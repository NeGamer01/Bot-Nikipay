const { ubahSaldo } = require('../../lib/saldoAdmin')

module.exports = {
  command: ['addsaldo', 'tambahsaldo'],
  category: 'owner',
  desc: 'Tambah saldo user (@user / nomor / diri sendiri)',
  isOwner: true,
  async run(ctx) { return ubahSaldo({ ...ctx, mode: 'add' }) }
}
