const { getGame, runGamePlugin } = require('../../lib/gameCatalog')

module.exports = {
  command: ['freefire', 'ff'],
  category: 'topup',
  desc: 'Top up Free Fire',
  async run(ctx) { return runGamePlugin(ctx, getGame('freefire')) }
}
