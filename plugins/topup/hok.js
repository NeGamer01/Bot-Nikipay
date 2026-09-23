const { getGame, runGamePlugin } = require('../../lib/gameCatalog')

module.exports = {
  command: ['hok', 'honorofkings'],
  category: 'topup',
  desc: 'Top up Honor of Kings',
  async run(ctx) { return runGamePlugin(ctx, getGame('hok')) }
}
