const { getGame, runGamePlugin } = require('../../lib/gameCatalog')

module.exports = {
  command: ['honkaiimpact', 'hi3'],
  category: 'topup',
  desc: 'Top up Honkai Impact 3',
  async run(ctx) { return runGamePlugin(ctx, getGame('honkaiimpact')) }
}
