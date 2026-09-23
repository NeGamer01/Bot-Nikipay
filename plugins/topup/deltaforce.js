const { getGame, runGamePlugin } = require('../../lib/gameCatalog')

module.exports = {
  command: ['deltaforce', 'df'],
  category: 'topup',
  desc: 'Top up Delta Force',
  async run(ctx) { return runGamePlugin(ctx, getGame('deltaforce')) }
}
