const { getGame, runGamePlugin } = require('../../lib/gameCatalog')

module.exports = {
  command: ['mobilelegend', 'ml'],
  category: 'topup',
  desc: 'Top up Mobile Legends',
  async run(ctx) { return runGamePlugin(ctx, getGame('mobilelegend')) }
}
