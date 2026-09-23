const { getGame, runGamePlugin } = require('../../lib/gameCatalog')

module.exports = {
  command: ['genshin', 'gi'],
  category: 'topup',
  desc: 'Top up Genshin Impact',
  async run(ctx) { return runGamePlugin(ctx, getGame('genshin')) }
}
