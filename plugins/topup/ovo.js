const { getGame, runGamePlugin } = require('../../lib/gameCatalog')

module.exports = {
  command: ['ovo'],
  category: 'topup',
  desc: 'Top up OVO',
  async run(ctx) { return runGamePlugin(ctx, getGame('ovo')) }
}
