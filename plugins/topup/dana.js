const { getGame, runGamePlugin } = require('../../lib/gameCatalog')

module.exports = {
  command: ['dana'],
  category: 'topup',
  desc: 'Top up DANA',
  async run(ctx) { return runGamePlugin(ctx, getGame('dana')) }
}
