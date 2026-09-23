const { getGame, runGamePlugin } = require('../../lib/gameCatalog')

module.exports = {
  command: ['pointblank', 'pb'],
  category: 'topup',
  desc: 'Top up Point Blank',
  async run(ctx) { return runGamePlugin(ctx, getGame('pointblank')) }
}
