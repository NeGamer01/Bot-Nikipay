const { getGame, runGamePlugin } = require('../../lib/gameCatalog')

module.exports = {
  command: ['pubg', 'pubgm'],
  category: 'topup',
  desc: 'Top up PUBG Mobile',
  async run(ctx) { return runGamePlugin(ctx, getGame('pubg')) }
}
