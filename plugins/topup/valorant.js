const { getGame, runGamePlugin } = require('../../lib/gameCatalog')

module.exports = {
  command: ['valorant', 'valo'],
  category: 'topup',
  desc: 'Top up Valorant',
  async run(ctx) { return runGamePlugin(ctx, getGame('valorant')) }
}
