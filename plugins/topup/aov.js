const { getGame, runGamePlugin } = require('../../lib/gameCatalog')

module.exports = {
  command: ['aov', 'arenaofvalor'],
  category: 'topup',
  desc: 'Top up Arena of Valor',
  async run(ctx) { return runGamePlugin(ctx, getGame('aov')) }
}
